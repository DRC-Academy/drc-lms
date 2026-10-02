import { describe, expect, it } from "vitest";
import { destinoSeguro } from "@/lib/volver";

describe("destinoSeguro", () => {
  it("acepta rutas internas, con su consulta", () => {
    expect(destinoSeguro("/mis-clases?recuperacion=rec_mg1abc2def")).toBe("/mis-clases?recuperacion=rec_mg1abc2def");
    expect(destinoSeguro("/clases")).toBe("/clases");
    expect(destinoSeguro("/progreso#arriba")).toBe("/progreso#arriba");
  });

  it("nunca deja salir del LMS", () => {
    for (const fuera of [
      "https://google.com",
      "http://google.com/mis-clases",
      "//google.com",
      "//google.com/mis-clases",
      "/\\google.com",
      "\\\\google.com",
      "/\t/google.com",
      "/\n/google.com",
      "javascript:alert(1)",
      "google.com",
      " /clases",
    ]) {
      expect(destinoSeguro(fuera)).toBeNull();
    }
  });

  it("descarta la raíz, las puertas de entrada y la API", () => {
    expect(destinoSeguro("/")).toBeNull();
    expect(destinoSeguro("/acceso?volver=/clases")).toBeNull();
    expect(destinoSeguro("/entrar?token=x")).toBeNull();
    expect(destinoSeguro("/salir")).toBeNull();
    expect(destinoSeguro("/api/progreso")).toBeNull();
  });

  it("descarta lo que no es texto o es demasiado largo", () => {
    expect(destinoSeguro(undefined)).toBeNull();
    expect(destinoSeguro(null)).toBeNull();
    expect(destinoSeguro(["/clases"])).toBeNull();
    expect(destinoSeguro("")).toBeNull();
    expect(destinoSeguro(`/clases?x=${"a".repeat(400)}`)).toBeNull();
  });
});
