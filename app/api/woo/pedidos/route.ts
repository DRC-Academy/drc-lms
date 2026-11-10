// ---------------------------------------------------------------
// WEBHOOK DE WOOCOMMERCE: «PEDIDO ACTUALIZADO»
//
// Se configura en WooCommerce → Ajustes → Avanzado → Webhooks, con el tema
// «Pedido actualizado» y el secreto de WOO_WEBHOOK_SECRET. Woo firma el cuerpo
// con HMAC-SHA256 en base64, en la cabecera `x-wc-webhook-signature`.
//
// RESPONDE 200 ENSEGUIDA Y SIEMPRE, salvo una firma que no cuadra: tras varios
// fallos seguidos WooCommerce desactiva el webhook sin avisar. Lo que falle por
// dentro lo recoge la conciliación (`/api/woo/conciliar`), que es la red de
// seguridad y no depende de que esto llegue.
//
// DEL CUERPO NO SE FÍA NADA: el pedido se vuelve a pedir a la tienda antes de
// conceder o quitar. El cuerpo solo sirve para saber qué pedido es y para
// descartar deprisa los que no son de un pase; este webhook salta con cada
// pedido de toda la tienda y sus datos personales no hacen falta aquí, así que
// solo se guarda el cuerpo de los pedidos de estos productos.
//
// El pedido del producto de respaldo se guarda antes de responder. Los demás
// se miran en segundo plano, porque saber si son un pase puede pedir una
// lectura a la tienda.
// ---------------------------------------------------------------

import { baseLms } from "@/lib/supabase-lms";
import { enSegundoPlano } from "@/lib/segundo-plano";
import { pasesActivos } from "@/lib/pases";
import { leerPedido, paseDelPedido, traeProductoRespaldo } from "@/lib/woo-api";
import { firmaValida, leerPedidoWoo } from "@/lib/pases-reglas";
import { procesarPedido, registrar } from "@/lib/pases-pedidos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ok = () => new Response("ok", { status: 200 });

async function guardarEvento(pedidoId: number, topic: string | null, cuerpo: unknown): Promise<number | null> {
  const { data, error } = await baseLms()
    .from("pases_eventos")
    .insert({ wc_order_id: pedidoId, topic, cuerpo })
    .select("id")
    .limit(1)
    .returns<{ id: number }[]>();

  if (error) {
    console.error("[webhook pases] No se pudo guardar el evento:", error.message);
    return null;
  }
  return data?.[0]?.id ?? null;
}

async function cerrarEvento(eventoId: number | null, error: string | null) {
  if (eventoId === null) return;
  const { error: alCerrar } = await baseLms()
    .from("pases_eventos")
    .update({ procesado_en: new Date().toISOString(), intentos: 1, error })
    .eq("id", eventoId);
  if (alCerrar) console.error("[webhook pases] No se pudo cerrar el evento:", alCerrar.message);
}

/** Vuelve a leer el pedido de la tienda y lo aplica. */
async function procesar(pedidoId: number, eventoId: number | null) {
  try {
    const pedido = await leerPedido(pedidoId);
    if (!pedido) throw new Error("El pedido ya no existe en la tienda.");
    await procesarPedido(pedido, "webhook");
    await cerrarEvento(eventoId, null);
  } catch (error) {
    const mensaje = (error as Error).message;
    console.error(`[webhook pases] Pedido ${pedidoId} (lo recoge la conciliación):`, mensaje);
    await registrar("webhook", "error", { pedidoId, error: mensaje });
    await cerrarEvento(eventoId, mensaje);
  }
}

export async function POST(peticion: Request): Promise<Response> {
  const cuerpo = await peticion.text();

  // El ping de WooCommerce al crear el webhook: `webhook_id=123`, sin firma.
  if (/^webhook_id=\d+$/.test(cuerpo.trim())) return ok();

  // Apagado no se hace nada, y tampoco se le da motivo a la tienda para
  // desactivar el webhook antes de tiempo.
  if (!pasesActivos()) return ok();

  const secreto = process.env.WOO_WEBHOOK_SECRET;
  if (!secreto) {
    console.error("[webhook pases] Falta WOO_WEBHOOK_SECRET: no se procesa nada.");
    return ok();
  }

  if (!firmaValida(cuerpo, peticion.headers.get("x-wc-webhook-signature") ?? "", secreto)) {
    return new Response("Firma no válida", { status: 401 });
  }

  let datos: unknown;
  try {
    datos = JSON.parse(cuerpo);
  } catch {
    return ok();
  }

  const aviso = leerPedidoWoo(datos);
  if (!aviso) return ok();

  const topic = peticion.headers.get("x-wc-webhook-topic");

  if (traeProductoRespaldo(aviso)) {
    const eventoId = await guardarEvento(aviso.id, topic, datos);
    enSegundoPlano("webhook-pases", () => procesar(aviso.id, eventoId));
    return ok();
  }

  enSegundoPlano("webhook-pases", async () => {
    if (!(await paseDelPedido(aviso))) return;
    await procesar(aviso.id, await guardarEvento(aviso.id, topic, datos));
  });

  return ok();
}
