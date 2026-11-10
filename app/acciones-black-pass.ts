"use server";

// ---------------------------------------------------------------
// LO QUE EL EQUIPO HACE DESDE EL PANEL /black-pass
//
// `exigirAdministrador()` abre todas: una acción de servidor es una ruta más.
// Quién actúa sale de la cookie, nunca de los argumentos.
// ---------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { baseLms } from "@/lib/supabase-lms";
import { buscarAlumnoPorEmail } from "@/lib/gestion";
import { enSegundoPlano } from "@/lib/segundo-plano";
import { esEmailPlausible, normalizarEmail } from "@/lib/sesion";
import { leerPedido } from "@/lib/woo-api";
import { procesarPedido, registrar } from "@/lib/pases-pedidos";
import { procesarCola } from "@/lib/pases-cola";

export type ResultadoPanel = { ok: boolean; mensaje?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refrescar() {
  revalidatePath("/black-pass");
}

/** Vuelve a leer el pedido de la tienda y aplica su estado. */
export async function reprocesarPedido(pedidoId: unknown): Promise<ResultadoPanel> {
  await exigirAdministrador();
  if (typeof pedidoId !== "number" || !Number.isSafeInteger(pedidoId) || pedidoId <= 0) {
    return { ok: false, mensaje: "Ese número de pedido no es válido." };
  }

  try {
    const pedido = await leerPedido(pedidoId);
    if (!pedido) return { ok: false, mensaje: "Ese pedido no existe en la tienda." };

    const { accion } = await procesarPedido(pedido, "panel");
    refrescar();
    return accion === "no_es_pase"
      ? { ok: false, mensaje: "Ese pedido no es de un Black Pass." }
      : { ok: true, mensaje: `Hecho: ${accion} (pedido ${pedido.estado}).` };
  } catch (error) {
    const mensaje = (error as Error).message;
    await registrar("panel", "error", { pedidoId, error: mensaje });
    return { ok: false, mensaje };
  }
}

/** Da un pase a mano, por email. Si ya tiene uno vivo no crea otro. */
export async function darAccesoManual(datos: {
  email: unknown;
  nombre: unknown;
  meses: unknown;
  motivo: unknown;
}): Promise<ResultadoPanel> {
  const sesion = await exigirAdministrador();

  const email = normalizarEmail(datos.email);
  if (!esEmailPlausible(email)) return { ok: false, mensaje: "Ese email no parece válido." };

  const meses = Number(datos.meses);
  if (!Number.isInteger(meses) || meses < 1 || meses > 60) return { ok: false, mensaje: "La duración va de 1 a 60 meses." };

  const ficha = await buscarAlumnoPorEmail(email);

  const { data, error } = await baseLms().rpc("conceder_pase_manual", {
    p_email: email,
    p_nombre: typeof datos.nombre === "string" ? datos.nombre : null,
    p_ficha_id: ficha?.alumnoId ?? null,
    p_meses: meses,
    p_por: sesion.email,
    p_motivo: typeof datos.motivo === "string" ? datos.motivo : null,
    p_enviar_correo: true,
  });

  if (error) return { ok: false, mensaje: error.message };

  const fila = (data as { accion: string; pase_id: string }[])[0];
  if (fila.accion === "ya_activo") return { ok: false, mensaje: "Ese email ya tiene un pase vivo." };

  await registrar("panel", "manual_concedido", { paseId: fila.pase_id, email, detalle: { por: sesion.email } });
  enSegundoPlano("pases-cola", () => procesarCola({ limite: 1, plazoMs: 8_000 }));
  refrescar();
  return { ok: true, mensaje: ficha ? "Pase concedido a su ficha. Le llega el correo de acceso." : "Pase concedido. Le llega el correo de acceso." };
}

/** Quita un pase. La conciliación no se lo devuelve hasta que se reactive. */
export async function quitarPase(paseId: unknown, motivo: unknown): Promise<ResultadoPanel> {
  const sesion = await exigirAdministrador();
  if (typeof paseId !== "string" || !UUID.test(paseId)) return { ok: false, mensaje: "Pase no válido." };

  const { data, error } = await baseLms().rpc("revocar_pase", {
    p_pase_id: paseId,
    p_por: sesion.email,
    p_motivo: typeof motivo === "string" ? motivo : null,
    p_bloquear: true,
  });
  if (error) return { ok: false, mensaje: error.message };

  const fila = (data as { accion: string; sesiones_revocadas: number }[])[0];
  await registrar("panel", "manual_revocado", { paseId, detalle: { por: sesion.email, sesiones: fila.sesiones_revocadas } });
  refrescar();
  return { ok: true, mensaje: fila.sesiones_revocadas > 0 ? `Quitado. Sesiones cerradas: ${fila.sesiones_revocadas}.` : "Quitado." };
}

export async function reactivarPase(paseId: unknown): Promise<ResultadoPanel> {
  const sesion = await exigirAdministrador();
  if (typeof paseId !== "string" || !UUID.test(paseId)) return { ok: false, mensaje: "Pase no válido." };

  const { error } = await baseLms().rpc("reactivar_pase", { p_pase_id: paseId });
  if (error) return { ok: false, mensaje: error.message };

  await registrar("panel", "manual_reactivado", { paseId, detalle: { por: sesion.email } });
  refrescar();
  return { ok: true, mensaje: "Reactivado, con su misma fecha." };
}

export async function reenviarCorreo(paseId: unknown): Promise<ResultadoPanel> {
  const sesion = await exigirAdministrador();
  if (typeof paseId !== "string" || !UUID.test(paseId)) return { ok: false, mensaje: "Pase no válido." };

  const { error } = await baseLms().rpc("reenviar_acceso", { p_pase_id: paseId });
  if (error) return { ok: false, mensaje: error.message };

  await registrar("panel", "correo_reenviado", { paseId, detalle: { por: sesion.email } });
  enSegundoPlano("pases-cola", () => procesarCola({ limite: 1, plazoMs: 8_000 }));
  refrescar();
  return { ok: true, mensaje: "En cola: sale en unos segundos." };
}

export async function resolverAlerta(alertaId: unknown): Promise<ResultadoPanel> {
  const sesion = await exigirAdministrador();
  if (typeof alertaId !== "number" || !Number.isSafeInteger(alertaId)) return { ok: false, mensaje: "Alerta no válida." };

  const { error } = await baseLms()
    .from("pases_log")
    .update({ resuelta_en: new Date().toISOString(), resuelta_por: sesion.email })
    .eq("id", alertaId)
    .is("resuelta_en", null);
  if (error) return { ok: false, mensaje: error.message };

  refrescar();
  return { ok: true };
}
