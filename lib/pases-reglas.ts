// ---------------------------------------------------------------
// LOS PEDIDOS DEL BLACK PASS: LAS REGLAS
//
// Puras: sin red ni base. Las usan el webhook, la conciliación, la entrada
// y el panel, que no pueden discrepar. Lo que hace cada una lo ejecuta
// `lib/pases-pedidos.ts`.
// ---------------------------------------------------------------

import { createHmac, timingSafeEqual } from "node:crypto";

/** La firma del webhook: HMAC-SHA256 del cuerpo, en base64. */
export function firmaValida(cuerpo: string, firma: string, secreto: string): boolean {
  const esperada = Buffer.from(createHmac("sha256", secreto).update(cuerpo, "utf8").digest("base64"));
  const recibida = Buffer.from(firma);
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}

/** Si el metadato falta o se borra, este producto sigue siendo un pase. */
export const PRODUCTO_RESPALDO = 36964;

const MESES_POR_DEFECTO = 12;

export type LineaPedido = { productoId: number };

export type PedidoWoo = {
  id: number;
  estado: string;
  email: string;
  nombre: string;
  /** 0 = sin cuenta. */
  usuarioId: number;
  /** En UTC. Null si Woo no la tiene. */
  pagadoEn: string | null;
  creadoEn: string | null;
  modificadoEn: string | null;
  lineas: LineaPedido[];
  reembolsos: number;
};

type Crudo = Record<string, unknown>;

const texto = (valor: unknown): string => (typeof valor === "string" ? valor.trim() : "");

/** Woo da las fechas `_gmt` sin zona: `2026-11-06T01:10:07`. */
function fechaGmt(valor: unknown): string | null {
  const limpio = texto(valor);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(limpio)) return null;
  const conZona = /(Z|[+-]\d{2}:?\d{2})$/.test(limpio) ? limpio : `${limpio}Z`;
  return Number.isNaN(Date.parse(conZona)) ? null : conZona;
}

/** Un pedido de la API v3, con lo que hace falta. Null si no se entiende. */
export function leerPedidoWoo(crudo: unknown): PedidoWoo | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const p = crudo as Crudo;

  const id = Number(p.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const facturacion = (typeof p.billing === "object" && p.billing !== null ? p.billing : {}) as Crudo;
  const lineas = Array.isArray(p.line_items) ? (p.line_items as (Crudo | null)[]) : [];

  return {
    id,
    estado: texto(p.status),
    email: texto(facturacion.email).toLowerCase(),
    nombre: `${texto(facturacion.first_name)} ${texto(facturacion.last_name)}`.trim(),
    usuarioId: Math.max(0, Number(p.customer_id) || 0),
    pagadoEn: fechaGmt(p.date_paid_gmt),
    creadoEn: fechaGmt(p.date_created_gmt),
    modificadoEn: fechaGmt(p.date_modified_gmt),
    lineas: lineas.map((l) => ({ productoId: Number(l?.product_id) || 0 })).filter((l) => l.productoId > 0),
    reembolsos: Array.isArray(p.refunds) ? p.refunds.length : 0,
  };
}

export type MetaProducto = { clave: string; valor: unknown }[];

/** Lo que `meta_data` de un producto dice de él. */
export function leerMetaProducto(crudo: unknown): MetaProducto {
  if (typeof crudo !== "object" || crudo === null) return [];
  const meta = (crudo as Crudo).meta_data;
  if (!Array.isArray(meta)) return [];
  return meta
    .filter((m): m is Crudo => typeof m === "object" && m !== null)
    .map((m) => ({ clave: texto(m.key), valor: m.value }));
}

export type ProductoPase = { productoId: number; meses: number; esPrueba: boolean };

/**
 * ¿Este producto es un pase? Por el metadato `_drc_tipo_acceso = black_pass`,
 * con el ID de respaldo. El clon de prueba lleva además `_drc_prueba = 1`.
 *
 * Si el metadato dice que es de OTRO tipo, manda el metadato, también en el
 * producto de respaldo: es lo que permitiría sacarlo sin desplegar.
 */
export function productoEsPase(productoId: number, meta: MetaProducto): ProductoPase | null {
  const valor = (clave: string) => texto(meta.find((m) => m.clave === clave)?.valor);

  const tipo = valor("_drc_tipo_acceso").toLowerCase();
  if (tipo !== "black_pass" && (tipo !== "" || productoId !== PRODUCTO_RESPALDO)) return null;

  const meses = Number.parseInt(valor("_drc_duracion_meses"), 10);
  return {
    productoId,
    meses: Number.isInteger(meses) && meses > 0 ? meses : MESES_POR_DEFECTO,
    esPrueba: ["1", "yes", "true"].includes(valor("_drc_prueba").toLowerCase()),
  };
}

export type Decision =
  | "conceder"
  | "revocar"
  /** Concedido y ahora en espera: posible disputa. Alerta, no se quita. */
  | "alerta_espera"
  /** Llevado a la papelera. Alerta, no se quita. */
  | "alerta_papelera"
  | "nada";

/**
 * Qué hacer con el estado de un pedido.
 *
 * `reembolsado` llega con el reembolso TOTAL. El parcial deja el pedido en
 * su estado: sigue dando acceso y solo se anota (`esReembolsoParcial`).
 */
export function decidirPedido(estado: string, tienePaseActivo: boolean): Decision {
  switch (estado) {
    case "processing":
    case "completed":
      return "conceder";
    case "refunded":
    case "cancelled":
      return "revocar";
    case "on-hold":
      return tienePaseActivo ? "alerta_espera" : "nada";
    case "trash":
      return tienePaseActivo ? "alerta_papelera" : "nada";
    default:
      return "nada";
  }
}

export function esReembolsoParcial(pedido: Pick<PedidoWoo, "estado" | "reembolsos">): boolean {
  return pedido.reembolsos > 0 && (pedido.estado === "processing" || pedido.estado === "completed");
}
