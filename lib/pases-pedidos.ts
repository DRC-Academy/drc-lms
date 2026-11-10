// ---------------------------------------------------------------
// QUÉ SE HACE CON UN PEDIDO DEL BLACK PASS
//
// Una sola función para los cuatro caminos que llegan aquí: el webhook, la
// conciliación, la entrada desde la tienda y «Reprocesar» en el panel. Las
// reglas están en `lib/pases-reglas.ts` y la atomicidad en las funciones de
// `supabase/lms-pases.sql`: se puede llamar a esto a la vez y mil veces.
//
// NO SE LE PREGUNTA A GESTIÓN MÁS QUE UNA VEZ POR PEDIDO, y solo para saber
// si el comprador tiene ficha la primera vez que se concede. Si esa lectura
// falla, se le da un id propio y la entrada lo funde con su ficha después.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { buscarAlumnoPorEmail } from "@/lib/gestion";
import { resolverPorWooUserId } from "@/lib/vinculos";
import { enSegundoPlano } from "@/lib/segundo-plano";
import { paseDelPedido } from "@/lib/woo-api";
import { decidirPedido, esReembolsoParcial, type PedidoWoo, type ProductoPase } from "@/lib/pases-reglas";
import { procesarCola } from "@/lib/pases-cola";

export type OrigenLog = "webhook" | "conciliacion" | "panel" | "cola" | "entrada" | "base";

export type AccionLog =
  | "concedido"
  | "reactivado"
  | "ya_activo"
  | "bloqueado_manual"
  | "revocado"
  | "sin_accion"
  | "reembolso_parcial"
  | "error"
  | "correo_reenviado"
  | "manual_concedido"
  | "manual_revocado"
  | "manual_reactivado"
  | "alerta";

export type Alerta = "espera_tras_conceder" | "pedido_en_papelera" | "pedido_sin_fecha_pago";

export async function registrar(
  origen: OrigenLog,
  accion: AccionLog,
  datos: {
    pedidoId?: number | null;
    paseId?: string | null;
    email?: string | null;
    estadoWc?: string | null;
    error?: string | null;
    alerta?: Alerta | null;
    detalle?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const { error } = await baseLms().rpc("registrar_pase_log", {
    p_origen: origen,
    p_accion: accion,
    p_wc_order_id: datos.pedidoId ?? null,
    p_pase_id: datos.paseId ?? null,
    p_email: datos.email ?? null,
    p_estado_wc: datos.estadoWc ?? null,
    p_error: datos.error ?? null,
    p_detalle: datos.detalle ?? {},
    p_alerta: datos.alerta ?? null,
  });
  // El registro no puede tumbar lo que acaba de pasar.
  if (error) console.error("[pases] No se pudo escribir en el registro:", error.message);
}

type FilaPaseDePedido = { id: string; estado: string };

async function paseDePedido(pedidoId: number): Promise<FilaPaseDePedido | null> {
  const { data, error } = await baseLms()
    .from("pases_curso")
    .select("id, estado")
    .eq("wc_order_id", pedidoId)
    .limit(1)
    .returns<FilaPaseDePedido[]>();
  if (error) throw new Error(`No se pudo leer el pase del pedido: ${error.message}`);
  return (data ?? [])[0] ?? null;
}

/** La ficha del comprador: por su email y, si no, por su usuario de WordPress. */
async function fichaDelComprador(pedido: PedidoWoo): Promise<string | null> {
  const porEmail = await buscarAlumnoPorEmail(pedido.email);
  if (porEmail) return porEmail.alumnoId;
  return pedido.usuarioId > 0 ? resolverPorWooUserId(pedido.usuarioId) : null;
}

export type ResultadoPedido = { accion: AccionLog | "no_es_pase"; paseId?: string; alumnoId?: string };

async function conceder(pedido: PedidoWoo, producto: ProductoPase, origen: OrigenLog, previo: FilaPaseDePedido | null): Promise<ResultadoPedido> {
  const ficha = previo ? null : await fichaDelComprador(pedido);

  // Un pago sin fecha es raro, pero quien ha pagado no se queda fuera por
  // eso: se cuenta desde la creación del pedido y se avisa.
  const pagadoEn = pedido.pagadoEn ?? pedido.creadoEn ?? new Date().toISOString();

  const { data, error } = await baseLms().rpc("conceder_pase_pedido", {
    p_wc_order_id: pedido.id,
    p_email: pedido.email,
    p_nombre: pedido.nombre,
    p_woo_user_id: pedido.usuarioId || null,
    p_ficha_id: ficha,
    p_producto_id: producto.productoId,
    p_pagado_en: pagadoEn,
    p_meses: producto.meses,
    p_es_prueba: producto.esPrueba,
  });
  if (error) throw new Error(`No se pudo conceder el pase: ${error.message}`);

  const fila = (data as { accion: AccionLog; pase_id: string; alumno_id: string }[])[0];
  const comun = { pedidoId: pedido.id, paseId: fila.pase_id, email: pedido.email, estadoWc: pedido.estado };

  await registrar(origen, esReembolsoParcial(pedido) && fila.accion === "ya_activo" ? "reembolso_parcial" : fila.accion, comun);

  if (!pedido.pagadoEn) await registrar(origen, "alerta", { ...comun, alerta: "pedido_sin_fecha_pago" });

  // Que el correo salga ya, sin esperar a la vuelta del cron.
  if (fila.accion === "concedido") {
    enSegundoPlano("pases-cola", () => procesarCola({ limite: 3, plazoMs: 8_000 }));
  }

  return { accion: fila.accion, paseId: fila.pase_id, alumnoId: fila.alumno_id };
}

/** Aplica el estado de un pedido ya leído de la tienda. Lanza si la base falla. */
export async function procesarPedido(pedido: PedidoWoo, origen: OrigenLog): Promise<ResultadoPedido> {
  const producto = await paseDelPedido(pedido);
  if (!producto) return { accion: "no_es_pase" };

  if (pedido.email === "") {
    await registrar(origen, "error", { pedidoId: pedido.id, estadoWc: pedido.estado, error: "El pedido no trae email." });
    return { accion: "error" };
  }

  const previo = await paseDePedido(pedido.id);
  const activo = previo?.estado === "activo";
  const comun = { pedidoId: pedido.id, paseId: previo?.id ?? null, email: pedido.email, estadoWc: pedido.estado };

  switch (decidirPedido(pedido.estado, activo)) {
    case "conceder":
      return conceder(pedido, producto, origen, previo);

    case "revocar": {
      if (!previo || !activo) {
        await registrar(origen, "sin_accion", comun);
        return { accion: "sin_accion", paseId: previo?.id };
      }
      const { error } = await baseLms().rpc("revocar_pase", {
        p_pase_id: previo.id,
        p_por: "woocommerce",
        p_motivo: `Pedido ${pedido.estado}`,
        p_bloquear: false,
      });
      if (error) throw new Error(`No se pudo revocar el pase: ${error.message}`);
      await registrar(origen, "revocado", comun);
      return { accion: "revocado", paseId: previo.id };
    }

    case "alerta_espera":
      await registrar(origen, "alerta", { ...comun, alerta: "espera_tras_conceder" });
      return { accion: "alerta", paseId: previo?.id };

    case "alerta_papelera":
      await registrar(origen, "alerta", { ...comun, alerta: "pedido_en_papelera" });
      return { accion: "alerta", paseId: previo?.id };

    default:
      // Una transferencia sin confirmar se apunta: es lo que la enseña en el panel.
      await registrar(origen, "sin_accion", comun);
      return { accion: "sin_accion", paseId: previo?.id };
  }
}
