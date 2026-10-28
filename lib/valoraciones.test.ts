import { describe, expect, it } from "vitest";
import {
  claseDelPopup,
  clasesValorables,
  comoComentario,
  comoEstrellas,
  comoOrigen,
  resumirValoraciones,
  ultimaClaseDada,
  type AnalisisParaValorar,
  type FilaValoracion,
  type ParteParaValorar,
} from "@/lib/valoraciones";

/** En octubre, hasta el 25, España va dos horas por delante (CEST). */
const AHORA = new Date("2026-10-21T18:00:00Z"); // 20:00 en Madrid

let n = 0;
function parte(extra: Partial<ParteParaValorar> & { fecha: string; tipo: string }): ParteParaValorar {
  n += 1;
  return { parteId: `cr_${n}`, hora: "10:00", teacherId: "t1", profesor: "Sebastian (test)", ...extra };
}
function analisis(extra: Partial<AnalisisParaValorar> & { fecha: string }): AnalisisParaValorar {
  n += 1;
  return { id: `ca_${n}`, teacherId: "t1", analizadoEn: `${extra.fecha}T12:00:00Z`, ...extra };
}
function valorables(partes: ParteParaValorar[], analisisLista: AnalisisParaValorar[] = [], programadas = [] as { fecha: string; hora: string; horas: number | null }[]) {
  return clasesValorables({ partes, analisis: analisisLista, programadas, ahora: AHORA });
}

describe("qué clase cuenta como dada", () => {
  it("un normal sin nada más en su hueco", () => {
    const p = parte({ fecha: "2026-10-20", tipo: "normal" });
    expect(valorables([p]).map((c) => c.claseId)).toEqual([p.parteId]);
  });

  it("un normal con una falta o cancelación en su hueco, aunque sea de otro profesor, no", () => {
    for (const tipo of ["falta_sin_aviso", "falta_con_aviso", "cancelacion_hora", "cancelada_por_profesor", "cancelada_con_preaviso"]) {
      const normal = parte({ fecha: "2026-10-20", tipo: "normal" });
      const quita = parte({ fecha: "2026-10-20", tipo, teacherId: "t9" });
      expect(valorables([normal, quita]), tipo).toEqual([]);
    }
  });

  it("una falta en otro hueco del mismo día no le afecta", () => {
    const normal = parte({ fecha: "2026-10-20", tipo: "normal", hora: "10:00" });
    const falta = parte({ fecha: "2026-10-20", tipo: "falta_sin_aviso", hora: "18:00" });
    expect(valorables([normal, falta]).map((c) => c.claseId)).toEqual([normal.parteId]);
  });

  it("una recuperación sin análisis no se puede valorar", () => {
    expect(valorables([parte({ fecha: "2026-10-20", tipo: "recuperacion" })])).toEqual([]);
  });

  it("con análisis cuenta, sea cual sea el parte (manda el transcript)", () => {
    const rec = parte({ fecha: "2026-10-19", tipo: "recuperacion" });
    const falta = parte({ fecha: "2026-10-20", tipo: "falta_sin_aviso" });
    const a1 = analisis({ fecha: "2026-10-19" });
    const a2 = analisis({ fecha: "2026-10-20" });
    expect(valorables([rec, falta], [a1, a2]).map((c) => [c.claseId, c.analisisId])).toEqual([
      [falta.parteId, a2.id],
      [rec.parteId, a1.id],
    ]);
  });

  it("el análisis tiene que ser del mismo profesor", () => {
    const rec = parte({ fecha: "2026-10-19", tipo: "recuperacion" });
    expect(valorables([rec], [analisis({ fecha: "2026-10-19", teacherId: "t9" })])).toEqual([]);
  });

  it("una reprogramada no se valora, no se lleva el análisis y quita su hueco", () => {
    const rep = parte({ fecha: "2026-10-20", tipo: "reprogramada", hora: "09:00" });
    const rec = parte({ fecha: "2026-10-20", tipo: "recuperacion", hora: "17:00" });
    const a = analisis({ fecha: "2026-10-20" });
    expect(valorables([rep, rec], [a]).map((c) => [c.claseId, c.analisisId])).toEqual([[rec.parteId, a.id]]);

    const normalEnElHueco = parte({ fecha: "2026-10-20", tipo: "normal", hora: "09:00" });
    expect(valorables([rep, normalEnElHueco])).toEqual([]);
  });
});

describe("emparejar partes y análisis el mismo día", () => {
  it("dos clases con el mismo profesor: la más temprana con el análisis más temprano", () => {
    const tarde = parte({ fecha: "2026-10-20", tipo: "recuperacion", hora: "18:00" });
    const manana = parte({ fecha: "2026-10-20", tipo: "recuperacion", hora: "09:00" });
    const segundo = analisis({ fecha: "2026-10-20", analizadoEn: "2026-10-20T19:30:00Z" });
    const primero = analisis({ fecha: "2026-10-20", analizadoEn: "2026-10-20T08:30:00Z" });
    const pares = Object.fromEntries(valorables([tarde, manana], [segundo, primero]).map((c) => [c.claseId, c.analisisId]));
    expect(pares).toEqual({ [manana.parteId]: primero.id, [tarde.parteId]: segundo.id });
  });

  it("un normal y una recuperación en el mismo hueco son una clase, con el parte del normal", () => {
    const rec = parte({ fecha: "2026-10-20", tipo: "recuperacion" });
    const normal = parte({ fecha: "2026-10-20", tipo: "normal" });
    const a = analisis({ fecha: "2026-10-20" });
    expect(valorables([rec, normal], [a]).map((c) => [c.claseId, c.analisisId])).toEqual([[normal.parteId, a.id]]);
  });

  it("con más partes que análisis, el análisis va a la clase y no a la falta", () => {
    const falta = parte({ fecha: "2026-10-20", tipo: "falta_sin_aviso", hora: "09:00" });
    const normal = parte({ fecha: "2026-10-20", tipo: "normal", hora: "18:00" });
    const a = analisis({ fecha: "2026-10-20" });
    expect(valorables([falta, normal], [a]).map((c) => [c.claseId, c.analisisId])).toEqual([[normal.parteId, a.id]]);
  });
});

describe("cuándo termina", () => {
  it("una clase que no ha terminado no se valora", () => {
    // 19:30 en Madrid: a las 20:00 aún dura.
    expect(valorables([parte({ fecha: "2026-10-21", tipo: "normal", hora: "19:30" })])).toEqual([]);
  });

  it("la duración sale de las programadas; si no casa, una hora", () => {
    const p = parte({ fecha: "2026-10-21", tipo: "normal", hora: "18:00" });
    const [conProgramada] = valorables([p], [], [{ fecha: "2026-10-21", hora: "18:00", horas: 2 }]);
    expect(conProgramada.fin?.toISOString()).toBe("2026-10-21T18:00:00.000Z");
    const [sinProgramada] = valorables([p]);
    expect(sinProgramada.fin?.toISOString()).toBe("2026-10-21T17:00:00.000Z");
  });

  it("sin hora solo cuenta si casa con un análisis, y no tiene fin", () => {
    const p = parte({ fecha: "2026-10-20", tipo: "normal", hora: null });
    expect(valorables([p])).toEqual([]);
    const [c] = valorables([p], [analisis({ fecha: "2026-10-20" })]);
    expect(c.claseId).toBe(p.parteId);
    expect(c.fin).toBeNull();
  });
});

describe("el pop-up", () => {
  const ayer = parte({ fecha: "2026-10-20", tipo: "normal", hora: "17:00" });
  const anteayer = parte({ fecha: "2026-10-19", tipo: "normal", hora: "21:00" });
  const haceTres = parte({ fecha: "2026-10-18", tipo: "normal", hora: "10:00" });
  const sinHora = parte({ fecha: "2026-10-21", tipo: "normal", hora: null });

  it("sale la última clase", () => {
    const clases = valorables([anteayer, ayer, haceTres]);
    expect(claseDelPopup(clases, new Set(), AHORA)?.claseId).toBe(ayer.parteId);
  });

  it("sale aunque sea de hace días: no hay ventana de 48 h", () => {
    expect(claseDelPopup(valorables([haceTres]), new Set(), AHORA)?.claseId).toBe(haceTres.parteId);
  });

  it("si la última ya tiene fila (valorada o descartada) no sale, y no baja a una anterior", () => {
    const clases = valorables([anteayer, ayer]);
    expect(claseDelPopup(clases, new Set([ayer.parteId]), AHORA)).toBeNull();
    expect(claseDelPopup(clases, new Set([anteayer.parteId]), AHORA)?.claseId).toBe(ayer.parteId);
  });

  it("con una clase nueva vuelve a salir", () => {
    const hoy = parte({ fecha: "2026-10-21", tipo: "normal", hora: "10:00" });
    const clases = valorables([ayer, hoy]);
    expect(claseDelPopup(clases, new Set([ayer.parteId]), AHORA)?.claseId).toBe(hoy.parteId);
  });

  it("una clase sin hora no lo dispara, ni aunque haya otra anterior", () => {
    const clases = valorables([sinHora], [analisis({ fecha: "2026-10-21" })]);
    expect(clases).toHaveLength(1);
    expect(claseDelPopup(clases, new Set(), AHORA)).toBeNull();
    const conAyer = valorables([ayer, sinHora], [analisis({ fecha: "2026-10-21" })]);
    expect(claseDelPopup(conAyer, new Set(), AHORA)).toBeNull();
  });
});

describe("solo se valora la última clase dada", () => {
  const ayer = parte({ fecha: "2026-10-20", tipo: "normal", hora: "17:00" });
  const anteayer = parte({ fecha: "2026-10-19", tipo: "normal", hora: "21:00" });

  it("es la última terminada, tenga fila o no; nunca una anterior", () => {
    const clases = valorables([anteayer, ayer]);
    expect(ultimaClaseDada(clases, AHORA)?.claseId).toBe(ayer.parteId);
  });

  it("una que aún dura no cuenta: sigue siendo la anterior", () => {
    const enCurso = parte({ fecha: "2026-10-21", tipo: "normal", hora: "19:30" });
    expect(ultimaClaseDada(valorables([ayer, enCurso]), AHORA)?.claseId).toBe(ayer.parteId);
  });

  it("si la última no tiene hora, ninguna", () => {
    const sinHora = parte({ fecha: "2026-10-21", tipo: "normal", hora: null });
    expect(ultimaClaseDada(valorables([ayer, sinHora], [analisis({ fecha: "2026-10-21" })]), AHORA)).toBeNull();
  });
});

describe("lo que manda el alumno", () => {
  it("estrellas: enteros de 1 a 5", () => {
    expect([1, 5].map(comoEstrellas)).toEqual([1, 5]);
    expect([0, 6, 2.5, "3", null].map(comoEstrellas)).toEqual([null, null, null, null, null]);
  });

  it("comentario: trim, vacío a null, más de 1000 rechazado", () => {
    expect(comoComentario("  muy bien  ")).toBe("muy bien");
    expect(comoComentario("   ")).toBeNull();
    expect(comoComentario(undefined)).toBeNull();
    expect(comoComentario("x".repeat(1000))).toHaveLength(1000);
    expect(comoComentario("x".repeat(1001))).toBeUndefined();
    expect(comoComentario(42)).toBeUndefined();
  });

  it("origen: solo los dos que hay", () => {
    expect(comoOrigen("popup")).toBe("popup");
    expect(comoOrigen("mis_clases")).toBe("mis_clases");
    expect(comoOrigen("email")).toBeNull();
  });
});

describe("el resumen del panel", () => {
  function fila(extra: Partial<FilaValoracion>): FilaValoracion {
    return {
      alumno_id: "s_1",
      clase_id: `cr_${++n}`,
      profesor_id: "t2",
      profesor_nombre: "Mauricio",
      fecha_clase: "2026-10-20T08:00:00Z",
      estrellas: 5,
      comentario: null,
      descartada_en: null,
      origen: "popup",
      created_at: "",
      updated_at: "",
      ...extra,
    };
  }

  it("media por profesor sin contar las descartadas, y la tasa sobre los pop-ups mostrados", () => {
    const r = resumirValoraciones([
      fila({ estrellas: 5 }),
      fila({ estrellas: 2 }),
      fila({ estrellas: null, descartada_en: "2026-10-20T10:00:00Z" }),
      fila({ estrellas: 4, origen: "mis_clases", profesor_id: "t9", profesor_nombre: "Silvia" }),
    ]);
    expect(r.valoraciones).toBe(3);
    expect(r.media).toBeCloseTo(11 / 3);
    expect(r.porProfesor).toEqual([
      { profesorId: "t2", nombre: "Mauricio", media: 3.5, valoraciones: 2 },
      { profesorId: "t9", nombre: "Silvia", media: 4, valoraciones: 1 },
    ]);
    expect([r.popupsRespondidos, r.popupsMostrados]).toEqual([2, 3]);
  });
});
