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
  type ModoCambio,
  type Momento,
  type Movilidad,
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

const esFecha = (v: unknown): v is string => typeof v === "string" && FECHA.test(v);
const esHora = (v: unknown): v is string => typeof v === "string" && HORA.test(v);

/** Un código de Gestión: el nuestro si lo conocemos, `GENERICO` si no. */
export function comoCodigo(v: unknown): CodigoAutoservicio {
  return typeof v === "string" && (CODIGOS_AUTOSERVICIO as readonly string[]).includes(v)
    ? (v as CodigoAutoservicio)
    : "GENERICO";
}

/**
 * El id de una sesión, «<dia>_<HH:MM>» («Miércoles_15:00»). Es lo único
 * que el navegador manda para pedir huecos, así que se valida entero.
 */
export function idSesionValido(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 20) return false;
  const [d, h, ...resto] = v.split("_");
  return resto.length === 0 && dia(d) !== null && esHora(h);
}

/**
 * Un cuerpo de error del contrato: `{ ok: false, codigo, mensaje }`.
 *
 * EL CAMBIO A MEDIAS no tiene código propio: llega con el del paso que
 * falló y un `mensaje` que pide no reintentar. Se reconoce por ese
 * mensaje (y por `a_medias: true`, si Gestión lo añade): tratarlo como un
 * error más invitaría a repetir un cambio que ya ha escrito algo.
 */
export function leerError(v: unknown): { codigo: CodigoAutoservicio; mensaje: string | null } {
  const o = obj(v);
  const mensaje = typeof o?.mensaje === "string" && o.mensaje.trim() !== "" ? o.mensaje.trim() : null;
  if (o?.a_medias === true || (mensaje !== null && /no lo intentes de nuevo/i.test(mensaje))) {
    return { codigo: "A_MEDIAS", mensaje };
  }
  return { codigo: comoCodigo(o?.codigo), mensaje };
}

function momento(v: unknown): Momento | null {
  const o = obj(v);
  return o && esFecha(o.fecha) && esHora(o.hora) ? { fecha: o.fecha, hora: o.hora } : null;
}

/** Sin `movible: true` explícito, no se ofrece moverla: que Gestión lo diga. */
function movilidad(o: Record<string, unknown> | null): Movilidad {
  if (o?.movible === true) return { movible: true, motivo: null, disponibleDesde: null };
  return { movible: false, motivo: comoCodigo(o?.motivo_no_movible), disponibleDesde: momento(o?.disponible_desde) };
}

function claseProxima(v: unknown): ClaseProxima | null {
  const o = obj(v);
  const h = duracion(o?.duracion);
  if (!o || !esFecha(o.fecha) || !esHora(o.hora) || !h) return null;
  return { fecha: o.fecha, hora: o.hora, duracion: h, ...movilidad(o) };
}

function sesion(v: unknown): Sesion | null {
  const o = obj(v);
  const d = dia(o?.dia);
  const h = duracion(o?.duracion);
  if (!o || !idSesionValido(o.id) || !d || !esHora(o.hora) || !h) return null;
  const proximasClases = (Array.isArray(o.proximas_clases) ? o.proximas_clases : [])
    .map(claseProxima)
    .filter((x): x is ClaseProxima => x !== null)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  return { id: o.id, dia: d, hora: o.hora, duracion: h, fijo: movilidad(obj(o.fijo)), proximasClases };
}

export function leerEstado(v: unknown): EstadoAutoservicio | null {
  const o = obj(v);
  if (!o || o.ok === false || typeof o.elegible !== "boolean") return null;
  const sesiones = (Array.isArray(o.sesiones) ? o.sesiones : []).map(sesion).filter((x): x is Sesion => x !== null);
  // Elegible sin una sola sesión que leer no es elegible: no hay nada que cambiar.
  const elegible = o.elegible && sesiones.length > 0;
  const profesor = obj(o.profesor)?.nombre;
  return {
    elegible,
    // Un `detalle_no_elegible` desconocido (EN_PAUSA, lo que venga) es
    // el mismo NO_ELEGIBLE: el texto no depende del detalle.
    motivoNoElegible: elegible ? null : comoCodigo(o.motivo_no_elegible),
    profesor: typeof profesor === "string" ? profesor.trim() : "",
    sesiones,
  };
}

/**
 * Un hueco. En puntual tiene que traer su `fecha`; en fijo esa fecha es
 * la primera clase con el horario nuevo y el hueco es semanal.
 */
function hueco(v: unknown, modo: ModoCambio): HuecoLibre | null {
  const o = obj(v);
  const d = dia(o?.dia);
  const h = duracion(o?.duracion);
  if (!o || !d || !esHora(o.hora) || !h) return null;
  if (modo === "puntual") return esFecha(o.fecha) ? { dia: d, hora: o.hora, duracion: h, fecha: o.fecha } : null;
  return { dia: d, hora: o.hora, duracion: h, fecha: null, primeraClase: esFecha(o.fecha) ? o.fecha : null };
}

export function leerHuecos(v: unknown, modo: ModoCambio): HuecoLibre[] | null {
  const o = obj(v);
  if (!o || o.ok === false || !Array.isArray(o.huecos)) return null;
  return o.huecos.map((x) => hueco(x, modo)).filter((x): x is HuecoLibre => x !== null);
}

/**
 * La respuesta del POST, venga como venga: un 200 con `ok`, o un 4xx/5xx
 * con `{ ok: false, codigo, mensaje }`. Sin `ok: true` explícito no se da
 * por hecho: decirle a alguien que su clase se ha movido sin estar
 * seguros es lo peor que puede salir de aquí.
 */
export function leerResultadoCambio(v: unknown): ResultadoCambio {
  const o = obj(v);
  if (o?.ok === true) return { ok: true, fechaNueva: esFecha(o.fecha_nueva) ? o.fecha_nueva : null };
  return { ok: false, ...leerError(o) };
}

/** Un hueco nuestro, de vuelta tal cual llegó de Gestión. */
export function aHuecoGestion(h: HuecoLibre): HuecoGestion | Omit<HuecoGestion, "fecha"> {
  const fecha = h.fecha ?? h.primeraClase ?? null;
  return { dia: h.dia, hora: h.hora, duracion: h.duracion, ...(fecha ? { fecha } : {}) };
}

/** La petición, validada en su forma: lo que no cuadra no sale hacia Gestión. */
export function peticionValida(p: PeticionCambio): boolean {
  const o = p.sesionOrigen;
  return (
    (p.modo === "fijo" || p.modo === "puntual") &&
    dia(o?.dia) !== null && esHora(o?.hora) && duracion(o?.duracion) !== null &&
    (p.modo === "fijo" ? p.fechaOrigen === null : esFecha(p.fechaOrigen)) &&
    (p.destino.fecha === null || esFecha(p.destino.fecha)) &&
    (p.destino.primeraClase == null || esFecha(p.destino.primeraClase)) &&
    hueco(aHuecoGestion(p.destino), p.modo) !== null &&
    p.destino.duracion === o.duracion &&
    /^[A-Za-z0-9-]{8,80}$/.test(p.idempotencyKey)
  );
}
