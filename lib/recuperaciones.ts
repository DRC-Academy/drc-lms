// ---------------------------------------------------------------
// LAS RECUPERACIONES DE CLASES CANCELADAS, PREGUNTADAS A GESTIÓN
//
// Cuando el profesor pulsa «No puedo dar esta clase» en DRC Gestión, allí
// nace una recuperación: fechas propuestas, lo que elige el alumno, la
// clase nueva en el calendario. TODA ESA LÓGICA VIVE EN GESTIÓN. El LMS
// solo enseña lo que Gestión le devuelve y le dice lo que ha elegido el
// alumno, por la API que Gestión publica para eso
// (`docs/recuperaciones-contrato.md` de academy-scheduler).
//
// NO SE LEE LA BASE, aunque sea la misma. `class_recoveries`,
// `teacher_calendars` y `class_records` son de Gestión: si el LMS leyera
// o escribiera ahí por su cuenta, las reglas —qué está vencido, qué
// hueco sigue libre, a quién se avisa— acabarían escritas dos veces.
//
// DE SERVIDOR A SERVIDOR, con el secreto compartido en `x-lms-secret`
// (`LMS_GESTION_SECRET`). Es OTRO secreto que el de la dirección
// contraria —`SECRETO_GESTION`, con el que Gestión llama al LMS—: cada
// sentido tiene el suyo. Este módulo es server-only, así que el secreto
// no puede acabar en el bundle del navegador.
//
// EL ALUMNO SALE SIEMPRE DE LA SESIÓN. Las funciones de aquí reciben el
// `alumnoId` y no saben de dónde viene: quien llama lo saca de la cookie
// (`alumnoDeLaPagina` en las páginas, `sesionActual` en las acciones).
// Gestión, además, comprueba que cada recuperación sea de ese alumno.
//
// LA DEMO NO PREGUNTA. Diego Ruiz no existe en Gestión: sale sin
// recuperaciones, sin llamada.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { esIdDemo } from "@/lib/demo/cuenta";

export const ESTADOS = [
  "esperando_alumno",
  "alumno_propuso",
  "confirmada",
  "recuperada",
  "sin_acuerdo",
  "anulada",
] as const;
export type EstadoRecuperacion = (typeof ESTADOS)[number];

/** Una fecha y hora de España: "2026-10-12" y "17:00". */
export type Hueco = { fecha: string; hora: string };
export type HuecoConHoras = Hueco & { horas: number };
export type Opcion = HuecoConHoras & { indice: number };

export type Recuperacion = {
  id: string;
  estado: EstadoRecuperacion;
  profesor: string;
  claseCancelada: HuecoConHoras;
  parte: { numero: number; de: number };
  ronda: number;
  opciones: Opcion[];
  misPropuestas: Hueco[];
  miNota: string | null;
  fechaConfirmada: HuecoConHoras | null;
  puedeElegir: boolean;
  puedeDecirNinguna: boolean;
};

/** El tope de espera. Gestión responde en décimas; esto es para cuando no. */
const MS_ESPERA = 8000;

/** Gestión sin configurar en este entorno: no se llama y no se avisa en cada petición. */
function configuracion(): { base: string; secreto: string } | null {
  const base = process.env.GESTION_URL?.trim().replace(/\/+$/, "");
  const secreto = process.env.LMS_GESTION_SECRET?.trim();
  if (!base || !secreto) return null;
  return { base, secreto };
}

/** Lo que devuelve una llamada: el cuerpo, o por qué no lo hay. */
type Respuesta =
  | { ok: true; cuerpo: unknown }
  | { ok: false; status: number; error: string; mensaje: string | null; problemas: string[] };

/**
 * Una llamada a la API de Gestión. Nunca lanza: si no hay variables, si
 * no contesta a tiempo o si contesta algo que no es JSON, sale como un
 * 503 más —para el alumno es lo mismo: ahora no se puede—.
 */
async function llamar(ruta: string, init: { method: "GET" | "POST"; cuerpo?: unknown }): Promise<Respuesta> {
  const config = configuracion();
  if (!config) {
    console.error("[recuperaciones] Faltan GESTION_URL o LMS_GESTION_SECRET: no se consulta Gestión.");
    return { ok: false, status: 503, error: "no_configurado", mensaje: null, problemas: [] };
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.base}${ruta}`, {
      method: init.method,
      headers: {
        "x-lms-secret": config.secreto,
        accept: "application/json",
        ...(init.cuerpo !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.cuerpo !== undefined ? JSON.stringify(init.cuerpo) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(MS_ESPERA),
    });
  } catch (error) {
    console.error(`[recuperaciones] Gestión no responde (${init.method} ${ruta.split("?")[0]}):`, error);
    return { ok: false, status: 503, error: "sin_respuesta", mensaje: null, problemas: [] };
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    // Sin cuerpo JSON: una página de error de Vercel, o nada.
  }

  if (respuesta.ok) return { ok: true, cuerpo };

  const c = (typeof cuerpo === "object" && cuerpo !== null ? cuerpo : {}) as Record<string, unknown>;
  const error = typeof c.error === "string" ? c.error : "desconocido";
  if (respuesta.status === 401 || respuesta.status >= 500) {
    // El 401 es un secreto que no cuadra entre los dos proyectos: el
    // alumno no puede hacer nada, quien tiene que enterarse es el log.
    console.error(`[recuperaciones] Gestión respondió ${respuesta.status} (${error}) a ${init.method} ${ruta.split("?")[0]}.`);
  }
  return {
    ok: false,
    status: respuesta.status,
    error,
    mensaje: typeof c.mensaje === "string" && c.mensaje.trim() !== "" ? c.mensaje : null,
    problemas: Array.isArray(c.problemas) ? c.problemas.filter((p): p is string => typeof p === "string") : [],
  };
}

// ---------------------------------------------------------------
// LEER LO QUE LLEGA
//
// Se comprueba cada campo en vez de fiarse del tipo: si Gestión cambia
// algo, una recuperación torcida se descarta y las demás se siguen
// enseñando, en vez de tumbar la pantalla de Mis clases entera.
// ---------------------------------------------------------------

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

function obj(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function hueco(v: unknown): Hueco | null {
  const o = obj(v);
  if (!o || typeof o.fecha !== "string" || !FECHA.test(o.fecha) || typeof o.hora !== "string" || !HORA.test(o.hora)) return null;
  return { fecha: o.fecha, hora: o.hora };
}

function conHoras(v: unknown): HuecoConHoras | null {
  const h = hueco(v);
  if (!h) return null;
  const horas = obj(v)?.horas;
  return { ...h, horas: typeof horas === "number" && horas > 0 ? horas : 1 };
}

function esEstado(v: unknown): v is EstadoRecuperacion {
  return typeof v === "string" && (ESTADOS as readonly string[]).includes(v);
}

export function leerRecuperacion(v: unknown): Recuperacion | null {
  const o = obj(v);
  if (!o || typeof o.id !== "string" || o.id === "" || !esEstado(o.estado)) return null;
  const claseCancelada = conHoras(o.clase_cancelada);
  if (!claseCancelada) return null;

  const parte = obj(o.parte);
  const numero = typeof parte?.numero === "number" ? parte.numero : 1;
  const de = typeof parte?.de === "number" ? parte.de : 1;

  const opciones = (Array.isArray(o.opciones) ? o.opciones : [])
    .map((x) => {
      const h = conHoras(x);
      const indice = obj(x)?.indice;
      return h && typeof indice === "number" ? { ...h, indice } : null;
    })
    .filter((x): x is Opcion => x !== null);

  return {
    id: o.id,
    estado: o.estado,
    profesor: typeof o.profesor === "string" && o.profesor.trim() !== "" ? o.profesor.trim() : "",
    claseCancelada,
    parte: { numero, de },
    ronda: typeof o.ronda === "number" ? o.ronda : 1,
    opciones,
    misPropuestas: (Array.isArray(o.mis_propuestas) ? o.mis_propuestas : []).map(hueco).filter((x): x is Hueco => x !== null),
    miNota: typeof o.mi_nota === "string" && o.mi_nota.trim() !== "" ? o.mi_nota : null,
    fechaConfirmada: conHoras(o.fecha_confirmada),
    puedeElegir: o.puede_elegir === true,
    puedeDecirNinguna: o.puede_decir_ninguna === true,
  };
}

// ---------------------------------------------------------------
// 1. LISTAR
// ---------------------------------------------------------------

export type Lista = { ok: true; recuperaciones: Recuperacion[] } | { ok: false };

/**
 * Las recuperaciones del alumno: las activas y las que cambiaron en los
 * últimos 30 días. `{ ok: false }` si Gestión no está o no contesta: la
 * pantalla lo dice en su hueco y sigue con lo demás.
 *
 * En `cache()`: si en la misma petición lo piden dos piezas, una sola
 * llamada a Gestión.
 */
export const listarRecuperaciones = cache(async (alumnoId: string): Promise<Lista> => {
  if (alumnoId === "" || esIdDemo(alumnoId)) return { ok: true, recuperaciones: [] };

  const r = await llamar(`/api/lms/recuperaciones?alumno_id=${encodeURIComponent(alumnoId)}`, { method: "GET" });
  if (!r.ok) {
    // Un 404 del listado es un alumno que Gestión no conoce: no tiene
    // recuperaciones, no es un fallo que haya que enseñar.
    return r.status === 404 ? { ok: true, recuperaciones: [] } : { ok: false };
  }

  const lista = obj(r.cuerpo)?.recuperaciones;
  if (!Array.isArray(lista)) {
    console.error("[recuperaciones] Gestión devolvió un listado sin `recuperaciones`.");
    return { ok: false };
  }
  return { ok: true, recuperaciones: lista.map(leerRecuperacion).filter((x): x is Recuperacion => x !== null) };
});

// ---------------------------------------------------------------
// 2 Y 3. ELEGIR Y PROPONER
// ---------------------------------------------------------------

/** Lo que se le cuenta al navegador tras una acción. Sin nada interno. */
export type ResultadoAccion =
  | { ok: true; estado: EstadoRecuperacion; fecha?: HuecoConHoras }
  | { ok: false; status: number; error: string; mensaje: string | null; problemas: string[] };

/** «Elegir» una de las fechas que propuso el profesor. */
export async function elegirFecha(alumnoId: string, id: string, indice: number): Promise<ResultadoAccion> {
  const r = await llamar(`/api/lms/recuperaciones/${encodeURIComponent(id)}/elegir`, {
    method: "POST",
    cuerpo: { alumno_id: alumnoId, indice },
  });
  if (!r.ok) return r;
  const c = obj(r.cuerpo);
  const estado = esEstado(c?.estado) ? c.estado : "confirmada";
  return { ok: true, estado, fecha: conHoras(c) ?? undefined };
}

/** «Ninguna me viene bien»: de 1 a 3 huecos y una nota opcional. */
export async function proponerHorarios(
  alumnoId: string,
  id: string,
  horarios: Hueco[],
  nota: string | null
): Promise<ResultadoAccion> {
  const r = await llamar(`/api/lms/recuperaciones/${encodeURIComponent(id)}/ninguna`, {
    method: "POST",
    cuerpo: { alumno_id: alumnoId, horarios, ...(nota ? { nota } : {}) },
  });
  if (!r.ok) return r;
  const c = obj(r.cuerpo);
  return { ok: true, estado: esEstado(c?.estado) ? c.estado : "alumno_propuso" };
}
