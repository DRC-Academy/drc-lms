import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// EL CARGADOR DE LA FICHA Y DE LA LISTA. Lo que importa aquí es lo que NO
// sale: lo buscamos en la salida entera, serializada.

const doble = vi.hoisted(() => ({
  clases: [] as Record<string, unknown>[],
  calendario: new Map<string, unknown[]>(),
  excepciones: new Map<string, unknown[]>(),
  bloques: [] as Record<string, unknown>[],
  progreso: {} as Record<string, unknown>,
  avance: {} as Record<string, unknown>,
  cursos: [] as Record<string, unknown>[],
  cursosPedidos: [] as unknown[][],
  accesos: new Map<string, string>() as Map<string, string> | null,
  intentos: [] as Record<string, unknown>[],
  ejercicios: [] as Record<string, unknown>[],
  lecciones: [] as Record<string, unknown>[],
  progresoSemana: [] as Record<string, unknown>[],
  falla: new Set<string>(),
  tablas: [] as string[],
}));

vi.mock("@/lib/gestion", () => ({
  leerClasesDeFicha: async () => {
    if (doble.falla.has("clases")) throw new Error("caída");
    return doble.clases;
  },
  leerCalendariosSinEnlace: async () => {
    if (doble.falla.has("calendario")) throw new Error("caída");
    return doble.calendario;
  },
  leerExcepcionesDe: async () => doble.excepciones,
}));
vi.mock("@/lib/progreso-servidor", () => ({
  leerBloquesGenerados: async () => doble.bloques,
  leerProgresoAlumno: async () => doble.progreso,
  leerAvanceAlumno: async () => doble.avance,
}));
vi.mock("@/lib/cursos-servidor", () => ({
  cursosDelInicio: async (...args: unknown[]) => {
    doble.cursosPedidos.push(args);
    if (doble.falla.has("cursos")) throw new Error("caída");
    return doble.cursos;
  },
}));
vi.mock("@/lib/panel-profesor", () => ({ ultimosAccesos: async () => doble.accesos }));
vi.mock("@/lib/supabase-lms", () => ({
  baseLms: () => ({
    from: (tabla: string) => {
      doble.tablas.push(tabla);
      const filas = () =>
        tabla === "intentos_ejercicio"
          ? doble.intentos
          : tabla === "ejercicios_leccion"
            ? doble.ejercicios
            : tabla === "lecciones"
              ? doble.lecciones
              : doble.progresoSemana;
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        in: () => b,
        gte: () => b,
        order: () => b,
        limit: () => b,
        returns: () => b,
        then: (ok: (r: unknown) => unknown) => Promise.resolve({ data: filas(), error: doble.falla.has(tabla) ? { message: "caída" } : null }).then(ok),
      };
      return b;
    },
  }),
}));

import { cargarFichaDelAlumno, resumenesDeLaLista } from "@/lib/panel-profesor-ficha";
import type { AlumnoAutorizado, ProfesorAutorizado } from "@/lib/panel-profesor";

const profesor = { teacherId: "tA", nombre: "Ana", comoAdmin: false } as ProfesorAutorizado;
const alumno = {
  teacherId: "tA",
  alumnoId: "a1",
  nombre: "Lucía Fernández",
  nivel: "B1",
  nivelProfesor: "B2",
  nivelFicha: null,
  nivelPrueba: null,
  focoRecomendado: "Reforzar el pasado simple. Comentó que quiere cancelar su suscripción.",
  fechaInicio: "2026-10-01",
  examen: "first",
} as AlumnoAutorizado;

const clase = (extra: Record<string, unknown>) => ({
  id: "c1",
  teacherId: "tA",
  fechaClase: "2026-11-02",
  titulo: "Clase propia",
  temas: "Present perfect",
  resumen: "Resumen de la clase propia.",
  puntos: "Preposiciones: 'listen music'.",
  validada: true,
  ...extra,
});

const AHORA = new Date("2026-11-05T12:00:00Z");

beforeEach(() => {
  vi.stubEnv("GESTION_URL", "https://gestion.test/");
  vi.spyOn(console, "error").mockImplementation(() => {});
  doble.clases = [];
  doble.calendario = new Map();
  doble.excepciones = new Map();
  doble.bloques = [];
  doble.progreso = {};
  doble.avance = {};
  doble.cursos = [];
  doble.cursosPedidos = [];
  doble.accesos = new Map();
  doble.intentos = [];
  doble.ejercicios = [];
  doble.lecciones = [];
  doble.progresoSemana = [];
  doble.falla = new Set();
  doble.tablas = [];
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("cargarFichaDelAlumno", () => {
  it("no acepta a un alumno de otro profesor, aunque alguien los mezcle", async () => {
    await expect(cargarFichaDelAlumno({ ...profesor, teacherId: "tB" } as ProfesorAutorizado, alumno, AHORA)).rejects.toThrow();
  });

  it("no compila con un alumno o un profesor fabricados a mano", () => {
    const hecho = { teacherId: "tA", alumnoId: "b1", nombre: "Otro" };
    const usar = () => {
      // @ts-expect-error Un objeto cualquiera no es un AlumnoAutorizado.
      void cargarFichaDelAlumno(profesor, hecho);
      // @ts-expect-error Ni un ProfesorAutorizado.
      void cargarFichaDelAlumno(hecho, alumno);
      // @ts-expect-error Ni una lista de ellos.
      void resumenesDeLaLista([hecho]);
    };
    expect(typeof usar).toBe("function");
  });

  it("la cabecera: nombre, nivel con su origen y enlace a su ficha en Gestión", async () => {
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f).toMatchObject({ nombre: "Lucía Fernández", nombrePila: "Lucía", nivel: "B2", origenNivel: "profesor" });
    expect(f.enlaceGestion).toBe("https://gestion.test/mis-alumnos/a1");
  });

  it("sin GESTION_URL no hay enlace", async () => {
    vi.stubEnv("GESTION_URL", "");
    expect((await cargarFichaDelAlumno(profesor, alumno, AHORA)).enlaceGestion).toBeNull();
  });

  it("el foco pierde la frase de la suscripción", async () => {
    expect((await cargarFichaDelAlumno(profesor, alumno, AHORA)).foco).toBe("Reforzar el pasado simple.");
  });

  it("una clase con OTRO profesor: fecha y temas, sin nombre, título, resumen ni puntos", async () => {
    doble.clases = [
      clase({
        id: "ajena",
        teacherId: "tB",
        titulo: "Título de la ajena",
        temas: "Conditionals",
        resumen: "Resumen de la profesora Marta.",
        puntos: "Puntos de la ajena.",
      }),
    ];
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f.clases).toEqual([
      { id: "ajena", numero: null, fechaClase: "2026-11-02", titulo: "", temas: "Conditionals", etiqueta: "Con otro profesor" },
    ]);
    expect(f.puntos).toEqual([]);
    const todo = JSON.stringify(f);
    for (const fuera of ["Marta", "Título de la ajena", "Puntos de la ajena", "tB"]) expect(todo).not.toContain(fuera);
  });

  it("una clase propia: temas y resumen; en revisión, sin resumen ni puntos", async () => {
    doble.clases = [clase({}), clase({ id: "c2", validada: false, resumen: "Sin revisar.", puntos: "Tampoco esto." })];
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f.clases?.[0]).toMatchObject({ titulo: "Clase propia", temas: "Present perfect", resumen: "Resumen de la clase propia." });
    expect(f.clases?.[1]).toMatchObject({ resumen: null });
    expect(f.puntos?.map((p) => p.id)).toEqual(["c1"]);
    expect(JSON.stringify(f)).not.toContain("Tampoco esto");
  });

  it("los puntos: como mucho tres, sin lo que dice que no hubo clase, y sin frases de cobro", async () => {
    doble.clases = [
      clase({ id: "1", puntos: "No aplica. No hay clase." }),
      clase({ id: "2", puntos: "Le cuesta el presente. Preguntó por la factura." }),
      clase({ id: "3", puntos: "Tercera." }),
      clase({ id: "4", puntos: "Cuarta." }),
      clase({ id: "5", puntos: "Quinta." }),
    ];
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f.puntos?.map((p) => [p.id, p.texto])).toEqual([
      ["2", "Le cuesta el presente."],
      ["3", "Tercera."],
      ["4", "Cuarta."],
    ]);
  });

  it("los bloques: resultado, a medias o sin empezar, y sin el profesor que guarda claseOrigen", async () => {
    doble.bloques = [
      { id: "b1", titulo: "Pasado", area: "Gramática", claseOrigen: { fecha: "2026-10-12", profesor: "Marta" }, ejercicios: [{ correcta: "SOLUCION" }] },
      { id: "b2", titulo: "Vocabulario", area: "Léxico" },
      { id: "b3", titulo: "Listening", area: "Oído" },
    ];
    doble.progreso = { b1: { aciertos: 8, total: 10, fecha: "2026-10-13" } };
    doble.avance = { b2: { indice: 2, total: 8, fecha: "2026-10-14" } };
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f.bloques.map((b) => b.estado)).toEqual([
      { tipo: "terminado", aciertos: 8, total: 10, porcentaje: 80 },
      { tipo: "a_medias", indice: 2, total: 8 },
      { tipo: "sin_empezar" },
    ]);
    expect(f.bloques[0].deLaClase).toMatch(/12.*octubre/);
    const todo = JSON.stringify(f);
    expect(todo).not.toContain("Marta");
    expect(todo).not.toContain("SOLUCION");
  });

  it("nunca lee las respuestas libres", async () => {
    await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(doble.tablas).not.toContain("respuestas_produccion");
  });

  it("los ejercicios del curso: primero los que más le han costado, sin lo que respondió", async () => {
    doble.intentos = [
      { ejercicio_id: "e1", correcto: false, respondido_en: "2026-11-03" },
      { ejercicio_id: "e1", correcto: true, respondido_en: "2026-11-03" },
      { ejercicio_id: "e2", correcto: false, respondido_en: "2026-11-02" },
      { ejercicio_id: "e2", correcto: false, respondido_en: "2026-11-02" },
      { ejercicio_id: "e3", correcto: true, respondido_en: "2026-11-01" },
    ];
    doble.ejercicios = [
      { id: "e1", enunciado: "<p>Uno</p>", leccion_id: "l1" },
      { id: "e2", enunciado: "Dos", leccion_id: "l1" },
    ];
    doble.lecciones = [{ id: "l1", titulo: "Lección uno" }];
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f.ejercicios).toEqual([
      { id: "e2", leccion: "Lección uno", enunciado: "Dos", intentos: 2, sinAcertar: 2 },
      { id: "e1", leccion: "Lección uno", enunciado: "Uno", intentos: 2, sinAcertar: 1 },
    ]);
  });

  it("el curso: con la columna examen, no con el plan, y con las lecciones abiertas", async () => {
    doble.cursos = [{ curso: { id: "c", titulo: "First", tipo: "examen" }, total: 60, abiertas: 24, completadas: 18, abreEl: null }];
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(doble.cursosPedidos[0][0]).toBe("a1");
    expect(doble.cursosPedidos[0][1]).toBe("first");
    expect(f.cursos).toEqual([{ id: "c", titulo: "First", total: 60, abiertas: 24, completadas: 18, abreEl: null }]);
    expect(f.semana).toBe(6);
  });

  it("un alumno sin examen entra con el plan vacío: el curso sale de su nivel", async () => {
    await cargarFichaDelAlumno(profesor, { ...alumno, examen: null } as AlumnoAutorizado, AHORA);
    expect(doble.cursosPedidos[0][1]).toBe("");
  });

  it("cada sección falla sola: lo que no se lee es null y el resto se enseña", async () => {
    doble.falla = new Set(["clases", "calendario", "cursos", "intentos_ejercicio"]);
    doble.accesos = null;
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f).toMatchObject({ clases: null, puntos: null, proxima: null, cursos: null, ejercicios: null, ultimoAcceso: null });
    expect(f.nombre).toBe("Lucía Fernández");
    expect(f.foco).toBe("Reforzar el pasado simple.");
  });

  it("sin clases en el calendario: ninguna próxima, que no es lo mismo que no haber podido leer", async () => {
    const f = await cargarFichaDelAlumno(profesor, alumno, AHORA);
    expect(f.proxima).toEqual({ clase: null });
  });
});

describe("resumenesDeLaLista", () => {
  it("con una lista vacía no lee nada de la práctica", async () => {
    await expect(resumenesDeLaLista([], AHORA)).resolves.toEqual(new Map());
    expect(doble.tablas).toEqual([]);
  });

  it("la práctica de la semana y la semana del curso", async () => {
    const otro = { ...alumno, alumnoId: "a2", fechaInicio: null } as AlumnoAutorizado;
    doble.progresoSemana = [{ alumno_id: "a1" }];
    const r = await resumenesDeLaLista([alumno, otro], AHORA);
    expect(r.get("a1")).toMatchObject({ practico: true, semana: 6, proxima: null, empiezaEn: null, calendarioLeido: true });
    expect(r.get("a2")).toMatchObject({ practico: false, semana: null });
  });

  it("si falla el calendario o la práctica, la lista sigue", async () => {
    doble.falla = new Set(["calendario", "progreso_bloques"]);
    const r = await resumenesDeLaLista([alumno], AHORA);
    expect(r.get("a1")).toMatchObject({ proxima: null, calendarioLeido: false, practico: null, semana: 6 });
  });
});
