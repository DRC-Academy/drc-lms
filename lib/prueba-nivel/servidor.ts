// ---------------------------------------------------------------
// LA PRUEBA DE NIVEL CONTRA LA BASE DEL LMS
//
// Lo que en Gestión hacen sus rutas contra `level_test_sessions` y
// `level_test_answers`, aquí contra `pruebas_nivel`
// (`supabase/lms-prueba-nivel.sql`). Las decisiones de la prueba —qué
// pregunta, si acertó, cuánto vale la redacción, qué nivel sale— son del
// motor (`lib/prueba-nivel/motor.ts`), que usa las funciones de Gestión sin
// tocar. Aquí solo se lee, se guarda y se decide quién puede.
//
// EL LMS NUNCA ESCRIBE EN GESTIÓN. El resultado se queda en el LMS.
//
// QUIÉN: `puedeHacerPrueba`. Hoy, con el interruptor encendido
// (`PRUEBA_NIVEL_ACTIVA=1`), quien ve el inicio del Black Pass. Abrirla
// después a los alumnos con plan es cambiar esa función y nada más.
//
// UNA EN CURSO POR ALUMNO (índice único en la base). Retomar es seguir con
// esa; repetir, una fila nueva cuando no hay ninguna abierta, y como mucho
// una cada 24 horas desde que terminó la última (`repetir.ts`): cada intento
// cuesta una corrección con IA.
//
// EL CERROJO: cada respuesta se guarda con `n_respuestas = lo que se leyó`.
// Si otra petición ha guardado antes (doble clic, dos pestañas), esta no
// escribe y devuelve la pregunta que toca ahora.
// ---------------------------------------------------------------

import "server-only";
import { createHash } from "node:crypto";
import bancoJson from "./banco.json";
import { baseLms } from "@/lib/supabase-lms";
import { cursosActivos } from "@/lib/cursos-servidor";
import { conInicioBlackPass } from "@/lib/inicio-black-pass";
import type { AccesoAlumno } from "@/lib/acceso-alumno";
import { evaluateWriting } from "./gestion/evaluateWriting";
import { GRAND_TOTAL } from "./gestion/constants";
import { repetirDesde } from "./repetir";
import type { Cefr, LTProgress, LTQuestionPublic } from "./gestion/types";
import {
  ESTADO_INICIAL,
  buscarPregunta,
  cursoRecomendado,
  preguntaQueToca,
  responderEscritura,
  responderLectura,
  resultadoFinal,
  yaRespondida,
  type EstadoPrueba,
  type Respuesta,
} from "./motor";

/** La huella del banco con el que se hace la prueba: sha256 de banco.json. */
export const HUELLA_BANCO = createHash("sha256").update(`${JSON.stringify(bancoJson, null, 2)}\n`).digest("hex");

/** El interruptor. Apagado por defecto: solo «1» lo enciende. */
export function pruebaActiva(): boolean {
  return process.env.PRUEBA_NIVEL_ACTIVA === "1";
}

/**
 * ¿Puede hacer la prueba? EL ÚNICO SITIO que lo decide. Hoy: interruptor
 * encendido y el inicio del Black Pass (pase sin plan con profesor). Para
 * abrirla a los alumnos con plan, se cambia aquí.
 */
export function puedeHacerPrueba(acceso: Pick<AccesoAlumno, "tienePase" | "origen" | "avisoPago">): boolean {
  return pruebaActiva() && conInicioBlackPass(acceso);
}

// ---------------------------------------------------------------
// LA FILA
// ---------------------------------------------------------------

type Fila = {
  id: string;
  alumno_id: string;
  estado: "en_curso" | "terminada" | "abandonada";
  dificultad_actual: number;
  pregunta_actual: string | null;
  respuestas: Respuesta[];
  n_respuestas: number;
  nivel: Cefr | null;
  provisional: boolean | null;
  curso_recomendado: string | null;
  creada_en: string;
  terminada_en: string | null;
};

const COLUMNAS =
  "id, alumno_id, estado, dificultad_actual, pregunta_actual, respuestas, n_respuestas, nivel, provisional, curso_recomendado, creada_en, terminada_en";

/** Las últimas del alumno, de la más nueva a la más vieja. Lanza si la base falla. */
async function ultimas(alumnoId: string): Promise<Fila[]> {
  const { data, error } = await baseLms()
    .from("pruebas_nivel")
    .select(COLUMNAS)
    .eq("alumno_id", alumnoId)
    .neq("estado", "abandonada")
    .order("creada_en", { ascending: false })
    .limit(5);
  if (error) throw new Error(`No se pudieron leer las pruebas de nivel: ${error.message}`);
  return (data ?? []) as Fila[];
}

async function una(alumnoId: string, pruebaId: string): Promise<Fila | null> {
  const { data, error } = await baseLms()
    .from("pruebas_nivel")
    .select(COLUMNAS)
    .eq("id", pruebaId)
    .eq("alumno_id", alumnoId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer la prueba de nivel: ${error.message}`);
  return (data as Fila | null) ?? null;
}

const estadoDe = (fila: Fila): EstadoPrueba => ({
  respuestas: Array.isArray(fila.respuestas) ? fila.respuestas : [],
  dificultad: fila.dificultad_actual,
  preguntaActual: fila.pregunta_actual,
});

// ---------------------------------------------------------------
// LO QUE VE EL ALUMNO
// ---------------------------------------------------------------

export type CursoDeLaPrueba = { id: string; slug: string; titulo: string };

/** El nivel va en código (B2): su nombre y su frase salen de los textos de la app, en su idioma. */
export type Resultado = {
  nivel: Cefr;
  provisional: boolean;
  curso: CursoDeLaPrueba | null;
  /** Mientras no puede repetirla (ISO): desde cuándo podrá. Null si ya puede. */
  repetirDesde: string | null;
};

export type Pregunta = {
  pruebaId: string;
  pregunta: LTQuestionPublic;
  progreso: LTProgress;
};

/** Lo que pinta el bloque del inicio. */
export type EstadoBloque =
  | { tipo: "nueva" }
  | { tipo: "en_curso"; respondidas: number; total: number }
  | { tipo: "terminada"; resultado: Resultado };

async function cursoPorId(id: string | null): Promise<CursoDeLaPrueba | null> {
  if (!id) return null;
  const curso = (await cursosActivos())?.find((c) => c.id === id);
  return curso ? { id: curso.id, slug: curso.slug, titulo: curso.titulo } : null;
}

async function resultadoDe(fila: Fila): Promise<Resultado | null> {
  if (fila.estado !== "terminada" || !fila.nivel) return null;
  return {
    nivel: fila.nivel,
    provisional: fila.provisional === true,
    curso: await cursoPorId(fila.curso_recomendado),
    repetirDesde: repetirDesde(fila.terminada_en, new Date()),
  };
}

function preguntaDe(fila: Fila): Pregunta | null {
  const siguiente = preguntaQueToca(estadoDe(fila));
  if (!siguiente.question) return null;
  return {
    pruebaId: fila.id,
    pregunta: siguiente.question,
    progreso: siguiente.progress,
  };
}

/** El estado para el bloque del inicio. Ante un fallo de la base, como nueva: el botón lleva igual. */
export async function estadoDelBloque(alumnoId: string): Promise<EstadoBloque> {
  try {
    const filas = await ultimas(alumnoId);
    const enCurso = filas.find((f) => f.estado === "en_curso");
    if (enCurso) return { tipo: "en_curso", respondidas: enCurso.n_respuestas, total: GRAND_TOTAL };
    const terminada = filas.find((f) => f.estado === "terminada");
    const resultado = terminada ? await resultadoDe(terminada) : null;
    return resultado ? { tipo: "terminada", resultado } : { tipo: "nueva" };
  } catch (error) {
    console.error("[prueba-nivel]", (error as Error).message);
    return { tipo: "nueva" };
  }
}

export type Vista =
  | { tipo: "bienvenida"; repitiendo: boolean }
  | { tipo: "pregunta"; datos: Pregunta }
  | { tipo: "resultado"; resultado: Resultado };

/** Lo que enseña la página de la prueba al abrirla. */
export async function vistaInicial(alumnoId: string, repetir: boolean): Promise<Vista> {
  const filas = await ultimas(alumnoId);
  const enCurso = filas.find((f) => f.estado === "en_curso");
  if (enCurso) {
    const datos = preguntaDe(enCurso);
    if (datos) return { tipo: "pregunta", datos };
  }
  const terminada = filas.find((f) => f.estado === "terminada");
  if (terminada) {
    // `?repetir=1` antes de tiempo (un enlace viejo): el resultado, que dice desde cuándo.
    const resultado = await resultadoDe(terminada);
    if (resultado && (!repetir || resultado.repetirDesde)) return { tipo: "resultado", resultado };
  }
  return { tipo: "bienvenida", repitiendo: Boolean(terminada) };
}

// ---------------------------------------------------------------
// EMPEZAR Y RESPONDER
// ---------------------------------------------------------------

/** Repetir antes de tiempo: no se crea la fila. `desde` (ISO) es cuándo podrá. */
export class EsperaParaRepetir extends Error {
  constructor(readonly desde: string) {
    super(`No puede repetir la prueba hasta ${desde}.`);
    this.name = "EsperaParaRepetir";
  }
}

/**
 * Empieza (o retoma, si ya hay una abierta) y devuelve la pregunta que toca.
 * Lanza `EsperaParaRepetir` si terminó la última hace menos de 24 horas.
 */
export async function empezar(alumnoId: string, email: string): Promise<Pregunta> {
  const filas = await ultimas(alumnoId);
  const abierta = filas.find((f) => f.estado === "en_curso");
  if (abierta) {
    const datos = preguntaDe(abierta);
    if (datos) return datos;
  }

  const anterior = filas.find((f) => f.estado === "terminada");
  const espera = anterior ? repetirDesde(anterior.terminada_en, new Date()) : null;
  if (espera) throw new EsperaParaRepetir(espera);

  const primera = preguntaQueToca(ESTADO_INICIAL);
  const { data, error } = await baseLms()
    .from("pruebas_nivel")
    .insert({
      alumno_id: alumnoId,
      email: email || null,
      estado: "en_curso",
      dificultad_actual: ESTADO_INICIAL.dificultad,
      pregunta_actual: primera.currentQuestionId,
      banco: HUELLA_BANCO,
    })
    .select(COLUMNAS)
    .single();

  // Otra pestaña la ha creado a la vez: el índice único lo ha parado. Se retoma esa.
  if (error?.code === "23505") {
    const otra = (await ultimas(alumnoId)).find((f) => f.estado === "en_curso");
    const datos = otra ? preguntaDe(otra) : null;
    if (datos) return datos;
  }
  if (error || !data) throw new Error(`No se pudo empezar la prueba de nivel: ${error?.message ?? "sin fila"}`);

  const datos = preguntaDe(data as Fila);
  if (!datos) throw new Error("El banco no tiene pregunta para empezar.");
  return datos;
}

export type EntradaRespuesta = {
  pruebaId: string;
  preguntaId: string;
  seleccion?: number;
  texto?: string;
  segundos?: number;
};

export type Salida =
  | { tipo: "pregunta"; datos: Pregunta }
  | { tipo: "resultado"; resultado: Resultado }
  | { tipo: "error"; status: number; mensaje: string };

const ESPERA_MINIMA_MS = 700;

/** Guarda una respuesta y devuelve lo siguiente: otra pregunta, o el resultado. */
export async function responder(alumnoId: string, entrada: EntradaRespuesta): Promise<Salida> {
  const fila = await una(alumnoId, entrada.pruebaId);
  if (!fila) return { tipo: "error", status: 404, mensaje: "No encontramos esta prueba." };

  if (fila.estado === "terminada") {
    const resultado = await resultadoDe(fila);
    return resultado ? { tipo: "resultado", resultado } : { tipo: "error", status: 409, mensaje: "La prueba ya está terminada." };
  }
  if (fila.estado !== "en_curso") return { tipo: "error", status: 409, mensaje: "Esta prueba ya no está abierta." };

  const estado = estadoDe(fila);
  const actual = (): Salida => {
    const datos = preguntaDe(fila);
    return datos ? { tipo: "pregunta", datos } : { tipo: "error", status: 500, mensaje: "No podemos seguir ahora mismo." };
  };

  // Gestión: rechazar envíos demasiado seguidos.
  const ultima = estado.respuestas.at(-1)?.answered_at;
  if (ultima && Date.now() - new Date(ultima).getTime() < ESPERA_MINIMA_MS) {
    return { tipo: "error", status: 429, mensaje: "Un momento, que vamos guardando." };
  }

  // Doble envío de una ya respondida, o una pestaña vieja con otra pregunta:
  // no se guarda nada y se devuelve la que toca.
  if (yaRespondida(estado, entrada.preguntaId) || entrada.preguntaId !== fila.pregunta_actual) return actual();

  const q = buscarPregunta(entrada.preguntaId);
  if (!q) return { tipo: "error", status: 404, mensaje: "No encontramos esta pregunta." };

  const ahora = new Date();
  const segundos = Number.isFinite(entrada.segundos) ? Math.max(0, Math.round(entrada.segundos!)) : null;

  let avance;
  if (q.section === "writing") {
    const texto = entrada.texto ?? "";
    if (!texto.trim()) return { tipo: "error", status: 400, mensaje: "Escribe tu redacción para seguir." };
    avance = await responderEscritura(estado, q, texto, evaluateWriting, ahora, segundos);
  } else {
    avance = responderLectura(estado, q, entrada.seleccion, ahora, segundos);
  }

  const cambios: Record<string, unknown> = {
    respuestas: avance.estado.respuestas,
    n_respuestas: avance.estado.respuestas.length,
    dificultad_actual: avance.estado.dificultad,
    pregunta_actual: avance.estado.preguntaActual,
    actualizada_en: ahora.toISOString(),
  };

  // LA ÚLTIMA: el resultado sale en la misma petición (en Gestión, el submit).
  const final = avance.siguiente.done ? resultadoFinal(avance.estado.respuestas) : null;
  if (final) {
    const nivelCurso = cursoRecomendado(final.cefr);
    const curso = (await cursosActivos())?.find((c) => c.tipo === "general" && c.nivel === nivelCurso) ?? null;
    Object.assign(cambios, {
      estado: "terminada",
      terminada_en: ahora.toISOString(),
      puntuacion_lectura: final.readingScore,
      puntuacion_escritura: final.writingScore,
      puntuacion_total: final.overall,
      nivel: final.cefr,
      nivel_por_puntuacion: final.auto.scoreLevel,
      tope: final.auto.capped,
      provisional: final.provisional,
      motivo_provisional: final.provisionalReason,
      evaluacion_escritura: final.aiEvaluation ?? null,
      curso_recomendado: curso?.id ?? null,
    });
  }

  const { data, error } = await baseLms()
    .from("pruebas_nivel")
    .update(cambios)
    .eq("id", fila.id)
    .eq("alumno_id", alumnoId)
    .eq("estado", "en_curso")
    .eq("n_respuestas", fila.n_respuestas)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) {
    console.error("[prueba-nivel] No se pudo guardar la respuesta:", error.message);
    return { tipo: "error", status: 500, mensaje: "No hemos podido guardar tu respuesta. Vuelve a intentarlo." };
  }

  // El cerrojo: otra petición guardó antes. Se devuelve lo que hay ahora.
  if (!data) {
    const ahoraFila = await una(alumnoId, fila.id);
    if (!ahoraFila) return { tipo: "error", status: 404, mensaje: "No encontramos esta prueba." };
    if (ahoraFila.estado === "terminada") {
      const resultado = await resultadoDe(ahoraFila);
      if (resultado) return { tipo: "resultado", resultado };
    }
    const datos = preguntaDe(ahoraFila);
    return datos ? { tipo: "pregunta", datos } : { tipo: "error", status: 409, mensaje: "Esta prueba ya no está abierta." };
  }

  const guardada = data as Fila;
  if (guardada.estado === "terminada") {
    const resultado = await resultadoDe(guardada);
    if (resultado) return { tipo: "resultado", resultado };
  }
  const datos = preguntaDe(guardada);
  return datos ? { tipo: "pregunta", datos } : { tipo: "error", status: 500, mensaje: "No podemos seguir ahora mismo." };
}
