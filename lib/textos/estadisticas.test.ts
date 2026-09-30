import { describe, expect, it } from "vitest";
import { ESTADISTICAS } from "@/lib/textos/estadisticas";
import { PROGRESO } from "@/lib/textos/progreso";

const es = ESTADISTICAS.es;
const en = ESTADISTICAS.en;

describe("clases con el profesor", () => {
  it("todas con el profesor actual: «10 clases con Dana»", () => {
    const dana = { nombre: "Dana", conActual: 10, soloConActual: true };
    expect(`10 ${es.tarjeta.clases(10, dana)}`).toBe("10 clases con Dana");
    expect(es.lector.clases(10, dana)).toBe("Clases: 10 con Dana.");
    expect(`10 ${en.tarjeta.clases(10, dana)}`).toBe("10 classes with Dana");
  });

  it("con más de un profesor: «16 clases · 7 con Liliana»", () => {
    const liliana = { nombre: "Liliana", conActual: 7, soloConActual: false };
    expect(`16 ${es.tarjeta.clases(16, liliana)}`).toBe("16 clases · 7 con Liliana");
    expect(es.lector.clases(16, liliana)).toBe("Clases: 16, 7 con Liliana.");
    expect(`16 ${en.tarjeta.clases(16, liliana)}`).toBe("16 classes · 7 with Liliana");
  });

  it("recién cambiado, sin clases aún con el nuevo: no escribe el cero", () => {
    const nuevo = { nombre: "Liliana", conActual: 0, soloConActual: false };
    expect(es.tarjeta.clases(16, nuevo)).toBe("clases · ahora con Liliana");
    expect(es.tarjeta.clases(16, nuevo)).not.toMatch(/\b0\b/);
  });

  it("si no se pudo contar por profesor, se queda en el total con su nombre", () => {
    expect(es.tarjeta.clases(5, { nombre: "Sol", conActual: null, soloConActual: false })).toBe("clases con Sol");
  });

  it("singular y sin profesor", () => {
    expect(es.tarjeta.clases(1, { nombre: "Dana", conActual: 1, soloConActual: true })).toBe("clase con Dana");
    expect(es.tarjeta.clases(3, null)).toBe("clases");
  });
});

describe("las tres marcas del nivel", () => {
  it("profesor: su nombre (el ✓ lo pone el componente)", () => {
    expect(es.tarjeta.marcaNivel("profesor", "Daniela")).toBe("Daniela");
    expect(es.lector.nivel("C1", "profesor", "Daniela")).toBe("Nivel C1, confirmado por Daniela.");
    expect(PROGRESO.es.nivelConfirmadoPor("Daniela")).toBe("✓ Confirmado por Daniela");
  });

  it("prueba: «prueba de nivel», nunca «confirmado» ni un profesor", () => {
    const marca = es.tarjeta.marcaNivel("prueba", "Dana");
    expect(marca).toBe("prueba de nivel");
    expect(marca).not.toMatch(/Dana|confirmad/i);
    const lector = es.lector.nivel("B2", "prueba", "Dana");
    expect(lector).toBe("Nivel B2, según tu prueba de nivel.");
    expect(lector).not.toMatch(/Dana|confirmad/i);
    expect(PROGRESO.es.nivelPrueba).toBe("Según tu prueba de nivel");
    expect(en.tarjeta.marcaNivel("prueba", "Dana")).toBe("level test");
  });

  it("alta: «estimado»", () => {
    expect(es.tarjeta.marcaNivel("alta", "Dana")).toBe("estimado");
    expect(es.lector.nivel("B1", "alta", "Dana")).toBe("Nivel B1, estimado: te lo confirmará tu profesor.");
    expect(en.tarjeta.marcaNivel("alta", null)).toBe("estimated");
  });
});

describe("curso cumplido", () => {
  it("dice que está abierto, no que se acabó el plazo", () => {
    expect(es.tarjeta.cursoAbierto).toBe("Todo tu curso está abierto");
    expect(en.tarjeta.cursoAbierto).toBe("Your whole course is open");
  });
});
