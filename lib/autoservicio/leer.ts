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
  type CambioProfesorPosible,
  type ClaseProxima,
  type CodigoAutoservicio,
  type EstadoAutoservicio,
  type HuecoGestion,
  type HuecoLibre,
  type HuecoProfesor,
  type HuecosDeProfesor,
  type ListaProfesores,
  type ModoCambio,
  type Momento,
  type Movilidad,
  type PeticionCambio,
  type PeticionCambioProfesor,
  type ResultadoCambio,
  type ResultadoCambioProfesor,
  type Sesion,
  type SesionOrigen,
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
 * falló y `a_medias: true` (contrato v2; Gestión lo manda desde 2cf4ad9).
 * Se reconoce también por su `mensaje`, que pide no reintentar, por si
 * llegara de una Gestión anterior: tratarlo como un error más invitaría
 * a repetir un cambio que ya ha escrito algo.
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

/**
 * `puede_cambiar_profesor` (v2). Ausente —Gestión en v1— es null: no se
 * ofrece. Sin `puede: true` explícito, no puede, con el motivo que diga.
 */
function cambioProfesor(v: unknown): CambioProfesorPosible | null {
  const o = obj(v);
  if (!o || typeof o.puede !== "boolean") return null;
  if (o.puede) return { puede: true, motivo: null, disponibleDesde: null };
  return { puede: false, motivo: comoCodigo(o.motivo), disponibleDesde: momento(o.disponible_desde) };
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
    cambioProfesor: cambioProfesor(o.puede_cambiar_profesor),
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

// ---------------------------------------------------------------
// v2: EL CAMBIO DE PROFESOR
// ---------------------------------------------------------------

const ID_PROFESOR = /^[A-Za-z0-9_-]{1,64}$/;

/** El id de un profesor tal como lo manda el navegador: se valida entero. */
export function idProfesorValido(v: unknown): v is string {
  return typeof v === "string" && ID_PROFESOR.test(v);
}

/** Una sesión sin id: lo que se mueve y a dónde. */
function sesionOrigen(v: unknown): SesionOrigen | null {
  const o = obj(v);
  const d = dia(o?.dia);
  const h = duracion(o?.duracion);
  return o && d && esHora(o.hora) && h ? { dia: d, hora: o.hora, duracion: h } : null;
}

function huecoProfesor(v: unknown): HuecoProfesor | null {
  const o = obj(v);
  const p = obj(o?.profesor);
  const base = sesionOrigen(o);
  if (!o || !p || !base || !idProfesorValido(p.id) || typeof p.nombre !== "string" || p.nombre.trim() === "") return null;
  return {
    ...base,
    fecha: null,
    primeraClase: esFecha(o.fecha_primera_clase) ? o.fecha_primera_clase : null,
    profesor: { id: p.id, nombre: p.nombre.trim() },
  };
}

const huecosProfesor = (v: unknown): HuecoProfesor[] =>
  (Array.isArray(v) ? v : []).map(huecoProfesor).filter((x): x is HuecoProfesor => x !== null);

/**
 * La lista de todos los profesores (`tipo: "lista"`). LOS HUECOS SALEN EN
 * EL ORDEN DE GESTIÓN: aleatorio y estable durante el día, con los de
 * cada profesor juntos. Aquí no se reordena nada.
 */
export function leerListaProfesores(v: unknown): ListaProfesores | null {
  const o = obj(v);
  if (!o || o.ok === false || !Array.isArray(o.sesiones) || !Array.isArray(o.huecos)) return null;
  const sesiones = o.sesiones.map(sesionOrigen).filter((x): x is SesionOrigen => x !== null);
  // Una sesión torcida no se puede dejar fuera: el cambio tiene que darles
  // destino a todas.
  if (sesiones.length === 0 || sesiones.length !== o.sesiones.length) return null;
  return { sesiones, huecos: huecosProfesor(o.huecos) };
}

/** Los huecos de un profesor para cada sesión (`tipo: "profesor"`), por `indice`. */
export function leerHuecosDeProfesor(v: unknown): HuecosDeProfesor | null {
  const o = obj(v);
  const p = obj(o?.profesor);
  if (!o || o.ok === false || !p || !idProfesorValido(p.id) || typeof p.nombre !== "string" || !Array.isArray(o.sesiones)) return null;
  const sesiones: { indice: number; sesion: SesionOrigen; huecos: HuecoProfesor[] }[] = [];
  for (const crudo of o.sesiones) {
    const c = obj(crudo);
    const s = sesionOrigen(c);
    if (!c || !s || typeof c.indice !== "number") return null;
    sesiones.push({ indice: c.indice, sesion: s, huecos: huecosProfesor(c.huecos) });
  }
  if (sesiones.length === 0) return null;
  sesiones.sort((a, b) => a.indice - b.indice);
  return {
    profesor: { id: p.id, nombre: p.nombre.trim() },
    sesiones: sesiones.map(({ sesion: s, huecos }) => ({ sesion: s, huecos })),
  };
}

/**
 * La respuesta del POST de cambiar de profesor. Como en el de horario,
 * solo un `ok: true` explícito es un cambio hecho. Un error trae su
 * código, y con ANTELACION_INSUFICIENTE, desde cuándo podrá.
 */
export function leerResultadoCambioProfesor(v: unknown): ResultadoCambioProfesor {
  const o = obj(v);
  if (o?.ok === true) {
    const nuevo = obj(o.profesor_nuevo)?.nombre;
    const despues = (Array.isArray(o.sesiones_despues) ? o.sesiones_despues : [])
      .map(sesionOrigen)
      .filter((x): x is SesionOrigen => x !== null);
    return { ok: true, profesorNuevo: typeof nuevo === "string" ? nuevo.trim() : "", sesionesDespues: despues };
  }
  return { ok: false, ...leerError(o), disponibleDesde: momento(o?.disponible_desde) };
}

/** La petición de cambio de profesor, validada en su forma antes de salir hacia Gestión. */
export function peticionProfesorValida(p: PeticionCambioProfesor, sesiones: number | null = null): boolean {
  return (
    idProfesorValido(p.profesorId) &&
    Array.isArray(p.destinos) &&
    p.destinos.length > 0 &&
    p.destinos.length <= 7 &&
    (sesiones === null || p.destinos.length === sesiones) &&
    p.destinos.every((d) => sesionOrigen(d) !== null) &&
    /^[A-Za-z0-9-]{8,80}$/.test(p.idempotencyKey)
  );
}
