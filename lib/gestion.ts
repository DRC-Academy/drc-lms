// ---------------------------------------------------------------
// LECTURAS CONTRA DRC GESTIÓN
//
// Todo lo que el LMS sabe de un alumno sale de las dos vistas del
// contrato. Aquí se leen, se normalizan y se deduplican; el resto de
// la aplicación no vuelve a tocar Supabase.
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
  comoTexto,
  comoTextoOpcional,
} from "@/lib/perfil";
import type { PerfilAlumno, ResumenAlumno, UltimaClase } from "@/lib/data";

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
    // `comoTextoOpcional` devuelve null si no es una cadena, así que
    // aguanta que la columna todavía no exista en la vista de Gestión.
    formToken: comoTextoOpcional(fila.form_token),
    formTokenEnviadoEn: comoTextoOpcional(fila.form_token_enviado_en),
  };
}

function aUltimaClase(fila: Fila): UltimaClase {
  return {
    alumnoId: comoTexto(fila.alumno_id),
    fechaClase: comoTexto(fila.fecha_clase),
    titulo: comoTexto(fila.titulo),
    temas: comoTexto(fila.temas),
    errores: comoTexto(fila.errores),
    notasProgreso: comoTexto(fila.notas_progreso),
    guiaProxima: asGuiaProxima(fila.guia_proxima),
    analizadoEn: comoTexto(fila.analizado_en),
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

/**
 * Última clase analizada de un alumno, o null si todavía no tiene ninguna.
 * Solo 76 de los 174 alumnos tienen fila aquí.
 */
export async function obtenerUltimaClase(alumnoId: string): Promise<UltimaClase | null> {
  const { data, error } = await soloLectura("vista_ultima_clase")
    .select("*")
    .eq("alumno_id", alumnoId)
    .order("fecha_clase", { ascending: false })
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo leer vista_ultima_clase:", error.message);
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
};

/** Todos los alumnos con ficha, sin recortar. */
export async function alumnosDelPanel(): Promise<AlumnoPanel[]> {
  const { data, error } = await soloLectura("vista_perfil_alumno")
    .select("alumno_id, nombre, nivel, plan, profesor, ocupacion, objetivo_perfil, fecha_inicio")
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
 * No basta con tener fila: hay filas con `temas` y `errores` vacíos, que
 * es una clase registrada sin análisis detrás. Para el panel eso cuenta
 * igual que no tenerla, porque el modo repaso no puede construir nada.
 */
export async function clasesDelPanel(): Promise<ClasePanel[]> {
  const { data, error } = await soloLectura("vista_ultima_clase")
    .select("alumno_id, titulo, temas, errores, fecha_clase")
    .order("fecha_clase", { ascending: false })
    .returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo leer las clases para el panel:", error.message);
    return [];
  }

  const vistos = new Set<string>();
  const salida: ClasePanel[] = [];

  for (const fila of data ?? []) {
    const alumnoId = comoTexto(fila.alumno_id);
    if (alumnoId === "" || vistos.has(alumnoId)) continue;
    vistos.add(alumnoId);

    salida.push({
      alumnoId,
      titulo: comoTexto(fila.titulo),
      conTranscript: comoTexto(fila.temas).trim() !== "" || comoTexto(fila.errores).trim() !== "",
      fechaClase: comoTexto(fila.fecha_clase),
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
// `vista_ultima_clase` da una fila por alumno: la última. Sirve para
// saber qué acaba de ver, no para ver qué arrastra, y eso es la mitad
// del material del bloque único: un error que aparece en tres clases
// seguidas no es un despiste, es el punto que se le resiste de verdad,
// y no lo ve nadie porque cada clase se analiza sola.
//
// Se lee `class_analyses`, que es la tabla de la que sale esa vista.
// Sigue siendo SOLO LECTURA contra Gestión, que es la regla que
// importa; lo que se pierde es la comodidad de que el contrato fueran
// exactamente dos vistas. Se piden columnas nombradas y nunca `*`: la
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
