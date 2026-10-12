import { describe, expect, it } from "vitest";
import { fondoDeRuta, seccionDeRuta } from "@/components/IconoSeccion";

describe("la ruta de «Mi diploma»", () => {
  it("marca la sección del diploma", () => {
    expect(seccionDeRuta("/diploma")).toBe("diploma");
  });

  it("solo «Mi diploma» lleva el fondo blanco; el resto, niebla", () => {
    expect(fondoDeRuta("/diploma")).toBe("blanco");
    for (const ruta of ["/", "/alumno/s_1", "/clases", "/curso/b1", "/practica", "/progreso", "/diplomas", "/acceso"]) {
      expect(fondoDeRuta(ruta), ruta).toBe("niebla");
    }
  });
});
