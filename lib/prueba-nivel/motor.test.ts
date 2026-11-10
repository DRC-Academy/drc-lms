import { describe, expect, it, vi } from "vitest";
import {
  BANCO,
  ESTADO_INICIAL,
  buscarPregunta,
  cursoRecomendado,
  preguntaQueToca,
  responderEscritura,
  responderLectura,
  resultadoFinal,
  type EstadoPrueba,
  type EvaluarRedaccion,
} from "@/lib/prueba-nivel/motor";
import { GRAND_TOTAL, SECTION_COUNT, cefrToScore } from "@/lib/prueba-nivel/gestion/constants";
import type { WritingEvaluation } from "@/lib/prueba-nivel/gestion/types";

const AHORA = new Date("2026-11-19T10:00:00Z");

function evaluacion(nivel: WritingEvaluation["cefr_level"], valida = true): WritingEvaluation {
  const nota = { score: 50, feedback: "ok" };
  return {
    score: cefrToScore(nivel, "mid"),
    is_valid_attempt: valida,
    cefr_level: nivel,
    within_level: "mid",
    evidence: "x",
    grammar: nota,
    vocabulary: nota,
    coherence: nota,
    task_completion: nota,
    overall_feedback: "ok",
    strengths: [],
    areas_for_improvement: [],
  };
}

const IA = (nivel: WritingEvaluation["cefr_level"], valida = true): EvaluarRedaccion =>
  async () => ({ data: evaluacion(nivel, valida), status: "ready" });

const REDACCION =
  "Last summer I travelled to Lisbon with my family. We visited old streets, ate fresh fish and watched the sunset from a hill. I would recommend it because the people are friendly and the city is beautiful.";

/** Responde las 16 de lectura (acertando o no) y la redacción, como lo haría la pantalla. */
async function pruebaEntera(acierta: (i: number) => boolean, evaluar: EvaluarRedaccion) {
  let estado: EstadoPrueba = ESTADO_INICIAL;
  let siguiente = preguntaQueToca(estado);
  estado = { ...estado, preguntaActual: siguiente.currentQuestionId };

  for (let i = 0; !siguiente.done; i++) {
    const q = buscarPregunta(siguiente.currentQuestionId!)!;
    const avance =
      q.section === "writing"
        ? await responderEscritura(estado, q, REDACCION, evaluar, AHORA, 600)
        : responderLectura(estado, q, acierta(i) ? q.correct_answer! : (q.correct_answer! + 1) % 4, AHORA, 20);
    estado = avance.estado;
    siguiente = avance.siguiente;
  }
  return estado;
}

describe("el banco copiado de Gestión", () => {
  it("son las 102 preguntas activas, con lo que exige check:bank de Gestión", () => {
    expect(BANCO).toHaveLength(102);
    for (const seccion of ["reading_completion", "reading_passage", "reading_email"] as const) {
      for (let d = 1; d <= 6; d++) {
        expect(BANCO.filter((q) => q.section === seccion && q.difficulty === d).length).toBeGreaterThanOrEqual(SECTION_COUNT[seccion]);
      }
    }
    expect(BANCO.filter((q) => q.section === "writing")).toHaveLength(6);
  });

  it("cada pregunta de lectura tiene su respuesta correcta dentro de las opciones", () => {
    for (const q of BANCO.filter((q) => q.section !== "writing")) {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.correct_answer).toBeGreaterThanOrEqual(0);
      expect(q.correct_answer).toBeLessThan(q.options!.length);
    }
  });
});

describe("una prueba entera, como en Gestión", () => {
  it("arranca en B1 y en «Completar oraciones»", () => {
    const r = preguntaQueToca(ESTADO_INICIAL);
    expect(r.question?.section).toBe("reading_completion");
    expect(r.question?.difficulty).toBe(3);
    expect(r.progress.grandTotal).toBe(GRAND_TOTAL);
  });

  it("son 17 respuestas distintas y la última es la redacción", async () => {
    const estado = await pruebaEntera(() => true, IA("C1"));
    expect(estado.respuestas).toHaveLength(GRAND_TOTAL);
    expect(new Set(estado.respuestas.map((r) => r.question_id)).size).toBe(GRAND_TOTAL);
    expect(estado.respuestas.at(-1)?.section).toBe("writing");
  });

  it("acertarlo todo: C2 con una redacción C1 (a un nivel, pasa la compuerta); B1 con una A2 (a más de un nivel, manda la redacción + 1)", async () => {
    expect(resultadoFinal((await pruebaEntera(() => true, IA("C1"))).respuestas)?.cefr).toBe("C2");
    const r = resultadoFinal((await pruebaEntera(() => true, IA("A2"))).respuestas)!;
    expect(r.auto.capped).toBe("escritura_lejos");
    expect(r.cefr).toBe("B1");
  });

  it("fallarlo todo con una redacción A1 da A1", async () => {
    expect(resultadoFinal((await pruebaEntera(() => false, IA("A1"))).respuestas)?.cefr).toBe("A1");
  });

  it("la lectura sube y baja la dificultad; la redacción no la mueve", async () => {
    const q = buscarPregunta(preguntaQueToca(ESTADO_INICIAL).currentQuestionId!)!;
    expect(responderLectura(ESTADO_INICIAL, q, q.correct_answer!, AHORA, 5).estado.dificultad).toBe(4);
    expect(responderLectura(ESTADO_INICIAL, q, -1, AHORA, 5).estado.dificultad).toBe(2);

    const escritura = BANCO.find((p) => p.section === "writing")!;
    const avance = await responderEscritura({ ...ESTADO_INICIAL, dificultad: 5 }, escritura, REDACCION, IA("B2"), AHORA, 5);
    expect(avance.estado.dificultad).toBe(5);
  });

  it("sin las 17 no hay nivel", async () => {
    const estado = await pruebaEntera(() => true, IA("B2"));
    expect(resultadoFinal(estado.respuestas.slice(0, GRAND_TOTAL - 1))).toBeNull();
  });
});

describe("la redacción, con los tres desenlaces de Gestión", () => {
  const escritura = BANCO.find((p) => p.section === "writing")!;

  it("relleno: no llega a la IA, sin nota y nivel provisional con tope B2", async () => {
    const evaluar = vi.fn(IA("C2"));
    const a = await responderEscritura(ESTADO_INICIAL, escritura, "a a a a a a a a a a", evaluar, AHORA, 5);
    expect(evaluar).not.toHaveBeenCalled();
    expect(a.estado.respuestas[0]).toMatchObject({ ai_score: null, invalid_reason: "low_diversity" });

    const estado = await pruebaEntera(() => true, async () => ({ data: null, status: "error", error: "x" }));
    const r = resultadoFinal(estado.respuestas)!;
    expect(r.provisional).toBe(true);
    expect(["A1", "A2", "B1", "B2"]).toContain(r.cefr);
  });

  it("la IA dice que no es un intento: sin nota, motivo ai_invalid", async () => {
    const a = await responderEscritura(ESTADO_INICIAL, escritura, REDACCION, IA("B1", false), AHORA, 5);
    expect(a.estado.respuestas[0]).toMatchObject({ ai_score: null, invalid_reason: "ai_invalid" });
    expect(a.puntuada).toBe(false);
  });

  it("la IA se cae o lanza: no le cuesta la prueba, queda ai_unavailable con el error", async () => {
    const caida = await responderEscritura(ESTADO_INICIAL, escritura, REDACCION, async () => ({ data: null, status: "error", error: "sin saldo" }), AHORA, 5);
    expect(caida.estado.respuestas[0]).toMatchObject({ invalid_reason: "ai_unavailable", ai_error: "sin saldo" });

    const lanza = await responderEscritura(ESTADO_INICIAL, escritura, REDACCION, async () => { throw new Error("red"); }, AHORA, 5);
    expect(lanza.estado.respuestas[0]).toMatchObject({ invalid_reason: "ai_unavailable", ai_error: "Excepción: red" });
  });
});

describe("el curso recomendado", () => {
  it("el general de su nivel; A1 empieza por A2 y C2 va al C1", () => {
    expect(cursoRecomendado("A1")).toBe("A2");
    expect(cursoRecomendado("A2")).toBe("A2");
    expect(cursoRecomendado("B1")).toBe("B1");
    expect(cursoRecomendado("B2")).toBe("B2");
    expect(cursoRecomendado("C1")).toBe("C1");
    expect(cursoRecomendado("C2")).toBe("C1");
  });
});
