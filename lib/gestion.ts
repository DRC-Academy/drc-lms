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

/** Perfil de un alumno, o null si ese id no existe en la vista. */
export async function obtenerPerfil(alumnoId: string): Promise<PerfilAlumno | null> {
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
}

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

function aResumen(fila: Fila): ResumenAlumno {
  return {
    alumnoId: comoTexto(fila.alumno_id),
    nombre: comoTexto(fila.nombre),
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
    .select("alumno_id, nombre, nivel, profesor")
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
 * Con `busqueda` filtra por nombre sobre los 174 alumnos, no solo sobre
 * los 20 que se ven: un buscador que solo mira la primera página no sirve
 * para encontrar a nadie.
 */
export async function listarAlumnos(busqueda = "", limite = 20): Promise<ResumenAlumno[]> {
  const termino = busqueda.trim();

  let consulta = soloLectura("vista_perfil_alumno")
    .select("alumno_id, nombre, nivel, profesor")
    .order("nombre", { ascending: true });

  if (termino !== "") consulta = consulta.ilike("nombre", `%${escaparLike(termino)}%`);

  const { data, error } = await consulta.returns<Fila[]>();

  if (error) {
    console.error("[gestion] No se pudo listar vista_perfil_alumno:", error.message);
    return [];
  }

  return deduplicar(data ?? []).slice(0, limite).map(aResumen);
}
