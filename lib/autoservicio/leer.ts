// ---------------------------------------------------------------
// DE LO QUE MANDA GESTIÓN A LO QUE PINTAN LAS PANTALLAS
//
// Se comprueba cada campo en vez de fiarse del tipo, igual que en las
// recuperaciones: una sesión o un hueco torcidos se descartan y el resto
// se sigue enseñando. Lo que no se puede leer en absoluto —un estado sin
// `elegible`— cuenta como `GENERICO`.
//
// Puro y sin `server-only`, para poder probarlo.
// ---------------------------------------------------------------

import { DIAS, type DiaSemana } from "@/lib/clases";
import {
  CODIGOS_AUTOSERVICIO,
  type ClaseProxima,
  type CodigoAutoservicio,
  type EstadoAutoservicio,
  type HuecoGestion,
  type HuecoLibre,
  type PeticionCambio,
  type ResultadoCambio,
  type Sesion,
} from "@/lib/autoservicio/tipos";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

function obj(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function dia(v: unknown): DiaSemana | null {
  return typeof v === "string" && (DIAS as readonly string[]).includes(v) ? (v as DiaSemana) : null;
}

function duracion(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 4 ? v : null;
}

/** Un código de Gestión: el nuestro si lo conocemos, `GENERICO` si no. */
export function comoCodigo(v: unknown): CodigoAutoservicio {
  return typeof v === "string" && (CODIGOS_AUTOSERVICIO as readonly string[]).includes(v)
    ? (v as CodigoAutoservicio)
    : "GENERICO";
}

function sesion(v: unknown): Sesion | null {
  const o = obj(v);
  const d = dia(o?.dia);
  const h = duracion(o?.duracion);
  if (!o || typeof o.id !== "string" || o.id === "" || !d || typeof o.hora !== "string" || !HORA.test(o.hora) || !h) return null;
  return { id: o.id, dia: d, hora: o.hora, duracion: h };
}

function claseProxima(v: unknown): ClaseProxima | null {
  const o = obj(v);
  const h = duracion(o?.duracion);
  if (
    !o ||
    typeof o.fecha !== "string" || !FECHA.test(o.fecha) ||
    typeof o.hora !== "string" || !HORA.test(o.hora) ||
    !h ||
    typeof o.sesion_id !== "string" || o.sesion_id === ""
  ) {
    return null;
  }
  // Sin `movible` explícito, no se ofrece moverla: que Gestión lo diga.
  const movible = o.movible === true;
  return {
    fecha: o.fecha,
    hora: o.hora,
    duracion: h,
    sesionId: o.sesion_id,
    movible,
    motivoNoMovible: movible ? null : comoCodigo(o.motivo_no_movible),
  };
}

export function leerEstado(v: unknown): EstadoAutoservicio | null {
  const o = obj(v);
  if (!o || typeof o.elegible !== "boolean") return null;
  const sesiones = (Array.isArray(o.sesiones) ? o.sesiones : []).map(sesion).filter((x): x is Sesion => x !== null);
  const proximasClases = (Array.isArray(o.proximas_clases) ? o.proximas_clases : [])
    .map(claseProxima)
    .filter((x): x is ClaseProxima => x !== null)
    // Solo las de una sesión que conocemos: una clase que no cuelga de
    // ninguna no tendría a qué volver al elegir.
    .filter((c) => sesiones.some((s) => s.id === c.sesionId))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  // Elegible sin una sola sesión que leer no es elegible: no hay nada que cambiar.
  const elegible = o.elegible && sesiones.length > 0;
  return {
    elegible,
    motivoNoElegible: elegible ? null : comoCodigo(o.motivo_no_elegible),
    profesor: typeof o.profesor === "string" ? o.profesor.trim() : "",
    sesiones,
    proximasClases,
  };
}

function hueco(v: unknown): HuecoLibre | null {
  const o = obj(v);
  const d = dia(o?.dia);
  const h = duracion(o?.duracion);
  if (!o || !d || typeof o.hora !== "string" || !HORA.test(o.hora) || !h) return null;
  const fecha = typeof o.fecha === "string" && FECHA.test(o.fecha) ? o.fecha : null;
  return { dia: d, hora: o.hora, duracion: h, fecha };
}

export function leerHuecos(v: unknown): HuecoLibre[] | null {
  const lista = obj(v)?.huecos;
  if (!Array.isArray(lista)) return null;
  return lista.map(hueco).filter((x): x is HuecoLibre => x !== null);
}

/**
 * La respuesta del POST, venga como venga: un 200 con `ok`, o un 4xx con
 * `{ ok: false, codigo, mensaje }`. Sin `ok: true` explícito no se da
 * por hecho: decirle a alguien que su clase se ha movido sin estar
 * seguros es lo peor que puede salir de aquí.
 */
export function leerResultadoCambio(v: unknown): ResultadoCambio {
  const o = obj(v);
  if (o?.ok === true) return { ok: true };
  return {
    ok: false,
    codigo: comoCodigo(o?.codigo),
    mensaje: typeof o?.mensaje === "string" && o.mensaje.trim() !== "" ? o.mensaje.trim() : null,
  };
}

/** Un hueco nuestro, de vuelta en la forma del contrato. */
export function aHuecoGestion(h: HuecoLibre): HuecoGestion {
  return { dia: h.dia, hora: h.hora, duracion: h.duracion, ...(h.fecha ? { fecha: h.fecha } : {}) };
}

/** La petición, validada en su forma: lo que no cuadra no sale hacia Gestión. */
export function peticionValida(p: PeticionCambio): boolean {
  return (
    (p.modo === "fijo" || p.modo === "puntual") &&
    /^[A-Za-z0-9_-]{1,80}$/.test(p.sesionOrigen) &&
    (p.modo === "fijo" ? p.fechaOrigen === null : typeof p.fechaOrigen === "string" && FECHA.test(p.fechaOrigen)) &&
    hueco(aHuecoGestion(p.destino)) !== null &&
    (p.modo === "fijo" || p.destino.fecha !== null) &&
    /^[A-Za-z0-9-]{8,80}$/.test(p.idempotencyKey)
  );
}
