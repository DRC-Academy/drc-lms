import { describe, expect, it } from "vitest";
import { BANNERS } from "@/lib/textos/banners";

const es = BANNERS.es;
const en = BANNERS.en;

/** Lo que el banner de ritmo puede escribir con un número de meses. */
function frases(t: typeof es, n: number): string[] {
  return [
    t.unosMeses(n),
    t.llegariasAntes(n),
    t.mesesAntes(n),
    t.ritmoEntradilla(1, "B2", n),
    t.llegasAEn("B2", n),
    t.ritmoLector("B2", 2, n, 4, n),
    t.ritmoLectorMaximo("B2", n),
  ];
}

describe("comparativa de ritmo: singular y plural de los meses", () => {
  it("con un mes, nunca «1 meses» ni «unos 1»", () => {
    for (const f of frases(es, 1)) {
      expect(f).not.toMatch(/\b1 meses\b|unos 1\b/);
    }
    expect(es.unosMeses(1)).toBe("un mes");
    expect(es.llegasAEn("B2", 1)).toBe("Llegas al nivel B2 en un mes.");
    expect(es.llegariasAntes(1)).toBe("Llegarías 1 mes antes");
    for (const f of frases(en, 1)) {
      expect(f).not.toMatch(/\b1 months\b/);
    }
    expect(en.unosMeses(1)).toBe("about 1 month");
  });

  it("con varios, en plural", () => {
    expect(es.unosMeses(3)).toBe("unos 3 meses");
    expect(es.llegasAEn("B2", 3)).toBe("Llegas al nivel B2 en unos 3 meses.");
    expect(en.llegasAEn("B2", 3)).toBe("You'll reach level B2 in about 3 months.");
  });

  it("los textos sin cifras no llevan ningún número", () => {
    for (const t of [es, en]) {
      for (const f of [t.conMasHorasLlegasAntes, t.conMasHorasAvanzasMas, t.haciaTuMetaSinCifras, t.ritmoLectorMaximo(null, null)]) {
        expect(f).not.toMatch(/\d/);
      }
    }
  });
});
