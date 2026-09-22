import { describe, expect, it } from "vitest";
import { agruparPorDia, enlaceDeClase, normalizarSlots, proximaClase } from "@/lib/clases";

/**
 * Los instantes se escriben en UTC a propósito: es lo que hace que estas
 * pruebas comprueben algo. Si se escribieran en hora local, pasarían en
 * la máquina de quien las escribió y fallarían en Vercel, que corre en
 * UTC. Al lado de cada uno va la hora española que le corresponde.
 */
const CEST = (utc: string) => new Date(utc); // verano: España = UTC+2
const CET = (utc: string) => new Date(utc); //  invierno: España = UTC+1

describe("normalizarSlots", () => {
  it("acepta lo que manda Gestión y lo deja ordenado", () => {
    expect(
      normalizarSlots([
        { day: "Viernes", hour: "09:00" },
        { day: "Miércoles", hour: "11:00" },
      ])
    ).toEqual([
      { dia: "Miércoles", hora: "11:00" },
      { dia: "Viernes", hora: "09:00" },
    ]);
  });

  it("descarta lo torcido sin llevarse por delante lo bueno", () => {
    expect(
      normalizarSlots([
        { day: "Lunes", hour: "10:00" },
        { day: "Lunes", hour: "25:00" }, // hora imposible
        { day: "Lunip", hour: "10:00" }, // día que no existe
        { day: "Martes" }, // sin hora
        null,
        "Lunes 10:00",
      ])
    ).toEqual([{ dia: "Lunes", hora: "10:00" }]);
  });

  it("quita las celdas repetidas, que inventarían una hora de más", () => {
    expect(
      normalizarSlots([
        { day: "Lunes", hour: "10:00" },
        { day: "Lunes", hour: "10:00" },
      ])
    ).toEqual([{ dia: "Lunes", hora: "10:00" }]);
  });

  it("sin slots, o con basura, devuelve vacío en vez de romper", () => {
    expect(normalizarSlots(null)).toEqual([]);
    expect(normalizarSlots("Lunes")).toEqual([]);
    expect(normalizarSlots([])).toEqual([]);
  });
});

describe("agruparPorDia", () => {
  it("dos horas seguidas el mismo día son UNA clase de dos horas", () => {
    expect(
      agruparPorDia([
        { dia: "Miércoles", hora: "16:00" },
        { dia: "Miércoles", hora: "17:00" },
      ])
    ).toEqual([
      { dia: "Miércoles", indice: 3, desde: "16:00", hasta: "18:00", horas: 2 },
    ]);
  });

  it("el mismo horario en dos días son DOS clases de una hora", () => {
    expect(
      agruparPorDia([
        { dia: "Miércoles", hora: "09:00" },
        { dia: "Viernes", hora: "09:00" },
      ])
    ).toEqual([
      { dia: "Miércoles", indice: 3, desde: "09:00", hasta: "10:00", horas: 1 },
      { dia: "Viernes", indice: 5, desde: "09:00", hasta: "10:00", horas: 1 },
    ]);
  });

  it("dos horas sueltas el mismo día no se estiran en un bloque falso", () => {
    // Hoy no ocurre en ningún alumno, y el día que ocurra "10:00–19:00"
    // le escondería la clase de la tarde.
    expect(
      agruparPorDia([
        { dia: "Lunes", hora: "10:00" },
        { dia: "Lunes", hora: "18:00" },
      ])
    ).toEqual([
      { dia: "Lunes", indice: 1, desde: "10:00", hasta: "11:00", horas: 1 },
      { dia: "Lunes", indice: 1, desde: "18:00", hasta: "19:00", horas: 1 },
    ]);
  });

  it("la semana se lee de lunes a domingo, no de domingo a sábado", () => {
    const filas = agruparPorDia([
      { dia: "Domingo", hora: "10:00" },
      { dia: "Lunes", hora: "10:00" },
    ]);
    expect(filas.map((f) => f.dia)).toEqual(["Lunes", "Domingo"]);
  });
});

describe("proximaClase", () => {
  const miercolesYViernes = agruparPorDia([
    { dia: "Miércoles", hora: "16:00" },
    { dia: "Viernes", hora: "09:00" },
  ]);

  it("sin horario no hay próxima clase", () => {
    expect(proximaClase([], CEST("2026-09-22T10:00:00Z"))).toBeNull();
  });

  it("desde el lunes, la próxima es el miércoles de esta semana", () => {
    // Lunes 21/09, 12:00 en España.
    const p = proximaClase(miercolesYViernes, CEST("2026-09-21T10:00:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-23", esHoy: false, enCurso: false });
  });

  it("el mismo miércoles por la mañana, la de hoy", () => {
    // Miércoles 23/09, 09:00 en España.
    const p = proximaClase(miercolesYViernes, CEST("2026-09-23T07:00:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-23", esHoy: true, enCurso: false });
  });

  it("mientras la clase ocurre, la próxima es ESA y está en curso", () => {
    // Miércoles 23/09, 16:30 en España: dentro de 16:00–17:00.
    const p = proximaClase(miercolesYViernes, CEST("2026-09-23T14:30:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-23", esHoy: true, enCurso: true });
  });

  it("en cuanto termina, salta a la siguiente", () => {
    // Miércoles 23/09, 17:00 en punto en España.
    const p = proximaClase(miercolesYViernes, CEST("2026-09-23T15:00:00Z"));
    expect(p).toMatchObject({ dia: "Viernes", fecha: "2026-09-25" });
  });

  it("después de la última de la semana, vuelve a la primera de la siguiente", () => {
    // Viernes 25/09, 20:00 en España.
    const p = proximaClase(miercolesYViernes, CEST("2026-09-25T18:00:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-30" });
  });

  it("con una sola clase a la semana, la de dentro de siete días", () => {
    const soloLunes = agruparPorDia([{ dia: "Lunes", hora: "10:00" }]);
    // Lunes 21/09, 11:00 en España: ya terminó la de las 10.
    const p = proximaClase(soloLunes, CEST("2026-09-21T09:00:00Z"));
    expect(p).toMatchObject({ dia: "Lunes", fecha: "2026-09-28" });
  });

  // ---------------------------------------------------------------
  // EL CAMBIO DE HORA
  //
  // España pasa a CET el 25 de octubre de 2026. Estas dos son la razón
  // de que el módulo no reste horas a mano: con un `-2` fijo, la segunda
  // fallaría y todos los horarios saldrían una hora corridos durante
  // medio año.
  // ---------------------------------------------------------------

  it("en verano cuenta la hora española, no la del servidor", () => {
    // Miércoles 23/09, 23:30 en España (21:30 UTC): el día español ya es
    // el 23 aunque en UTC sea de noche del mismo día.
    const p = proximaClase(miercolesYViernes, CEST("2026-09-23T21:30:00Z"));
    expect(p).toMatchObject({ fecha: "2026-09-25" });
  });

  it("después del cambio de hora de octubre sigue cuadrando", () => {
    // Miércoles 28/10/2026, 15:30 en España = 14:30 UTC (ya es CET).
    // La clase de 16:00 todavía no ha empezado, así que es la próxima.
    const p = proximaClase(miercolesYViernes, CET("2026-10-28T14:30:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-10-28", esHoy: true, enCurso: false });
  });

  it("y a las 16:30 de ese mismo día la clase está en curso", () => {
    // 16:30 en España = 15:30 UTC en CET.
    const p = proximaClase(miercolesYViernes, CET("2026-10-28T15:30:00Z"));
    expect(p).toMatchObject({ enCurso: true });
  });

  it("la medianoche española NO es la medianoche UTC", () => {
    // Jueves 24/09, 00:30 en España = miércoles 23/09 22:30 UTC.
    // Si esto contara en UTC creería que sigue siendo miércoles y
    // ofrecería una clase que ya pasó.
    const p = proximaClase(miercolesYViernes, CEST("2026-09-23T22:30:00Z"));
    expect(p).toMatchObject({ dia: "Viernes", fecha: "2026-09-25" });
  });
});

describe("enlaceDeClase", () => {
  it("deja pasar los enlaces buenos", () => {
    expect(enlaceDeClase("https://meet.google.com/xpt-qjsn-jum")).toBe(
      "https://meet.google.com/xpt-qjsn-jum"
    );
    expect(enlaceDeClase("https://us06web.zoom.us/j/8246398792?pwd=abc")).toBe(
      "https://us06web.zoom.us/j/8246398792?pwd=abc"
    );
    expect(enlaceDeClase("https://teams.live.com/meet/9397914765854?p=4")).toBe(
      "https://teams.live.com/meet/9397914765854?p=4"
    );
  });

  it("le pone el esquema al que se lo dejó", () => {
    expect(enlaceDeClase("meet.google.com/bao-cnyt-axs")).toBe(
      "https://meet.google.com/bao-cnyt-axs"
    );
  });

  it("rechaza lo que hay de verdad en la base y no es un enlace", () => {
    expect(enlaceDeClase("aaa")).toBeNull();
    expect(enlaceDeClase("hola")).toBeNull();
    expect(enlaceDeClase("enlace meet")).toBeNull();
    expect(enlaceDeClase("meet.com")).toBeNull();
    expect(
      enlaceDeClase("Maria Pernas Lunes, 10 de agosto · 12:00 – 13:00 Zona horaria: America/Argentina")
    ).toBeNull();
  });

  it("vacío, nulo y en blanco son lo mismo: no hay enlace", () => {
    expect(enlaceDeClase("")).toBeNull();
    expect(enlaceDeClase("   ")).toBeNull();
    expect(enlaceDeClase(null)).toBeNull();
    expect(enlaceDeClase(undefined)).toBeNull();
  });

  it("no firma como clase un dominio que no es de videollamada", () => {
    expect(enlaceDeClase("https://drcacademy.com/mi-cuenta")).toBeNull();
    expect(enlaceDeClase("javascript:alert(1)")).toBeNull();
    expect(enlaceDeClase("https://meet.google.com.malo.example/abc")).toBeNull();
  });

  it("el dominio a secas no es la sala de nadie", () => {
    expect(enlaceDeClase("https://meet.google.com")).toBeNull();
    expect(enlaceDeClase("https://meet.google.com/")).toBeNull();
  });
});
