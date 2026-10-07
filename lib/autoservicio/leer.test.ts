import { describe, expect, it } from "vitest";
import { comoCodigo, leerEstado, leerHuecos, leerResultadoCambio, peticionValida } from "@/lib/autoservicio/leer";
import { cambioSimulado, escenarioDe, estadoSimulado, huecosSimulados } from "@/lib/autoservicio/simulacion";

// Un martes a mediodía en Madrid: el 6 de octubre de 2026.
const AHORA = new Date("2026-10-06T10:00:00Z");

describe("comoCodigo", () => {
  it("los códigos conocidos pasan; cualquier otro es GENERICO", () => {
    expect(comoCodigo("HUECO_YA_OCUPADO")).toBe("HUECO_YA_OCUPADO");
    expect(comoCodigo("CONFLICTO_INTERNO")).toBe("GENERICO");
    expect(comoCodigo(undefined)).toBe("GENERICO");
  });
});

describe("leerEstado", () => {
  it("lee el estado simulado: dos sesiones, clases ordenadas y la primera sin poder moverse", () => {
    const e = leerEstado(estadoSimulado("normal", AHORA))!;
    expect(e.elegible).toBe(true);
    expect(e.profesor).toBe("Laura");
    expect(e.sesiones.map((s) => [s.dia, s.hora, s.duracion])).toEqual([
      ["Martes", "18:00", 1],
      ["Jueves", "09:00", 2],
    ]);
    expect(e.proximasClases[0]).toMatchObject({ fecha: "2026-10-08", movible: false, motivoNoMovible: "ANTELACION_INSUFICIENTE" });
    expect(e.proximasClases[2]).toMatchObject({ movible: false, motivoNoMovible: "MARCA_PUNTUAL_EXISTENTE" });
    expect(e.proximasClases[1].movible).toBe(true);
  });

  it("un escenario bloqueado no es elegible y dice por qué", () => {
    expect(leerEstado(estadoSimulado("RECUPERACION_PENDIENTE", AHORA))).toMatchObject({
      elegible: false,
      motivoNoElegible: "RECUPERACION_PENDIENTE",
    });
  });

  it("descarta lo torcido y sin sesiones no es elegible", () => {
    const e = leerEstado({
      elegible: true,
      profesor: "Laura",
      sesiones: [{ id: "x", dia: "miercoles", hora: "18:00", duracion: 1 }],
      proximas_clases: [{ fecha: "2026-10-08", hora: "18:00", duracion: 1, sesion_id: "x", movible: true }],
    })!;
    expect(e.sesiones).toEqual([]);
    expect(e.proximasClases).toEqual([]);
    expect(e).toMatchObject({ elegible: false, motivoNoElegible: "GENERICO" });
  });

  it("sin `elegible` no hay estado", () => {
    expect(leerEstado({ profesor: "Laura" })).toBeNull();
  });
});

describe("leerHuecos", () => {
  it("fijos sin fecha; los de dos horas no empiezan a las 21:00", () => {
    const fijos = leerHuecos(huecosSimulados("fijo", "ses-jueves", AHORA))!;
    expect(fijos.every((h) => h.fecha === null && h.duracion === 2)).toBe(true);
    expect(fijos.some((h) => h.hora === "21:00")).toBe(false);
  });

  it("puntuales con fecha, desde dentro de dos días", () => {
    const puntuales = leerHuecos(huecosSimulados("puntual", "ses-martes", AHORA))!;
    expect(puntuales.length).toBeGreaterThan(0);
    expect(puntuales.every((h) => h.fecha !== null && h.fecha >= "2026-10-08")).toBe(true);
  });
});

describe("leerResultadoCambio", () => {
  it("solo un ok: true explícito es un cambio hecho", () => {
    expect(leerResultadoCambio({ ok: true, cambio_id: "c1" })).toEqual({ ok: true });
    expect(leerResultadoCambio({})).toEqual({ ok: false, codigo: "GENERICO", mensaje: null });
    expect(leerResultadoCambio(null)).toEqual({ ok: false, codigo: "GENERICO", mensaje: null });
  });

  it("los errores simulados salen con su código", () => {
    expect(leerResultadoCambio(cambioSimulado("fijo", null, { dia: "Sábado", hora: "10:00" }, AHORA))).toMatchObject({
      codigo: "HUECO_YA_OCUPADO",
    });
    expect(leerResultadoCambio(cambioSimulado("fijo", null, { dia: "Viernes", hora: "18:00" }, AHORA))).toMatchObject({
      codigo: "GENERICO",
    });
    expect(leerResultadoCambio(cambioSimulado("puntual", "2026-10-08", { dia: "Lunes", hora: "09:00" }, AHORA))).toMatchObject({
      codigo: "ANTELACION_INSUFICIENTE",
    });
    expect(leerResultadoCambio(cambioSimulado("fijo", null, { dia: "Lunes", hora: "09:00" }, AHORA))).toEqual({ ok: true });
  });
});

describe("peticionValida", () => {
  const destino = { dia: "Lunes" as const, hora: "09:00", duracion: 1, fecha: null };
  const base = { modo: "fijo" as const, sesionOrigen: "ses-martes", fechaOrigen: null, destino, idempotencyKey: "0f8b3c2e-aaaa" };

  it("el cambio fijo, sin fecha de origen", () => {
    expect(peticionValida(base)).toBe(true);
    expect(peticionValida({ ...base, fechaOrigen: "2026-10-13" })).toBe(false);
  });

  it("el puntual necesita la fecha de origen y un destino con fecha", () => {
    expect(peticionValida({ ...base, modo: "puntual" })).toBe(false);
    expect(
      peticionValida({ ...base, modo: "puntual", fechaOrigen: "2026-10-13", destino: { ...destino, fecha: "2026-10-12" } })
    ).toBe(true);
  });
});

describe("escenarioDe", () => {
  it("«1» es el normal; los tres bloqueos por su nombre; lo demás, sin simulación", () => {
    expect(escenarioDe("1")).toBe("normal");
    expect(escenarioDe("NO_ELEGIBLE")).toBe("NO_ELEGIBLE");
    expect(escenarioDe("")).toBeNull();
    expect(escenarioDe("true")).toBeNull();
    expect(escenarioDe(undefined)).toBeNull();
  });
});
