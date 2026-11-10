// EXTRACTO de lib/levelTest/server.ts de Gestión: SOLO la parte pura (tipos,
// `toPublic` y `pickNext`), copiada sin tocar una línea. Lo que en Gestión lee
// la base (`loadBank`, `findQuestion`, `loadSessionWithAnswers`, `computeNext`)
// en el LMS lo hace lib/prueba-nivel/servidor.ts, contra banco.json y la tabla
// `pruebas_nivel`. Ver lib/prueba-nivel/ORIGEN.md.

import { SECTION_ORDER, SECTION_COUNT, GRAND_TOTAL } from './constants';
import { selectNextQuestion } from './adaptive';
import type { LTSection, LTQuestionPublic, LTProgress } from './types';


/** Pregunta del banco tal como la usa el SERVIDOR: con la respuesta correcta. Nunca sale al cliente. */
export interface BankQuestion extends LTQuestionPublic {
  correct_answer: number | null;
}

export interface SessionLite {
  id: string;
  current_difficulty: number | null;
  current_question_id: string | null;
  questions_answered: unknown;
}

export interface AnsweredLite { question_id: string; section: string; answered_at?: string | null }

export interface NextResult {
  question: LTQuestionPublic | null;
  progress: LTProgress;
  done: boolean;
  currentQuestionId: string | null;
}

/** Lo que ve el alumno: la pregunta SIN la respuesta correcta. */
export function toPublic(q: BankQuestion | LTQuestionPublic): LTQuestionPublic {
  return {
    id: q.id, section: q.section, cefr_level: q.cefr_level, difficulty: q.difficulty,
    prompt_text: q.prompt_text, question_text: q.question_text, options: q.options,
    writing_prompt: q.writing_prompt, writing_min_words: q.writing_min_words,
  };
}

// ── Elegir la próxima pregunta (en memoria) ──────────────────────────────────
/**
 * Próxima pregunta + progreso, a partir de lo que ya se sabe. PURO salvo por el
 * azar de selectNextQuestion entre empatadas. NO persiste nada: el caller decide
 * si guarda `currentQuestionId` en la sesión.
 */
export function pickNext(
  bank: BankQuestion[],
  answered: AnsweredLite[],
  currentDifficulty: number | null,
  currentQuestionId: string | null,
  fixedQuestion?: BankQuestion | null,
): NextResult {
  const answeredIds = answered.map(a => a.question_id);
  const countIn = (sec: LTSection) => answered.filter(a => a.section === sec).length;

  // Primera sección no completa.
  let currentSection: LTSection | null = null;
  let sectionIndex = 0;
  for (let i = 0; i < SECTION_ORDER.length; i++) {
    const sec = SECTION_ORDER[i];
    if (countIn(sec) < SECTION_COUNT[sec]) { currentSection = sec; sectionIndex = i; break; }
  }

  const answeredTotal = answeredIds.length;

  if (!currentSection) {
    const last = SECTION_ORDER[SECTION_ORDER.length - 1];
    return {
      question: null, done: true, currentQuestionId: null,
      progress: {
        section: last, sectionIndex: SECTION_ORDER.length - 1, sectionTotal: SECTION_ORDER.length,
        answeredInSection: SECTION_COUNT[last], totalInSection: SECTION_COUNT[last],
        answeredTotal, grandTotal: GRAND_TOTAL, done: true,
      },
    };
  }

  // Reutilizar la pregunta fijada si sigue vigente y es de la sección actual.
  let q: BankQuestion | null = null;
  if (currentQuestionId && !answeredIds.includes(currentQuestionId)) {
    const fixed = fixedQuestion?.id === currentQuestionId ? fixedQuestion : bank.find(b => b.id === currentQuestionId);
    if (fixed && fixed.section === currentSection) q = fixed;
  }
  if (!q) q = selectNextQuestion(bank, currentSection, currentDifficulty ?? 3, answeredIds);

  const progress: LTProgress = {
    section: currentSection, sectionIndex, sectionTotal: SECTION_ORDER.length,
    answeredInSection: countIn(currentSection), totalInSection: SECTION_COUNT[currentSection],
    answeredTotal, grandTotal: GRAND_TOTAL, done: false,
  };
  return { question: q ? toPublic(q) : null, done: false, currentQuestionId: q ? q.id : null, progress };
}
