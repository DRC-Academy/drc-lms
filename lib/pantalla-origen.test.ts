import { describe, expect, it } from "vitest";
import { leerPantallaOrigen } from "@/lib/generacion";

// Lo que `app/api/generar-bloque` guarda en `pantalla_origen`: solo los
// dos valores que acepta el CHECK de la base; lo demás, sin dato.
describe("leerPantallaOrigen", () => {
  it("acepta las dos pantallas", () => {
    expect(leerPantallaOrigen("inicio")).toBe("inicio");
    expect(leerPantallaOrigen("para_ti")).toBe("para_ti");
  });

  it("cualquier otra cosa es «sin dato», no un error", () => {
    for (const valor of [undefined, null, "", "mi_camino", "Inicio", 1, {}]) {
      expect(leerPantallaOrigen(valor)).toBeNull();
    }
  });
});
