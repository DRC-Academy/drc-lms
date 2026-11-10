import { describe, expect, it } from "vitest";
import { pruebaEnBarra } from "@/lib/prueba-nivel/barra";
import { PRUEBA_NIVEL } from "@/lib/textos/prueba-nivel";

const TERMINADA = {
  tipo: "terminada" as const,
  resultado: { nivel: "B2" as const, provisional: false, curso: null, repetirDesde: null },
};

describe("la prueba de nivel en la barra", () => {
  it("sin hacer: el botón para hacerla", () => {
    expect(pruebaEnBarra({ tipo: "nueva" }, "/alumno/pase-1")).toEqual({ tipo: "nueva" });
  });

  it("a medias: continuar, con cuántas lleva", () => {
    expect(pruebaEnBarra({ tipo: "en_curso", respondidas: 9, total: 17 }, "/curso/general-b1")).toEqual({ tipo: "en_curso", respondidas: 9, total: 17 });
  });

  it("terminada: solo su nivel, sin botón ni repetir", () => {
    expect(pruebaEnBarra(TERMINADA, "/progreso")).toEqual({ tipo: "nivel", nivel: "B2" });
  });

  it("sin estado (interruptor apagado o con plan): nada", () => {
    expect(pruebaEnBarra(null, "/alumno/pase-1")).toBeNull();
    expect(pruebaEnBarra(undefined, "/alumno/pase-1")).toBeNull();
  });

  it("en la propia prueba: nada, en ningún estado", () => {
    for (const estado of [{ tipo: "nueva" as const }, { tipo: "en_curso" as const, respondidas: 3, total: 17 }, TERMINADA]) {
      expect(pruebaEnBarra(estado, "/prueba-nivel")).toBeNull();
    }
    expect(pruebaEnBarra({ tipo: "nueva" }, "/prueba-nivel-otra")).toEqual({ tipo: "nueva" });
  });

  it("los textos, en los dos idiomas", () => {
    expect([PRUEBA_NIVEL.es.barraNuevaBoton, PRUEBA_NIVEL.es.barraNuevaTexto]).toEqual(["Haz tu prueba de nivel", "Unos 30–40 min"]);
    expect([PRUEBA_NIVEL.es.barraEnCursoBoton, PRUEBA_NIVEL.es.barraEnCursoTexto(9, 17)]).toEqual(["Continuar mi prueba", "Llevas 9 de 17"]);
    expect(PRUEBA_NIVEL.es.barraNivel("B2")).toBe("Tu nivel: B2");
    expect([PRUEBA_NIVEL.en.barraNuevaBoton, PRUEBA_NIVEL.en.barraEnCursoTexto(9, 17), PRUEBA_NIVEL.en.barraNivel("B2")]).toEqual([
      "Take your level test",
      "9 of 17 done",
      "Your level: B2",
    ]);
  });
});
