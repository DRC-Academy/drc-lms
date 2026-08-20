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
import { partirModulo } from "@/lib/modulo";
import { baseLms } from "@/lib/supabase-lms";
import { claveCoincide, cursosDelAlumno } from "@/lib/cursos";
import { excepcionesDelAlumno } from "@/lib/accesos-manuales";

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

/**
 * EL HITO CERCANO: el módulo en el que está ahora mismo.
 *
 * Existe para el embudo del diploma. "Te faltan 179 lecciones" es la
 * meta, y una meta a 179 lecciones no mueve a nadie un martes; "te
 * faltan 4 para cerrar este módulo" sí, porque es esta semana. Los dos
 * números hacen falta y son datos distintos, así que ninguno repite al
 * otro.
 *
 * Sale de la misma consulta que ya se hacía: los módulos y las lecciones
 * están todos leídos y el progreso también. No cuesta un viaje más.
 */
export type HitoModulo = {
  /** El título ya limpio, sin el "Week 3 - Lesson 12:" de LearnDash. */
  titulo: string;
  total: number;
  completadas: number;
  /** Nunca cero: con cero el módulo estaría cerrado y el hito sería el siguiente. */
  restantes: number;
};

export type EstadoCurso = {
  curso: CursoFila;
  /** Lecciones del curso. */
  total: number;
  completadas: number;
  /** La primera sin completar, o null si ya está el curso entero. */
  siguiente: SiguienteLeccion | null;
  /** El módulo de esa lección, con su cuenta. Null con el curso terminado. */
  hito: HitoModulo | null;
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
  const salida: CursoFila[] = [];

  // Se recorren las claves y no los cursos: así el orden de salida es el
  // de relevancia que fija `cursosDelAlumno` (examen antes que general).
  for (const clave of cursosDelAlumno(plan, nivel)) {
    const encontrado = disponibles.find((curso) => claveCoincide(clave, curso));
    if (encontrado && !salida.some((c) => c.id === encontrado.id)) salida.push(encontrado);
  }

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
    hito: null,
    ultimaActividad: null,
  };

  const cliente = baseLms();

  const { data: modulos, error: errorModulos } = await cliente
    .from("modulos")
    .select("id, titulo, orden, visible_after")
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
  let moduloDelSiguiente: string | null = null;
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
      moduloDelSiguiente = leccion.modulo_id;
    }
  }

  // Segunda pasada, solo sobre el módulo en curso. Es sobre las mismas
  // filas que ya están en memoria: recorrerlas otra vez cuesta menos que
  // llevar un acumulador por módulo durante el bucle de arriba.
  let hito: HitoModulo | null = null;
  if (moduloDelSiguiente !== null) {
    const delModulo = ordenadas.filter((l) => l.modulo_id === moduloDelSiguiente);
    const hechas = delModulo.filter((l) => completadaEn.has(l.id)).length;

    hito = {
      // Sin el prefijo de LearnDash: en una fila de 50px, "Week 3 -
      // Lesson 12: Reported speech" se corta antes de decir de qué va.
      titulo: partirModulo(
        tituloModulo.get(moduloDelSiguiente) ?? "",
        ordenModulo.get(moduloDelSiguiente) ?? 0
      ).titulo,
      total: delModulo.length,
      completadas: hechas,
      restantes: delModulo.length - hechas,
    };
  }

  return { curso, total: ordenadas.length, completadas, siguiente, hito, ultimaActividad };
}

// ---------------------------------------------------------------
// EL ÍNDICE DEL CURSO
// ---------------------------------------------------------------

export type LeccionIndice = {
  id: string;
  titulo: string;
  /** Lección sintética del importador: solo ejercicios, sin teoría. */
  soloEjercicios: boolean;
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
 * Ninguna consulta trae `contenido`. Saber cuáles son las lecciones de
 * solo ejercicios se resuelve con una consulta aparte que filtra por
 * `contenido = ''` y devuelve únicamente ids: pesa unos cientos de
 * bytes en vez de los cientos de kilobytes que costaría traer el HTML
 * de todo el curso para mirar si está vacío.
 *
 * El filtro exige además `video_url is null`. Una lección de vídeo
 * tiene el contenido vacío —lo normal: son 158 de las 160— y sin esa
 * condición saldrían todas etiquetadas como "· ejercicios", que es
 * justo lo que no son.
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
  const cliente = baseLms();
  const vacio: ArbolCurso = { curso, modulos: [], total: 0, completadas: 0, leccionActual: null };

  const { data: modulos, error: e1 } = await cliente
    .from("modulos")
    .select("id, titulo, orden, visible_after")
    .eq("curso_id", curso.id)
    .order("orden")
    .returns<FilaModulo[]>();

  if (!registrar("No se pudieron leer los módulos", e1)) return vacio;
  const listaModulos = modulos ?? [];
  if (listaModulos.length === 0) return vacio;

  const idsModulo = listaModulos.map((m) => m.id);

  const [lecciones, soloEjercicios, progreso] = await Promise.all([
    cliente
      .from("lecciones")
      .select("id, titulo, orden, modulo_id")
      .in("modulo_id", idsModulo)
      .order("orden")
      .returns<FilaLeccion[]>(),
    cliente
      .from("lecciones")
      .select("id")
      .in("modulo_id", idsModulo)
      .eq("contenido", "")
      .is("video_url", null)
      .returns<{ id: string }[]>(),
    cliente
      .from("progreso_lecciones")
      .select("leccion_id, completada_en")
      .eq("alumno_id", alumnoId)
      .returns<FilaProgreso[]>(),
  ]);

  if (!registrar("No se pudieron leer las lecciones", lecciones.error)) return vacio;

  const sinTeoria = new Set((soloEjercicios.data ?? []).map((l) => l.id));
  const hechas = new Set((progreso.data ?? []).map((p) => p.leccion_id));

  const porModulo = new Map<string, FilaLeccion[]>();
  for (const leccion of lecciones.data ?? []) {
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
 * El curso entero, pero solo para ordenarlo: id, sitio en el módulo y
 * sitio del módulo en el curso. SIN TÍTULOS, que era la mitad del peso.
 *
 * De estas 191 filas se pintan cero: sirven para saber cuál es la
 * lección siguiente y la anterior —que pueden estar en otro módulo— y
 * para contar el progreso del curso en la cabecera.
 */
type FilaOrdenCurso = {
  id: string;
  orden: number;
  modulo_id: string;
  modulos: { orden: number } | null;
};

// ---------------------------------------------------------------
// LAS DOS LECTURAS QUE COMPARTEN LA CABECERA Y LA PÁGINA
//
// Desde que la cabecera vive en el layout, dos componentes distintos
// necesitan lo mismo: cuántas lecciones tiene el curso y cuáles lleva
// hechas el alumno. `cache()` de React las deduplica DENTRO DE UNA
// PETICIÓN, así que el layout y la página se reparten el mismo viaje en
// vez de hacer dos.
//
// Ojo con lo que NO es: no es una caché entre peticiones. Cada carga
// vuelve a preguntar, que es lo que queremos —el progreso cambia al
// completar una lección—.
// ---------------------------------------------------------------

/** Las lecciones del curso en bruto, sin ordenar. Ver `FilaOrdenCurso`. */
const ordenDelCurso = cache(async (cursoId: string): Promise<FilaOrdenCurso[] | null> => {
  const { data, error } = await baseLms()
    .from("lecciones")
    .select("id, orden, modulo_id, modulos!inner(orden)")
    .eq("modulos.curso_id", cursoId)
    .order("orden")
    .returns<FilaOrdenCurso[]>();

  if (!registrar("No se pudo leer el orden del curso", error)) return null;
  return data ?? [];
});

/** Lo que este alumno lleva completado, en todos sus cursos. */
const leccionesHechas = cache(async (alumnoId: string): Promise<Set<string>> => {
  const { data, error } = await baseLms()
    .from("progreso_lecciones")
    .select("leccion_id, completada_en")
    .eq("alumno_id", alumnoId)
    .returns<FilaProgreso[]>();

  registrar("No se pudo leer el progreso de lecciones", error);
  return new Set((data ?? []).map((p) => p.leccion_id));
});

/**
 * Cuántas lecciones del curso lleva hechas el alumno.
 *
 * Es lo único que la cabecera necesita de la base además del título del
 * curso, y sale de las dos lecturas de arriba, así que cuando la página
 * de lección ya las ha pedido esto no cuesta ningún viaje.
 */
export async function progresoDelCurso(
  alumnoId: string,
  cursoId: string
): Promise<{ completadas: number; total: number }> {
  const [orden, hechas] = await Promise.all([ordenDelCurso(cursoId), leccionesHechas(alumnoId)]);
  const lecciones = orden ?? [];

  return {
    total: lecciones.length,
    completadas: lecciones.filter((l) => hechas.has(l.id)).length,
  };
}

/**
 * Todo lo que necesita la vista de una lección, en UNA sola ola.
 *
 * Antes eran tres esperas encadenadas —lección, luego módulos, luego el
 * resto— porque cada consulta necesitaba los ids de la anterior. Con los
 * embeds esa cadena desaparece: las cinco consultas de abajo solo
 * dependen de lo que ya se sabe al entrar (el id de la lección, el del
 * curso y el del alumno), así que salen todas a la vez.
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

  const [conModulo, ordenCurso, hechas, soloEjercicios, ejercicios] = await Promise.all([
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
    // Estas dos las comparte con la cabecera del layout: van por
    // `cache()`, así que quien llegue segundo se engancha al mismo viaje.
    ordenDelCurso(curso.id),
    leccionesHechas(alumnoId),
    // Las de solo ejercicios de TODO el curso, no solo las del módulo:
    // son 3 ids y 139 bytes, y pedirlas por curso las saca de la cadena
    // de dependencias —no hace falta saber el módulo para pedirlas—.
    cliente
      .from("lecciones")
      .select("id, modulos!inner(curso_id)")
      .eq("modulos.curso_id", curso.id)
      .eq("contenido", "")
      .is("video_url", null)
      .returns<{ id: string }[]>(),
    cliente
      .from("ejercicios_leccion")
      .select("id, tipo, enunciado, opciones, correcta, explicacion, orden")
      .eq("leccion_id", leccionId)
      .order("orden")
      .returns<EjercicioFila[]>(),
  ]);

  if (!registrar("No se pudo leer la lección", conModulo.error)) return null;
  if (ordenCurso === null) return null;

  const leccion = (conModulo.data ?? [])[0];
  if (!leccion) return null;

  const modulo = leccion.modulos;

  // Una lección de otro curso no se sirve desde esta URL: si no, el slug
  // sería decorativo y bastaría con adivinar un uuid. Antes se comprobaba
  // buscándola entre los módulos del curso; ahora el propio embed dice de
  // qué curso cuelga y basta con compararlo.
  if (!modulo || modulo.curso_id !== curso.id) return null;

  const sinTeoria = new Set((soloEjercicios.data ?? []).map((l) => l.id));

  const ordenadas = ordenCurso.slice().sort((a, b) => {
    const dm = (a.modulos?.orden ?? 0) - (b.modulos?.orden ?? 0);
    return dm !== 0 ? dm : a.orden - b.orden;
  });

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
        completada,
        disponible: aperturaDeLeccion(visibleAfter, fechaInicio, completada, ahora).abierto,
      };
    });

  const apertura = aperturaDeLeccion(visibleAfter, fechaInicio, hechas.has(leccionId), ahora);

  return {
    disponible: apertura.abierto,
    diasParaAbrir: apertura.abierto ? null : apertura.diasRestantes,
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
  nivel: string
): Promise<EstadoCurso[]> {
  const cursos = await cursosAsignados(plan, nivel, alumnoId);
  if (cursos.length === 0) return [];

  const estados = await Promise.all(cursos.map((curso) => estadoDelCurso(alumnoId, curso)));

  return estados.slice().sort((a, b) => {
    if (a.ultimaActividad === b.ultimaActividad) return 0;
    if (a.ultimaActividad === null) return 1;
    if (b.ultimaActividad === null) return -1;
    return a.ultimaActividad > b.ultimaActividad ? -1 : 1;
  });
}
