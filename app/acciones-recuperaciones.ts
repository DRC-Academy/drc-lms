"use server";

// ---------------------------------------------------------------
// LO QUE EL ALUMNO ELIGE EN UNA RECUPERACIÓN, CAMINO DE GESTIÓN
//
// Acciones de servidor para que la llamada a Gestión —y el secreto que
// la acompaña— no pase nunca por el navegador. Del navegador llegan solo
// el id de la recuperación y lo elegido; QUIÉN ES el alumno sale de la
// cookie, aquí, como en todas las rutas que escriben.
//
// SOLO EL PROPIO ALUMNO. El equipo revisando una ficha ve las tarjetas
// sin botones, y si llamara a esto igualmente se le rechaza: elegir en
// nombre del alumno no es algo que el LMS deba poder hacer.
//
// Lo que se devuelve es lo que la tarjeta necesita para pintar: el
// estado nuevo, o el mensaje listo para enseñar y, si los hay, los
// problemas del formulario. El mensaje de Gestión viene en español; en
// inglés se cambia por el del diccionario según el código.
// ---------------------------------------------------------------

import { sesionActual } from "@/lib/sesion-servidor";
import { idiomaActual } from "@/lib/idioma-servidor";
import { elegirFecha, proponerHorarios, type EstadoRecuperacion, type Hueco, type HuecoConHoras, type ResultadoAccion } from "@/lib/recuperaciones";
import { RECUPERACIONES } from "@/lib/textos/recuperaciones";
import { HORAS_PROPUESTA, MAX_NOTA, MAX_PROPUESTAS } from "@/lib/recuperaciones-fechas";

export type RespuestaRecuperacion =
  | { ok: true; estado: EstadoRecuperacion; fecha: HuecoConHoras | null }
  /** `invalido`: un 422, los datos del formulario no valen y el alumno puede corregirlos. */
  | { ok: false; mensaje: string; problemas: string[]; invalido: boolean };

function traducir(r: ResultadoAccion): RespuestaRecuperacion {
  if (r.ok) return { ok: true, estado: r.estado, fecha: r.fecha ?? null };
  const invalido = r.status === 422;
  const idioma = idiomaActual();
  const reserva = RECUPERACIONES[idioma].errorDe(r.status >= 500 || r.status === 401 ? "" : r.error);
  // Un 401 o un 503 es cosa nuestra, no del alumno: el texto de Gestión
  // ("falta el secreto") no le dice nada que pueda usar.
  const deGestion = idioma === "es" && r.status < 500 && r.status !== 401 ? r.mensaje : null;
  return { ok: false, mensaje: deGestion ?? reserva, problemas: r.problemas, invalido };
}

async function alumnoDeLaSesion(): Promise<string | null> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno" || !sesion.alumnoId) return null;
  return sesion.alumnoId;
}

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function rechazo(): RespuestaRecuperacion {
  return { ok: false, mensaje: RECUPERACIONES[idiomaActual()].errorDe(""), problemas: [], invalido: false };
}

/** «Elegir» una de las fechas propuestas por el profesor. */
export async function elegirRecuperacion(id: unknown, indice: unknown): Promise<RespuestaRecuperacion> {
  const alumnoId = await alumnoDeLaSesion();
  if (!alumnoId || typeof id !== "string" || !ID.test(id) || typeof indice !== "number" || !Number.isInteger(indice) || indice < 0) {
    return rechazo();
  }
  return traducir(await elegirFecha(alumnoId, id, indice));
}

/**
 * «Ninguna me viene bien». Se filtra la forma de lo que llega —que sean
 * fechas y horas de verdad, como mucho tres, la nota recortada—; las
 * reglas de fondo (que estén en los próximos 7 días, que no se repitan,
 * que el estado lo admita) son de Gestión, que contesta un 422 con la
 * lista de problemas si algo no cuadra.
 */
export async function proponerRecuperacion(id: unknown, horarios: unknown, nota: unknown): Promise<RespuestaRecuperacion> {
  const alumnoId = await alumnoDeLaSesion();
  if (!alumnoId || typeof id !== "string" || !ID.test(id) || !Array.isArray(horarios)) return rechazo();

  const limpios: Hueco[] = [];
  for (const h of horarios.slice(0, MAX_PROPUESTAS)) {
    const o = typeof h === "object" && h !== null ? (h as Record<string, unknown>) : {};
    if (typeof o.fecha !== "string" || !FECHA.test(o.fecha) || typeof o.hora !== "string" || !HORAS_PROPUESTA.includes(o.hora)) {
      return rechazo();
    }
    limpios.push({ fecha: o.fecha, hora: o.hora });
  }
  if (limpios.length === 0) {
    return { ok: false, mensaje: RECUPERACIONES[idiomaActual()].faltaHorario, problemas: [], invalido: true };
  }

  const textoNota = typeof nota === "string" ? nota.trim().slice(0, MAX_NOTA) : "";
  return traducir(await proponerHorarios(alumnoId, id, limpios, textoNota === "" ? null : textoNota));
}
