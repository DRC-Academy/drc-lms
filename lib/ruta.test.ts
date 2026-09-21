import { describe, expect, it } from "vitest";
import type { Bloque } from "@/lib/data";
import { RUTA } from "@/lib/textos/ruta";
import { construirRuta, type ProgresoBloques } from "@/lib/ruta";

const t = RUTA.es;

function bloque(id: string, fecha: string): Bloque {
  return {
    id,
    titulo: `Bloque ${id}`,
    area: "Gramática",
    nivel: "B1",
    intro: "",
    minutos: 10,
    ejercicios: [],
    claseOrigen: { fecha, profesor: "Noeli" },
  };
}

describe("construirRuta", () => {
  it("3a · sin clases ready y sin bloques: ninguna parada, ningún candado", () => {
    expect(construirRuta([], {}, null, t)).toEqual([]);
  });

  it("3b · con clase ready y cero bloques: una sola parada, el candado abierto, sin actual", () => {
    const paradas = construirRuta([], {}, "abierta", t);
    expect(paradas).toHaveLength(1);
    expect(paradas[0]).toMatchObject({ clave: "generacion", tipo: "generacion", numero: 1, abierta: true });
    expect(paradas.some((p) => p.tipo === "actual")).toBe(false);
  });

  it("3c · con bloques: 1..N son los generados, la actual es la última sin cerrar y el candado va en N+1", () => {
    const bloques = [bloque("a", "2026-09-02"), bloque("b", "2026-09-09"), bloque("c", "2026-09-17")];
    const progreso: ProgresoBloques = { a: { aciertos: 9, total: 10, fecha: "2026-09-03" } };

    const paradas = construirRuta(bloques, progreso, "cerrada", t);

    expect(paradas.map((p) => [p.numero, p.clave, p.tipo])).toEqual([
      [1, "a", "hecha"],
      [2, "b", "pendiente"],
      [3, "c", "actual"],
      [4, "generacion", "generacion"],
    ]);
    expect(paradas[3].abierta).toBe(false);
    expect(paradas.every((p) => p.bloque === null || p.bloque.claseOrigen)).toBe(true);
  });

  it("3c · con la última cerrada no hay actual: el presente es el candado", () => {
    const bloques = [bloque("a", "2026-09-02"), bloque("b", "2026-09-09")];
    const progreso: ProgresoBloques = {
      a: { aciertos: 8, total: 10, fecha: "2026-09-03" },
      b: { aciertos: 10, total: 10, fecha: "2026-09-10" },
    };

    const paradas = construirRuta(bloques, progreso, "cerrada", t);

    expect(paradas.map((p) => p.tipo)).toEqual(["hecha", "hecha", "generacion"]);
  });
});
