import { beforeEach, describe, expect, it, vi } from "vitest";
import { aperturaDeLeccion, calcularApertura } from "@/lib/drip";
import type { ProfesorAutorizado } from "@/lib/panel-profesor";

// LOS CURSOS PARA EL PROFESOR. Lo que sostiene el «todo abierto» es que cada
// lectura salga SIN ALUMNO y SIN FECHA: lo comprobamos en cada llamada.

const doble = vi.hoisted(() => ({
  cursos: [] as Record<string, unknown>[] | null,
  arboles: new Map<string, Record<string, unknown>>(),
  leccion: null as Record<string, unknown> | null,
  llamadas: [] as { funcion: string; alumno: unknown; fecha: unknown }[],
}));

vi.mock("@/lib/cursos-servidor", () => ({
  cursosActivos: async () => doble.cursos,
  cursoPorSlug: async (slug: string) => (doble.cursos ?? []).find((c) => c.slug === slug) ?? null,
  arbolDelCurso: async (alumno: unknown, curso: { slug: string }, fecha: unknown) => {
    doble.llamadas.push({ funcion: "arbolDelCurso", alumno, fecha });
    return doble.arboles.get(curso.slug);
  },
  leccionParaVer: async (alumno: unknown, _curso: unknown, _id: unknown, fecha: unknown) => {
    doble.llamadas.push({ funcion: "leccionParaVer", alumno, fecha });
    return doble.leccion;
  },
}));

import { cursosParaRevisar, indiceParaRevisar, leccionParaRevisar } from "@/lib/panel-profesor-cursos";

const profesor = { teacherId: "t1", nombre: "T", comoAdmin: false } as unknown as ProfesorAutorizado;

const CURSO = { id: "c1", slug: "fce", titulo: "FCE", nivel: "B2", tipo: "examen", examen: "b2_first" };

function leccionIndice(id: string, extra: Record<string, unknown> = {}) {
  return { id, titulo: `Lección ${id}`, soloEjercicios: false, conVideo: false, completada: false, disponible: true, ...extra };
}

function modulo(id: string, titulo: string, lecciones: unknown[]) {
  return { id, titulo, lecciones, completadas: 0, visibleAfter: 30, disponible: true, diasParaAbrir: null, abreEl: null };
}

const ARBOL = {
  curso: CURSO,
  total: 3,
  completadas: 0,
  leccionActual: "l1",
  modulos: [
    modulo("m1", "Week 1 - Lesson 1: Uno", [leccionIndice("l1", { conVideo: true }), leccionIndice("l2", { soloEjercicios: true })]),
    modulo("m2", "Week 1 - Lesson 2: Dos", [leccionIndice("l3")]),
  ],
};

const LECCION = {
  disponible: true,
  moduloTitulo: "Week 1 - Lesson 2: Dos",
  moduloOrden: 1,
  leccion: { id: "l3", titulo: "Lección l3", contenido: "<p>Texto</p><script>alert(1)</script>", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  hermanas: [leccionIndice("l3")],
  ejercicios: [
    { id: "e1", tipo: "single", enunciado: "¿Cuál?", opciones: ["a", "b"], correcta: [1], explicacion: "Porque sí", orden: 0 },
    { id: "e2", tipo: "cloze", enunciado: "{{1}}", opciones: null, correcta: [["x"]], explicacion: null, orden: 1 },
  ],
  anteriorId: "l2",
  siguienteId: null,
};

beforeEach(() => {
  doble.cursos = [CURSO];
  doble.arboles = new Map([["fce", ARBOL]]);
  doble.leccion = LECCION;
  doble.llamadas = [];
});

describe("todo abierto", () => {
  it("el drip no cierra nada sin fecha de inicio, aunque el módulo tenga un año de espera", () => {
    const ahora = new Date("2026-11-05T12:00:00Z");
    expect(calcularApertura(365, null, ahora).abierto).toBe(true);
    expect(aperturaDeLeccion(365, null, false, ahora).abierto).toBe(true);
  });

  it("cada lectura sale sin alumno y sin fecha", async () => {
    await cursosParaRevisar(profesor);
    await indiceParaRevisar(profesor, "fce");
    await leccionParaRevisar(profesor, "fce", "l3");

    expect(doble.llamadas.map((l) => l.funcion)).toContain("leccionParaVer");
    for (const llamada of doble.llamadas) {
      expect(llamada.alumno).toBe("");
      expect(llamada.fecha).toBeNull();
    }
  });
});

describe("la lista", () => {
  it("trae todos los activos, con su tamaño", async () => {
    await expect(cursosParaRevisar(profesor)).resolves.toEqual([
      { slug: "fce", titulo: "FCE", nivel: "B2", esExamen: true, modulos: 2, lecciones: 3 },
    ]);
  });

  it("si no se pueden leer, lanza: un error no parece un catálogo vacío", async () => {
    doble.cursos = null;
    await expect(cursosParaRevisar(profesor)).rejects.toThrow();
  });
});

describe("el índice", () => {
  it("un curso que no existe es null", async () => {
    await expect(indiceParaRevisar(profesor, "no-existe")).resolves.toBeNull();
  });

  it("pone cada módulo en su mes con todas sus lecciones y su tipo, en español", async () => {
    const indice = await indiceParaRevisar(profesor, "fce");
    expect(indice?.meses).toHaveLength(1);
    const [mes] = indice?.meses ?? [];
    expect(mes.rotulo).toBe("Mes 1");
    expect(mes.lecciones).toBe(3);
    expect(mes.modulos.map((m) => m.rotulo)).toEqual(["Semana 1 · Módulo 1", "Semana 1 · Módulo 2"]);
    expect(mes.modulos[0].lecciones).toEqual([
      { id: "l1", titulo: "Lección l1", tipo: "Vídeo" },
      { id: "l2", titulo: "Lección l2", tipo: "Práctica" },
    ]);
    expect(mes.modulos[1].lecciones[0].tipo).toBe("Teoría");
  });
});

describe("la lección", () => {
  it("una que no existe, o de otro curso, es null", async () => {
    doble.leccion = null;
    await expect(leccionParaRevisar(profesor, "fce", "otra")).resolves.toBeNull();
    await expect(leccionParaRevisar(profesor, "no-existe", "l3")).resolves.toBeNull();
  });

  it("sanea el texto y prepara el vídeo", async () => {
    const leccion = await leccionParaRevisar(profesor, "fce", "l3");
    expect(leccion?.html).toContain("Texto");
    expect(leccion?.html).not.toContain("<script");
    expect(leccion?.videoIncrustado).toContain("dQw4w9WgXcQ");
  });

  it("dice dónde está y a dónde se va", async () => {
    const leccion = await leccionParaRevisar(profesor, "fce", "l3");
    expect(leccion?.moduloId).toBe("m2");
    expect(leccion?.etiqueta).toContain("Lección 1 de 1");
    expect(leccion?.anteriorId).toBe("l2");
    expect(leccion?.siguienteId).toBeNull();
  });

  it("los ejercicios van como al alumno: sin explicación y con las opciones siempre en lista", async () => {
    const leccion = await leccionParaRevisar(profesor, "fce", "l3");
    expect(leccion?.ejercicios.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(leccion?.ejercicios[1].opciones).toEqual([]);
    expect(JSON.stringify(leccion?.ejercicios)).not.toContain("Porque sí");
  });

  it("sin texto ni vídeo, html y vídeo son null", async () => {
    doble.leccion = { ...LECCION, leccion: { ...LECCION.leccion, contenido: "", videoUrl: null } };
    const leccion = await leccionParaRevisar(profesor, "fce", "l3");
    expect(leccion?.html).toBeNull();
    expect(leccion?.videoIncrustado).toBeNull();
  });
});
