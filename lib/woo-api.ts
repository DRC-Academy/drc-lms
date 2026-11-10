// ---------------------------------------------------------------
// LA API DE WOOCOMMERCE, SOLO PARA LEER
//
// Lo único que el LMS le pregunta a la tienda: pedidos y productos, para el
// Black Pass. Con una clave de SOLO LECTURA: `WOOCOMMERCE_URL`,
// `WOOCOMMERCE_CONSUMER_KEY` y `WOOCOMMERCE_CONSUMER_SECRET`.
//
// Nunca se confía en lo que trae el webhook para conceder o quitar: se
// vuelve a pedir el pedido aquí, que es la fuente fiable.
//
// LA URL NO SE ESCRIBE EN NINGÚN LOG: lleva la clave.
// ---------------------------------------------------------------

import "server-only";
import {
  leerMetaProducto,
  leerPedidoWoo,
  productoEsPase,
  PRODUCTO_RESPALDO,
  type PedidoWoo,
  type ProductoPase,
} from "@/lib/pases-reglas";

const MS_LECTURA = 15_000;
const POR_PAGINA = 100;

export class FalloWoo extends Error {}

function credenciales() {
  const base = process.env.WOOCOMMERCE_URL?.trim().replace(/\/+$/, "");
  const clave = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim();
  const secreto = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim();
  if (!base || !clave || !secreto) throw new FalloWoo("Faltan las credenciales de WooCommerce.");
  return { base, clave, secreto };
}

async function wooGet(ruta: string, parametros: Record<string, string | number | boolean> = {}): Promise<unknown> {
  const { base, clave, secreto } = credenciales();
  const consulta = new URLSearchParams(Object.entries(parametros).map(([k, v]) => [k, String(v)]));
  consulta.set("consumer_key", clave);
  consulta.set("consumer_secret", secreto);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/wp-json/wc/v3/${ruta}?${consulta}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(MS_LECTURA),
    });
  } catch (error) {
    throw new FalloWoo(`Sin respuesta de WooCommerce en ${ruta}: ${(error as Error).name}`);
  }

  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new FalloWoo(`WooCommerce respondió ${respuesta.status} en ${ruta}`);
  return respuesta.json();
}

/** Un pedido, leído en este momento. Null si ya no existe. */
export async function leerPedido(id: number): Promise<PedidoWoo | null> {
  return leerPedidoWoo(await wooGet(`orders/${id}`));
}

/**
 * Una página de los pedidos modificados desde `desde`, de más viejo a más
 * nuevo. Sin filtrar por producto: la detección va por metadato, que la API
 * no sabe filtrar, y en esta tienda son unos pocos pedidos al día. Con la
 * papelera, que `any` no incluye.
 */
export async function pedidosModificados(desde: Date, pagina: number): Promise<PedidoWoo[]> {
  const filas = await wooGet("orders", {
    modified_after: desde.toISOString().slice(0, 19),
    dates_are_gmt: true,
    orderby: "modified",
    order: "asc",
    status: "any,trash",
    per_page: POR_PAGINA,
    page: pagina,
  });
  return (Array.isArray(filas) ? filas : []).map(leerPedidoWoo).filter((p): p is PedidoWoo => p !== null);
}

export const PEDIDOS_POR_PAGINA = POR_PAGINA;

/** Los pedidos pagados de un usuario de WordPress: los de la carrera tras pagar. */
export async function pedidosPagadosDeUsuario(usuarioId: number): Promise<PedidoWoo[]> {
  const filas = await wooGet("orders", {
    customer: usuarioId,
    status: "processing,completed",
    orderby: "date",
    order: "desc",
    per_page: 20,
  });
  return (Array.isArray(filas) ? filas : []).map(leerPedidoWoo).filter((p): p is PedidoWoo => p !== null);
}

/**
 * Lo que un producto es, con memo de 10 minutos por instancia: cada pedido de
 * la tienda pasa por aquí y los productos casi nunca cambian. Lo que no se
 * pudo leer no se guarda: la siguiente vuelta lo intenta otra vez.
 */
const MS_MEMO = 10 * 60 * 1000;
const memo = new Map<number, { valor: ProductoPase | null; en: number }>();

export async function productoDePase(productoId: number): Promise<ProductoPase | null> {
  const guardado = memo.get(productoId);
  if (guardado && Date.now() - guardado.en < MS_MEMO) return guardado.valor;

  const crudo = await wooGet(`products/${productoId}`);
  const valor = productoEsPase(productoId, leerMetaProducto(crudo));
  memo.set(productoId, { valor, en: Date.now() });
  return valor;
}

/** La primera línea del pedido que sea un pase, o null. */
export async function paseDelPedido(pedido: Pick<PedidoWoo, "lineas">): Promise<ProductoPase | null> {
  for (const linea of pedido.lineas) {
    const pase = await productoDePase(linea.productoId);
    if (pase) return pase;
  }
  return null;
}

/** ¿Trae el producto de respaldo? Se sabe sin preguntar a nadie. */
export function traeProductoRespaldo(pedido: Pick<PedidoWoo, "lineas">): boolean {
  return pedido.lineas.some((linea) => linea.productoId === PRODUCTO_RESPALDO);
}

/**
 * El estado del webhook del LMS en la tienda. WooCommerce lo desactiva solo
 * tras varios fallos y no avisa a nadie: esto es lo que lo enseña en el panel.
 * Null si no se pudo leer (la clave de solo lectura puede no alcanzar).
 */
export async function estadoDelWebhook(): Promise<string | null> {
  try {
    const filas = await wooGet("webhooks", { status: "all", per_page: 100 });
    if (!Array.isArray(filas)) return null;
    const suyo = (filas as { status?: string; delivery_url?: string }[]).find((w) =>
      w.delivery_url?.includes("/api/woo/pedidos")
    );
    return suyo?.status ?? "no_encontrado";
  } catch {
    return null;
  }
}
