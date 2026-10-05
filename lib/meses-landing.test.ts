import { describe, expect, it } from "vitest";
import { mesesTranscurridos } from "@/lib/meses-landing";

// Mediodía en Madrid de ese día: lejos de la medianoche, para que lo que
// se pruebe sea el mes y no la zona horaria.
const dia = (d: string) => new Date(`${d}T10:00:00Z`);

describe("mesesTranscurridos", () => {
  it("sin fecha de inicio, o con una ilegible, es 0", () => {
    expect(mesesTranscurridos(null, dia("2026-10-05"))).toBe(0);
    expect(mesesTranscurridos(undefined, dia("2026-10-05"))).toBe(0);
    expect(mesesTranscurridos("", dia("2026-10-05"))).toBe(0);
    expect(mesesTranscurridos("no es una fecha", dia("2026-10-05"))).toBe(0);
    expect(mesesTranscurridos("2026-02-30", dia("2026-10-05"))).toBe(0);
  });

  it("con fecha futura es 0", () => {
    expect(mesesTranscurridos("2026-10-06", dia("2026-10-05"))).toBe(0);
    expect(mesesTranscurridos("2027-01-01", dia("2026-10-05"))).toBe(0);
  });

  it("el mismo día del alta es 0", () => {
    expect(mesesTranscurridos("2026-03-15", dia("2026-03-15"))).toBe(0);
  });

  it("de 0 a 1: el mes se cumple el mismo día del mes siguiente", () => {
    expect(mesesTranscurridos("2026-03-15", dia("2026-04-14"))).toBe(0);
    expect(mesesTranscurridos("2026-03-15", dia("2026-04-15"))).toBe(1);
  });

  it("de 5 a 6, y de ahí no pasa", () => {
    expect(mesesTranscurridos("2026-03-15", dia("2026-09-14"))).toBe(5);
    expect(mesesTranscurridos("2026-03-15", dia("2026-09-15"))).toBe(6);
    expect(mesesTranscurridos("2026-03-15", dia("2027-06-01"))).toBe(6);
  });

  it("alta el 31 de enero: cada mes se cumple el último día del mes si no hay 31", () => {
    expect(mesesTranscurridos("2026-01-31", dia("2026-02-27"))).toBe(0);
    expect(mesesTranscurridos("2026-01-31", dia("2026-02-28"))).toBe(1);
    expect(mesesTranscurridos("2026-01-31", dia("2026-03-01"))).toBe(1);
    expect(mesesTranscurridos("2026-01-31", dia("2026-03-30"))).toBe(1);
    expect(mesesTranscurridos("2026-01-31", dia("2026-03-31"))).toBe(2);
    expect(mesesTranscurridos("2026-01-31", dia("2026-04-29"))).toBe(2);
    expect(mesesTranscurridos("2026-01-31", dia("2026-04-30"))).toBe(3);
    expect(mesesTranscurridos("2026-01-31", dia("2026-07-30"))).toBe(5);
    expect(mesesTranscurridos("2026-01-31", dia("2026-07-31"))).toBe(6);
  });

  it("alta el 31 de enero de un año bisiesto: el primer mes es el 29 de febrero", () => {
    expect(mesesTranscurridos("2028-01-31", dia("2028-02-28"))).toBe(0);
    expect(mesesTranscurridos("2028-01-31", dia("2028-02-29"))).toBe(1);
  });

  it("el día es el de Madrid, no el de UTC", () => {
    // 22:30 UTC del 14 de abril son las 00:30 del 15 en Madrid.
    expect(mesesTranscurridos("2026-03-15", new Date("2026-04-14T22:30:00Z"))).toBe(1);
    expect(mesesTranscurridos("2026-03-15", new Date("2026-04-14T21:30:00Z"))).toBe(0);
  });

  it("acepta la fecha con hora, como la puede dar la vista", () => {
    expect(mesesTranscurridos("2026-03-15T00:00:00+00:00", dia("2026-04-15"))).toBe(1);
  });
});
