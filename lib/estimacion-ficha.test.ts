import { describe, expect, it } from "vitest";
import { construirEstimacion, examenEnTexto } from "@/lib/estimacion-ficha";
import { calcularPlazo, sumarMeses } from "@/lib/diploma-plazo";

// Los mismos resultados que da `construirEstimacion` de DRC Gestión: si
// uno de estos cambia, la ficha de Gestión y «Mi progreso» dirían cosas
// distintas al mismo alumno.

const AHORA = new Date(Date.UTC(2026, 8, 29)); // 29/09/2026

const meses = (e: ReturnType<typeof construirEstimacion>) => e?.opciones.map((o) => `${o.horasSemanales}:${o.meses}`).join(" ");

describe("construirEstimacion (copia de Gestión)", () => {
  it("2 h: 7, 5 y 4 meses, llegada en abril y enero", () => {
    const e = construirEstimacion({ nivelActual: "B1", horasSemanales: 2, fuentes: {}, ahora: AHORA });
    expect(meses(e)).toBe("2:7 3:5 4:4");
    expect(e?.estado).toBe("ahorro");
    expect(e?.meta).toEqual({ nivel: "B2", origen: "siguiente_nivel" });
    expect(e?.opciones[0].llegada).toEqual({ mes: 3, anio: 2027 });
    expect(e?.mejor?.llegada).toEqual({ mes: 0, anio: 2027 });
    expect(e?.mejor?.mesesAhorrados).toBe(3);
  });

  it("1 h: 14, 7 y 5 meses", () => {
    expect(meses(construirEstimacion({ nivelActual: "A1", horasSemanales: 1, fuentes: {}, ahora: AHORA }))).toBe("1:14 2:7 3:5");
  });

  it("5 h: tope, una sola opción de 3 meses", () => {
    const e = construirEstimacion({ nivelActual: "B2", horasSemanales: 5, fuentes: {}, ahora: AHORA });
    expect(e?.estado).toBe("tope");
    expect(meses(e)).toBe("5:3");
    expect(e?.mejor).toBeNull();
  });

  it("sin horas o con 0: null (no hay banner)", () => {
    expect(construirEstimacion({ nivelActual: "B1", horasSemanales: null, fuentes: {} })).toBeNull();
    expect(construirEstimacion({ nivelActual: "B1", horasSemanales: 0, fuentes: {} })).toBeNull();
  });

  it("sin nivel se estima igual, con meta sin nombre", () => {
    const e = construirEstimacion({ nivelActual: null, horasSemanales: 2, fuentes: {}, ahora: AHORA });
    expect(meses(e)).toBe("2:7 3:5 4:4");
    expect(e?.meta).toEqual({ nivel: null, origen: "sin_nivel" });
  });

  it("C2 sin examen: la meta es su propio nivel", () => {
    expect(construirEstimacion({ nivelActual: "C2", horasSemanales: 3, fuentes: {} })?.meta).toEqual({ nivel: "C2", origen: "nivel_actual" });
  });

  it("el producto de WooCommerce manda sobre los demás textos", () => {
    const e = construirEstimacion({
      nivelActual: "B1",
      horasSemanales: 2,
      fuentes: { productoWoo: "Preparación B2 First Certificate", planAssignment: "Inglés general" },
    });
    expect(e?.estado).toBe("examen");
    expect(e?.meta).toEqual({ nivel: "B2", origen: "examen" });
  });

  it("examen de su propio nivel: la meta es ese nivel", () => {
    expect(construirEstimacion({ nivelActual: "B1", horasSemanales: 2, fuentes: { productoWoo: "intensivo PET" } })?.meta)
      .toEqual({ nivel: "B1", origen: "examen" });
  });

  it("un examen por debajo del nivel se ignora", () => {
    expect(construirEstimacion({ nivelActual: "C1", horasSemanales: 2, fuentes: { planAssignment: "First" } })?.meta)
      .toEqual({ nivel: "C2", origen: "siguiente_nivel" });
  });

  it("CAE y PET solo en mayúsculas; un código MCER solo junto a una palabra de examen", () => {
    expect(examenEnTexto("le cae bien el horario")).toBeNull();
    expect(examenEnTexto("Preparación B1")).toBe("B1");
    expect(examenEnTexto("Curso de inglés general - 2h semanales, B2")).toBeNull();
  });
});

describe("calcularPlazo (copia de Gestión)", () => {
  it("seis meses desde el inicio, en meses y días de calendario", () => {
    expect(calcularPlazo("2026-06-04", "2026-09-29")).toEqual({ dias: 66, meses: 2, diasSueltos: 5, fase: "meses" });
  });
  it("hoy, días y vencido", () => {
    expect(calcularPlazo("2026-03-29", "2026-09-29")?.fase).toBe("hoy");
    expect(calcularPlazo("2026-04-10", "2026-09-29")?.fase).toBe("dias");
    expect(calcularPlazo("2026-01-01", "2026-09-29")?.fase).toBe("vencido");
  });
  it("sin fecha, o con una que no existe: null", () => {
    expect(calcularPlazo(null, "2026-09-29")).toBeNull();
    expect(calcularPlazo("2026-02-30", "2026-09-29")).toBeNull();
  });
  it("31/08 + 6 meses = último día de febrero", () => {
    expect(sumarMeses("2026-08-31", 6)).toBe("2027-02-28");
  });
});
