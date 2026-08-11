// ---------------------------------------------------------------
// LOS CURSOS, CONTRA LA BASE PROPIA DEL LMS
//
// Las reglas de quién ve qué están en `lib/cursos.ts` y son puras. Esto
// solo las traduce a filas.
//
// SOBRE EL COSTE: un curso tiene hasta 48 módulos y 169 lecciones, y el
// `contenido` de una lección es HTML de varios kilobytes. Ninguna
// consulta de aquí lo pide: para el banner del inicio hacen falta los
// títulos y el orden, nada más. El HTML solo lo carga la vista de la
// lección, y solo el de esa lección.
//
// Como en `lib/progreso-servidor.ts`, nada lanza: una lectura que falla
// devuelve vacío y deja el aviso en el log. Que la base tenga un mal
// minuto no puede dejar a un alumno sin inicio.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { claveCoincide, cursosDelAlumno } from "@/lib/cursos";

export type CursoFila = {
  id: string;
  slug: string;
  titulo: string;
  nivel: string;
  tipo: string;
  examen: string | null;
};

export type SiguienteLeccion = {
  id: string;
  titulo: string;
  moduloTitulo: string;
};

export type EstadoCurso = {
  curso: CursoFila;
  /** Lecciones del curso. */
  total: number;
  completadas: number;
  /** La primera sin completar, o null si ya está el curso entero. */
  siguiente: SiguienteLeccion | null;
  /** Cuándo tocó este curso por última vez. Decide cuál va en el banner. */
  ultimaActividad: string | null;
};

type FilaModulo = { id: string; titulo: string; orden: number };
type FilaLeccion = { id: string; titulo: string; orden: number; modulo_id: string };
type FilaProgreso = { leccion_id: string; completada_en: string };

function registrar(donde: string, error: { message: string } | null): boolean {
  if (!error) return true;
  console.error(`[cursos] ${donde}:`, error.message);
  return false;
}

/**
 * Los cursos a los que tiene acceso este alumno, ya resueltos a filas.
 *
 * Se traen los cursos activos enteros —son 7— y se emparejan en
 * memoria. Montar un `or(...)` de PostgREST para dos claves costaría
 * más de leer que de ejecutar, y la tabla no va a crecer: son los
 * cursos de la academia, no un catálogo abierto.
 */
export async function cursosAsignados(plan: string, nivel: string): Promise<CursoFila[]> {
  const { data, error } = await baseLms()
    .from("cursos")
    .select("id, slug, titulo, nivel, tipo, examen")
    .eq("activo", true)
    .order("orden")
    .returns<CursoFila[]>();

  if (!registrar("No se pudieron leer los cursos", error)) return [];

  const disponibles = data ?? [];
  const salida: CursoFila[] = [];

  // Se recorren las claves y no los cursos: así el orden de salida es el
  // de relevancia que fija `cursosDelAlumno` (examen antes que general).
  for (const clave of cursosDelAlumno(plan, nivel)) {
    const encontrado = disponibles.find((curso) => claveCoincide(clave, curso));
    if (encontrado && !salida.some((c) => c.id === encontrado.id)) salida.push(encontrado);
  }

  return salida;
}

/**
 * Dónde va un alumno en un curso.
 *
 * Tres consultas y ninguna trae contenido: los módulos con su orden, las
 * lecciones con el suyo, y lo que este alumno lleva completado. El
 * cruce se hace aquí porque PostgREST no ordena las filas de una tabla
 * por una columna de la tabla incrustada, que es lo que haría falta para
 * pedir "la primera lección pendiente" en una sola consulta.
 */
export async function estadoDelCurso(alumnoId: string, curso: CursoFila): Promise<EstadoCurso> {
  const vacio: EstadoCurso = {
    curso,
    total: 0,
    completadas: 0,
    siguiente: null,
    ultimaActividad: null,
  };

  const cliente = baseLms();

  const { data: modulos, error: errorModulos } = await cliente
    .from("modulos")
    .select("id, titulo, orden")
    .eq("curso_id", curso.id)
    .order("orden")
    .returns<FilaModulo[]>();

  if (!registrar("No se pudieron leer los módulos", errorModulos)) return vacio;

  const listaModulos = modulos ?? [];
  if (listaModulos.length === 0) return vacio;

  const { data: lecciones, error: errorLecciones } = await cliente
    .from("lecciones")
    .select("id, titulo, orden, modulo_id")
    .in(
      "modulo_id",
      listaModulos.map((m) => m.id)
    )
    .order("orden")
    .returns<FilaLeccion[]>();

  if (!registrar("No se pudieron leer las lecciones", errorLecciones)) return vacio;

  // El progreso del alumno entero, no filtrado por curso: son pocas
  // filas y así vale igual para los dos cursos de un alumno de examen
  // sin repetir la consulta.
  const { data: progreso, error: errorProgreso } = await cliente
    .from("progreso_lecciones")
    .select("leccion_id, completada_en")
    .eq("alumno_id", alumnoId)
    .returns<FilaProgreso[]>();

  if (!registrar("No se pudo leer el progreso de lecciones", errorProgreso)) return vacio;

  const completadaEn = new Map<string, string>();
  for (const fila of progreso ?? []) completadaEn.set(fila.leccion_id, fila.completada_en);

  const ordenModulo = new Map<string, number>();
  const tituloModulo = new Map<string, string>();
  for (const m of listaModulos) {
    ordenModulo.set(m.id, m.orden);
    tituloModulo.set(m.id, m.titulo);
  }

  // Orden real del curso: primero por módulo, luego por lección.
  const ordenadas = (lecciones ?? []).slice().sort((a, b) => {
    const dm = (ordenModulo.get(a.modulo_id) ?? 0) - (ordenModulo.get(b.modulo_id) ?? 0);
    return dm !== 0 ? dm : a.orden - b.orden;
  });

  let completadas = 0;
  let siguiente: SiguienteLeccion | null = null;
  let ultimaActividad: string | null = null;

  for (const leccion of ordenadas) {
    const cuando = completadaEn.get(leccion.id);

    if (cuando !== undefined) {
      completadas++;
      if (ultimaActividad === null || cuando > ultimaActividad) ultimaActividad = cuando;
      continue;
    }

    // La primera pendiente en el orden del curso es donde se retoma.
    if (siguiente === null) {
      siguiente = {
        id: leccion.id,
        titulo: leccion.titulo,
        moduloTitulo: tituloModulo.get(leccion.modulo_id) ?? "",
      };
    }
  }

  return { curso, total: ordenadas.length, completadas, siguiente, ultimaActividad };
}

/**
 * El estado de todos los cursos del alumno, con el que va en el banner
 * primero.
 *
 * "El que va primero" es el de actividad más reciente. Si ninguno tiene
 * actividad todavía, manda el orden de `cursosAsignados`, que pone el
 * del examen por delante: a quien acaba de comprar la preparación del
 * First se le enseña esa, no el general.
 */
export async function cursosDelInicio(
  alumnoId: string,
  plan: string,
  nivel: string
): Promise<EstadoCurso[]> {
  const cursos = await cursosAsignados(plan, nivel);
  if (cursos.length === 0) return [];

  const estados = await Promise.all(cursos.map((curso) => estadoDelCurso(alumnoId, curso)));

  return estados.slice().sort((a, b) => {
    if (a.ultimaActividad === b.ultimaActividad) return 0;
    if (a.ultimaActividad === null) return 1;
    if (b.ultimaActividad === null) return -1;
    return a.ultimaActividad > b.ultimaActividad ? -1 : 1;
  });
}
