import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------
// La capa de base de la prueba de nivel, contra una `pruebas_nivel` falsa en
// memoria que imita lo que hace PostgREST con las consultas que se usan
// (select/eq/neq/order/limit, insert…single, update…maybeSingle) y el índice
// único de «una en curso por alumno».
// ---------------------------------------------------------------

type Fila = Record<string, unknown>;
const tabla = vi.hoisted(() => ({ filas: [] as Record<string, unknown>[], n: 0 }));

vi.mock("@/lib/supabase-lms", () => {
  function consulta(op: "select" | "update" | "insert", datos?: Fila | null) {
    const filtros: Array<(f: Fila) => boolean> = [];
    let limite = Infinity;
    const q = {
      select: () => q,
      eq: (c: string, v: unknown) => (filtros.push((f) => f[c] === v), q),
      neq: (c: string, v: unknown) => (filtros.push((f) => f[c] !== v), q),
      order: () => q,
      limit: (n: number) => ((limite = n), q),
      async single() {
        return q.ejecutar(true);
      },
      async maybeSingle() {
        return q.ejecutar(true);
      },
      then(ok: (r: unknown) => unknown, ko?: (e: unknown) => unknown) {
        return q.ejecutar(false).then(ok, ko);
      },
      async ejecutar(una: boolean) {
        if (op === "insert") {
          if (datos!.estado === "en_curso" && tabla.filas.some((f) => f.alumno_id === datos!.alumno_id && f.estado === "en_curso")) {
            return { data: null, error: { code: "23505", message: "duplicate key" } };
          }
          const fila = { id: `p${++tabla.n}`, creada_en: new Date(Date.now() + tabla.n).toISOString(), respuestas: [], n_respuestas: 0, nivel: null, provisional: null, curso_recomendado: null, ...datos };
          tabla.filas.push(fila);
          return { data: { ...fila }, error: null };
        }
        const elegidas = tabla.filas.filter((f) => filtros.every((fn) => fn(f)));
        if (op === "update") for (const f of elegidas) Object.assign(f, datos);
        const salida = elegidas
          .slice()
          .sort((a, b) => String(b.creada_en).localeCompare(String(a.creada_en)))
          .slice(0, limite)
          .map((f) => JSON.parse(JSON.stringify(f)));
        return { data: una ? salida[0] ?? null : salida, error: null };
      },
    };
    return q;
  }
  return {
    baseLms: () => ({
      from: () => ({
        select: () => consulta("select"),
        insert: (d: Fila) => consulta("insert", d),
        update: (d: Fila) => consulta("update", d),
      }),
    }),
  };
});

const CURSOS = [
  { id: "c-a2", slug: "general-a2", titulo: "Inglés general A2", tipo: "general", nivel: "A2", examen: null },
  { id: "c-b1", slug: "general-b1", titulo: "Inglés general B1", tipo: "general", nivel: "B1", examen: null },
  { id: "c-b2", slug: "general-b2", titulo: "Inglés general B2", tipo: "general", nivel: "B2", examen: null },
  { id: "c-c1", slug: "general-c1", titulo: "Inglés general C1", tipo: "general", nivel: "C1", examen: null },
  { id: "c-fce", slug: "first-b2", titulo: "First B2", tipo: "examen", nivel: "B2", examen: "b2_first" },
];
vi.mock("@/lib/cursos-servidor", () => ({ cursosActivos: async () => CURSOS }));

// La IA: una redacción B2 válida (la nota la pone `cefrToScore`, como en Gestión).
vi.mock("@/lib/prueba-nivel/gestion/evaluateWriting", async () => {
  const { cefrToScore } = await import("@/lib/prueba-nivel/gestion/constants");
  const nota = { score: 55, feedback: "ok" };
  return {
    evaluateWriting: async () => ({
      data: {
        score: cefrToScore("B2", "mid"), is_valid_attempt: true, cefr_level: "B2", within_level: "mid", evidence: "x",
        grammar: nota, vocabulary: nota, coherence: nota, task_completion: nota, overall_feedback: "ok", strengths: [], areas_for_improvement: [],
      },
      status: "ready",
    }),
  };
});

import { empezar, estadoDelBloque, puedeHacerPrueba, responder, vistaInicial, HUELLA_BANCO } from "@/lib/prueba-nivel/servidor";
import { buscarPregunta } from "@/lib/prueba-nivel/motor";

const REDACCION =
  "Last month I started a cooking course at a school near my home. We learn traditional recipes from different countries and I decided to join because I wanted to eat better. So far I have learned to make fresh pasta, a curry and bread, and I really enjoy it because the teacher is patient and funny. I would recommend it to anyone who wants to try something new.";

/** Responde hasta el final, acertando todo, esperando lo justo entre respuestas. */
async function hastaElFinal(alumnoId: string) {
  let datos = await empezar(alumnoId, "a@b.c");
  for (let i = 0; i < 30; i++) {
    vi.setSystemTime(Date.now() + 1_000);
    const q = buscarPregunta(datos.pregunta.id)!;
    const salida = await responder(alumnoId, {
      pruebaId: datos.pruebaId,
      preguntaId: q.id,
      ...(q.section === "writing" ? { texto: REDACCION } : { seleccion: q.correct_answer! }),
      segundos: 10,
    });
    if (salida.tipo === "resultado") return salida.resultado;
    if (salida.tipo !== "pregunta") throw new Error(JSON.stringify(salida));
    datos = salida.datos;
  }
  throw new Error("no terminó");
}

beforeEach(() => {
  tabla.filas.length = 0;
  tabla.n = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-19T10:00:00Z"));
  vi.unstubAllEnvs();
});

describe("quién puede", () => {
  const blackPass = { tienePase: true, origen: "pase" as const, avisoPago: false };
  it("solo con el interruptor encendido y el inicio del Black Pass", () => {
    expect(puedeHacerPrueba(blackPass)).toBe(false);
    vi.stubEnv("PRUEBA_NIVEL_ACTIVA", "1");
    expect(puedeHacerPrueba(blackPass)).toBe(true);
    expect(puedeHacerPrueba({ tienePase: true, origen: "plan+pase", avisoPago: false })).toBe(false);
    expect(puedeHacerPrueba({ tienePase: false, origen: "plan", avisoPago: false })).toBe(false);
  });
});

describe("empezar y retomar", () => {
  it("la primera vez crea un intento con la huella del banco; la segunda retoma el mismo", async () => {
    const a = await empezar("pase-1", "a@b.c");
    const b = await empezar("pase-1", "a@b.c");
    expect(b.pruebaId).toBe(a.pruebaId);
    expect(b.pregunta.id).toBe(a.pregunta.id);
    expect(tabla.filas).toHaveLength(1);
    expect(tabla.filas[0]).toMatchObject({ banco: HUELLA_BANCO, estado: "en_curso" });
  });

  it("nunca manda la respuesta correcta", async () => {
    const a = await empezar("pase-1", "a@b.c");
    expect(a.pregunta).not.toHaveProperty("correct_answer");
  });

  it("el bloque del inicio: nueva → a medias con lo que lleva", async () => {
    expect(await estadoDelBloque("pase-1")).toEqual({ tipo: "nueva" });
    const a = await empezar("pase-1", "a@b.c");
    vi.setSystemTime(Date.now() + 1_000);
    await responder("pase-1", { pruebaId: a.pruebaId, preguntaId: a.pregunta.id, seleccion: 0 });
    expect(await estadoDelBloque("pase-1")).toEqual({ tipo: "en_curso", respondidas: 1, total: 17 });
  });
});

describe("responder", () => {
  it("un doble envío no cuenta dos veces", async () => {
    const a = await empezar("pase-1", "a@b.c");
    vi.setSystemTime(Date.now() + 1_000);
    const primera = await responder("pase-1", { pruebaId: a.pruebaId, preguntaId: a.pregunta.id, seleccion: 0 });
    vi.setSystemTime(Date.now() + 1_000);
    const otra = await responder("pase-1", { pruebaId: a.pruebaId, preguntaId: a.pregunta.id, seleccion: 1 });
    expect(tabla.filas[0].n_respuestas).toBe(1);
    expect(otra).toEqual(primera);
  });

  it("demasiado seguido: espera, como en Gestión", async () => {
    const a = await empezar("pase-1", "a@b.c");
    vi.setSystemTime(Date.now() + 1_000);
    const s = await responder("pase-1", { pruebaId: a.pruebaId, preguntaId: a.pregunta.id, seleccion: 0 });
    if (s.tipo !== "pregunta") throw new Error("esperaba pregunta");
    const r = await responder("pase-1", { pruebaId: a.pruebaId, preguntaId: s.datos.pregunta.id, seleccion: 0 });
    expect(r).toMatchObject({ tipo: "error", status: 429 });
  });

  it("la prueba de otro alumno no existe para él", async () => {
    const a = await empezar("pase-1", "a@b.c");
    expect(await responder("pase-2", { pruebaId: a.pruebaId, preguntaId: a.pregunta.id, seleccion: 0 })).toMatchObject({ tipo: "error", status: 404 });
  });

  it("una redacción vacía no se guarda", async () => {
    const a = await empezar("pase-1", "a@b.c");
    const escritura = (await import("@/lib/prueba-nivel/motor")).BANCO.find((q) => q.section === "writing")!;
    tabla.filas[0].pregunta_actual = escritura.id;
    vi.setSystemTime(Date.now() + 1_000);
    expect(await responder("pase-1", { pruebaId: a.pruebaId, preguntaId: escritura.id, texto: "   " })).toMatchObject({ tipo: "error", status: 400 });
  });
});

describe("terminar", () => {
  it("con la 17.ª sale el nivel y el curso general de su nivel, y queda guardado", async () => {
    const resultado = await hastaElFinal("pase-1");
    // Lectura perfecta (C2 alto, 95,83) y redacción B2 (58,33): 60/40 da 80,83, que es C1,
    // y la redacción está a un nivel, así que la compuerta no lo toca.
    expect(resultado).toMatchObject({ nivel: "C1", provisional: false, curso: { id: "c-c1", slug: "general-c1" } });
    expect(tabla.filas[0]).toMatchObject({ estado: "terminada", nivel: "C1", nivel_por_puntuacion: "C1", tope: null, curso_recomendado: "c-c1", n_respuestas: 17 });
    expect(await estadoDelBloque("pase-1")).toMatchObject({ tipo: "terminada", resultado: { nivel: "C1" } });
  });

  it("después: la página enseña el resultado; con ?repetir=1, la bienvenida, y empezar crea otro intento", async () => {
    await hastaElFinal("pase-1");
    expect(await vistaInicial("pase-1", false)).toMatchObject({ tipo: "resultado" });
    expect(await vistaInicial("pase-1", true)).toEqual({ tipo: "bienvenida", repitiendo: true });
    await empezar("pase-1", "a@b.c");
    expect(tabla.filas.map((f) => f.estado)).toEqual(["terminada", "en_curso"]);
    expect(await estadoDelBloque("pase-1")).toMatchObject({ tipo: "en_curso", respondidas: 0 });
  });
});
