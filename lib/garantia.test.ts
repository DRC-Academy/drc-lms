import { describe, expect, it } from "vitest";
import {
  calcularGarantia,
  esIntensivo,
  estadoVigente,
  incumplimientos,
  evaluarParte,
  semanasDelDrip,
  type ClaseProgramada,
  type EntradaGarantia,
  type ModuloDrip,
  type ParteClase,
} from "@/lib/garantia";

/**
 * Instantes en UTC. En septiembre y hasta el 25 de octubre España va dos
 * horas por delante (CEST); desde el 25, una (CET).
 */
const UTC = (iso: string) => new Date(iso);

function parte(extra: Partial<ParteClase> & { fecha: string; tipo: string }): ParteClase {
  return {
    parteId: "p1",
    hora: "17:00",
    profesor: "Jimena",
    motivo: null,
    rescheduledTo: null,
    registradoEn: null,
    avisadoEn: null,
    canceladoPor: null,
    ...extra,
  };
}

function entrada(extra: Partial<EntradaGarantia> = {}): EntradaGarantia {
  return {
    inicio: "2026-09-01",
    fin: null,
    intensivo: true,
    partes: [],
    programadas: [],
    modulos: [],
    cursosSinDrip: 0,
    completadas: new Map(),
    ahora: UTC("2026-10-13T10:00:00Z"),
    ...extra,
  };
}

describe("la antelación de una cancelación del alumno", () => {
  // Clase el 15/10 a las 17:00 de España = 15:00 UTC.
  const cancelada = (avisadoEn: string) =>
    evaluarParte(parte({ fecha: "2026-10-15", tipo: "falta_con_aviso", avisadoEn, canceladoPor: "alumno" }));

  it("con 23 h 59 min es tarde", () => {
    const c = cancelada("2026-10-14T15:01:00Z");
    expect(c.resultado).toBe("cancelada_tarde");
    expect(c.antelacionMin).toBe(23 * 60 + 59);
  });

  it("con 24 h 01 min es a tiempo", () => {
    const c = cancelada("2026-10-14T14:59:00Z");
    expect(c.resultado).toBe("cancelada_a_tiempo");
    expect(c.antelacionMin).toBe(24 * 60 + 1);
  });

  it("con 24 h justas es a tiempo: «menos de 24 h» es lo que la pierde", () => {
    expect(cancelada("2026-10-14T15:00:00Z").resultado).toBe("cancelada_a_tiempo");
  });

  it("los segundos no redondean hacia el alumno: 23 h 59 min 30 s sigue siendo tarde", () => {
    expect(cancelada("2026-10-14T15:00:30Z").resultado).toBe("cancelada_tarde");
  });

  it("el 25 de octubre se cuenta en horas reales, no de reloj", () => {
    // Clase el domingo 25/10 a las 12:00 CET = 11:00 UTC. El aviso, el
    // sábado a las 12:30 CEST = 10:30 UTC. En el reloj de pared hay
    // 23 h 30 min; de verdad, 24 h 30 min, porque esa noche se atrasa
    // una hora.
    const c = evaluarParte(
      parte({ fecha: "2026-10-25", hora: "12:00", tipo: "falta_con_aviso", avisadoEn: "2026-10-24T10:30:00Z", canceladoPor: "alumno" })
    );
    expect(c.resultado).toBe("cancelada_a_tiempo");
    expect(c.antelacionMin).toBe(24 * 60 + 30);
  });

  it("y al revés: 24 h 30 min de reloj pueden ser 23 h 30 min de verdad (29 de marzo)", () => {
    // Clase el domingo 29/03/2026 a las 12:00 CEST = 10:00 UTC. Aviso el
    // sábado a las 11:30 CET = 10:30 UTC.
    const c = evaluarParte(
      parte({ fecha: "2026-03-29", hora: "12:00", tipo: "falta_con_aviso", avisadoEn: "2026-03-28T10:30:00Z", canceladoPor: "alumno" })
    );
    expect(c.resultado).toBe("cancelada_tarde");
    expect(c.antelacionMin).toBe(23 * 60 + 30);
  });
});

describe("cada tipo de parte", () => {
  it("normal y recuperación son clases asistidas", () => {
    expect(evaluarParte(parte({ fecha: "2026-10-01", tipo: "normal" })).resultado).toBe("asistida");
    expect(evaluarParte(parte({ fecha: "2026-10-01", tipo: "recuperacion" })).resultado).toBe("asistida");
  });

  it("la falta sin aviso es no asistida", () => {
    expect(evaluarParte(parte({ fecha: "2026-10-01", tipo: "falta_sin_aviso" })).resultado).toBe("no_asistida");
  });

  it("la cancelación del profesor no es culpa del alumno, aunque sea con 1 h", () => {
    const c = evaluarParte(
      parte({ fecha: "2026-10-15", tipo: "cancelada_por_profesor", avisadoEn: "2026-10-15T14:00:00Z", canceladoPor: "profesor" })
    );
    expect(c.resultado).toBe("cancelada_profesor");
    // Y sin `cancelado_por`, el tipo basta.
    expect(evaluarParte(parte({ fecha: "2026-10-15", tipo: "cancelada_con_preaviso" })).resultado).toBe("cancelada_profesor");
  });

  it("la reprogramada que pide el profesor tampoco cuenta", () => {
    const c = evaluarParte(parte({ fecha: "2026-10-15", tipo: "reprogramada", motivo: "profesor", rescheduledTo: "2026-10-17" }));
    expect(c.resultado).toBe("cancelada_profesor");
  });

  it("un cambio de horario del alumno con antelación es un cambio de día, no una falta", () => {
    // Autoservicio: la hora del parte es la del cambio.
    const c = evaluarParte(
      parte({ fecha: "2026-10-15", tipo: "reprogramada", motivo: "autoservicio", rescheduledTo: "2026-10-17", registradoEn: "2026-10-12T09:00:00Z" })
    );
    expect(c.resultado).toBe("cambiada_de_dia");
    expect(c.segunProfesor).toBe(false);
  });

  it("pero movida con menos de 24 h es una cancelación tarde", () => {
    const c = evaluarParte(
      parte({ fecha: "2026-10-15", tipo: "reprogramada", motivo: "autoservicio", rescheduledTo: "2026-10-17", registradoEn: "2026-10-15T09:00:00Z" })
    );
    expect(c.resultado).toBe("cancelada_tarde");
  });

  describe("partes anteriores a avisado_en", () => {
    it("la cancelación sobre la hora es tarde, según el profesor", () => {
      const c = evaluarParte(parte({ fecha: "2026-10-12", tipo: "cancelacion_hora" }));
      expect(c.resultado).toBe("cancelada_tarde");
      expect(c.segunProfesor).toBe(true);
    });

    it("«con anticipación» sin hora va a favor del alumno", () => {
      const c = evaluarParte(
        parte({ fecha: "2026-10-15", tipo: "reprogramada", motivo: "alumno_antelacion", registradoEn: "2026-10-15T14:00:00Z" })
      );
      expect(c.resultado).toBe("cambiada_de_dia");
      expect(c.segunProfesor).toBe(true);
    });

    it("si el parte se subió 30 h antes, la antelación está probada", () => {
      const c = evaluarParte(
        parte({ fecha: "2026-10-15", tipo: "reprogramada", motivo: "alumno_antelacion", registradoEn: "2026-10-14T09:00:00Z" })
      );
      expect(c.segunProfesor).toBe(false);
      expect(c.antelacionMin).toBe(30 * 60);
    });
  });

  it("un tipo que no conoce no se adivina", () => {
    expect(evaluarParte(parte({ fecha: "2026-10-01", tipo: "algo_nuevo" })).resultado).toBe("sin_clasificar");
  });
});

describe("el contenido semanal", () => {
  const modulos: ModuloDrip[] = [
    { titulo: "M1", curso: "B1", visibleAfter: 0, lecciones: [{ id: "l1", titulo: "L1" }, { id: "l2", titulo: "L2" }] },
    { titulo: "M2", curso: "B1", visibleAfter: 0, lecciones: [{ id: "l3", titulo: "L3" }] },
    { titulo: "M3", curso: "B1", visibleAfter: 7, lecciones: [{ id: "l4", titulo: "L4" }] },
  ];

  it("la semana 1 vence a las 00:00 de España del día 7", () => {
    const [s1, s2] = semanasDelDrip("2026-09-01", modulos, new Map(), UTC("2026-10-13T10:00:00Z"));
    expect(s1).toMatchObject({ numero: 1, abre: "2026-09-01", vence: "2026-09-08" });
    expect(s2).toMatchObject({ numero: 2, abre: "2026-09-08", vence: "2026-09-15" });
  });

  it("completada en el último minuto del plazo, a tiempo; un segundo después de las 00:00, tarde", () => {
    // 00:00 del 08/09 en España = 22:00 UTC del 07/09.
    const ahora = UTC("2026-09-10T10:00:00Z");
    const enPlazo = new Map([
      ["l1", "2026-09-02T10:00:00Z"],
      ["l2", "2026-09-05T10:00:00Z"],
      ["l3", "2026-09-07T21:59:59Z"],
    ]);
    expect(semanasDelDrip("2026-09-01", modulos, enPlazo, ahora)[0].resultado).toBe("a_tiempo");

    const tarde = new Map(enPlazo).set("l3", "2026-09-07T22:00:00Z");
    const [s1] = semanasDelDrip("2026-09-01", modulos, tarde, ahora);
    expect(s1.resultado).toBe("tarde");
    expect(s1.lecciones.find((l) => l.id === "l3")?.resultado).toBe("tarde");
  });

  it("una semana sin vencer está en plazo", () => {
    const [, s2] = semanasDelDrip("2026-09-01", modulos, new Map(), UTC("2026-09-10T10:00:00Z"));
    expect(s2.resultado).toBe("en_plazo");
  });

  it("vencida sin completar antes del LMS no prueba nada; después, sí", () => {
    const [antes] = semanasDelDrip("2026-06-01", modulos, new Map(), UTC("2026-10-13T10:00:00Z"));
    expect(antes.resultado).toBe("sin_datos");
    const [despues] = semanasDelDrip("2026-09-01", modulos, new Map(), UTC("2026-10-13T10:00:00Z"));
    expect(despues.resultado).toBe("pendiente");
  });
});

describe("el veredicto", () => {
  const programada = (fecha: string, hora = "17:00"): ClaseProgramada => ({ fecha, hora, profesor: "Jimena" });

  it("va cumpliendo y el plan no ha terminado: en curso", () => {
    const v = calcularGarantia(entrada({ partes: [parte({ fecha: "2026-10-01", tipo: "normal" })] }));
    expect(v.estado).toBe("en_curso");
    expect(v.motivo).toMatch(/no tiene fecha de fin/);
  });

  it("perdida con la clase exacta y su fecha", () => {
    const v = calcularGarantia(
      entrada({
        partes: [
          parte({ fecha: "2026-10-01", tipo: "normal" }),
          parte({ fecha: "2026-10-06", tipo: "falta_sin_aviso", parteId: "p-falta" }),
          parte({ fecha: "2026-10-09", tipo: "cancelacion_hora" }),
        ],
      })
    );
    expect(v.estado).toBe("perdida");
    expect(v.fechaPerdida).toBe("2026-10-06");
    expect(v.motivo).toBe("Faltó sin avisar a la clase del 6 oct 2026, 17:00 (Jimena).");
    expect(v.evidencia).toMatchObject({ tipo: "clase", clase: { parte: { parteId: "p-falta" } } });
  });

  it("perdida por una semana, con la semana", () => {
    const v = calcularGarantia(
      entrada({
        intensivo: false,
        modulos: [{ titulo: "M1", curso: "B1", visibleAfter: 0, lecciones: [{ id: "l1", titulo: "L1" }] }],
      })
    );
    expect(v.estado).toBe("perdida");
    expect(v.fechaPerdida).toBe("2026-09-08");
    expect(v.motivo).toBe("Semana 1 (abrió el 1 sep 2026, vencía el 8 sep 2026): 1 de 1 lección sin completar.");
    expect(v.evidencia?.tipo).toBe("semana");
  });

  it("a un intensivo no se le mide el contenido", () => {
    const v = calcularGarantia(
      entrada({
        intensivo: true,
        modulos: [{ titulo: "M1", curso: "B1", visibleAfter: 0, lecciones: [{ id: "l1", titulo: "L1" }] }],
      })
    );
    expect(v.estado).toBe("en_curso");
    expect(v.semanas).toEqual([]);
  });

  it("cumplida: el plan terminó sin nada en contra", () => {
    const v = calcularGarantia(entrada({ fin: "2026-10-10", partes: [parte({ fecha: "2026-10-01", tipo: "normal" })] }));
    expect(v.estado).toBe("cumplida");
  });

  it("lo que pasa después del fin del plan no cuenta", () => {
    const v = calcularGarantia(entrada({ fin: "2026-10-10", partes: [parte({ fecha: "2026-10-12", tipo: "falta_sin_aviso" })] }));
    expect(v.estado).toBe("cumplida");
  });

  it("una semana que vence después del fin del plan no se pide", () => {
    const v = calcularGarantia(
      entrada({
        intensivo: false,
        fin: "2026-09-05",
        modulos: [{ titulo: "M1", curso: "B1", visibleAfter: 0, lecciones: [{ id: "l1", titulo: "L1" }] }],
      })
    );
    expect(v.estado).toBe("cumplida");
  });

  it("una clase sin parte: 48 h de gracia, luego sin datos; nunca perdida", () => {
    const ayer = calcularGarantia(entrada({ programadas: [programada("2026-10-12")] }));
    expect(ayer.estado).toBe("en_curso");
    expect(ayer.clases[0].resultado).toBe("pendiente");

    const hace5 = calcularGarantia(entrada({ programadas: [programada("2026-10-08")] }));
    expect(hace5.estado).toBe("sin_datos");
    expect(hace5.motivo).toBe("La clase del 8 oct 2026, 17:00 no tiene parte.");
  });

  it("una clase con parte no queda «sin parte», aunque el parte traiga otra hora", () => {
    const v = calcularGarantia(
      entrada({ programadas: [programada("2026-10-08", "17:00")], partes: [parte({ fecha: "2026-10-08", hora: "18:00", tipo: "normal" })] })
    );
    expect(v.estado).toBe("en_curso");
  });

  it("una prueba de pérdida pesa más que un dato que falta", () => {
    const v = calcularGarantia(
      entrada({ programadas: [programada("2026-10-05")], partes: [parte({ fecha: "2026-10-08", tipo: "falta_sin_aviso" })] })
    );
    expect(v.estado).toBe("perdida");
  });

  it("sin fecha de inicio no se decide", () => {
    expect(calcularGarantia(entrada({ inicio: null })).estado).toBe("sin_datos");
  });

  it("quien empezó antes de que hubiera partes queda sin datos, no perdida", () => {
    const v = calcularGarantia(entrada({ inicio: "2025-03-01" }));
    expect(v.estado).toBe("sin_datos");
    expect(v.huecos[0]).toMatch(/no hay partes de clase anteriores/);
  });

  it("con el plan terminado y el parte de la última clase en camino, aún no está cumplida", () => {
    const v = calcularGarantia(entrada({ fin: "2026-10-12", programadas: [programada("2026-10-12")] }));
    expect(v.estado).toBe("en_curso");
  });

  it("la cancelación del profesor y el cambio de horario no la pierden", () => {
    const v = calcularGarantia(
      entrada({
        partes: [
          parte({ fecha: "2026-10-05", tipo: "cancelada_por_profesor" }),
          parte({ fecha: "2026-10-06", tipo: "reprogramada", motivo: "autoservicio", registradoEn: "2026-10-02T09:00:00Z", rescheduledTo: "2026-10-08" }),
          parte({ fecha: "2026-10-08", tipo: "normal" }),
        ],
      })
    );
    expect(v.estado).toBe("en_curso");
  });
});

describe("intensivos", () => {
  it("se reconocen por el nombre", () => {
    expect(esIntensivo("Empresas Intensivos — 5h semanales · B1 · 6 Meses")).toBe(true);
    expect(esIntensivo(null, "Curso intensivo de ingles - OFERTA - 5h semanales")).toBe(true);
    expect(esIntensivo("Curso de inglés general - 2h semanales", "Inglés general")).toBe(false);
  });
});

describe("lo que se guarda", () => {
  const perdida = calcularGarantia(entrada({ partes: [parte({ fecha: "2026-10-06", tipo: "falta_sin_aviso" })] }));
  const enCurso = calcularGarantia(entrada());

  it("la primera vez, lo calculado, y cuenta como cambio", () => {
    expect(estadoVigente(null, enCurso)).toMatchObject({ estado: "en_curso", cambia: true });
  });

  it("una pérdida guardada no vuelve atrás aunque Gestión borre el parte", () => {
    const guardada = { estado: "perdida" as const, motivo: "Faltó", fechaPerdida: "2026-10-06", evidencia: perdida.evidencia, corregido: false };
    expect(estadoVigente(guardada, enCurso)).toMatchObject({ estado: "perdida", motivo: "Faltó", cambia: false });
  });

  it("una corrección a mano no la pisa el cálculo", () => {
    const corregida = { estado: "en_curso" as const, motivo: "El profesor se equivocó", fechaPerdida: null, evidencia: null, corregido: true };
    expect(estadoVigente(corregida, perdida)).toMatchObject({ estado: "en_curso", cambia: false });
  });

  it("de en curso a perdida es un cambio, con su fecha y su prueba", () => {
    const previo = { estado: "en_curso" as const, motivo: "Va cumpliendo.", fechaPerdida: null, evidencia: null, corregido: false };
    expect(estadoVigente(previo, perdida)).toMatchObject({ estado: "perdida", fechaPerdida: "2026-10-06", cambia: true });
  });

  it("el mismo estado con otro motivo no es un cambio", () => {
    const previo = { estado: "en_curso" as const, motivo: "otro texto", fechaPerdida: null, evidencia: null, corregido: false };
    expect(estadoVigente(previo, enCurso).cambia).toBe(false);
  });
});

describe("todos los incumplimientos", () => {
  it("salen todos, por fecha, y el primero es el motivo", () => {
    const v = calcularGarantia(
      entrada({
        partes: [
          parte({ fecha: "2026-10-09", tipo: "cancelacion_hora" }),
          parte({ fecha: "2026-10-06", tipo: "falta_sin_aviso" }),
          parte({ fecha: "2026-10-07", tipo: "normal" }),
        ],
      })
    );
    const todos = incumplimientos(v.clases, v.semanas);
    expect(todos.map((p) => p.fecha)).toEqual(["2026-10-06", "2026-10-09"]);
    expect(todos[0].motivo).toBe(v.motivo);
  });
});
