import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { alumnoEsperado, datosQueSirven } from "@/lib/marco";
import { focoDeLaUrl } from "@/lib/foco";

const ane = { alumnoId: "ane", nombre: "Ane" };
const pilar = { alumnoId: "pilar", nombre: "Pilar" };
const consulta = (texto = "") => new URLSearchParams(texto);

describe("de quién habla la URL", () => {
  it("la ruta de la ficha manda sobre el parámetro", () => {
    expect(focoDeLaUrl("/alumno/ane", consulta("alumno=pilar"))).toBe("ane");
    expect(focoDeLaUrl("/alumno/ane/gen-1", consulta())).toBe("ane");
  });

  it("en el resto de pantallas, el parámetro", () => {
    expect(focoDeLaUrl("/practica", consulta("alumno=pilar"))).toBe("pilar");
    expect(focoDeLaUrl("/curso/fce/abc", consulta("alumno=pilar"))).toBe("pilar");
  });

  it("sin ninguno, nadie", () => {
    expect(focoDeLaUrl("/clases", consulta())).toBeNull();
    expect(focoDeLaUrl("/clases", consulta("alumno="))).toBeNull();
  });
});

describe("la barra nunca enseña a otro alumno (auditoría del 30/09/2026)", () => {
  it("equipo: de la ficha de Ane a la de Pilar, lo de Ane deja de servir", () => {
    const esperado = alumnoEsperado(null, "pilar");
    expect(datosQueSirven(esperado, ane, null)).toBeNull();
  });

  it("equipo: el layout guardado de Ane tampoco sirve en la ficha de Pilar", () => {
    const esperado = alumnoEsperado(null, "pilar");
    expect(datosQueSirven(esperado, null, ane)).toBeNull();
  });

  it("equipo: en cuanto Pilar publica, se pinta Pilar", () => {
    const esperado = alumnoEsperado(null, "pilar");
    expect(datosQueSirven(esperado, pilar, ane)).toBe(pilar);
  });

  it("alumno: el id de otro en la URL no cambia de quién son los datos", () => {
    expect(alumnoEsperado("ane", "pilar")).toBe("ane");
    expect(datosQueSirven(alumnoEsperado("ane", "pilar"), pilar, null)).toBeNull();
    expect(datosQueSirven(alumnoEsperado("ane", "pilar"), ane, null)).toBe(ane);
  });

  it("equipo sin ficha: solo sirve lo que no es de nadie", () => {
    const sinFicha = { alumnoId: "", nombre: "" };
    expect(datosQueSirven(alumnoEsperado(null, null), ane, null)).toBeNull();
    expect(datosQueSirven(alumnoEsperado(null, null), sinFicha, null)).toBe(sinFicha);
  });
});

// ---------------------------------------------------------------
// NINGUNA PANTALLA SE OLVIDA DE PUBLICAR, NI DE SU ESQUELETO
//
// El marco ya no se renderiza solo con cada URL: lo pide cada página con
// `<MarcoDeLaPagina />`. Una pantalla nueva sin él dejaría la barra con
// los datos de la pantalla anterior. Y sin `loading.tsx`, el clic no da
// ninguna respuesta hasta que llega el servidor.
// ---------------------------------------------------------------

const ALUMNO = join(__dirname, "..", "app", "(alumno)");

function paginas(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return paginas(ruta);
    return nombre === "page.tsx" ? [ruta] : [];
  });
}

describe("las páginas de (alumno)", () => {
  const todas = paginas(ALUMNO);

  it("encuentra las pantallas", () => {
    expect(todas.length).toBeGreaterThanOrEqual(9);
  });

  it("todas publican el marco", () => {
    const sin = todas.filter((f) => !readFileSync(f, "utf8").includes("<MarcoDeLaPagina"));
    expect(sin.map((f) => f.split(sep).slice(-3).join("/"))).toEqual([]);
  });

  it("todas tienen su esqueleto al lado", () => {
    const sin = todas.filter((f) => {
      try {
        return !statSync(f.replace(/page\.tsx$/, "loading.tsx")).isFile();
      } catch {
        return true;
      }
    });
    expect(sin.map((f) => f.split(sep).slice(-3).join("/"))).toEqual([]);
  });

  it("no vuelve un slot paralelo: cada clic es una sola petición", () => {
    expect(readdirSync(ALUMNO).filter((n) => n.startsWith("@"))).toEqual([]);
  });
});
