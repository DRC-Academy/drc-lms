// ---------------------------------------------------------------
// LECTURAS CONTRA DRC GESTIÓN
//
// Todo lo que el LMS sabe de un alumno sale de `vista_perfil_alumno` y
// de `class_analyses`. Aquí se leen, se normalizan y se deduplican; el
// resto de la aplicación no vuelve a tocar Supabase.
//
// Las reglas puras sobre esos datos (examen, nivel, fechas, parseo)
// están en `lib/perfil.ts`, que no es server-only y por tanto se puede
// usar desde cualquier sitio.
//
// Solo SELECT: `soloLectura()` no expone ninguna otra operación.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { soloLectura } from "@/lib/supabase-server";
import {
  asGuiaProxima,
  asObject,
  comoBooleano,
  comoEnteroOpcional,
  comoTexto,
  comoTextoOpcional,
} from "@/lib/perfil";
import type { PerfilAlumno, ResumenAlumno, UltimaClase } from "@/lib/data";
import type { FilaCalendario } from "@/lib/calendario-gestion";

type Fila = Record<string, unknown>;

// ---------------------------------------------------------------
// NORMALIZACIÓN
// ---------------------------------------------------------------

function aPerfil(fila: Fila): PerfilAlumno {
  return {
    alumnoId: comoTexto(fila.alumno_id),
    nombre: comoTexto(fila.nombre),
    email: comoTexto(fila.email),
    nivel: comoTexto(fila.nivel),
    plan: comoTexto(fila.plan),
    producto: comoTextoOpcional(fila.producto),
    objetivoSetter: comoTextoOpcional(fila.objetivo_setter),
    profesor: comoTexto(fila.profesor),
    fechaInicio: comoTextoOpcional(fila.fecha_inicio),
    ocupacion: comoTextoOpcional(fila.ocupacion),
    objetivoPerfil: comoTextoOpcional(fila.objetivo_perfil),
    puntosFuertes: comoTextoOpcional(fila.puntos_fuertes),
    puntosDebiles: comoTextoOpcional(fila.puntos_debiles),
    estiloAprendizaje: comoTextoOpcional(fila.estilo_aprendizaje),
    focoRecomendado: comoTextoOpcional(fila.foco_recomendado),
    respuestasFormulario: asObject(fila.respuestas_formulario),
    tienePerfil: comoBooleano(fila.tiene_perfil),
    // Las cinco del banner de ritmo. Como el token, aguantan que la
    // vista todavía no las tenga: los conversores devuelven null en vez
    // de romper, y sin ellas la pantalla enseña menos, no falla.
    // Ver `supabase/gestion-vista-perfil-ritmo.sql`.
    horasSemanales: comoEnteroOpcional(fila.horas_semanales),
    planContratado: comoTextoOpcional(fila.plan_contratado),
    nivelProfesor: comoTextoOpcional(fila.nivel_profesor),
    nivelFicha: comoTextoOpcional(fila.nivel_ficha),
    nivelPrueba: comoTextoOpcional(fila.nivel_prueba),
    // `comoTextoOpcional` devuelve null si no es una cadena, así que
    // aguanta que la columna todavía no exista en la vista de Gestión.
    formToken: comoTextoOpcional(fila.form_token),
    formTokenEnviadoEn: comoTextoOpcional(fila.form_token_enviado_en),
    // Las dos de «Mis clases». Aguantan igual que las anteriores que la
    // vista de Gestión todavía no las tenga: `comoTextoOpcional`
    // devuelve null y `slots` se queda en undefined, que es lo que
    // `normalizarSlots` trata como "sin horario".
    // Ver `supabase/gestion-vista-perfil-clases.sql`.
    meetLink: comoTextoOpcional(fila.meet_link),
    slots: fila.slots ?? null,
  };
}

/**
 * Una fila de `class_analyses` como `UltimaClase`.
 *
 * Los nombres de columna son los de la tabla, no los de la vista que
 * esto leía antes (ver `ULTIMA_CLASE` más abajo). Las formas son
 * idénticas —comprobado columna a columna: `class_date` llega como día
 * ISO corto y `next_class_guide` como cadena JSON, igual que
 * `fecha_clase` y `guia_proxima`—, así que el resto de la aplicación no
 * se entera del cambio.
 */
function aUltimaClase(fila: Fila): UltimaClase {
  return {
    alumnoId: comoTexto(fila.student_id),
    fechaClase: comoTexto(fila.class_date),
    titulo: comoTexto(fila.class_title),
    temas: comoTexto(fila.topics_covered),
    errores: comoTexto(fila.errors_detected),
    notasProgreso: comoTexto(fila.progress_notes),
    guiaProxima: asGuiaProxima(fila.next_class_guide),
    analizadoEn: comoTexto(fila.analyzed_at),
  };
}

/**
 * Un alumno puede tener más de una fila por assignments duplicadas en
 * Gestión. Nos quedamos con la primera. El `order` de las consultas fija
 * cuál es "la primera": sin él PostgREST no garantiza ningún orden y el
 * alumno duplicado cambiaría de datos entre recargas.
 */
function deduplicar(filas: Fila[]): Fila[] {
  const vistos = new Set<string>();
  const salida: Fila[] = [];

  for (const fila of filas) {
    const id = comoTexto(fila.alumno_id);
    if (id === "" || vistos.has(id)) continue;
    vistos.add(id);
    salida.push(fila);
  }

  return salida;
}

// ---------------------------------------------------------------
// CONSULTAS
// ---------------------------------------------------------------

/**
 * Perfil de un alumno, o null si ese id no existe en la vista.
 *
 * Envuelto en `cache()` de React, que deduplica dentro de una misma
 * petición. Hace falta desde que la cabecera del curso vive en un layout:
 * el layout necesita el nombre para el avatar y la página necesita el
 * plan y la fecha de inicio, y son dos componentes distintos preguntando
 * lo mismo. Sin esto serían dos viajes a Gestión por página.
 */
export const obtenerPerfil = cache(async (alumnoId: string): Promise<PerfilAlumno | null> => {
  const { data, error } = await soloLectura("vista_perfil_alumno")
    .select("*")
    .eq("alumno_id", alumnoId)
    .order("alumno_id", { ascending: true })
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo leer vista_perfil_alumno:", error.message);
    return null;
  }

  const filas = deduplicar(data ?? []);
  return filas.length > 0 ? aPerfil(filas[0]) : null;
});

// ---------------------------------------------------------------
// CUÁL ES «LA ÚLTIMA CLASE», Y POR QUÉ YA NO SALE DE LA VISTA
//
// Esto leía `vista_ultima_clase`, que da una fila por alumno.
// Comprobado contra los datos, fila a fila, esa vista es
//
//     la más reciente de class_analyses por alumno
//     con analysis_status = 'ready'
//     Y validation_status IN ('approved', 'auto_approved', 'ok')
//
// —176 de 176 filas encajan con esa regla, incluido el `analizado_en`
// exacto—. La regla es la correcta y no cambia. Lo que cambia es de
// dónde sale: ahora se lee la tabla y el filtro se escribe aquí.
//
// POR QUÉ NO SEGUIR LEYENDO LA VISTA, si hace lo mismo. Porque hacía lo
// mismo por casualidad documental: la definición vive en Gestión, nadie
// de este lado la había leído nunca, y el día que se descubrió fue
// persiguiendo por qué 21 alumnos tenían aquí una clase más vieja que
// la última analizada. Con la regla escrita en este módulo, el próximo
// que se lo pregunte lo lee aquí en vez de deducirlo de los datos.
//
// QUÉ SIGNIFICA EL FILTRO DE VALIDACIÓN. Gestión marca `review` la
// clase cuyo transcript dispara una heurística suya —demasiado corto,
// duración insuficiente…— y la deja esperando a que una persona la
// mire. Hasta que la miran, esa clase NO cuenta como última clase del
// alumno, aunque su análisis esté completo. No es un fallo: es la cola
// de revisión de Gestión, y el LMS la respeta. La consecuencia es real
// y está aceptada: hoy 21 de 180 alumnos tienen aquí una clase anterior
// a su última analizada, y se resuelve sola cuando la cola se trabaja.
//
// ES UNA LISTA BLANCA, NO UNA LISTA NEGRA, y esa es la parte que
// importa: `rejected` —la clase que una persona miró y descartó— queda
// fuera por no estar en la lista, y también quedará fuera cualquier
// estado que Gestión invente mañana. Con una lista negra de `rejected`,
// un estado nuevo entraría solo y nadie se enteraría.
//
// SE CAMBIA AQUÍ, en la lectura que comparten todas las pantallas, y no
// en el generador: si la ficha, el panel y la práctica dijeran cada uno
// una clase distinta, tendríamos tres verdades.
//
// EL DESEMPATE ES `analyzed_at`, igual que en el resto del módulo: hay
// alumnos con dos clases el mismo día y sin él la fila elegida cambia
// entre recargas.
// ---------------------------------------------------------------

/** Las columnas de `class_analyses` que componen una `UltimaClase`. */
const ULTIMA_CLASE =
  "student_id, class_date, class_title, topics_covered, errors_detected, progress_notes, next_class_guide, analyzed_at";

/**
 * Los estados de validación que cuentan como clase del alumno.
 *
 * `approved` la revisó una persona; `auto_approved` pasó la heurística
 * sin que nadie tuviera que mirarla; `ok` es el estado viejo, anterior a
 * que la validación tuviera estados, y sigue habiendo 24 filas así.
 *
 * Fuera quedan `review` —esperando revisión— y `rejected`, que es una
 * clase que alguien miró y descartó.
 */
const VALIDACION_ACEPTADA = ["approved", "auto_approved", "ok"] as const;

/**
 * Última clase analizada y validada de un alumno, o null si no tiene
 * ninguna.
 *
 * Null no significa «no ha dado clase»: significa que no tiene ninguna
 * que haya pasado la validación. Un alumno cuyas clases están todas en
 * la cola de revisión llega aquí como si no tuviera ninguna, y eso es lo
 * que se quiere: el generador no trabaja con un transcript que nadie ha
 * dado por bueno.
 */
// ---------------------------------------------------------------
// LAS CLASES DEL ALUMNO
//
// Dos lecturas, y las dos las consumen `proximaDelAlumno` y
// `semanasDelAlumno`: el calendario de Gestión (qué clases hay, con qué
// profesor y con qué enlace) y los 'quita' de las excepciones (cuáles de
// esas no van a ocurrir). Si falla una lectura se devuelve vacío y se
// registra: sin calendario el alumno lee que aún no tiene su próxima
// clase, y sin excepciones ve la clase que dice el calendario.
// ---------------------------------------------------------------

/** Las columnas de `vista_calendario_alumno`, nombradas: las de `FilaCalendario`. */
const CALENDARIO =
  "alumno_id, nombre_en_celda, teacher_id, profesor, celda, dia, hora, estado, alumno_celda, alumno_base, estado_base, week_date, recovery_for, rescheduled_to, asignacion_inicio, asignacion_alta, alumno_alta, baja, meet_link";

/** Las celdas del calendario de Gestión que nombran al alumno. */
export const obtenerCalendario = cache(async (alumnoId: string): Promise<FilaCalendario[]> => {
  const { data, error } = await soloLectura("vista_calendario_alumno")
    .select(CALENDARIO)
    .eq("alumno_id", alumnoId)
    .order("teacher_id", { ascending: true })
    .order("celda", { ascending: true })
    .returns<FilaCalendario[]>();

  if (error) {
    console.error("[gestion] No se pudo leer vista_calendario_alumno:", error.message);
    return [];
  }
  return (data ?? []).filter(
    (f) => typeof f.teacher_id === "string" && typeof f.celda === "string" && typeof f.nombre_en_celda === "string"
  );
});

/**
 * Los 'quita' del alumno: clases que Gestión tiene anotadas como que no
 * van a ocurrir. Crudos: los valida `normalizarQuitas`.
 */
export const obtenerQuitas = cache(async (alumnoId: string): Promise<unknown[]> => {
  const { data, error } = await soloLectura("vista_excepciones_clase")
    .select("tipo, fecha, hora")
    .eq("alumno_id", alumnoId)
    .eq("tipo", "quita")
    .order("fecha", { ascending: true })
    .returns<unknown[]>();

  if (error) {
    console.error("[gestion] No se pudo leer vista_excepciones_clase:", error.message);
    return [];
  }
  return data ?? [];
});

/**
 * Todas las excepciones del alumno —'quita' y 'añade'—, con el tipo del
 * parte y la fecha original. Las pide el calendario de «Clases»: los
 * 'quita' para las canceladas y los 'añade' de tipo reprogramada para
 * saber de dónde viene una clase movida. Crudas: las validan
 * `normalizarQuitas` y `normalizarReprogramaciones`.
 */
export const obtenerExcepciones = cache(async (alumnoId: string): Promise<unknown[]> => {
  const { data, error } = await soloLectura("vista_excepciones_clase")
    .select("tipo, class_type, fecha, hora, original_date")
    .eq("alumno_id", alumnoId)
    .order("fecha", { ascending: true })
    .returns<unknown[]>();

  if (error) {
    console.error("[gestion] No se pudo leer vista_excepciones_clase:", error.message);
    return [];
  }
  return data ?? [];
});

/**
 * El nombre de cada profesor, por `teacher_id`, para el historial de
 * clases: el que dio cada una, que puede ser un suplente o alguien que
 * ya no le da clase. Sale de `vista_profesores`, que solo tiene eso.
 * Si no se puede leer, el historial se enseña sin nombres.
 */
export const obtenerNombresProfesor = cache(async (): Promise<Map<string, string>> => {
  const { data, error } = await soloLectura("vista_profesores")
    .select("teacher_id, profesor")
    .order("teacher_id", { ascending: true })
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo leer vista_profesores:", error.message);
    return new Map();
  }
  const nombres = new Map<string, string>();
  for (const fila of data ?? []) {
    const id = comoTexto(fila.teacher_id);
    const nombre = comoTexto(fila.profesor).trim();
    if (id && nombre) nombres.set(id, nombre);
  }
  return nombres;
});

export async function obtenerUltimaClase(alumnoId: string): Promise<UltimaClase | null> {
  const { data, error } = await soloLectura("class_analyses")
    .select(ULTIMA_CLASE)
    .eq("student_id", alumnoId)
    .eq("analysis_status", "ready")
    .in("validation_status", VALIDACION_ACEPTADA)
    .order("class_date", { ascending: false })
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo leer la última clase de class_analyses:", error.message);
    return null;
  }

  const filas = data ?? [];
  return filas.length > 0 ? aUltimaClase(filas[0]) : null;
}

/**
 * Perfil y última clase de una sola vez: es lo que necesita la ficha.
 *
 * El perfil puede venir vacío. Hay al menos un alumno con clase analizada
 * pero sin fila en `vista_perfil_alumno`, y a ese alumno se le muestra su
 * ficha con lo que haya: si falta un dato se enseña menos, nunca se cierra
 * la puerta. Solo devolvemos null cuando no existe absolutamente nada,
 * que es el único caso en el que el id no corresponde a nadie.
 */
export async function obtenerAlumno(
  alumnoId: string
): Promise<{ perfil: PerfilAlumno | null; ultimaClase: UltimaClase | null } | null> {
  const [perfil, ultimaClase] = await Promise.all([
    obtenerPerfil(alumnoId),
    obtenerUltimaClase(alumnoId),
  ]);

  if (!perfil && !ultimaClase) return null;
  return { perfil, ultimaClase };
}

// ---------------------------------------------------------------
// LECTURAS DEL PANEL DEL EQUIPO
//
// El panel necesita a los 174 de una vez y con más campos que el
// buscador: de `plan`, `ocupacion` y `objetivo_perfil` sale quién es
// elegible para cada modo de generación, y de `fecha_inicio` cuándo
// empezó. Son dos consultas —las dos vistas del contrato— y de ahí no
// se vuelve a tocar Gestión.
// ---------------------------------------------------------------

export type AlumnoPanel = {
  alumnoId: string;
  nombre: string;
  nivel: string;
  plan: string;
  profesor: string;
  ocupacion: string | null;
  objetivoPerfil: string | null;
  fechaInicio: string | null;
  /**
   * Las tres columnas de nivel de la ficha de IA. Con ellas y con
   * `nivel` —la casilla del alta— el panel puede contestar si el nivel
   * de un alumno está MEDIDO o solo tecleado, que no es lo mismo.
   *
   * La regla que las ordena es `origenDelNivel` en `lib/estimacion.ts`,
   * y no se repite aquí: esto solo las trae.
   */
  nivelProfesor: string | null;
  nivelFicha: string | null;
  nivelPrueba: string | null;
};

/**
 * Todos los alumnos con ficha, sin recortar.
 *
 * DEPENDE DE `supabase/gestion-vista-perfil-ritmo.sql`, que es lo que
 * pone las tres columnas de nivel en la vista. A diferencia de
 * `obtenerPerfil`, que lee con `select("*")` y aguanta que falten, aquí
 * se piden por nombre: si la migración se revirtiera, PostgREST daría
 * 42703 y esta función devolvería la lista vacía. No es silencioso —el
 * panel se marca `incompleto` y lo dice en pantalla—, pero conviene
 * saberlo antes de tocar la vista de Gestión.
 */
export async function alumnosDelPanel(): Promise<AlumnoPanel[]> {
  const { data, error } = await soloLectura("vista_perfil_alumno")
    .select(
      "alumno_id, nombre, nivel, plan, profesor, ocupacion, objetivo_perfil, fecha_inicio, nivel_profesor, nivel_ficha, nivel_prueba"
    )
    .order("nombre", { ascending: true })
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo listar para el panel:", error.message);
    return [];
  }

  return deduplicar(data ?? []).map((fila) => ({
    alumnoId: comoTexto(fila.alumno_id),
    nombre: comoTexto(fila.nombre),
    nivel: comoTexto(fila.nivel),
    plan: comoTexto(fila.plan),
    profesor: comoTexto(fila.profesor),
    ocupacion: comoTextoOpcional(fila.ocupacion),
    objetivoPerfil: comoTextoOpcional(fila.objetivo_perfil),
    fechaInicio: comoTextoOpcional(fila.fecha_inicio),
    nivelProfesor: comoTextoOpcional(fila.nivel_profesor),
    nivelFicha: comoTextoOpcional(fila.nivel_ficha),
    nivelPrueba: comoTextoOpcional(fila.nivel_prueba),
  }));
}

// ---------------------------------------------------------------
// LOS ALUMNOS DEL CRON DE AVISOS
//
// Es la única lectura de Gestión que se lleva el EMAIL de todos a la
// vez. Está justificada —sin dirección no hay a quién avisar— y por eso
// vive aquí, en el módulo que ya es el único que habla con Gestión, y
// no en el del cron.
//
// Ese email no se pinta en ninguna pantalla ni se escribe en ningún
// log: solo va al `to:` de Resend. Ver la nota del panel, que dejó de
// enseñarlos por lo mismo.
// ---------------------------------------------------------------

export type AlumnoAviso = {
  alumnoId: string;
  nombre: string;
  email: string;
  plan: string;
  nivel: string;
  /** Sin ella no hay drip que anunciar: el curso entero está abierto. */
  fechaInicio: string | null;
};

export async function alumnosParaAvisos(): Promise<AlumnoAviso[]> {
  const { data, error } = await soloLectura("vista_perfil_alumno")
    .select("alumno_id, nombre, email, plan, nivel, fecha_inicio")
    .order("alumno_id", { ascending: true })
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo listar para los avisos:", error.message);
    return [];
  }

  return deduplicar(data ?? []).map((fila) => ({
    alumnoId: comoTexto(fila.alumno_id),
    nombre: comoTexto(fila.nombre),
    email: comoTexto(fila.email),
    plan: comoTexto(fila.plan),
    nivel: comoTexto(fila.nivel),
    fechaInicio: comoTextoOpcional(fila.fecha_inicio),
  }));
}

export type ClasePanel = {
  alumnoId: string;
  titulo: string;
  /** Lo que de verdad importa: si el análisis trae contenido o vino vacío. */
  conTranscript: boolean;
  fechaClase: string;
};

/**
 * La última clase de cada alumno, para saber quién tiene transcript.
 *
 * MISMA DEFINICIÓN QUE `obtenerUltimaClase`, filtro de validación
 * incluido: la más reciente `ready` y validada de `class_analyses`. El
 * panel tiene que contar lo mismo que la ficha, o el equipo ve una
 * fecha en una pantalla y otra en la de al lado.
 *
 * No basta con tener fila: hay filas con `temas` y `errores` vacíos, que
 * es una clase registrada sin análisis detrás. Para el panel eso cuenta
 * igual que no tenerla, porque el modo repaso no puede construir nada.
 *
 * SE PAGINA, y no es por prudencia. PostgREST corta en 1000 filas y no
 * hay `limit` que lo suba: hoy hay 1279 clases `ready` y validadas, así
 * que una sola consulta perdería 279 —y como vienen ordenadas por
 * fecha, las que se perderían son las de los alumnos que llevan más
 * tiempo sin clase, que desaparecerían del panel enteros—. La vista
 * devolvía una fila por alumno y nunca llegó a rozar el tope; la tabla
 * son todas las clases de todos, y sí lo roza.
 */
const PAGINA = 1000;

export async function clasesDelPanel(): Promise<ClasePanel[]> {
  const filas: Fila[] = [];

  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await soloLectura("class_analyses")
      .select("student_id, class_title, topics_covered, errors_detected, class_date, analyzed_at")
      .eq("analysis_status", "ready")
      .in("validation_status", VALIDACION_ACEPTADA)
      .order("class_date", { ascending: false })
      .order("analyzed_at", { ascending: false })
      .range(desde, desde + PAGINA - 1)
      .returns<Fila[]>();

    if (error) {
      console.error("[gestion] No se pudo leer las clases para el panel:", error.message);
      return [];
    }

    const pagina = data ?? [];
    filas.push(...pagina);
    if (pagina.length < PAGINA) break;
  }

  const vistos = new Set<string>();
  const salida: ClasePanel[] = [];

  for (const fila of filas) {
    const alumnoId = comoTexto(fila.student_id);
    if (alumnoId === "" || vistos.has(alumnoId)) continue;
    vistos.add(alumnoId);

    salida.push({
      alumnoId,
      titulo: comoTexto(fila.class_title),
      conTranscript:
        comoTexto(fila.topics_covered).trim() !== "" ||
        comoTexto(fila.errors_detected).trim() !== "",
      fechaClase: comoTexto(fila.class_date),
    });
  }

  return salida;
}

const CAMPOS_RESUMEN = "alumno_id, nombre, email, nivel, profesor";

function aResumen(fila: Fila): ResumenAlumno {
  return {
    alumnoId: comoTexto(fila.alumno_id),
    nombre: comoTexto(fila.nombre),
    email: comoTexto(fila.email),
    nivel: comoTexto(fila.nivel),
    profesor: comoTexto(fila.profesor),
  };
}

/**
 * `%` y `_` son comodines de LIKE. Sin escaparlos, un alumno que escriba
 * "%" en el buscador haría que la consulta devolviese a todo el mundo.
 */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Prepara un patrón de LIKE para meterlo dentro de un `or(...)`.
 *
 * Ahí dentro la coma y el paréntesis separan condiciones, así que el
 * valor va entrecomillado o un alumno apellidado "Ruiz, Ana" partiría el
 * filtro en dos. Y entre comillas PostgREST se queda con el carácter que
 * sigue a cada barra: las que puso `escaparLike` hay que duplicarlas para
 * que lleguen enteras a LIKE y sigan escapando el comodín.
 */
function valorEnOr(patron: string): string {
  return `"${patron.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

/**
 * Resuelve el alumno a partir de su email. Es lo que convierte el enlace
 * del correo en una sesión, y también lo que decide si un email existe:
 * la pantalla de acceso pregunta aquí antes de mandar nada.
 *
 * Se busca con `ilike` sin comodines, que en PostgREST es una igualdad
 * que ignora mayúsculas. Hace falta porque en Gestión los emails están
 * escritos como los tecleó cada alumno y el que llega del formulario
 * viene siempre en minúsculas.
 *
 * Devuelve null si no hay nadie con ese email, y quien llama NO debe
 * contárselo al visitante: saber qué direcciones tienen ficha es saber
 * quién estudia en la academia.
 */
export async function buscarAlumnoPorEmail(email: string): Promise<ResumenAlumno | null> {
  const limpio = email.trim();
  if (limpio === "") return null;

  const { data, error } = await soloLectura("vista_perfil_alumno")
    .select(CAMPOS_RESUMEN)
    .ilike("email", escaparLike(limpio))
    .order("alumno_id", { ascending: true })
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo buscar por email en vista_perfil_alumno:", error.message);
    return null;
  }

  // Mismo motivo que en la ficha: un alumno puede traer varias filas por
  // assignments duplicadas, y el `order` fija cuál es la primera.
  const filas = deduplicar(data ?? []);
  return filas.length > 0 ? aResumen(filas[0]) : null;
}

/**
 * Listado para la home del equipo. Deduplica antes de recortar, para que
 * el límite cuente alumnos y no filas.
 *
 * Con `busqueda` filtra por nombre O POR CORREO sobre los 174 alumnos, no
 * solo sobre los 20 que se ven: un buscador que solo mira la primera
 * página no sirve para encontrar a nadie.
 *
 * Las dos columnas van en el mismo `or` y con el mismo trozo de texto, sin
 * adivinar de antemano qué se ha escrito. Al equipo le llegan incidencias
 * con el correo delante —es lo que trae el email del alumno o el pedido de
 * WooCommerce—, y con el nombre a veces no coincide: en Gestión está el
 * nombre completo y quien pregunta escribe solo uno. Como es un `contiene`,
 * también vale el dominio suelto o la parte de antes de la arroba.
 */
export async function listarAlumnos(busqueda = "", limite = 20): Promise<ResumenAlumno[]> {
  const termino = busqueda.trim();

  let consulta = soloLectura("vista_perfil_alumno")
    .select(CAMPOS_RESUMEN)
    .order("nombre", { ascending: true });

  if (termino !== "") {
    const patron = valorEnOr(`%${escaparLike(termino)}%`);
    consulta = consulta.or(`nombre.ilike.${patron},email.ilike.${patron}`);
  }

  const { data, error } = await consulta.returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo listar vista_perfil_alumno:", error.message);
    return [];
  }

  return deduplicar(data ?? []).slice(0, limite).map(aResumen);
}

// ---------------------------------------------------------------
// EL HISTORIAL DE CLASES
//
// La última clase sirve para saber qué acaba de ver el alumno, no para
// ver qué arrastra, y eso es la mitad del material del bloque único: un
// error que aparece en tres clases seguidas no es un despiste, es el
// punto que se le resiste de verdad, y no lo ve nadie porque cada clase
// se analiza sola.
//
// Se lee `class_analyses`, la misma tabla de la que sale todo lo demás
// de este módulo. Sigue siendo SOLO LECTURA contra Gestión, que es la
// regla que importa. Se piden columnas nombradas y nunca `*`: la
// tabla guarda el transcript entero, decenas de miles de caracteres por
// clase, y aquí no se usa para nada.
//
// LA LECTURA Y EL FILTRO VAN SEPARADOS a propósito. Para descartar la
// última clase hace falta su `analizado_en`, que llega por la otra
// consulta; si la lectura lo esperase, las dos irían en serie y el
// presupuesto de la ruta no da para un viaje de más. Así la consulta
// sale a la vez que el perfil y el recorte se hace después, ya en
// memoria.
// ---------------------------------------------------------------

/**
 * Cuántas clases anteriores se miran, como mucho.
 *
 * CUATRO, y sale de los datos, no de una intuición. De los 112 alumnos
 * con alguna clase analizada, 95 tienen cuatro o menos en total: con
 * esta ventana se lee su historial entero. Subir a seis alcanzaría a
 * 109 —tres alumnos más— y bajar a dos dejaría a la mitad de la gente
 * mirando solo un par de clases.
 *
 * Cuatro anteriores más la última son cinco clases, que es donde un
 * patrón repetido empieza a distinguirse de una coincidencia sin llenar
 * el mensaje de material viejo que ya no describe a esa persona.
 */
export const CLASES_ANTERIORES = 4;

/**
 * Y ninguna de más de esto.
 *
 * Hoy no descarta nada, y se sabe: el hueco más largo entre dos clases
 * analizadas consecutivas es de 21 días, y de la última a la quinta más
 * reciente hay 35 días en el peor caso. Existe para el alumno que para
 * tres meses y vuelve. Sus errores de hace un trimestre no son "lo que
 * arrastra", son los de otra persona, y darlos por vigentes sería peor
 * que no tener historial.
 */
const DIAS_MAXIMOS = 90;

/** Una clase analizada, con lo justo para leer patrones. */
export type ClaseAnalizada = {
  fechaClase: string;
  titulo: string;
  errores: string;
  /** La misma marca que `UltimaClase.analizadoEn`: es lo que las empareja. */
  analizadoEn: string;
};

/**
 * Las últimas clases analizadas de un alumno, de la más reciente a la
 * más antigua. Incluye la última: la descarta después `anterioresA`.
 *
 * Solo filas `ready` y con errores anotados. Un análisis fallido o vacío
 * no aporta ningún patrón, y contarlo gastaría un hueco de la ventana
 * sin decir nada. Hay alumnos con siete análisis de los que cinco
 * fallaron.
 *
 * Nunca lanza. Sin historial el bloque se genera igual, solo que con
 * menos: es material que lo mejora, no material sin el que no haya nada.
 */
export async function historialDeClases(alumnoId: string): Promise<ClaseAnalizada[]> {
  const { data, error } = await soloLectura("class_analyses")
    .select("class_date, class_title, errors_detected, analyzed_at")
    .eq("student_id", alumnoId)
    .eq("analysis_status", "ready")
    .not("errors_detected", "is", null)
    .order("class_date", { ascending: false })
    .order("analyzed_at", { ascending: false })
    // Una más de las que se quieren: la primera suele ser la última
    // clase, que se descarta en `anterioresA`.
    .limit(CLASES_ANTERIORES + 1)
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo leer class_analyses:", error.message);
    return [];
  }

  const salida: ClaseAnalizada[] = [];

  for (const fila of data ?? []) {
    const errores = comoTexto(fila.errors_detected).trim();
    const fechaClase = comoTexto(fila.class_date);
    if (errores === "" || fechaClase === "") continue;

    salida.push({
      fechaClase,
      titulo: comoTexto(fila.class_title),
      errores,
      analizadoEn: comoTexto(fila.analyzed_at),
    });
  }

  return salida;
}

/**
 * Del historial, las anteriores a la última: como mucho
 * `CLASES_ANTERIORES` y ninguna de más de `DIAS_MAXIMOS`.
 *
 * La última se descarta por su `analizado_en` y no por la fecha porque
 * hay alumnos con dos clases el mismo día, y filtrar por fecha se
 * llevaría por delante una clase entera.
 *
 * Función pura: quien llama ya tiene las dos lecturas hechas.
 */
export function anterioresA(
  historial: ClaseAnalizada[],
  ultimaAnalizadaEn: string | null,
  ahora: Date = new Date()
): ClaseAnalizada[] {
  const limite = ahora.getTime() - DIAS_MAXIMOS * 24 * 60 * 60 * 1000;
  const salida: ClaseAnalizada[] = [];

  for (const clase of historial) {
    if (ultimaAnalizadaEn !== null && clase.analizadoEn === ultimaAnalizadaEn) continue;

    const momento = Date.parse(clase.fechaClase);
    if (Number.isFinite(momento) && momento < limite) continue;

    salida.push(clase);
    if (salida.length === CLASES_ANTERIORES) break;
  }

  return salida;
}

// ---------------------------------------------------------------
// EL RECORRIDO CLASE A CLASE
//
// Es la pieza central de la pantalla de progreso, y la única del
// producto que ninguna aplicación puede copiar: es la prueba de que hay
// un profesor que estuvo delante y escribió lo que pasó.
//
// NO SE REUTILIZA `historialDeClases`, aunque lea la misma tabla. Aquel
// filtra por `errors_detected` y corta en cinco filas porque busca
// patrones de error para el generador de bloques; aquí se quiere lo
// contrario: el resumen de cada clase y todas las que haya. Compartir
// una consulta habría obligado a una de las dos a pedir de más.
//
// COLUMNAS NOMBRADAS, NUNCA `*`: `class_analyses` guarda el transcript
// entero, decenas de miles de caracteres por clase. Tampoco se piden
// `errors_detected`, `progress_notes`, `risk_signal` ni
// `risk_explanation`: la ficha del profesor no se le enseña al alumno,
// que es la misma línea que traza Gestión en su página pública.
//
// QUÉ CUENTA COMO CLASE ENSEÑABLE: que el análisis traiga título o
// resumen. Y no `analysis_status = 'ready'`, que es como filtra el
// generador: hay filas `ready` con el resumen vacío, y el criterio que
// importa aquí es si hay algo que leer, no en qué estado quedó el
// proceso.
// ---------------------------------------------------------------

/** Una clase tal y como se le enseña al alumno. */
export type ClaseDelRecorrido = {
  /** `class_analyses.id`. Sirve de clave de lista y de nada más. */
  id: string;
  fechaClase: string;
  titulo: string;
  /**
   * Los temas y el vocabulario que se trabajaron (`topics_covered`), tal
   * cual los escribe el análisis: "Vocabulario y expresiones: skimp,
   * off-putting… Práctica de speaking libre". Es lo que trabajó, no lo
   * que falló: los errores (`errors_detected`) no se piden.
   *
   * NO HAY RESUMEN, Y NO SE PIDE. `class_summary` está escrito en tercera
   * persona sobre el alumno —"Ella llegó sin cuaderno y muy metida en el
   * trabajo"— y esos comentarios no se le enseñan. El título y los temas
   * dicen lo que trabajó sin hablar de él.
   */
  temas: string;
  /** Casi siempre null: la columna está vacía en 858 de 867 filas. */
  numero: number | null;
  /** Quién dio la clase. El nombre lo pone `obtenerNombresProfesor`. */
  teacherId: string | null;
  /** Tiene análisis: título o temas. Sin él, la clase es su fecha y su profesor. */
  conAnalisis: boolean;
};

export type Recorrido = {
  /** Las clases con informe, de la más reciente a la más antigua. */
  clases: ClaseDelRecorrido[];
  /**
   * Todas las clases registradas, con informe o sin él, en el mismo
   * orden. Las enseña el historial de «Clases»: una clase sin informe
   * ocurrió igual, y allí sale con su fecha y su profesor, sin inventarle
   * contenido. La ficha de progreso sigue con `clases`.
   */
  todas: ClaseDelRecorrido[];
  /**
   * TODAS las clases registradas, tengan informe o no.
   *
   * Es mayor que `clases.length` y a propósito: hoy 351 de 867 análisis
   * fallaron, y comprobado que NO son reintentos de una misma clase
   * —solo 3 comparten alumno y fecha con una fila correcta—, sino clases
   * reales cuyo informe no llegó a escribirse. Esa clase ocurrió y el
   * alumno la dio, así que contarla es lo honesto; lo que no se puede es
   * pintar una tarjeta vacía con ella.
   */
  totalClases: number;
  /**
   * La cifra que enseña "Clases hechas".
   *
   * Es `max(mayor class_number, número de filas)`, exactamente como la
   * calcula Gestión. Casi siempre acaba siendo el número de filas,
   * porque `class_number` está vacío en 858 de las 867, pero el máximo
   * está para el alumno que sí lo trae y lo trae más alto: si su ficha
   * dice que va por la clase 30 y solo hay 22 análisis, ha dado 30.
   */
  clasesContadas: number;
};

/**
 * Tope de filas que se traen. Ningún alumno pasa hoy de 22, así que no
 * recorta a nadie: está para que un día raro no se traiga media tabla.
 */
const MAXIMO_CLASES = 200;

/**
 * El recorrido de un alumno. Nunca lanza: sin recorrido la pantalla
 * enseña su estado vacío, que es una frase, no un error.
 */
export async function obtenerRecorrido(alumnoId: string): Promise<Recorrido> {
  const { data, error } = await soloLectura("class_analyses")
    .select("id, teacher_id, class_number, class_title, topics_covered, class_date, analyzed_at")
    .eq("student_id", alumnoId)
    // Hay alumnos con dos clases el mismo día; `analyzed_at` desempata
    // para que el orden no cambie entre recargas.
    .order("class_date", { ascending: false })
    .order("analyzed_at", { ascending: false })
    .limit(MAXIMO_CLASES)
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo leer el recorrido de class_analyses:", error.message);
    return { clases: [], todas: [], totalClases: 0, clasesContadas: 0 };
  }

  const filas = data ?? [];
  const todas: ClaseDelRecorrido[] = [];
  let mayorNumero = 0;

  for (const fila of filas) {
    const numeroCrudo = Number(fila.class_number);
    const numero = Number.isFinite(numeroCrudo) && numeroCrudo > 0 ? numeroCrudo : null;

    // El mayor `class_number` se busca en TODAS las filas, también en
    // las que no tienen informe: una clase numerada cuenta como dada
    // aunque su análisis fallara.
    if (numero !== null && numero > mayorNumero) mayorNumero = numero;

    const titulo = comoTexto(fila.class_title).trim();
    const temas = comoTexto(fila.topics_covered).trim();
    const conAnalisis = titulo !== "" || temas !== "";

    todas.push({
      id: comoTexto(fila.id),
      fechaClase: comoTexto(fila.class_date),
      titulo,
      temas,
      numero,
      teacherId: comoTextoOpcional(fila.teacher_id),
      conAnalisis,
    });
  }

  return {
    clases: todas.filter((c) => c.conAnalisis),
    todas,
    totalClases: filas.length,
    clasesContadas: Math.max(mayorNumero, filas.length),
  };
}
