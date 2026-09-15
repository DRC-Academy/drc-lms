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
import { cache } from "react";
import { aperturaDeLeccion, calcularApertura } from "@/lib/drip";
import { baseLms } from "@/lib/supabase-lms";
import { comoFecha } from "@/lib/fechas";
import { cursosDelPlan } from "@/lib/cursos";
import { excepcionesDelAlumno, sinDripEn } from "@/lib/accesos-manuales";

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
  /**
   * Qué lugar ocupa su módulo en el curso, DESDE 0.
   *
   * Es lo que espera `partirModulo`, y con él la franja del inicio sitúa
   * la lección en el plan —mes, semana y módulo— con el mismo rótulo que
   * «Mi curso». Se cuenta sobre la lista ya ordenada y no sobre la
   * columna `orden`: si un módulo se borrara del catálogo, la columna
   * dejaría un hueco y las dos pantallas contarían distinto.
   */
  moduloOrden: number;
  /**
   * Qué número hace en el curso, empezando en 1.
   *
   * Se cuenta sobre el orden real —módulo y luego lección—, no sobre las
   * completadas: quien haya hecho lecciones sueltas fuera de orden tiene
   * más hechas que su posición, y "Lección 13 de 191" tiene que decir
   * dónde está, no cuántas lleva.
   */
  posicion: number;
};

export type EstadoCurso = {
  curso: CursoFila;
  /** Lecciones del curso. */
  total: number;
  completadas: number;
  /**
   * La primera sin completar A LA QUE SE PUEDE ENTRAR.
   *
   * Null significa dos cosas distintas y quien lo pinte tiene que
   * separarlas: o el curso está entero —`completadas === total`— o el
   * alumno ha hecho todo lo que el drip le tiene abierto y espera al
   * módulo siguiente. En ese segundo caso lo dice `diasParaAbrir`.
   */
  siguiente: SiguienteLeccion | null;
  /**
   * Días hasta que se abra lo siguiente, o null si ya hay algo abierto
   * (y también si no queda nada por abrir). Mismo nombre y mismo
   * significado que en `ModuloIndice`.
   */
  diasParaAbrir: number | null;
  /** Qué día abre, como "2026-09-26", o null si no hay espera. */
  abreEl: string | null;
  /** Cuándo tocó este curso por última vez. Decide cuál va en el banner. */
  ultimaActividad: string | null;
};

type FilaModulo = { id: string; titulo: string; orden: number
  visible_after: number;
};
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
export async function cursosAsignados(
  plan: string,
  nivel: string,
  /**
   * Con quién comprobar las excepciones manuales. ADITIVO Y OPCIONAL: sin
   * este argumento la función devuelve exactamente lo mismo que devolvía
   * antes de que existieran, que es lo que permitió añadirlas sin tocar
   * ninguna de las llamadas que ya había.
   *
   * Quien lo pasa recibe además los cursos concedidos a mano. Nunca
   * recibe menos: lo manual se suma al plan, nunca lo sustituye.
   */
  alumnoId = ""
): Promise<CursoFila[]> {
  // Las dos a la vez: las excepciones solo dependen del alumno, así que
  // no tienen por qué esperar a la lista de cursos. Y como
  // `excepcionesDelAlumno` va por `cache()`, si algo más de esta misma
  // petición ya la pidió, esto no cuesta ningún viaje.
  const [respuesta, excepciones] = await Promise.all([
    baseLms()
      .from("cursos")
      .select("id, slug, titulo, nivel, tipo, examen")
      .eq("activo", true)
      .order("orden")
      .returns<CursoFila[]>(),
    excepcionesDelAlumno(alumnoId),
  ]);

  const { data, error } = respuesta;
  if (!registrar("No se pudieron leer los cursos", error)) return [];

  const disponibles = data ?? [];

  // Lo que da el plan. La regla entera vive en `lib/cursos.ts` y aquí no
  // se decide nada: un plan de examen devuelve el curso del examen y
  // nada más.
  const salida: CursoFila[] = [...cursosDelPlan(plan, nivel, disponibles)];

  // Y detrás los concedidos a mano, que por definición no están en las
  // claves del plan. Van al final a propósito: delante quedan los del
  // producto que el alumno compró, que es el orden de relevancia que usa
  // el banner cuando todavía no hay actividad de la que fiarse.
  for (const curso of disponibles) {
    if (!excepciones.has(curso.id)) continue;
    if (salida.some((c) => c.id === curso.id)) continue;
    salida.push(curso);
  }

  return salida;
}

// ---------------------------------------------------------------
// LAS TRES LECTURAS QUE COMPARTE TODO EL CURSO
//
// Los módulos de un curso, sus lecciones y el progreso del alumno son lo
// que necesita CUALQUIER cosa que hable del curso: la franja del inicio,
// la pestaña «Mi curso» de cada cabecera, el temario, la barra del layout
// y la vista de la lección. Antes cada una las pedía con su propia
// consulta —la misma tabla, otra forma— y dentro de una petición se
// repetían: el layout del curso y la página que cuelga de él leían dos
// veces las 191 lecciones.
//
// `cache()` de React las deduplica DENTRO DE UNA PETICIÓN. No es una
// caché entre peticiones: cada carga vuelve a preguntar, que es lo que
// queremos, porque el progreso cambia al completar una lección.
//
// CON ARGUMENTOS PRIMITIVOS a propósito. `cache()` compara por identidad,
// así que una función que recibiera el objeto del curso o un `Date` se
// quedaría sin deduplicar cada vez que el llamador construyera el suyo.
// Por eso reciben ids, y quien las combina con la fecha del drip lo hace
// fuera.
//
// NINGUNA TRAE `contenido`. Las lecciones vienen con título porque el
// temario y el panel lo pintan; son unos kilobytes, y a cambio la vista
// de la lección deja de pedir una segunda lista sin títulos solo para
// ordenar.
// ---------------------------------------------------------------

/** Los módulos del curso, en orden. Null si la lectura falló. */
const modulosDelCurso = cache(async (cursoId: string): Promise<FilaModulo[] | null> => {
  const { data, error } = await baseLms()
    .from("modulos")
    .select("id, titulo, orden, visible_after")
    .eq("curso_id", cursoId)
    .order("orden")
    .returns<FilaModulo[]>();

  if (!registrar("No se pudieron leer los módulos", error)) return null;
  return data ?? [];
});

/**
 * Las lecciones del curso, sin ordenar entre módulos. Null si falló.
 *
 * Se filtran por el curso a través del módulo —`modulos!inner`— y no
 * por una lista de ids de módulo: así no dependen de haber leído antes
 * los módulos, y las tres lecturas salen en la misma ola.
 */
const leccionesDelCurso = cache(async (cursoId: string): Promise<FilaLeccion[] | null> => {
  const { data, error } = await baseLms()
    .from("lecciones")
    .select("id, titulo, orden, modulo_id, modulos!inner(curso_id)")
    .eq("modulos.curso_id", cursoId)
    .order("orden")
    .returns<FilaLeccion[]>();

  if (!registrar("No se pudieron leer las lecciones", error)) return null;
  return data ?? [];
});

/**
 * Lo que este alumno lleva completado, en todos sus cursos.
 *
 * Sin filtrar por curso: son pocas filas y así vale igual para los dos
 * cursos de un alumno con acceso manual sin repetir la consulta. El
 * equipo entra como `""` y no tiene progreso; preguntarlo sería una
 * consulta por página para recibir siempre cero filas.
 *
 * Null si la lectura falló, y quien llama decide: el estado del curso
 * prefiere no decir nada a decir «Empieza tu curso» a quien lleva 100
 * lecciones; el árbol y la lección pintan el curso con el progreso a
 * cero, que es lo que hacían.
 */
const progresoDelAlumno = cache(async (alumnoId: string): Promise<FilaProgreso[] | null> => {
  if (alumnoId === "") return [];

  const { data, error } = await baseLms()
    .from("progreso_lecciones")
    .select("leccion_id, completada_en")
    .eq("alumno_id", alumnoId)
    .returns<FilaProgreso[]>();

  if (!registrar("No se pudo leer el progreso de lecciones", error)) return null;
  return data ?? [];
});

/**
 * Las lecciones de solo ejercicios del curso: `contenido` vacío y sin
 * vídeo. Se resuelve con una consulta que devuelve únicamente ids: pesa
 * unos cientos de bytes en vez de los cientos de kilobytes que costaría
 * traer el HTML de todo el curso para mirar si está vacío.
 *
 * El filtro exige además `video_url is null`. Una lección de vídeo
 * tiene el contenido vacío —lo normal: son 158 de las 160— y sin esa
 * condición saldrían todas etiquetadas como "· ejercicios", que es
 * justo lo que no son.
 */
const idsSoloEjercicios = cache(async (cursoId: string): Promise<Set<string>> => {
  const { data, error } = await baseLms()
    .from("lecciones")
    .select("id, modulos!inner(curso_id)")
    .eq("modulos.curso_id", cursoId)
    .eq("contenido", "")
    .is("video_url", null)
    .returns<{ id: string }[]>();

  registrar("No se pudieron leer las lecciones de solo ejercicios", error);
  return new Set((data ?? []).map((l) => l.id));
});

/** Las que llevan vídeo, por el mismo camino: solo ids. */
const idsConVideo = cache(async (cursoId: string): Promise<Set<string>> => {
  const { data, error } = await baseLms()
    .from("lecciones")
    .select("id, modulos!inner(curso_id)")
    .eq("modulos.curso_id", cursoId)
    .not("video_url", "is", null)
    .returns<{ id: string }[]>();

  registrar("No se pudieron leer las lecciones con vídeo", error);
  return new Set((data ?? []).map((l) => l.id));
});

/**
 * El orden real del curso: primero por módulo, luego por lección.
 *
 * Se cuenta sobre la lista de módulos ya ordenada y no sobre la columna
 * `orden`: si un módulo se borrara del catálogo, la columna dejaría un
 * hueco y dos pantallas contarían distinto.
 */
function ordenarLecciones(modulos: FilaModulo[], lecciones: FilaLeccion[]): FilaLeccion[] {
  const posicion = new Map(modulos.map((m, i) => [m.id, i]));
  return lecciones.slice().sort((a, b) => {
    const dm = (posicion.get(a.modulo_id) ?? 0) - (posicion.get(b.modulo_id) ?? 0);
    return dm !== 0 ? dm : a.orden - b.orden;
  });
}

/**
 * Cuándo se aplica el drip a este alumno en este curso.
 *
 * Null abre el curso entero, que es lo que `lib/drip.ts` entiende por
 * "sin espera". Pasa en dos casos que aquí se juntan: sin fecha de
 * inicio no hay desde dónde contar, y a quien el equipo le abrió este
 * curso entero —`accesos_manuales.sin_drip`— tampoco se le cuenta.
 *
 * Era la misma pareja de líneas en el temario, en la lección y ahora en
 * el layout; con tres copias, la cuarta se olvidaría de una mitad.
 */
export async function fechaDelDrip(
  alumnoId: string,
  cursoId: string,
  fechaInicio: string | null | undefined
): Promise<Date | null> {
  if (await sinDripEn(alumnoId, cursoId)) return null;
  return comoFecha(fechaInicio);
}

/**
 * Dónde va un alumno en un curso.
 *
 * Las tres lecturas de arriba en UNA ola y ninguna trae contenido. El
 * cruce se hace aquí porque PostgREST no ordena las filas de una tabla
 * por una columna de la tabla incrustada, que es lo que haría falta para
 * pedir "la primera lección pendiente" en una sola consulta.
 */
export async function estadoDelCurso(
  alumnoId: string,
  curso: CursoFila,
  /**
   * Cuándo empezó el alumno. Null abre el curso entero, igual que en
   * `arbolDelCurso`: ver `lib/drip.ts` para por qué se falla abierto.
   */
  fechaInicio: Date | null = null
): Promise<EstadoCurso> {
  const vacio: EstadoCurso = {
    curso,
    total: 0,
    completadas: 0,
    siguiente: null,
    diasParaAbrir: null,
    abreEl: null,
    ultimaActividad: null,
  };

  const [modulos, lecciones, progreso] = await Promise.all([
    modulosDelCurso(curso.id),
    leccionesDelCurso(curso.id),
    progresoDelAlumno(alumnoId),
  ]);

  if (modulos === null || lecciones === null || progreso === null) return vacio;
  if (modulos.length === 0) return vacio;

  const completadaEn = new Map<string, string>();
  for (const fila of progreso) completadaEn.set(fila.leccion_id, fila.completada_en);

  const ordenModulo = new Map<string, number>();
  const tituloModulo = new Map<string, string>();
  // `visible_after` SE PEDÍA Y NO SE USABA, y ese era el fallo: la
  // franja del inicio ofrecía "Continuar" hacia la primera lección
  // pendiente sin mirar si su módulo estaba abierto. El alumno que
  // terminaba lo que tenía disponible pulsaba y la página de la lección
  // lo devolvía al índice sin decirle nada.
  const esperaModulo = new Map<string, number>();
  modulos.forEach((m, i) => {
    ordenModulo.set(m.id, i);
    tituloModulo.set(m.id, m.titulo);
    esperaModulo.set(m.id, m.visible_after ?? 0);
  });

  const ordenadas = ordenarLecciones(modulos, lecciones);

  let completadas = 0;
  let siguiente: SiguienteLeccion | null = null;
  let diasParaAbrir: number | null = null;
  let abreEl: string | null = null;
  let ultimaActividad: string | null = null;

  const ahora = new Date();

  ordenadas.forEach((leccion, i) => {
    const cuando = completadaEn.get(leccion.id);

    if (cuando !== undefined) {
      completadas++;
      if (ultimaActividad === null || cuando > ultimaActividad) ultimaActividad = cuando;
      return;
    }

    // Ya la tenemos: el resto de las pendientes no cambia nada.
    if (siguiente !== null) return;

    // LA PRIMERA PENDIENTE A LA QUE SE PUEDE ENTRAR, que no es la
    // primera pendiente. Mismo criterio y misma función que
    // `arbolDelCurso`, que ya lo hacía así para su `leccionActual`: si
    // esto apuntara a una bloqueada, el botón llevaría a una pantalla
    // que rechaza al alumno.
    //
    // `false` como "completada" no es un atajo: aquí nunca lo está, ese
    // caso ha salido por el `return` de arriba.
    const apertura = aperturaDeLeccion(
      esperaModulo.get(leccion.modulo_id) ?? 0,
      fechaInicio,
      false,
      ahora
    );

    if (!apertura.abierto) {
      // Se anota cuándo se abre la primera que está esperando y se
      // sigue mirando: puede haber un módulo sin espera más adelante, y
      // entonces sí hay a dónde ir hoy.
      if (diasParaAbrir === null) {
        diasParaAbrir = apertura.diasRestantes;
        abreEl = apertura.abreEl;
      }
      return;
    }

    siguiente = {
      id: leccion.id,
      titulo: leccion.titulo,
      moduloTitulo: tituloModulo.get(leccion.modulo_id) ?? "",
      moduloOrden: ordenModulo.get(leccion.modulo_id) ?? 0,
      posicion: i + 1,
    };
  });

  return {
    curso,
    total: ordenadas.length,
    completadas,
    siguiente,
    // Si hay a dónde ir hoy, lo que tarde el módulo de más allá no le
    // interesa a nadie.
    diasParaAbrir: siguiente === null ? diasParaAbrir : null,
    abreEl: siguiente === null ? abreEl : null,
    ultimaActividad,
  };
}

// ---------------------------------------------------------------
// EL ÍNDICE DEL CURSO
// ---------------------------------------------------------------

export type LeccionIndice = {
  id: string;
  titulo: string;
  /** Lección sintética del importador: solo ejercicios, sin teoría. */
  soloEjercicios: boolean;
  /**
   * Lleva vídeo. El panel del curso etiqueta cada lección —vídeo, teoría
   * o práctica— y esta es la única de las tres que no se deduce de lo
   * que ya se traía.
   */
  conVideo: boolean;
  completada: boolean;
  /** false solo si su módulo todavía no se ha abierto Y no está hecha. */
  disponible: boolean;
};

export type ModuloIndice = {
  id: string;
  titulo: string;
  lecciones: LeccionIndice[];
  completadas: number;
  /** Días desde la matrícula que pide este módulo. 0 = desde el principio. */
  visibleAfter: number;
  /** Si el módulo se ha abierto ya por calendario. */
  disponible: boolean;
  /** Cuántos días faltan, o null si ya está abierto. */
  diasParaAbrir: number | null;
  /** Qué día abre, o null si ya está abierto. */
  abreEl: string | null;
};

export type ArbolCurso = {
  curso: CursoFila;
  modulos: ModuloIndice[];
  total: number;
  completadas: number;
  /** La primera pendiente: el acordeón abre su módulo. */
  leccionActual: string | null;
};

/**
 * Va por `cache()` porque ahora lo piden dos: la cabecera del layout y la
 * página que cuelga de él. Dentro de una petición es un solo viaje.
 */
export const cursoPorSlug = cache(async (slug: string): Promise<CursoFila | null> => {
  const { data, error } = await baseLms()
    .from("cursos")
    .select("id, slug, titulo, nivel, tipo, examen")
    .eq("slug", slug)
    .eq("activo", true)
    .limit(1)
    .returns<CursoFila[]>();

  if (!registrar("No se pudo leer el curso", error)) return null;
  return (data ?? [])[0] ?? null;
});

/**
 * El árbol entero del curso para el índice: 48 módulos y hasta 169
 * lecciones.
 *
 * Las cinco lecturas en una ola, y todas por `cache()`: cuando la vista
 * de la lección ya las ha pedido —que es lo normal, porque el panel del
 * curso pinta este mismo árbol— esto no cuesta ningún viaje.
 */
export async function arbolDelCurso(
  alumnoId: string,
  curso: CursoFila,
  /**
   * Cuándo empezó el alumno. Null —o alumno del equipo— abre el curso
   * entero: ver `lib/drip.ts` para por qué se falla abierto.
   */
  fechaInicio: Date | null = null
): Promise<ArbolCurso> {
  const vacio: ArbolCurso = { curso, modulos: [], total: 0, completadas: 0, leccionActual: null };

  const [listaModulos, lecciones, sinTeoria, videos, progreso] = await Promise.all([
    modulosDelCurso(curso.id),
    leccionesDelCurso(curso.id),
    idsSoloEjercicios(curso.id),
    idsConVideo(curso.id),
    progresoDelAlumno(alumnoId),
  ]);

  if (listaModulos === null || lecciones === null) return vacio;
  if (listaModulos.length === 0) return vacio;

  const hechas = new Set((progreso ?? []).map((p) => p.leccion_id));

  const porModulo = new Map<string, FilaLeccion[]>();
  for (const leccion of lecciones) {
    const lista = porModulo.get(leccion.modulo_id);
    if (lista) lista.push(leccion);
    else porModulo.set(leccion.modulo_id, [leccion]);
  }

  let total = 0;
  let completadas = 0;
  let leccionActual: string | null = null;

  const ahora = new Date();

  const salida: ModuloIndice[] = listaModulos.map((modulo) => {
    const suyas = (porModulo.get(modulo.id) ?? []).slice().sort((a, b) => a.orden - b.orden);
    const visibleAfter = modulo.visible_after ?? 0;
    const apertura = calcularApertura(visibleAfter, fechaInicio, ahora);
    let hechasAqui = 0;

    const lista: LeccionIndice[] = suyas.map((leccion) => {
      const completada = hechas.has(leccion.id);
      if (completada) hechasAqui++;

      // Lo completado nunca se cierra, así que una lección hecha dentro
      // de un módulo aún por abrir sigue disponible.
      const suya = aperturaDeLeccion(visibleAfter, fechaInicio, completada, ahora);

      // "La actual" es la primera pendiente A LA QUE SE PUEDE ENTRAR: si
      // apuntara a una bloqueada, el botón Continuar llevaría a una
      // pantalla que rechaza al alumno.
      if (!completada && suya.abierto && leccionActual === null) leccionActual = leccion.id;

      return {
        id: leccion.id,
        titulo: leccion.titulo,
        soloEjercicios: sinTeoria.has(leccion.id),
        conVideo: videos.has(leccion.id),
        completada,
        disponible: suya.abierto,
      };
    });

    total += lista.length;
    completadas += hechasAqui;

    return {
      id: modulo.id,
      titulo: modulo.titulo,
      lecciones: lista,
      completadas: hechasAqui,
      visibleAfter,
      disponible: apertura.abierto,
      diasParaAbrir: apertura.abierto ? null : apertura.diasRestantes,
      abreEl: apertura.abierto ? null : apertura.abreEl,
    };
  });

  return { curso, modulos: salida, total, completadas, leccionActual };
}

// ---------------------------------------------------------------
// UNA LECCIÓN
// ---------------------------------------------------------------

export type EjercicioFila = {
  id: string;
  tipo: "single" | "multiple" | "cloze" | "essay";
  enunciado: string;
  opciones: string[];
  correcta: unknown;
  explicacion: string | null;
  orden: number;
};

export type LeccionCompleta = {
  /**
   * false si el módulo todavía no se ha abierto para este alumno. La
   * lección se devuelve igualmente —con su título y su sitio en el
   * curso— para que la página pueda contar CUÁNDO estará en vez de
   * fingir que no existe. Quien decide qué hacer con esto es la página.
   */
  disponible: boolean;
  /** Días que faltan, o null si ya está abierta. */
  diasParaAbrir: number | null;
  /** Qué día abre, o null si ya está abierta. */
  abreEl: string | null;
  curso: CursoFila;
  moduloTitulo: string;
  /** Posición del módulo en el curso, desde 0: la etiqueta lo numera. */
  moduloOrden: number;
  leccion: { id: string; titulo: string; contenido: string; videoUrl: string | null };
  /** Las del mismo módulo, para la barra lateral. */
  hermanas: LeccionIndice[];
  ejercicios: EjercicioFila[];
  completada: boolean;
  /** A dónde lleva "completar y continuar". null si es la última del curso. */
  siguienteId: string | null;
  /** La anterior del curso, para el botón de atrás. null en la primera. */
  anteriorId: string | null;
  /** Progreso del curso entero: va en la cabecera de la lección. */
  cursoCompletadas: number;
  cursoTotal: number;
};

/**
 * La lección con su módulo colgando, y del módulo sus lecciones.
 *
 * Es un embed anidado de PostgREST sobre las dos claves ajenas que ya
 * existen (`lecciones.modulo_id` → `modulos.id`). En un solo viaje trae
 * lo que antes eran tres en fila: la lección, a qué módulo pertenece
 * —incluido `curso_id`, que es con lo que se comprueba que la URL no
 * miente— y las hermanas que van en la barra lateral.
 *
 * Las hermanas vienen SIN `contenido`: son cinco lecciones, pero su HTML
 * sumaba 26 KB que nadie llegaba a pintar.
 */
type FilaLeccionConModulo = {
  id: string;
  titulo: string;
  contenido: string;
  video_url: string | null;
  orden: number;
  modulo_id: string;
  modulos: {
    id: string;
    titulo: string;
    orden: number;
    visible_after: number;
    curso_id: string;
    lecciones: { id: string; titulo: string; orden: number }[];
  } | null;
};

/**
 * Todo lo que necesita la vista de una lección, en UNA sola ola.
 *
 * Antes eran tres esperas encadenadas —lección, luego módulos, luego el
 * resto— porque cada consulta necesitaba los ids de la anterior. Con los
 * embeds esa cadena desaparece: las consultas de abajo solo dependen de
 * lo que ya se sabe al entrar (el id de la lección, el del curso y el
 * del alumno), así que salen todas a la vez.
 *
 * El orden del curso, el progreso y las dos listas de ids salen de la
 * capa compartida: la página pide también el árbol para el panel y el
 * layout el estado para la cabecera, y las tres leen lo mismo una vez.
 *
 * Aquí SÍ se trae `contenido`, pero solo el de esta lección.
 */
export async function leccionParaVer(
  alumnoId: string,
  curso: CursoFila,
  leccionId: string,
  /** Ver `arbolDelCurso`: null abre el curso entero. */
  fechaInicio: Date | null = null
): Promise<LeccionCompleta | null> {
  const cliente = baseLms();

  const [conModulo, modulos, lecciones, progreso, sinTeoria, videos, ejercicios] =
    await Promise.all([
      cliente
        .from("lecciones")
        .select(
          "id, titulo, contenido, video_url, orden, modulo_id," +
            " modulos!inner(id, titulo, orden, visible_after, curso_id," +
            " lecciones(id, titulo, orden))"
        )
        .eq("id", leccionId)
        .limit(1)
        .returns<FilaLeccionConModulo[]>(),
      modulosDelCurso(curso.id),
      leccionesDelCurso(curso.id),
      progresoDelAlumno(alumnoId),
      idsSoloEjercicios(curso.id),
      idsConVideo(curso.id),
      cliente
        .from("ejercicios_leccion")
        .select("id, tipo, enunciado, opciones, correcta, explicacion, orden")
        .eq("leccion_id", leccionId)
        .order("orden")
        .returns<EjercicioFila[]>(),
    ]);

  if (!registrar("No se pudo leer la lección", conModulo.error)) return null;
  if (modulos === null || lecciones === null) return null;

  const leccion = (conModulo.data ?? [])[0];
  if (!leccion) return null;

  const modulo = leccion.modulos;

  // Una lección de otro curso no se sirve desde esta URL: si no, el slug
  // sería decorativo y bastaría con adivinar un uuid. Antes se comprobaba
  // buscándola entre los módulos del curso; ahora el propio embed dice de
  // qué curso cuelga y basta con compararlo.
  if (!modulo || modulo.curso_id !== curso.id) return null;

  const hechas = new Set((progreso ?? []).map((p) => p.leccion_id));
  const ordenadas = ordenarLecciones(modulos, lecciones);

  const posicion = ordenadas.findIndex((l) => l.id === leccionId);
  const siguiente = posicion >= 0 ? ordenadas[posicion + 1] : undefined;
  const anterior = posicion > 0 ? ordenadas[posicion - 1] : undefined;

  const ahora = new Date();

  // ESTO ANTES ERA SIEMPRE 0. El `select` de los módulos no pedía
  // `visible_after`, así que la propiedad llegaba `undefined`, el `?? 0`
  // la daba por abierta y el drip de esta pantalla no cerraba nada: 43
  // de los 45 módulos del FCE tienen espera y ninguna se aplicaba aquí.
  // El índice del curso sí la aplicaba —`arbolDelCurso` sí lo pide—, con
  // lo que la fila salía bloqueada en el temario y la URL directa
  // entraba igual.
  const visibleAfter = modulo.visible_after ?? 0;

  const hermanas: LeccionIndice[] = (modulo.lecciones ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((l) => {
      const completada = hechas.has(l.id);
      return {
        id: l.id,
        titulo: l.titulo,
        soloEjercicios: sinTeoria.has(l.id),
        conVideo: videos.has(l.id),
        completada,
        disponible: aperturaDeLeccion(visibleAfter, fechaInicio, completada, ahora).abierto,
      };
    });

  const apertura = aperturaDeLeccion(visibleAfter, fechaInicio, hechas.has(leccionId), ahora);

  return {
    disponible: apertura.abierto,
    diasParaAbrir: apertura.abierto ? null : apertura.diasRestantes,
    abreEl: apertura.abierto ? null : apertura.abreEl,
    curso,
    moduloTitulo: modulo.titulo,
    moduloOrden: modulo.orden,
    leccion: {
      id: leccion.id,
      titulo: leccion.titulo,
      contenido: leccion.contenido,
      videoUrl: leccion.video_url,
    },
    hermanas,
    ejercicios: ejercicios.data ?? [],
    completada: hechas.has(leccionId),
    siguienteId: siguiente?.id ?? null,
    anteriorId: anterior?.id ?? null,
    cursoCompletadas: ordenadas.filter((l) => hechas.has(l.id)).length,
    cursoTotal: ordenadas.length,
  };
}

// ---------------------------------------------------------------
// LOS EJERCICIOS DE UN MÓDULO, CONTADOS POR LECCIÓN
//
// El panel del curso pone al lado de cada lección cuántos ejercicios
// tiene y cuántos ha respondido ya el alumno. Solo para las lecciones
// del módulo abierto: contarlos para las 191 del curso sería traer mil
// filas por cada lección que se abre, para pintar nueve.
//
// «Hecho» es haber respondido al menos una vez, acertando o no: el
// curso guarda intentos, no notas, y lo que aquí se cuenta es por dónde
// va el alumno, no cómo le ha ido.
// ---------------------------------------------------------------

export type EjerciciosDeLeccion = { total: number; hechos: number };

export async function ejerciciosPorLeccion(
  alumnoId: string,
  leccionIds: string[]
): Promise<Record<string, EjerciciosDeLeccion>> {
  if (leccionIds.length === 0) return {};
  const cliente = baseLms();

  const [ejercicios, intentos] = await Promise.all([
    cliente
      .from("ejercicios_leccion")
      .select("id, leccion_id")
      .in("leccion_id", leccionIds)
      .returns<{ id: string; leccion_id: string }[]>(),
    // Sin alumno —el equipo repasando contenido— no hay intentos que
    // contar, y se ahorra el viaje.
    alumnoId
      ? cliente
          .from("intentos_ejercicio")
          .select("ejercicio_id, ejercicios_leccion!inner(leccion_id)")
          .eq("alumno_id", alumnoId)
          .in("ejercicios_leccion.leccion_id", leccionIds)
          .returns<{ ejercicio_id: string }[]>()
      : Promise.resolve({ data: [] as { ejercicio_id: string }[], error: null }),
  ]);

  registrar("No se pudieron contar los ejercicios del módulo", ejercicios.error);
  registrar("No se pudieron leer los intentos del módulo", intentos.error);

  const respondidos = new Set((intentos.data ?? []).map((i) => i.ejercicio_id));
  const salida: Record<string, EjerciciosDeLeccion> = {};

  for (const ejercicio of ejercicios.data ?? []) {
    const cuenta = salida[ejercicio.leccion_id] ?? { total: 0, hechos: 0 };
    salida[ejercicio.leccion_id] = cuenta;
    cuenta.total++;
    if (respondidos.has(ejercicio.id)) cuenta.hechos++;
  }

  return salida;
}

/**
 * Deja una lección por vista.
 *
 * `origen: 'lms'` la distingue de lo que un día venga migrado de
 * LearnDash, que es lo que permitirá deshacer solo la migración.
 *
 * El UNIQUE de la tabla convierte el segundo intento en un conflicto:
 * se ignora en vez de fallar, porque volver a marcar una lección ya
 * hecha es una pulsación de más, no un error.
 */
export async function completarLeccion(alumnoId: string, leccionId: string): Promise<boolean> {
  const { error } = await baseLms()
    .from("progreso_lecciones")
    .upsert(
      { alumno_id: alumnoId, leccion_id: leccionId, origen: "lms" },
      { onConflict: "alumno_id,leccion_id", ignoreDuplicates: true }
    );

  return registrar("No se pudo marcar la lección como completada", error);
}

/**
 * Deja constancia de un intento de ejercicio.
 *
 * Append-only, igual que `progreso_bloques` en la práctica: cada
 * intento es una fila y ninguno pisa al anterior. Sin esto el curso
 * corrige y no aprende nada del alumno, y es lo que después alimenta el
 * bucle de vuelta al profesor: no es lo mismo acertar a la primera que
 * a la cuarta, y un porcentaje final no distingue las dos cosas.
 *
 * `origen: 'lms'` lo separa de lo que un día venga migrado de
 * LearnDash, que tiene 13.101 registros de actividad de quiz.
 */
export async function guardarIntento(
  alumnoId: string,
  ejercicioId: string,
  correcto: boolean
): Promise<boolean> {
  const { error } = await baseLms().from("intentos_ejercicio").insert({
    alumno_id: alumnoId,
    ejercicio_id: ejercicioId,
    correcto,
    origen: "lms",
  });

  return registrar("No se pudo guardar el intento", error);
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
  nivel: string,
  /**
   * Cuándo empezó el alumno, tal cual viene de su ficha. El drip por
   * curso se resuelve aquí dentro: a quien le hayan abierto un curso
   * entero se le pasa `null`, que es lo que `lib/drip.ts` entiende por
   * "sin espera".
   *
   * Preguntar las excepciones por curso no cuesta viajes:
   * `excepcionesDelAlumno` va por `cache()` y esta misma petición ya la
   * ha pedido en `cursosAsignados`.
   */
  fechaInicio: Date | null = null
): Promise<EstadoCurso[]> {
  const cursos = await cursosAsignados(plan, nivel, alumnoId);
  if (cursos.length === 0) return [];

  const estados = await Promise.all(
    cursos.map(async (curso) =>
      estadoDelCurso(alumnoId, curso, (await sinDripEn(alumnoId, curso.id)) ? null : fechaInicio)
    )
  );

  return estados.slice().sort((a, b) => {
    if (a.ultimaActividad === b.ultimaActividad) return 0;
    if (a.ultimaActividad === null) return 1;
    if (b.ultimaActividad === null) return -1;
    return a.ultimaActividad > b.ultimaActividad ? -1 : 1;
  });
}
