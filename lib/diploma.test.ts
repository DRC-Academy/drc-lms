import { describe, expect, it } from "vitest";
import { progresoDiploma } from "@/lib/diploma";
import { calcularPlazo } from "@/lib/diploma-plazo";
import { mesesTranscurridos } from "@/lib/meses-landing";
import { diaLocal } from "@/lib/fechas";

/** Mediodía en Madrid: el día no depende del huso de quien corre el test. */
const dia = (d: string) => new Date(`${d}T10:00:00Z`);
const con = (fechaInicio: string | null) => ({ fechaInicio });

describe("progresoDiploma", () => {
  it("sin fecha de inicio, null: nunca un cero", () => {
    expect(progresoDiploma(null, dia("2026-10-12"))).toBeNull();
    expect(progresoDiploma(con(null), dia("2026-10-12"))).toBeNull();
    expect(progresoDiploma(con("no es una fecha"), dia("2026-10-12"))).toBeNull();
    expect(progresoDiploma(con("2026-02-30"), dia("2026-10-12"))).toBeNull();
  });

  it("el primer día: empezando, cero meses, la fecha a seis meses", () => {
    expect(progresoDiploma(con("2026-03-15"), dia("2026-03-15"))).toMatchObject({
      meses: 0,
      mesesTotales: 6,
      porcentaje: 0,
      diasRestantes: 184,
      fechaPrevista: "2026-09-15",
      tramo: "empezando",
    });
  });

  it("los tramos: 0-1 empezando, 2-3 a mitad, 4-5 recta final", () => {
    const tramo = (hoy: string) => progresoDiploma(con("2026-03-15"), dia(hoy))?.tramo;
    expect(tramo("2026-05-14")).toBe("empezando");
    expect(tramo("2026-05-15")).toBe("a-mitad");
    expect(tramo("2026-07-14")).toBe("a-mitad");
    expect(tramo("2026-07-15")).toBe("recta-final");
    expect(tramo("2026-09-14")).toBe("recta-final");
  });

  it("conseguido el mismo día de los seis meses y después; nada de «vencido»", () => {
    for (const hoy of ["2026-09-15", "2026-09-16", "2027-06-01"]) {
      expect(progresoDiploma(con("2026-03-15"), dia(hoy))).toMatchObject({
        meses: 6,
        porcentaje: 100,
        diasRestantes: 0,
        cuenta: { meses: 0, dias: 0 },
        tramo: "conseguido",
      });
    }
  });

  it("la víspera no llega al 100 %", () => {
    expect(progresoDiploma(con("2026-03-15"), dia("2026-09-14"))).toMatchObject({ porcentaje: 99, diasRestantes: 1 });
  });

  it("fin de mes acotado, como Gestión: 31/08 + 6 = 28/02", () => {
    expect(progresoDiploma(con("2026-08-31"), dia("2026-10-12"))?.fechaPrevista).toBe("2027-02-28");
  });

  it("inicio futuro: empezando, sin avance", () => {
    expect(progresoDiploma(con("2026-11-01"), dia("2026-10-12"))).toMatchObject({ meses: 0, porcentaje: 0, tramo: "empezando" });
  });

  it("dice lo mismo que la landing y que la cuenta atrás de Gestión, día a día", () => {
    const inicio = "2026-01-31";
    for (let i = 0; i < 220; i++) {
      const hoy = new Date(Date.UTC(2026, 0, 31 + i, 10));
      const p = progresoDiploma(con(inicio), hoy)!;
      const plazo = calcularPlazo(inicio, diaLocal(hoy))!;
      expect(p.meses).toBe(mesesTranscurridos(inicio, hoy));
      expect(p.diasRestantes).toBe(Math.max(0, plazo.dias));
      expect(p.tramo === "conseguido").toBe(p.meses === 6);
    }
  });
});
