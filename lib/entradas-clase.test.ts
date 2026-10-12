import { describe, expect, it } from "vitest";
import { clasesCercanas, proximaDelAlumno } from "@/lib/clases";
import type { FilaCalendario } from "@/lib/calendario-gestion";
import {
  claveDeClase,
  comoMes,
  comoOrigen,
  hrefEntrada,
  idDeClase,
  limitesDelMes,
  mesVecino,
  minutosDesdeInicio,
  resolverEntrada,
  resumirEntradas,
  type FilaEntrada,
} from "@/lib/entradas-clase";

/**
 * Instantes en UTC, como en `lib/clases.test.ts`: en septiembre España va
 * dos horas por delante (CEST). Al lado, la hora española.
 */
const CEST = (utc: string) => new Date(utc);

const SALA_JIMENA = "https://meet.google.com/abc-defg-hij";
const SALA_SOL = "https://meet.google.com/sol-sala-uno";

function fila(extra: Partial<FilaCalendario> & { celda: string }): FilaCalendario {
  const [dia, hora] = extra.celda.split("_");
  return {
    alumno_id: "a1",
    nombre_en_celda: "Ana Pérez",
    teacher_id: "t1",
    profesor: "Jimena",
    dia,
    hora,
    estado: "ocupado",
    alumno_celda: "Ana Pérez",
    alumno_base: null,
    estado_base: null,
    week_date: null,
    recovery_for: null,
    rescheduled_to: null,
    asignacion_inicio: "2026-01-01",
    asignacion_alta: "2026-01-01T00:00:00Z",
    alumno_alta: "2026-01-01T00:00:00Z",
    baja: null,
    meet_link: SALA_JIMENA,
    ...extra,
  };
}

/** Miércoles 23/09/2026 a las 17:00 con Jimena: una hora. */
const horario = [fila({ celda: "Miércoles_17:00" })];

function entrar(filas: FilaCalendario[], ahora: Date, pedida: string | null = null, excepciones: unknown = [], enlaceFicha: string | null = null) {
  return resolverEntrada({
    cercanas: clasesCercanas(filas, excepciones, ahora),
    pedida,
    proxima: proximaDelAlumno(filas, excepciones, ahora),
    enlaceFicha,
    ahora,
  });
}

describe("a qué clase cuenta un clic", () => {
  it("media hora antes ya cuenta, con minutos negativos", () => {
    const ahora = CEST("2026-09-23T14:30:00Z"); // 16:30 en España
    const { clase, destino } = entrar(horario, ahora);
    expect(clase).toMatchObject({ fecha: "2026-09-23", desde: "17:00", teacherId: "t1", profesor: "Jimena" });
    expect(minutosDesdeInicio(clase!, ahora)).toBe(-30);
    expect(destino).toBe(SALA_JIMENA);
  });

  it("un minuto antes de la ventana no cuenta, pero se le manda a la sala igual", () => {
    const { clase, destino } = entrar(horario, CEST("2026-09-23T14:29:00Z")); // 16:29
    expect(clase).toBeNull();
    expect(destino).toBe(SALA_JIMENA);
  });

  it("con la clase empezada sigue contando, con minutos positivos", () => {
    const ahora = CEST("2026-09-23T15:12:00Z"); // 17:12
    const { clase } = entrar(horario, ahora);
    expect(minutosDesdeInicio(clase!, ahora)).toBe(12);
  });

  it("en cuanto termina deja de contar", () => {
    expect(entrar(horario, CEST("2026-09-23T16:00:00Z")).clase).toBeNull(); // 18:00
  });

  it("una clase cancelada no cuenta", () => {
    const quita = [{ tipo: "quita", fecha: "2026-09-23", hora: "17:00", class_type: "cancelada_por_profesor" }];
    expect(entrar(horario, CEST("2026-09-23T15:00:00Z"), null, quita).clase).toBeNull();
  });

  it("de noche, cada clase cuenta en la suya: Gestión no junta las 23:00 con las 00:00", () => {
    const noche = [fila({ celda: "Miércoles_23:00" }), fila({ celda: "Jueves_00:00" })];
    expect(entrar(noche, CEST("2026-09-23T21:40:00Z")).clase).toMatchObject({ fecha: "2026-09-23", desde: "23:00" }); // 23:40
    expect(entrar(noche, CEST("2026-09-23T22:20:00Z")).clase).toMatchObject({ fecha: "2026-09-24", desde: "00:00" }); // jueves 00:20
  });
});

describe("a qué sala se manda", () => {
  // Jimena a las 17:00 y una recuperación con Sol a las 18:00, el mismo día.
  const conRecuperacion = [
    ...horario,
    fila({
      celda: "Miércoles_18:00",
      teacher_id: "t2",
      profesor: "Sol",
      estado: "bloqueado",
      week_date: "2026-09-21",
      recovery_for: "2026-09-16",
      meet_link: SALA_SOL,
    }),
  ];

  it("con dos ventanas abiertas gana la pulsada, con su sala", () => {
    const { clase, destino } = entrar(conRecuperacion, CEST("2026-09-23T15:45:00Z"), "2026-09-23T18:00"); // 17:45
    expect(clase).toMatchObject({ desde: "18:00", teacherId: "t2" });
    expect(destino).toBe(SALA_SOL);
  });

  it("sin saber cuál, la que termina antes", () => {
    const { clase, destino } = entrar(conRecuperacion, CEST("2026-09-23T15:45:00Z"));
    expect(clase).toMatchObject({ desde: "17:00", teacherId: "t1" });
    expect(destino).toBe(SALA_JIMENA);
  });

  it("una clave que no es de sus clases no cambia nada", () => {
    const { clase } = entrar(conRecuperacion, CEST("2026-09-23T15:45:00Z"), "https://malo.example");
    expect(clase).toMatchObject({ desde: "17:00" });
  });

  it("sin sala en el calendario, la de la ficha", () => {
    const sinSala = [fila({ celda: "Miércoles_17:00", meet_link: null as unknown as string })];
    expect(entrar(sinSala, CEST("2026-09-23T15:00:00Z"), null, [], SALA_SOL).destino).toBe(SALA_SOL);
  });

  it("sin ninguna sala que valga, null: la pantalla amable", () => {
    const sinSala = [fila({ celda: "Miércoles_17:00", meet_link: "hola" })];
    expect(entrar(sinSala, CEST("2026-09-23T15:00:00Z"), null, [], "aaa").destino).toBeNull();
  });
});

describe("el enlace del botón", () => {
  const clase = { fecha: "2026-09-23", desde: "17:00" };

  it("lleva el origen y la clase, nunca la sala", () => {
    expect(hrefEntrada(clase, "mis_clases", null)).toBe("/clase/entrar?origen=mis_clases&clase=2026-09-23T17%3A00");
  });

  it("con el equipo revisando, lleva al alumno", () => {
    expect(hrefEntrada(clase, "dashboard", "s_1")).toContain("alumno=s_1");
  });

  it("la clave y el id de clase", () => {
    expect(claveDeClase(clase)).toBe("2026-09-23T17:00");
    expect(idDeClase({ ...clase, teacherId: "t1" })).toBe("2026-09-23T17:00|t1");
  });

  it("un origen que no está en la lista es desconocido", () => {
    expect(comoOrigen("calendario")).toBe("calendario");
    expect(comoOrigen("https://x")).toBe("desconocido");
    expect(comoOrigen(null)).toBe("desconocido");
  });
});

describe("resumirEntradas", () => {
  const base: FilaEntrada = {
    alumno_id: "a1",
    clase_id: "2026-09-23T17:00|t1",
    clase_inicio: "2026-09-23T15:00:00.000Z",
    profesor: "Jimena",
    clicked_at: "2026-09-23T14:50:00.000Z",
    origen: "dashboard",
    minutos_desde_inicio: -10,
  };

  it("varios clics a la misma clase son una entrada, con el primero", () => {
    const r = resumirEntradas([
      { ...base, clicked_at: "2026-09-23T15:05:00.000Z", origen: "mis_clases", minutos_desde_inicio: 5 },
      base,
    ]);
    expect(r.clases).toHaveLength(1);
    expect(r.clases[0]).toMatchObject({ primera: base.clicked_at, origen: "dashboard", minutos: -10, clics: 2 });
    expect(r.ultima).toBe("2026-09-23T15:05:00.000Z");
  });

  it("los clics sin clase van aparte y no cuentan como clase", () => {
    const r = resumirEntradas([{ ...base, clase_id: null, clase_inicio: null, minutos_desde_inicio: null }]);
    expect(r.clases).toHaveLength(0);
    expect(r.sueltos).toHaveLength(1);
  });
});

describe("el mes", () => {
  it("se valida y se mueve", () => {
    expect(comoMes("2026-10")).toBe("2026-10");
    expect(comoMes("2026-13")).toBeNull();
    expect(mesVecino("2026-12", 1)).toBe("2027-01");
    expect(mesVecino("2026-01", -1)).toBe("2025-12");
    expect(limitesDelMes("2026-12")).toEqual({ desde: "2026-12-01", hasta: "2027-01-01" });
  });
});
