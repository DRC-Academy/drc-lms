// ---------------------------------------------------------------
// LA VALORACIÓN DE CLASES, EN EL SERVIDOR
//
// Lee lo que necesita la regla de `lib/valoraciones.ts` —los partes y las
// clases programadas de Gestión, el recorrido de análisis— y escribe en
// `valoraciones_clase`, en la base del LMS (supabase/lms-valoraciones-clase.sql).
// Gestión no se toca: solo se lee, y solo vistas de la lista blanca.
//
// NADA DE LO QUE MANDA EL NAVEGADOR SE CREE. De él llegan el `clase_id`,
// las estrellas y el comentario; el alumno sale de la cookie, y antes de
// escribir se vuelve a calcular la lista de clases valorables de ESE
// alumno. Un `clase_id` que no está en ella —de otro alumno, cancelada,
// sin terminar— se rechaza. El profesor y la fecha se leen de Gestión.
//
// SIN TABLA, NADA. Si `valoraciones_clase` no existe todavía (o la base
// no contesta), las lecturas devuelven null y ni el pop-up ni el botón
// salen: no se ofrece valorar algo que no se puede guardar.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import {
  alumnosParaMetricas,
  clasesProgramadas,
  obtenerNombresProfesor,
  obtenerRecorrido,
  partesDeClase,
  type FilaParteGestion,
  type FilaProgramadaGestion,
} from "@/lib/gestion";
import { LecturaFallida, SEGUNDOS_CLASES, conCache, etiquetaAlumno } from "@/lib/cache-gestion";
import { instanteEnMadrid } from "@/lib/clases";
import { esCuentaDeEquipo } from "@/lib/entradas-clase-servidor";
import {
  claseDelPopup,
  clasesValorables,
  comoComentario,
  comoEstrellas,
  comoOrigen,
  type ClaseValorable,
  type FilaValoracion,
  type Origen,
} from "@/lib/valoraciones";

// ---------------------------------------------------------------
// LO QUE SE PUEDE VALORAR
// ---------------------------------------------------------------

type DeGestion = { partes: FilaParteGestion[]; programadas: FilaProgramadaGestion[] };

/**
 * Los partes y las programadas del alumno, con la caché corta de las
 * lecturas de clases. Null si falla cualquiera de las dos: sin partes no
 * se puede decir qué clase se dio.
 */
async function leerDeGestion(alumnoId: string): Promise<DeGestion | null> {
  return conCache<DeGestion | null>(
    ["valoraciones", alumnoId],
    SEGUNDOS_CLASES,
    [etiquetaAlumno(alumnoId)],
    async () => {
      const [partes, programadas] = await Promise.all([partesDeClase(alumnoId), clasesProgramadas(alumnoId)]);
      if (!partes || !programadas) throw new LecturaFallida("partes o programadas del alumno");
      return { partes, programadas };
    },
    null
  );
}

/** Las clases dadas y terminadas del alumno. Null si no se pudo leer Gestión. */
async function leerClasesValorables(alumnoId: string): Promise<ClaseValorable[] | null> {
  const [gestion, recorrido] = await Promise.all([leerDeGestion(alumnoId), obtenerRecorrido(alumnoId)]);
  if (!gestion) return null;

  return clasesValorables({
    partes: gestion.partes
      .filter((p) => p.parteId)
      .map((p) => ({ parteId: p.parteId!, fecha: p.fecha, hora: p.hora, tipo: p.tipo, teacherId: p.teacherId, profesor: p.profesor })),
    analisis: recorrido.todas.map((c) => ({ id: c.id, fecha: c.fechaClase, teacherId: c.teacherId, analizadoEn: c.analizadoEn })),
    programadas: gestion.programadas.map((c) => ({ fecha: c.fecha, hora: c.hora, horas: c.horas })),
    ahora: new Date(),
  });
}

/** El nombre que se enseña: el de `vista_profesores`, o el que quedó en el parte. */
function nombreDelProfesor(clase: ClaseValorable, profesores: Map<string, string>): string | null {
  const nombre = (clase.teacherId ? profesores.get(clase.teacherId) : undefined) ?? clase.profesorDelParte;
  return nombre && nombre.trim() !== "" ? nombre.trim() : null;
}

// ---------------------------------------------------------------
// LO QUE YA HA VALORADO
// ---------------------------------------------------------------

export type ValoracionGuardada = { estrellas: number | null; comentario: string | null };

/** clase_id → su fila. Null si la tabla no se pudo leer. */
async function valoracionesDe(alumnoId: string): Promise<Map<string, ValoracionGuardada> | null> {
  const { data, error } = await baseLms()
    .from("valoraciones_clase")
    .select("clase_id, estrellas, comentario")
    .eq("alumno_id", alumnoId)
    .limit(1000)
    .returns<{ clase_id: string; estrellas: number | null; comentario: string | null }[]>();

  if (error) {
    console.error("[valoraciones] No se pudieron leer las del alumno:", error.message);
    return null;
  }
  return new Map((data ?? []).map((f) => [f.clase_id, { estrellas: f.estrellas, comentario: f.comentario }]));
}

// ---------------------------------------------------------------
// EL POP-UP
// ---------------------------------------------------------------

export type ValoracionPendiente = { claseId: string; profesor: string | null };

/** La clase que hay que preguntar al entrar, o null. */
export async function valoracionPendiente(alumnoId: string): Promise<ValoracionPendiente | null> {
  if (!alumnoId) return null;
  const [clases, guardadas] = await Promise.all([leerClasesValorables(alumnoId), valoracionesDe(alumnoId)]);
  if (!clases || !guardadas) return null;

  const clase = claseDelPopup(clases, new Set(guardadas.keys()), new Date());
  if (!clase) return null;
  return { claseId: clase.claseId, profesor: nombreDelProfesor(clase, await obtenerNombresProfesor()) };
}

// ---------------------------------------------------------------
// EL HISTORIAL DE «MIS CLASES»
// ---------------------------------------------------------------

export type ValorarDelHistorial = { claseId: string; profesor: string | null; guardada: ValoracionGuardada | null };

/**
 * Por análisis del historial (`ClaseDelRecorrido.id`), la clase que se
 * valora desde él y lo que ya tenga. Solo las clases dadas que casan con
 * un análisis: las demás no salen en el historial. Null si falta algo.
 */
export async function valoracionesDelHistorial(alumnoId: string): Promise<Map<string, ValorarDelHistorial> | null> {
  if (!alumnoId) return null;
  const [clases, guardadas, profesores] = await Promise.all([
    leerClasesValorables(alumnoId),
    valoracionesDe(alumnoId),
    obtenerNombresProfesor(),
  ]);
  if (!clases || !guardadas) return null;

  const salida = new Map<string, ValorarDelHistorial>();
  for (const clase of clases) {
    if (!clase.analisisId) continue;
    const guardada = guardadas.get(clase.claseId);
    salida.set(clase.analisisId, {
      claseId: clase.claseId,
      profesor: nombreDelProfesor(clase, profesores),
      // Una fila solo descartada no es una valoración: sigue el botón.
      guardada: guardada && guardada.estrellas !== null ? guardada : null,
    });
  }
  return salida;
}

// ---------------------------------------------------------------
// GUARDAR
// ---------------------------------------------------------------

export type ResultadoValoracion = { ok: true } | { ok: false; motivo: "datos" | "no_valorable" | "base" };

/** La clase de este alumno con ese id, si se puede valorar. */
async function claseDelAlumno(alumnoId: string, claseId: unknown): Promise<ClaseValorable | null> {
  if (typeof claseId !== "string" || claseId === "") return null;
  return (await leerClasesValorables(alumnoId))?.find((c) => c.claseId === claseId) ?? null;
}

/** Lo que se copia de Gestión en la fila al crearla. */
async function copiaDeGestion(alumnoId: string, clase: ClaseValorable) {
  return {
    alumno_id: alumnoId,
    clase_id: clase.claseId,
    profesor_id: clase.teacherId,
    profesor_nombre: nombreDelProfesor(clase, await obtenerNombresProfesor()),
    fecha_clase: (clase.inicio ?? instanteEnMadrid(clase.fecha, "00:00")).toISOString(),
  };
}

const DUPLICADA = "23505";

/**
 * Valorar o editar. La primera vez crea la fila con el origen y la copia
 * de Gestión; después solo cambian las estrellas y el comentario, también
 * si la fila era de un pop-up descartado.
 */
export async function guardarValoracion(
  alumnoId: string,
  entrada: { claseId: unknown; estrellas: unknown; comentario: unknown; origen: unknown }
): Promise<ResultadoValoracion> {
  const estrellas = comoEstrellas(entrada.estrellas);
  const comentario = comoComentario(entrada.comentario);
  const origen = comoOrigen(entrada.origen);
  if (estrellas === null || comentario === undefined || origen === null) return { ok: false, motivo: "datos" };

  const clase = await claseDelAlumno(alumnoId, entrada.claseId);
  if (!clase) return { ok: false, motivo: "no_valorable" };

  const base = baseLms().from("valoraciones_clase");
  const nueva = await base.insert({ ...(await copiaDeGestion(alumnoId, clase)), estrellas, comentario, origen });
  if (!nueva.error) return { ok: true };
  if (nueva.error.code !== DUPLICADA) {
    console.error("[valoraciones] No se pudo guardar:", nueva.error.message);
    return { ok: false, motivo: "base" };
  }

  const editada = await baseLms()
    .from("valoraciones_clase")
    .update({ estrellas, comentario, updated_at: new Date().toISOString() })
    .eq("alumno_id", alumnoId)
    .eq("clase_id", clase.claseId);
  if (editada.error) {
    console.error("[valoraciones] No se pudo editar:", editada.error.message);
    return { ok: false, motivo: "base" };
  }
  return { ok: true };
}

/** El pop-up se cerró sin valorar: no vuelve a salir para esa clase. */
export async function descartarValoracion(alumnoId: string, claseId: unknown): Promise<ResultadoValoracion> {
  const clase = await claseDelAlumno(alumnoId, claseId);
  if (!clase) return { ok: false, motivo: "no_valorable" };

  const { error } = await baseLms()
    .from("valoraciones_clase")
    .insert({ ...(await copiaDeGestion(alumnoId, clase)), descartada_en: new Date().toISOString(), origen: "popup" satisfies Origen });
  // Si ya tenía fila, ya no salía: nada que hacer.
  if (error && error.code !== DUPLICADA) {
    console.error("[valoraciones] No se pudo apuntar el descarte:", error.message);
    return { ok: false, motivo: "base" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------
// EL PANEL (/valoraciones)
// ---------------------------------------------------------------

export type DatosPanelValoraciones = {
  /** Todas las filas, de la más reciente a la más antigua. Null si no se pudo leer. */
  filas: FilaValoracion[] | null;
  /** alumno_id → nombre en Gestión. */
  nombres: Map<string, string>;
  /** Las cuentas que no cuentan: `metricas_excluidos`, la demo y la de pruebas. */
  excluidas: Set<string>;
};

const PAGINA = 1000;

/** Sin caché: se mira poco y tiene que enseñar lo que se acaba de valorar. */
export async function cargarPanelValoraciones(): Promise<DatosPanelValoraciones> {
  const leerFilas = async (): Promise<FilaValoracion[] | null> => {
    const filas: FilaValoracion[] = [];
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error } = await baseLms()
        .from("valoraciones_clase")
        .select("alumno_id, clase_id, profesor_id, profesor_nombre, fecha_clase, estrellas, comentario, descartada_en, origen, created_at, updated_at")
        .order("fecha_clase", { ascending: false })
        .order("id", { ascending: true })
        .range(desde, desde + PAGINA - 1)
        .returns<FilaValoracion[]>();
      if (error) {
        console.error("[valoraciones] No se pudieron leer para el panel:", error.message);
        return null;
      }
      filas.push(...(data ?? []));
      if ((data ?? []).length < PAGINA) return filas;
    }
  };

  const [filas, fichas, excluidos] = await Promise.all([
    leerFilas(),
    alumnosParaMetricas(),
    baseLms().from("metricas_excluidos").select("alumno_id").returns<{ alumno_id: string }[]>(),
  ]);
  if (excluidos.error) console.error("[valoraciones] metricas_excluidos:", excluidos.error.message);

  const excluidas = new Set((excluidos.data ?? []).map((f) => f.alumno_id));
  for (const f of filas ?? []) if (esCuentaDeEquipo(f.alumno_id)) excluidas.add(f.alumno_id);

  return { filas, nombres: new Map((fichas ?? []).map((f) => [f.alumnoId, f.nombre])), excluidas };
}
