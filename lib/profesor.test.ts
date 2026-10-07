import { describe, expect, it } from "vitest";
import {
  limpiarUsuarioProfesor,
  nombreVisibleProfesor,
  profesorVisibleDelPerfil,
  sinProfesorDeOrigen,
} from "@/lib/profesor";

describe("limpiarUsuarioProfesor", () => {
  it.each([
    ["DanielaN", "Daniela"],
    ["Daiana.M", "Daiana"],
    ["Sol.G", "Sol"],
    ["Ana.C", "Ana"],
    ["Sebastian (test)", "Sebastian"],
    ["Mauricio ", "Mauricio"],
    ["  Dana  ", "Dana"],
  ])("%s → %s", (usuario, esperado) => {
    expect(limpiarUsuarioProfesor(usuario)).toBe(esperado);
  });

  it("no toca los nombres que ya están limpios", () => {
    for (const nombre of ["Ana", "Agustin", "Silvia", "Johny", "Nahiara", "JUAN"]) {
      expect(limpiarUsuarioProfesor(nombre)).toBe(nombre);
    }
  });

  it("si la limpieza lo vaciara, devuelve el usuario", () => {
    expect(limpiarUsuarioProfesor("(test)")).toBe("(test)");
  });
});

describe("nombreVisibleProfesor", () => {
  it("usa el nombre visible de Gestión cuando lo hay", () => {
    expect(nombreVisibleProfesor("Daniela", "DanielaN")).toBe("Daniela");
    expect(nombreVisibleProfesor("  María José ", "MJose")).toBe("María José");
  });

  it("sin nombre visible, limpia el usuario", () => {
    expect(nombreVisibleProfesor(null, "DanielaN")).toBe("Daniela");
    expect(nombreVisibleProfesor("  ", "Sol.G")).toBe("Sol");
  });
});

describe("profesorVisibleDelPerfil", () => {
  it("con la assignment activa, el nombre visible", () => {
    expect(profesorVisibleDelPerfil({ profesor: "DanielaN", profesorVisible: null, asignacionActiva: true })).toBe("Daniela");
  });

  it("fuera de calendario, nadie", () => {
    expect(profesorVisibleDelPerfil({ profesor: "DanielaN", profesorVisible: "Daniela", asignacionActiva: false })).toBe("");
  });
});

describe("sinProfesorDeOrigen", () => {
  it("quita el nombre y deja la fecha", () => {
    expect(sinProfesorDeOrigen({ id: "b", claseOrigen: { fecha: "2026-09-12", profesor: "Camila" } })).toEqual({
      id: "b",
      claseOrigen: { fecha: "2026-09-12", profesor: "" },
    });
  });

  it("un bloque sin clase de origen se queda igual", () => {
    const bloque: { id: string; claseOrigen?: { fecha: string; profesor: string } } = { id: "b" };
    expect(sinProfesorDeOrigen(bloque)).toBe(bloque);
  });
});
