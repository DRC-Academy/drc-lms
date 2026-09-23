import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  DIAS_HACIA_DELANTE,
  enlaceDeClase,
  instanteEnMadrid,
  normalizarQuitas,
  normalizarSlots,
  proximaClase,
  semanasDelAlumno,
  ventanaAbierta,
  type Quita,
} from "@/lib/clases";
import { CLASES } from "@/lib/textos/clases";
import { clasesDelAlumno, type FilaCalendario } from "@/lib/calendario-gestion";
import { diaLocal } from "@/lib/fechas";

/**
 * Los instantes se escriben en UTC a propósito: es lo que hace que estas
 * pruebas comprueben algo. Si se escribieran en hora local, pasarían en
 * la máquina de quien las escribió y fallarían en Vercel, que corre en
 * UTC. Al lado de cada uno va la hora española que le corresponde.
 */
const CEST = (utc: string) => new Date(utc); // verano: España = UTC+2
const CET = (utc: string) => new Date(utc); //  invierno: España = UTC+1

// ---------------------------------------------------------------
// EL CALENDARIO DE GESTIÓN, EN PEQUEÑO
//
// `proximaClase` trabaja sobre las clases que salen del calendario de
// Gestión (`clasesDelAlumno`), así que las pruebas le dan un grid: filas
// como las de `vista_calendario_alumno`. `filasDeSlots` es un alumno con
// ese horario recurrente con UN profesor; `celda` añade una celda suelta
// (una recuperación, una reprogramada).
// ---------------------------------------------------------------

const ENLACE = "https://meet.google.com/abc-defg-hij";

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
    meet_link: ENLACE,
    ...extra,
  };
}

function filasDeSlots(slots: Array<{ dia: string; hora: string }>, extra: Partial<FilaCalendario> = {}) {
  return slots.map((s) => fila({ ...extra, celda: `${s.dia}_${s.hora}` }));
}

/** Lo mismo que hace `proximaDelAlumno`, pero con los 'quita' ya normalizados. */
function siguiente(filas: FilaCalendario[], ahora: Date, quitas: Quita[] = []) {
  return proximaClase(clasesDelAlumno(filas, diaLocal(ahora), DIAS_HACIA_DELANTE), ahora, quitas);
}

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
  const miercolesYViernes = filasDeSlots([
    { dia: "Miércoles", hora: "16:00" },
    { dia: "Viernes", hora: "09:00" },
  ]);

  it("sin horario no hay próxima clase", () => {
    expect(siguiente([], CEST("2026-09-22T10:00:00Z"))).toBeNull();
  });

  it("desde el lunes, la próxima es el miércoles de esta semana", () => {
    // Lunes 21/09, 12:00 en España.
    const p = siguiente(miercolesYViernes, CEST("2026-09-21T10:00:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-23", esHoy: false, enCurso: false });
  });

  it("el mismo miércoles por la mañana, la de hoy", () => {
    // Miércoles 23/09, 09:00 en España.
    const p = siguiente(miercolesYViernes, CEST("2026-09-23T07:00:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-23", esHoy: true, enCurso: false });
  });

  it("mientras la clase ocurre, la próxima es ESA y está en curso", () => {
    // Miércoles 23/09, 16:30 en España: dentro de 16:00–17:00.
    const p = siguiente(miercolesYViernes, CEST("2026-09-23T14:30:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-23", esHoy: true, enCurso: true });
  });

  it("en cuanto termina, salta a la siguiente", () => {
    // Miércoles 23/09, 17:00 en punto en España.
    const p = siguiente(miercolesYViernes, CEST("2026-09-23T15:00:00Z"));
    expect(p).toMatchObject({ dia: "Viernes", fecha: "2026-09-25" });
  });

  it("después de la última de la semana, vuelve a la primera de la siguiente", () => {
    // Viernes 25/09, 20:00 en España.
    const p = siguiente(miercolesYViernes, CEST("2026-09-25T18:00:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-09-30" });
  });

  it("con una sola clase a la semana, la de dentro de siete días", () => {
    const soloLunes = filasDeSlots([{ dia: "Lunes", hora: "10:00" }]);
    // Lunes 21/09, 11:00 en España: ya terminó la de las 10.
    const p = siguiente(soloLunes, CEST("2026-09-21T09:00:00Z"));
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
    const p = siguiente(miercolesYViernes, CEST("2026-09-23T21:30:00Z"));
    expect(p).toMatchObject({ fecha: "2026-09-25" });
  });

  it("después del cambio de hora de octubre sigue cuadrando", () => {
    // Miércoles 28/10/2026, 15:30 en España = 14:30 UTC (ya es CET).
    // La clase de 16:00 todavía no ha empezado, así que es la próxima.
    const p = siguiente(miercolesYViernes, CET("2026-10-28T14:30:00Z"));
    expect(p).toMatchObject({ dia: "Miércoles", fecha: "2026-10-28", esHoy: true, enCurso: false });
  });

  it("y a las 16:30 de ese mismo día la clase está en curso", () => {
    // 16:30 en España = 15:30 UTC en CET.
    const p = siguiente(miercolesYViernes, CET("2026-10-28T15:30:00Z"));
    expect(p).toMatchObject({ enCurso: true });
  });

  it("la medianoche española NO es la medianoche UTC", () => {
    // Jueves 24/09, 00:30 en España = miércoles 23/09 22:30 UTC.
    // Si esto contara en UTC creería que sigue siendo miércoles y
    // ofrecería una clase que ya pasó.
    const p = siguiente(miercolesYViernes, CEST("2026-09-23T22:30:00Z"));
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

describe("instanteEnMadrid", () => {
  it("en verano, las 17:00 de Madrid son las 15:00 UTC", () => {
    expect(instanteEnMadrid("2026-09-25", "17:00").toISOString()).toBe("2026-09-25T15:00:00.000Z");
  });

  it("en invierno, las 17:00 de Madrid son las 16:00 UTC", () => {
    // Ya pasado el cambio del 25 de octubre de 2026.
    expect(instanteEnMadrid("2026-11-05", "17:00").toISOString()).toBe("2026-11-05T16:00:00.000Z");
  });

  it("el día del cambio, antes y después de las 03:00, cada uno con su desfase", () => {
    // El 25/10/2026 a las 03:00 España atrasa a las 02:00.
    expect(instanteEnMadrid("2026-10-25", "01:00").toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(instanteEnMadrid("2026-10-25", "10:00").toISOString()).toBe("2026-10-25T09:00:00.000Z");
  });
});

describe("la ventana del botón", () => {
  const juevesA17 = filasDeSlots([{ dia: "Jueves", hora: "17:00" }]);
  // Jueves 24/09/2026. En España, 17:00 = 15:00 UTC.
  const proxima = () => siguiente(juevesA17, new Date("2026-09-24T08:00:00Z"))!;

  it("los instantes salen anclados a la hora de España", () => {
    const p = proxima();
    expect(p.fecha).toBe("2026-09-24");
    expect(p.empiezaEn.toISOString()).toBe("2026-09-24T15:00:00.000Z");
    expect(p.terminaEn.toISOString()).toBe("2026-09-24T16:00:00.000Z");
    expect(p.abreEn.toISOString()).toBe("2026-09-24T14:30:00.000Z");
  });

  it("cerrada por la mañana", () => {
    expect(ventanaAbierta(proxima(), new Date("2026-09-24T08:00:00Z"))).toBe(false);
  });

  it("cerrada un minuto antes de que abra", () => {
    expect(ventanaAbierta(proxima(), new Date("2026-09-24T14:29:00Z"))).toBe(false);
  });

  it("abierta en el minuto exacto en que abre", () => {
    expect(ventanaAbierta(proxima(), new Date("2026-09-24T14:30:00Z"))).toBe(true);
  });

  it("abierta mientras la clase ocurre", () => {
    expect(ventanaAbierta(proxima(), new Date("2026-09-24T15:30:00Z"))).toBe(true);
  });

  it("cerrada en el instante en que la clase termina", () => {
    // La ventana no se alarga: si la clase se estira, el alumno ya está dentro.
    expect(ventanaAbierta(proxima(), new Date("2026-09-24T16:00:00Z"))).toBe(false);
  });

  it("una clase de dos horas abre igual media hora antes, no una", () => {
    const dosHoras = filasDeSlots([
      { dia: "Jueves", hora: "17:00" },
      { dia: "Jueves", hora: "18:00" },
    ]);
    const p = siguiente(dosHoras, new Date("2026-09-24T08:00:00Z"))!;
    expect(p.abreEn.toISOString()).toBe("2026-09-24T14:30:00.000Z");
    expect(p.terminaEn.toISOString()).toBe("2026-09-24T17:00:00.000Z");
  });

  it("después del cambio de hora la ventana sigue cuadrando", () => {
    // Jueves 05/11/2026: 17:00 en España = 16:00 UTC, así que abre a las 15:30 UTC.
    const p = siguiente(juevesA17, new Date("2026-11-05T09:00:00Z"))!;
    expect(p.abreEn.toISOString()).toBe("2026-11-05T15:30:00.000Z");
    expect(ventanaAbierta(p, new Date("2026-11-05T15:29:00Z"))).toBe(false);
    expect(ventanaAbierta(p, new Date("2026-11-05T15:30:00Z"))).toBe(true);
  });

  it("sin clase no hay ventana", () => {
    expect(ventanaAbierta(null, new Date("2026-09-24T15:30:00Z"))).toBe(false);
  });

  it("la clase de las 23:00 es la de HOY, no la de la semana que viene", () => {
    // Leyendo `hasta` ("00:00") como 0 minutos, a las 10:00 de la mañana
    // esta clase ya parecía terminada. Hay alumnos a las 23:00.
    const tarde = filasDeSlots([{ dia: "Jueves", hora: "23:00" }]);
    const p = siguiente(tarde, new Date("2026-09-24T08:00:00Z"))!;
    expect(p.fecha).toBe("2026-09-24");
    expect(p.esHoy).toBe(true);
  });

  it("y a las 23:30 está en curso", () => {
    const tarde = filasDeSlots([{ dia: "Jueves", hora: "23:00" }]);
    // 23:30 en España = 21:30 UTC.
    const p = siguiente(tarde, new Date("2026-09-24T21:30:00Z"))!;
    expect(p.enCurso).toBe(true);
  });

  it("una clase que cruza la medianoche termina al día siguiente", () => {
    const tarde = filasDeSlots([{ dia: "Jueves", hora: "23:00" }]);
    const p = siguiente(tarde, new Date("2026-09-24T08:00:00Z"))!;
    // 23:00 en España = 21:00 UTC; termina a las 22:00 UTC del mismo día UTC,
    // que en España ya es el viernes.
    expect(p.terminaEn.toISOString()).toBe("2026-09-24T22:00:00.000Z");
  });
});

// ---------------------------------------------------------------
// EL CALENDARIO DE GESTIÓN
//
// Semana del lunes 21/09/2026 (`week_date` de las marcas puntuales).
// Verano: España = UTC+2.
// ---------------------------------------------------------------

describe("las clases salen del calendario de Gestión", () => {
  // Miércoles 16:00 y viernes 09:00, con Jimena.
  const horario = filasDeSlots([
    { dia: "Miércoles", hora: "16:00" },
    { dia: "Viernes", hora: "09:00" },
  ]);

  it("cada clase lleva el profesor y el enlace de su assignment", () => {
    const p = siguiente(horario, CEST("2026-09-21T10:00:00Z"))!;
    expect(p).toMatchObject({ fecha: "2026-09-23", profesor: "Jimena", meetLink: ENLACE, esRecuperacion: false });
  });

  it("dos celdas seguidas del grid son UNA clase de dos horas", () => {
    const p = siguiente(
      filasDeSlots([
        { dia: "Jueves", hora: "20:00" },
        { dia: "Jueves", hora: "21:00" },
      ]),
      CEST("2026-09-21T10:00:00Z")
    )!;
    expect(p).toMatchObject({ fecha: "2026-09-24", desde: "20:00", hasta: "22:00", horas: 2 });
  });

  it("una recuperación anterior al siguiente slot gana", () => {
    const recuperacion = fila({
      celda: "Martes_18:00",
      estado: "bloqueado",
      week_date: "2026-09-21",
      estado_base: "libre",
      recovery_for: "2026-09-18",
    });
    const p = siguiente([...horario, recuperacion], CEST("2026-09-21T10:00:00Z"))!;
    expect(p).toMatchObject({ fecha: "2026-09-22", desde: "18:00", esRecuperacion: true });
  });

  it("la recuperación de dos horas dura lo que dicen sus celdas (Victor Capela)", () => {
    const celdas = ["Jueves_20:00", "Jueves_21:00"].map((celda) =>
      fila({ celda, estado: "bloqueado", week_date: "2026-09-21", estado_base: "libre", recovery_for: "2026-09-22" })
    );
    const p = siguiente(celdas, CEST("2026-09-23T10:00:00Z"))!;
    expect(p).toMatchObject({ fecha: "2026-09-24", desde: "20:00", horas: 2 });
  });

  it("manda la hora de la celda, no la del parte (HANA Gualda: 19:00)", () => {
    // Su parte dice "Reprogramada para 2026-09-23 18:00", pero la celda de
    // las 18:00 era de otra alumna y Gestión la puso a las 19:00.
    const celda = fila({
      celda: "Miércoles_19:00",
      estado: "bloqueado",
      week_date: "2026-09-21",
      estado_base: "no_work",
      recovery_for: "2026-09-21",
    });
    const p = siguiente([celda], CEST("2026-09-22T10:00:00Z"))!;
    expect(p).toMatchObject({ fecha: "2026-09-23", desde: "19:00", horas: 1 });
  });

  it("una marca puntual solo vale para su semana", () => {
    const recuperacion = fila({
      celda: "Martes_18:00",
      estado: "bloqueado",
      week_date: "2026-09-14", // la semana pasada
      estado_base: "libre",
    });
    expect(siguiente([recuperacion], CEST("2026-09-21T10:00:00Z"))).toBeNull();
  });

  it("la recuperación de un alumno encima de la hora fija de otro es de quien recupera", () => {
    // La celda es de Marta todas las semanas; esta semana, de Ana.
    const encima = fila({
      celda: "Jueves_19:00",
      estado: "bloqueado",
      alumno_celda: "Ana Pérez",
      alumno_base: "Marta Heredia",
      estado_base: "ocupado",
      week_date: "2026-09-21",
    });
    const p = siguiente([encima], CEST("2026-09-21T10:00:00Z"))!;
    expect(p).toMatchObject({ fecha: "2026-09-24", desde: "19:00", esRecuperacion: true });
    // Y de Ana no sale ninguna clase recurrente los jueves: la hora fija es de Marta.
    expect(siguiente([encima], CEST("2026-09-25T10:00:00Z"))).toBeNull();
  });

  it("con otro profesor, la clase lleva SU nombre y SU enlace", () => {
    const sustituta = fila({
      celda: "Lunes_12:00",
      teacher_id: "t2",
      profesor: "Sol",
      estado: "bloqueado",
      week_date: "2026-09-21",
      estado_base: "libre",
      meet_link: "https://meet.google.com/sol-sala-uno",
    });
    const p = siguiente([...horario, sustituta], CEST("2026-09-21T08:00:00Z"))!;
    expect(p).toMatchObject({ profesor: "Sol", meetLink: "https://meet.google.com/sol-sala-uno" });
  });

  it("sin assignment con ese profesor, su recuperación no sale (como en Gestión)", () => {
    const suelta = fila({
      celda: "Lunes_12:00",
      teacher_id: "t2",
      profesor: "Sol",
      estado: "bloqueado",
      week_date: "2026-09-21",
      estado_base: "libre",
      asignacion_inicio: null,
      asignacion_alta: null,
      meet_link: null,
    });
    expect(siguiente([suelta], CEST("2026-09-21T08:00:00Z"))).toBeNull();
  });

  it("un alumno sin celdas no tiene clase (María do Mar Campos Souto)", () => {
    expect(siguiente([], CEST("2026-09-21T08:00:00Z"))).toBeNull();
  });

  it("antes de su fecha de inicio no hay clase", () => {
    const empieza = filasDeSlots([{ dia: "Miércoles", hora: "16:00" }], { asignacion_inicio: "2026-10-01" });
    expect(siguiente(empieza, CEST("2026-09-21T10:00:00Z"))).toMatchObject({ fecha: "2026-10-07" });
  });

  it("después de la baja no hay clase", () => {
    const baja = filasDeSlots([{ dia: "Miércoles", hora: "16:00" }], { baja: "2026-09-20T10:00:00Z" });
    expect(siguiente(baja, CEST("2026-09-21T10:00:00Z"))).toBeNull();
  });
});

describe("los quita de las excepciones", () => {
  const horario = filasDeSlots([
    { dia: "Miércoles", hora: "16:00" },
    { dia: "Viernes", hora: "09:00" },
  ]);

  it("una cancelación salta la clase y la próxima es la siguiente", () => {
    const p = siguiente(horario, CEST("2026-09-21T10:00:00Z"), [{ fecha: "2026-09-23", hora: "16:00" }])!;
    expect(p).toMatchObject({ fecha: "2026-09-25", desde: "09:00" });
  });

  it("un quita a otra hora no se lleva la clase", () => {
    const p = siguiente(horario, CEST("2026-09-21T10:00:00Z"), [{ fecha: "2026-09-23", hora: "10:00" }])!;
    expect(p).toMatchObject({ fecha: "2026-09-23" });
  });

  it("un quita sin hora se lleva todas las clases del día", () => {
    const dosAlDia = filasDeSlots([
      { dia: "Miércoles", hora: "10:00" },
      { dia: "Miércoles", hora: "18:00" },
      { dia: "Viernes", hora: "09:00" },
    ]);
    const p = siguiente(dosAlDia, CEST("2026-09-21T10:00:00Z"), [{ fecha: "2026-09-23", hora: null }])!;
    expect(p).toMatchObject({ fecha: "2026-09-25" });
  });

  it("el quita a la segunda hora de un bloque de dos se lleva el bloque", () => {
    const bloque = filasDeSlots([
      { dia: "Miércoles", hora: "16:00" },
      { dia: "Miércoles", hora: "17:00" },
    ]);
    const p = siguiente(bloque, CEST("2026-09-21T10:00:00Z"), [{ fecha: "2026-09-23", hora: "17:00" }])!;
    expect(p).toMatchObject({ fecha: "2026-09-30" });
  });

  it("una reprogramación: el origen se salta y la clase es la de destino", () => {
    // La celda del lunes queda marcada 'reprogramada' y la del jueves 'bloqueado'.
    const origen = fila({
      celda: "Lunes_10:00",
      estado: "reprogramada",
      alumno_base: "Ana Pérez",
      estado_base: "ocupado",
      week_date: "2026-09-21",
      rescheduled_to: "2026-09-24",
    });
    const destino = fila({
      celda: "Jueves_18:00",
      estado: "bloqueado",
      estado_base: "libre",
      week_date: "2026-09-21",
      recovery_for: "2026-09-21",
    });
    const p = siguiente([origen, destino], CEST("2026-09-21T06:00:00Z"), [{ fecha: "2026-09-21", hora: "10:00" }])!;
    expect(p).toMatchObject({ fecha: "2026-09-24", desde: "18:00", esRecuperacion: true });
  });

  it("reprogramada dentro del mismo día (10:00 → 18:00): sobrevive la de las 18:00", () => {
    const origen = fila({
      celda: "Lunes_10:00",
      estado: "reprogramada",
      alumno_base: "Ana Pérez",
      estado_base: "ocupado",
      week_date: "2026-09-21",
      rescheduled_to: "2026-09-21",
    });
    const destino = fila({
      celda: "Lunes_18:00",
      estado: "bloqueado",
      estado_base: "libre",
      week_date: "2026-09-21",
      recovery_for: "2026-09-21",
    });
    const p = siguiente([origen, destino], CEST("2026-09-21T06:00:00Z"), [{ fecha: "2026-09-21", hora: "10:00" }])!;
    expect(p).toMatchObject({ fecha: "2026-09-21", desde: "18:00" });
  });

  it("una recuperación no se quita nunca, como en Gestión", () => {
    // Pasa de verdad: cancelación a las 16:00 y su recuperación a las 16:00 del mismo día.
    const recuperacion = fila({
      celda: "Martes_16:00",
      estado: "bloqueado",
      estado_base: "libre",
      week_date: "2026-09-21",
    });
    const p = siguiente([recuperacion], CEST("2026-09-21T10:00:00Z"), [{ fecha: "2026-09-22", hora: "16:00" }])!;
    expect(p).toMatchObject({ fecha: "2026-09-22", desde: "16:00" });
  });

  it("normalizarQuitas se queda con los quita bien formados", () => {
    expect(
      normalizarQuitas([
        { tipo: "quita", fecha: "2026-09-23", hora: "16:00", class_type: "cancelada_con_preaviso" },
        { tipo: "quita", fecha: "2026-09-24", hora: null },
        { tipo: "añade", fecha: "2026-09-25", hora: "10:00" },
        { tipo: "quita", fecha: "2026-09-26", hora: "a las 4" }, // no se convierte en día entero
        { tipo: "quita", fecha: "ayer", hora: "10:00" },
        null,
      ])
    ).toEqual([
      { fecha: "2026-09-23", hora: "16:00", tipo: "cancelada_con_preaviso" },
      { fecha: "2026-09-24", hora: null, tipo: null },
    ]);
    expect(normalizarQuitas(null)).toEqual([]);
  });
});

describe("los límites de la ventana, con hora simulada", () => {
  // Jueves 24/09/2026 de 17:00 a 18:00 en España = 15:00–16:00 UTC.
  const p = () => siguiente(filasDeSlots([{ dia: "Jueves", hora: "17:00" }]), new Date("2026-09-24T08:00:00Z"))!;

  it("inicio − 31 min: cerrada", () => {
    expect(ventanaAbierta(p(), new Date("2026-09-24T14:29:00Z"))).toBe(false);
  });

  it("inicio − 30 min: abierta", () => {
    expect(ventanaAbierta(p(), new Date("2026-09-24T14:30:00Z"))).toBe(true);
  });

  it("durante la clase: abierta", () => {
    expect(ventanaAbierta(p(), new Date("2026-09-24T15:45:00Z"))).toBe(true);
  });

  it("fin + 1 min: cerrada, y la próxima ya es la de la semana que viene", () => {
    const despues = new Date("2026-09-24T16:01:00Z");
    expect(ventanaAbierta(p(), despues)).toBe(false);
    const nueva = siguiente(filasDeSlots([{ dia: "Jueves", hora: "17:00" }]), despues)!;
    expect(nueva.fecha).toBe("2026-10-01");
    expect(ventanaAbierta(nueva, despues)).toBe(false);
  });
});

// ---------------------------------------------------------------
// EL CALENDARIO DE «CLASES»
// ---------------------------------------------------------------

describe("semanasDelAlumno", () => {
  const horario = filasDeSlots([
    { dia: "Lunes", hora: "10:00" },
    { dia: "Jueves", hora: "18:00" },
  ]);
  // Miércoles 23/09/2026, 12:00 en España.
  const miercoles = CEST("2026-09-23T10:00:00Z");

  it("cuatro semanas, de lunes a domingo, empezando por la actual", () => {
    const s = semanasDelAlumno(horario, [], miercoles);
    expect(s).toHaveLength(4);
    expect(s.map((x) => [x.lunes, x.domingo])).toEqual([
      ["2026-09-21", "2026-09-27"],
      ["2026-09-28", "2026-10-04"],
      ["2026-10-05", "2026-10-11"],
      ["2026-10-12", "2026-10-18"],
    ]);
    expect(s[0].dias.find((d) => d.esHoy)?.fecha).toBe("2026-09-23");
  });

  it("nada del pasado: el lunes de esta semana ya no sale", () => {
    const s = semanasDelAlumno(horario, [], miercoles);
    expect(s[0].dias[0].clases).toHaveLength(0); // lunes 21
    expect(s[0].dias[3].clases.map((c) => [c.desde, c.estado])).toEqual([["18:00", "normal"]]); // jueves 24
    expect(s[1].dias[0].clases.map((c) => c.desde)).toEqual(["10:00"]); // lunes 28
  });

  it("con conPasadas, las ya terminadas de esta semana salen marcadas", () => {
    const s = semanasDelAlumno(horario, [], miercoles, undefined, { conPasadas: true });
    expect(s[0].dias[0].clases.map((c) => [c.desde, c.terminada])).toEqual([["10:00", true]]); // lunes 21
    expect(s[0].dias[3].clases.map((c) => [c.desde, c.terminada])).toEqual([["18:00", false]]); // jueves 24
  });

  it("una celda de recuperación sale como recuperación", () => {
    const recuperacion = fila({
      celda: "Viernes_17:00",
      estado: "bloqueado",
      estado_base: "libre",
      week_date: "2026-09-21",
      recovery_for: "2026-09-10",
    });
    const s = semanasDelAlumno([...horario, recuperacion], [], miercoles);
    expect(s[0].dias[4].clases.map((c) => [c.desde, c.estado])).toEqual([["17:00", "recuperacion"]]);
  });

  it("el destino de una reprogramación lleva la fecha original, y el origen no sale", () => {
    // El lunes 28 a las 10:00 se movió al jueves 1/10 a las 20:00. A las
    // 20 y no a las 19: pegada a la clase normal de las 18:00, Gestión la
    // fundiría con ella en un bloque mixto de dos horas.
    const origen = fila({
      celda: "Lunes_10:00",
      estado: "reprogramada",
      alumno_base: "Ana Pérez",
      estado_base: "ocupado",
      week_date: "2026-09-28",
      rescheduled_to: "2026-10-01",
    });
    const destino = fila({
      celda: "Jueves_20:00",
      estado: "bloqueado",
      estado_base: "libre",
      week_date: "2026-09-28",
      recovery_for: "2026-09-28",
    });
    const excepciones = [
      { tipo: "quita", class_type: "reprogramada", fecha: "2026-09-28", hora: "10:00", original_date: "2026-09-28" },
      { tipo: "añade", class_type: "reprogramada", fecha: "2026-10-01", hora: "20:00", original_date: "2026-09-28" },
    ];
    const s = semanasDelAlumno([...horario, origen, destino], excepciones, miercoles);
    expect(s[1].dias[0].clases).toHaveLength(0); // lunes 28: el origen no sale
    const jueves = s[1].dias[3].clases; // jueves 1/10
    expect(jueves.map((c) => [c.desde, c.estado, c.original])).toEqual([
      ["18:00", "normal", null],
      ["20:00", "reprogramada", "2026-09-28"],
    ]);
  });

  it("una clase cancelada se ve, apagada, y deja de ser la próxima", () => {
    const excepciones = [
      { tipo: "quita", class_type: "cancelada_con_preaviso", fecha: "2026-09-24", hora: "18:00", original_date: null },
    ];
    const s = semanasDelAlumno(horario, excepciones, miercoles);
    expect(s[0].dias[3].clases.map((c) => [c.desde, c.estado])).toEqual([["18:00", "cancelada"]]);
    // Y la próxima clase se la salta, con los mismos datos.
    const p = siguiente(horario, miercoles, normalizarQuitas(excepciones))!;
    expect(p.fecha).toBe("2026-09-28");
  });

  it("una semana sin clases queda vacía", () => {
    const baja = filasDeSlots([{ dia: "Lunes", hora: "10:00" }], { baja: "2026-09-30" });
    const s = semanasDelAlumno(baja, [], miercoles);
    expect(s[2].dias.every((d) => d.clases.length === 0)).toBe(true);
  });
});

describe("textos del calendario", () => {
  it("la reprogramada, en los dos idiomas", () => {
    expect(CLASES.es.reprogramada({ dia: "Lunes", numero: 28 }, { dia: "Jueves", numero: 1 }, "18:00")).toBe(
      "Clase del lunes 28 reprogramada al jueves 1, 18:00"
    );
    expect(CLASES.en.reprogramada({ dia: "Lunes", numero: 28 }, { dia: "Jueves", numero: 1 }, "18:00")).toBe(
      "Monday 28th class moved to Thursday 1st, 18:00"
    );
    expect(CLASES.en.reprogramada({ dia: "Lunes", numero: 11 }, { dia: "Martes", numero: 22 }, "09:00")).toBe(
      "Monday 11th class moved to Tuesday 22nd, 09:00"
    );
  });
});
