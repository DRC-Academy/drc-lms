// ---------------------------------------------------------------
// LA CONCILIACIÓN: LA RED DE SEGURIDAD DEL WEBHOOK
//
// WooCommerce no reintenta de forma fiable y desactiva un webhook tras varios
// fallos, así que el acceso no puede depender de que este llegue. Esto pregunta
// a la tienda por los pedidos modificados desde la última pasada y aplica lo
// que falte. Es idempotente: lo que ya está hecho no se repite.
//
// LO LLAMA `pg_cron` (`supabase/lms-pases-cron.sql`) cada 5 minutos: Vercel
// Hobby solo admite crons diarios. Por si eso falla, `vercel.json` la llama
// además una vez al día. Las dos con `Authorization: Bearer CRON_SECRET`.
//
// EL CURSOR SOLO AVANZA POR LO QUE HA SALIDO BIEN. Un pedido que falla deja el
// cursor antes de él y se repite en la siguiente pasada; los demás siguen.
// Se relee con 15 minutos de solape, porque la API corta por segundos y un
// pedido puede guardarse mientras se está leyendo esa misma página.
//
// La respuesta lleva recuentos, nunca emails.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { baseLms } from "@/lib/supabase-lms";
import { pasesActivos } from "@/lib/pases";
import { estadoDelWebhook, PEDIDOS_POR_PAGINA, pedidosModificados } from "@/lib/woo-api";
import { procesarPedido, registrar } from "@/lib/pases-pedidos";
import { autorizadoComoCron } from "@/lib/secreto-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SOLAPE_MS = 15 * 60 * 1000;
/** Cerrar por su propio pie antes de que corte Vercel. */
const LIMITE_MS = 240_000;
/** Lo que dura la reserva del turno: tiene que pasar de `maxDuration`. */
const RESERVA_S = 310;

export async function GET(peticion: NextRequest) {
  if (!autorizadoComoCron(peticion)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  if (!pasesActivos()) return NextResponse.json({ apagado: true });

  const { data: turno, error: alTomar } = await baseLms().rpc("tomar_conciliacion", { p_reserva_segundos: RESERVA_S });
  if (alTomar) {
    console.error("[conciliar] No se pudo tomar el turno:", alTomar.message);
    return NextResponse.json({ error: "sin turno" }, { status: 500 });
  }

  const cursor = (turno as { cursor_en: string }[] | null)?.[0]?.cursor_en;
  // Otra pasada sigue en marcha: la siguiente ya se encargará.
  if (!cursor) return NextResponse.json({ ocupado: true });

  const arranque = Date.now();
  const contados = { pedidos: 0, pases: 0, fallidos: 0 };
  let hasta = new Date(cursor);
  let primerFallo: Date | null = null;
  let errorGeneral: string | null = null;
  let cortado = false;

  try {
    const desde = new Date(hasta.getTime() - SOLAPE_MS);

    for (let pagina = 1; ; pagina++) {
      const pedidos = await pedidosModificados(desde, pagina);

      for (const pedido of pedidos) {
        if (Date.now() - arranque > LIMITE_MS) {
          cortado = true;
          break;
        }

        contados.pedidos++;
        const modificado = pedido.modificadoEn ? new Date(pedido.modificadoEn) : null;

        try {
          const { accion } = await procesarPedido(pedido, "conciliacion");
          if (accion !== "no_es_pase") contados.pases++;
          if (modificado && modificado > hasta) hasta = modificado;
        } catch (error) {
          contados.fallidos++;
          const mensaje = (error as Error).message;
          console.error(`[conciliar] Pedido ${pedido.id}:`, mensaje);
          await registrar("conciliacion", "error", { pedidoId: pedido.id, estadoWc: pedido.estado, error: mensaje });
          if (modificado && (!primerFallo || modificado < primerFallo)) primerFallo = modificado;
        }
      }

      if (cortado || pedidos.length < PEDIDOS_POR_PAGINA) break;
    }
  } catch (error) {
    errorGeneral = (error as Error).message;
    console.error("[conciliar] La pasada no terminó:", errorGeneral);
  }

  // No pasar de lo que falló: el solape solo cubre 15 minutos por detrás.
  if (primerFallo && primerFallo < hasta) hasta = primerFallo;

  const webhook = await estadoDelWebhook();

  const { error: alCerrar } = await baseLms().rpc("cerrar_conciliacion", {
    p_cursor_en: hasta.toISOString(),
    p_error: errorGeneral,
    p_webhook_estado: webhook,
  });
  if (alCerrar) console.error("[conciliar] No se pudo cerrar la pasada:", alCerrar.message);

  return NextResponse.json({
    ...contados,
    cortado,
    error: errorGeneral !== null,
    webhook,
    segundos: Math.round((Date.now() - arranque) / 1000),
  });
}
