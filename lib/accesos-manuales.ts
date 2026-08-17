// ---------------------------------------------------------------
// EXCEPCIONES DE ACCESO A CURSOS
//
// Todo lo de este archivo es ADITIVO. El acceso normal lo sigue
// calculando `lib/cursos.ts` a partir del plan, sin tocar la base y sin
// enterarse de que esto existe. Un alumno sin ninguna excepción se
// comporta exactamente igual que antes de que este módulo apareciera.
//
// SE FALLA A "SIN EXCEPCIONES". Si la tabla todavía no está creada, si
// la base tiene un mal minuto o si la consulta devuelve error, esto
// entrega un mapa vacío y deja el aviso en el log. Es lo que permite
// desplegar este código antes de ejecutar el SQL: hasta que la tabla
// exista, el LMS entero funciona como hoy.
//
// Y es también la dirección segura por la que fallar: sin excepciones,
// un alumno ve lo que su plan le da. Al revés —fallar dando acceso—
// abriría cursos por un error de red.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { baseLms } from "@/lib/supabase-lms";
import { claveCoincide, cursosDelAlumno } from "@/lib/cursos";
import type { CursoFila } from "@/lib/cursos-servidor";

export type ExcepcionAcceso = {
  cursoId: string;
  /** Este alumno se salta la apertura progresiva en este curso. */
  sinDrip: boolean;
  /** Email del administrador que la concedió. */
  concedidaPor: string;
  creadaEn: string;
  motivo: string | null;
};

type FilaExcepcion = {
  curso_id: string;
  sin_drip: boolean;
  concedida_por: string;
  creada_en: string;
  motivo: string | null;
};

/**
 * Las excepciones vivas de un alumno, indexadas por curso.
 *
 * Va en `cache()` de React, que deduplica dentro de una misma petición.
 * Hace falta porque lo piden varios a la vez: el guard de la página de
 * curso, el de la lección, el cálculo de la fecha del drip y —en el
 * panel— la ficha. Sin esto serían cuatro consultas para responder lo
 * mismo; con esto es una.
 *
 * Como solo necesita el id del alumno, que se conoce desde la cookie
 * antes de cualquier otra consulta, cabe en la primera ola de las
 * páginas que ya la tienen. No añade ningún viaje de ida y vuelta.
 */
export const excepcionesDelAlumno = cache(
  async (alumnoId: string): Promise<Map<string, ExcepcionAcceso>> => {
    const vacio = new Map<string, ExcepcionAcceso>();

    // El equipo entra como `alumnoId: ""`. No es un alumno, no tiene
    // excepciones, y preguntarlo sería una consulta por página para
    // recibir siempre cero filas.
    if (alumnoId === "") return vacio;

    const { data, error } = await baseLms()
      .from("accesos_manuales")
      .select("curso_id, sin_drip, concedida_por, creada_en, motivo")
      .eq("alumno_id", alumnoId)
      .is("revocada_en", null)
      .returns<FilaExcepcion[]>();

    if (error) {
      // PGRST205 = la tabla no existe todavía. Es el caso esperado antes
      // de ejecutar `supabase/lms-accesos-manuales.sql`, y no merece
      // ruido en el log cada vez que alguien abre una lección.
      if (!error.message.includes("accesos_manuales")) {
        console.error("[accesos] No se pudieron leer las excepciones:", error.message);
      }
      return vacio;
    }

    const salida = new Map<string, ExcepcionAcceso>();
    for (const fila of data ?? []) {
      salida.set(fila.curso_id, {
        cursoId: fila.curso_id,
        sinDrip: fila.sin_drip === true,
        concedidaPor: fila.concedida_por,
        creadaEn: fila.creada_en,
        motivo: fila.motivo,
      });
    }

    return salida;
  }
);

/**
 * ¿Este alumno tiene abierto el curso entero, saltándose el drip?
 *
 * Se apoya en el mapa cacheado de arriba, así que llamarla no cuesta
 * ninguna consulta extra si algo más de la misma petición ya lo pidió.
 */
export async function sinDripEn(alumnoId: string, cursoId: string): Promise<boolean> {
  const excepciones = await excepcionesDelAlumno(alumnoId);
  return excepciones.get(cursoId)?.sinDrip === true;
}

// ---------------------------------------------------------------
// LO QUE VE EL PANEL
// ---------------------------------------------------------------

/** De dónde le viene a un alumno el acceso a un curso. */
export type OrigenAcceso = "plan" | "manual";

export type FilaAcceso = {
  curso: CursoFila;
  /** null = no tiene acceso a este curso. */
  origen: OrigenAcceso | null;
  sinDrip: boolean;
  /** Solo cuando el origen es "manual". */
  concedidaPor: string | null;
  creadaEn: string | null;
  motivo: string | null;
  /**
   * Lecciones que este alumno ya tiene completadas en este curso.
   *
   * NO CONCEDE NADA. Es la señal que convierte un dato enterrado en una
   * tarea: hay 19 alumnos con progreso migrado de LearnDash en cursos
   * que su plan no les da, y sin esto nadie se enteraría. La decisión de
   * abrírselo la toma una persona, no una consulta.
   */
  leccionesHechas: number;
};

type FilaProgresoCurso = {
  leccion_id: string;
  lecciones: { modulos: { curso_id: string } | null } | null;
};

/**
 * El estado de los 7 cursos para un alumno: qué tiene, de dónde le
 * viene, y dónde tiene progreso sin acceso.
 *
 * Es solo para el panel. Las páginas del alumno no llaman aquí.
 */
export async function estadoDeAccesos(
  alumnoId: string,
  plan: string,
  nivel: string
): Promise<FilaAcceso[]> {
  const cliente = baseLms();

  const [cursos, excepciones, progreso] = await Promise.all([
    cliente
      .from("cursos")
      .select("id, slug, titulo, nivel, tipo, examen")
      .eq("activo", true)
      .order("orden")
      .returns<CursoFila[]>(),
    excepcionesDelAlumno(alumnoId),
    // Progreso del alumno agrupado por curso, subiendo por las dos
    // claves ajenas: lección -> módulo -> curso. Un solo viaje.
    alumnoId === ""
      ? Promise.resolve({ data: [] as FilaProgresoCurso[], error: null })
      : cliente
          .from("progreso_lecciones")
          .select("leccion_id, lecciones!inner(modulos!inner(curso_id))")
          .eq("alumno_id", alumnoId)
          .returns<FilaProgresoCurso[]>(),
  ]);

  if (cursos.error) {
    console.error("[accesos] No se pudieron leer los cursos:", cursos.error.message);
    return [];
  }

  const activos = cursos.data ?? [];

  const hechasPorCurso = new Map<string, number>();
  for (const fila of progreso.data ?? []) {
    const cursoId = fila.lecciones?.modulos?.curso_id;
    if (!cursoId) continue;
    hechasPorCurso.set(cursoId, (hechasPorCurso.get(cursoId) ?? 0) + 1);
  }

  // Los que le da el plan. Es la MISMA regla que usa el resto de la
  // aplicación, sin copiarla: se llama a la función pura de siempre.
  const porPlan = new Set<string>();
  for (const clave of cursosDelAlumno(plan, nivel)) {
    const encontrado = activos.find((curso) => claveCoincide(clave, curso));
    if (encontrado) porPlan.add(encontrado.id);
  }

  return activos.map((curso) => {
    const excepcion = excepciones.get(curso.id);

    // EL PLAN GANA AL DECIR EL ORIGEN. Puede haber excepción sobre un
    // curso que el plan ya daba —existirá solo para abrir el drip— y en
    // ese caso el acceso no lo concedió nadie a mano: lo da el plan.
    // Etiquetarlo de "manual" haría creer que se puede quitar, y no.
    const origen: OrigenAcceso | null = porPlan.has(curso.id)
      ? "plan"
      : excepcion
        ? "manual"
        : null;

    return {
      curso,
      origen,
      sinDrip: excepcion?.sinDrip === true,
      concedidaPor: excepcion?.concedidaPor ?? null,
      creadaEn: excepcion?.creadaEn ?? null,
      motivo: excepcion?.motivo ?? null,
      leccionesHechas: hechasPorCurso.get(curso.id) ?? 0,
    };
  });
}

// ---------------------------------------------------------------
// ESCRITURAS
//
// Contra `baseLms()`, que es la base del LMS. Nunca contra Gestión: su
// cliente (`soloLectura`) devuelve un tipo que solo expone `select`, así
// que escribir allí ni siquiera compila.
//
// NADA SE BORRA NI SE PISA. Cambiar una excepción es revocar la viva y
// escribir otra, de modo que la tabla conserva cada estado por el que ha
// pasado el par (alumno, curso) con su autor y su fecha. El índice único
// parcial de `revocada_en is null` es lo que garantiza que solo haya una
// en vigor.
// ---------------------------------------------------------------

function registrar(donde: string, error: { message: string } | null): boolean {
  if (!error) return true;
  console.error(`[accesos] ${donde}:`, error.message);
  return false;
}

/** Marca como revocada la excepción viva, si la hay. */
async function revocarViva(alumnoId: string, cursoId: string, porQuien: string): Promise<boolean> {
  const { error } = await baseLms()
    .from("accesos_manuales")
    .update({ revocada_en: new Date().toISOString(), revocada_por: porQuien })
    .eq("alumno_id", alumnoId)
    .eq("curso_id", cursoId)
    .is("revocada_en", null);

  return registrar("No se pudo revocar la excepción", error);
}

/**
 * Concede el acceso, o cambia el drip de uno ya concedido.
 *
 * Revoca primero y escribe después. Si lo segundo fallara, el alumno se
 * queda SIN la excepción en vez de con una duplicada: es la dirección
 * segura, y el panel lo enseña en el acto porque relee de la tabla.
 */
export async function concederAcceso(
  alumnoId: string,
  cursoId: string,
  datos: { sinDrip: boolean; motivo: string | null; porQuien: string }
): Promise<boolean> {
  if (alumnoId === "" || cursoId === "" || datos.porQuien === "") return false;

  if (!(await revocarViva(alumnoId, cursoId, datos.porQuien))) return false;

  const motivo = datos.motivo?.trim();

  const { error } = await baseLms().from("accesos_manuales").insert({
    alumno_id: alumnoId,
    curso_id: cursoId,
    sin_drip: datos.sinDrip,
    concedida_por: datos.porQuien,
    // Cadena vacía no: el CHECK de la tabla rechaza un motivo en blanco
    // porque parece rellenado. Sin motivo es `null`.
    motivo: motivo ? motivo : null,
  });

  return registrar("No se pudo conceder el acceso", error);
}

/** Quita una excepción manual. Los cursos del plan no pasan por aquí. */
export async function revocarAcceso(
  alumnoId: string,
  cursoId: string,
  porQuien: string
): Promise<boolean> {
  if (alumnoId === "" || cursoId === "" || porQuien === "") return false;
  return revocarViva(alumnoId, cursoId, porQuien);
}
