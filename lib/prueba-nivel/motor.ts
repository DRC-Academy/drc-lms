// ---------------------------------------------------------------
// EL MOTOR DE LA PRUEBA DE NIVEL: LO QUE EN GESTIÓN HACEN SUS RUTAS
//
// Puro: sin base ni red. Recibe el estado de un intento y una respuesta, y
// devuelve el estado nuevo, la pregunta siguiente y, al terminar, el
// resultado. La base la pone `lib/prueba-nivel/servidor.ts`.
//
// ES LA MISMA SECUENCIA QUE GESTIÓN, paso por paso, con sus funciones
// copiadas sin tocar (`lib/prueba-nivel/gestion/`):
//
//   · app/api/level-test/[token]/answer → `responderLectura` y
//     `responderEscritura`: la lectura se corrige contra `correct_answer` y
//     mueve la dificultad (`getNextDifficulty`); la escritura pasa el filtro
//     determinista (`checkWritingAttempt`) y, si lo pasa, la IA
//     (`evaluateWriting`); NO mueve la dificultad. La siguiente pregunta,
//     con `pickNext` sobre el banco.
//   · app/api/level-test/[token]/submit → `resultadoFinal`: no hay nivel
//     sin las 17 respuestas distintas (`GRAND_TOTAL`), y el nivel sale de
//     `computeFinalResult` (lectura 60 % + escritura 40 %, provisional sin
//     escritura, compuerta de C1/C2).
//
// Lo único que el LMS añade: el curso recomendado, que Gestión no tiene
// (`cursoRecomendado`).
// ---------------------------------------------------------------

import bancoJson from "./banco.json";
import { pickNext, type BankQuestion, type AnsweredLite, type NextResult } from "./gestion/server";
import { getNextDifficulty } from "./gestion/adaptive";
import { checkWritingAttempt, type InvalidReason } from "./gestion/attemptValidity";
import { computeFinalResult, type FinalResult } from "./gestion/finalResult";
import { GRAND_TOTAL, START_DIFFICULTY } from "./gestion/constants";
import type { Cefr, WritingEvaluation } from "./gestion/types";
import { nivelDeCurso, type NivelCurso } from "@/lib/cursos";

/** El banco, tal como lo exporta `scripts/banco-prueba-nivel.mjs` desde Gestión. */
export const BANCO = bancoJson as unknown as BankQuestion[];

/** Una respuesta guardada: las mismas columnas que `level_test_answers` en Gestión. */
export type Respuesta = {
  question_id: string;
  section: string;
  /** La dificultad REAL de la pregunta servida. */
  difficulty: number;
  /** La que pidió el adaptativo. */
  target_difficulty: number;
  selected_answer: number | null;
  is_correct: boolean | null;
  written_response: string | null;
  ai_score: number | null;
  ai_feedback: WritingEvaluation | null;
  ai_error: string | null;
  invalid_reason: InvalidReason | null;
  answered_at: string;
  time_spent_seconds: number | null;
};

export type EstadoPrueba = {
  respuestas: Respuesta[];
  dificultad: number;
  preguntaActual: string | null;
};

export const ESTADO_INICIAL: EstadoPrueba = { respuestas: [], dificultad: START_DIFFICULTY, preguntaActual: null };

function contestadas(respuestas: Respuesta[]): AnsweredLite[] {
  return respuestas.map((r) => ({ question_id: r.question_id, section: r.section, answered_at: r.answered_at }));
}

/** La pregunta que toca ahora (la fijada, si sigue vigente), con el progreso. */
export function preguntaQueToca(estado: EstadoPrueba): NextResult {
  return pickNext(BANCO, contestadas(estado.respuestas), estado.dificultad, estado.preguntaActual);
}

export function buscarPregunta(id: string): BankQuestion | null {
  return BANCO.find((q) => q.id === id) ?? null;
}

export function yaRespondida(estado: EstadoPrueba, id: string): boolean {
  return estado.respuestas.some((r) => r.question_id === id);
}

export type Avance = { estado: EstadoPrueba; siguiente: NextResult; puntuada: boolean };

/** Guarda la respuesta y fija ya la siguiente pregunta, como el «Viaje 3» de Gestión. */
function avanzar(estado: EstadoPrueba, respuesta: Respuesta, dificultad: number): EstadoPrueba & { siguiente: NextResult } {
  const respuestas = [...estado.respuestas, respuesta];
  const siguiente = pickNext(BANCO, contestadas(respuestas), dificultad, null);
  return { respuestas, dificultad, preguntaActual: siguiente.currentQuestionId, siguiente };
}

/** Una respuesta de LECTURA. */
export function responderLectura(
  estado: EstadoPrueba,
  q: BankQuestion,
  seleccion: number | undefined,
  ahora: Date,
  segundos: number | null
): Avance {
  const sel = typeof seleccion === "number" ? seleccion : -1;
  const correcta = sel === q.correct_answer;
  const dificultad = getNextDifficulty(estado.dificultad, correcta);

  const { siguiente, ...nuevo } = avanzar(
    estado,
    {
      question_id: q.id,
      section: q.section,
      difficulty: q.difficulty,
      target_difficulty: estado.dificultad,
      selected_answer: typeof seleccion === "number" ? seleccion : null,
      is_correct: correcta,
      written_response: null,
      ai_score: null,
      ai_feedback: null,
      ai_error: null,
      invalid_reason: null,
      answered_at: ahora.toISOString(),
      time_spent_seconds: segundos,
    },
    dificultad
  );
  return { estado: nuevo, siguiente, puntuada: true };
}

/** Lo que dice la IA de una redacción, como lo devuelve `evaluateWriting`. */
export type EvaluarRedaccion = (args: {
  cefrLevel: Cefr;
  writingPrompt: string;
  writtenResponse: string;
}) => Promise<{ data: WritingEvaluation | null; status: string; error?: string }>;

/**
 * Una respuesta de ESCRITURA. Los tres desenlaces de Gestión, y los tres
 * guardan la fila: válida (con nota), no válida (sin nota y con motivo) o IA
 * no disponible (sin nota, `ai_unavailable` y el error real). Una excepción
 * de la IA no le cuesta la prueba al alumno.
 */
export async function responderEscritura(
  estado: EstadoPrueba,
  q: BankQuestion,
  texto: string,
  evaluar: EvaluarRedaccion,
  ahora: Date,
  segundos: number | null
): Promise<Avance> {
  const escrito = texto.trim();

  let aiScore: number | null = null;
  let aiFeedback: WritingEvaluation | null = null;
  let aiError: string | null = null;
  let invalidReason: InvalidReason | null = null;

  const check = checkWritingAttempt(escrito);
  if (!check.valid) {
    invalidReason = check.reason;
  } else {
    try {
      const res = await evaluar({ cefrLevel: q.cefr_level, writingPrompt: q.writing_prompt || "", writtenResponse: escrito });
      if (!res.data) {
        invalidReason = "ai_unavailable";
        aiError = res.error ?? `La IA no respondió (${res.status}).`;
      } else if (!res.data.is_valid_attempt) {
        invalidReason = "ai_invalid";
        aiFeedback = res.data;
      } else {
        aiScore = res.data.score;
        aiFeedback = res.data;
      }
    } catch (error) {
      invalidReason = "ai_unavailable";
      aiError = `Excepción: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Gestión guarda el texto tal cual llega (sin recortar) y la dificultad no
  // se mueve con la escritura.
  const { siguiente, ...nuevo } = avanzar(
    estado,
    {
      question_id: q.id,
      section: q.section,
      difficulty: q.difficulty,
      target_difficulty: estado.dificultad,
      selected_answer: null,
      is_correct: null,
      written_response: texto,
      ai_score: aiScore,
      ai_feedback: aiFeedback,
      ai_error: aiError,
      invalid_reason: invalidReason,
      answered_at: ahora.toISOString(),
      time_spent_seconds: segundos,
    },
    estado.dificultad
  );
  return { estado: nuevo, siguiente, puntuada: aiScore !== null };
}

/** El resultado, o null si todavía no están las 17 respuestas distintas. */
export function resultadoFinal(respuestas: Respuesta[]): FinalResult | null {
  const distintas = new Set(respuestas.map((r) => r.question_id)).size;
  if (distintas < GRAND_TOTAL) return null;
  return computeFinalResult(respuestas);
}

/**
 * EL CURSO QUE SE RECOMIENDA: el general de su nivel, con la regla de
 * siempre del LMS (`nivelDeCurso`): A1 va a A2, que es el más bajo que
 * existe, y C2 a C1. La prueba no recomienda cursos de examen.
 */
export function cursoRecomendado(nivel: Cefr): NivelCurso {
  return nivelDeCurso(nivel);
}
