import { describe, expect, it } from "vitest";
import { nivelMostrado } from "@/lib/estimacion";

const perfil = (p: Partial<{ nivel: string; nivelProfesor: string | null; nivelFicha: string | null; nivelPrueba: string | null }>) => ({
  nivel: "B1",
  nivelProfesor: null,
  nivelFicha: null,
  nivelPrueba: null,
  ...p,
});

describe("nivelMostrado: valor y marca de la misma llamada", () => {
  it("nivel del profesor: marca «profesor» con su nombre", () => {
    expect(nivelMostrado("x", perfil({ nivelProfesor: "C1", nivelPrueba: "B2" }), "Daniela")).toEqual({
      nivel: "C1",
      origen: "profesor",
      profesor: "Daniela",
    });
  });

  it("nivel de la prueba: marca «prueba», sin profesor aunque lo tenga", () => {
    expect(nivelMostrado("x", perfil({ nivelPrueba: "B2" }), "Dana")).toEqual({ nivel: "B2", origen: "prueba" });
  });

  it("nivel del alta: marca «alta»", () => {
    expect(nivelMostrado("x", perfil({ nivel: "A2" }), "Dana")).toEqual({ nivel: "A2", origen: "alta" });
  });

  it("congelado: el valor del alta con la marca del alta, aunque haya nivel de profesor", () => {
    // Zulena: alta A1, profesor A2, prueba C1. Está en NIVEL_CONGELADO.
    const zulena = perfil({ nivel: "A1", nivelProfesor: "A2", nivelPrueba: "C1" });
    expect(nivelMostrado("cd6ee017-9f31-4288-80f1-dccbb13a72a1", zulena, "Liliana")).toEqual({ nivel: "A1", origen: "alta" });
  });
});
