import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { PERFIL_WOO, urlActualizarPago } from "@/lib/cuenta-woo";

describe("urlActualizarPago", () => {
  it("con ID, a la ficha de la suscripción", () => {
    expect(urlActualizarPago(12345)).toBe("https://drcacademy.com/mi-cuenta/view-subscription/12345/");
    expect(urlActualizarPago(" 678 ")).toBe("https://drcacademy.com/mi-cuenta/view-subscription/678/");
  });

  it("sin ID, a Perfil", () => {
    expect(urlActualizarPago()).toBe(PERFIL_WOO);
    expect(urlActualizarPago(null)).toBe(PERFIL_WOO);
    expect(urlActualizarPago("")).toBe(PERFIL_WOO);
  });

  it("lo que no es un entero positivo cuenta como sin ID", () => {
    for (const malo of [0, -3, 1.5, Number.NaN, "0", "12a", "../perfil", "1/2", "12?x=1", "0012"]) {
      expect(urlActualizarPago(malo)).toBe(PERFIL_WOO);
    }
  });

  it("nunca al escritorio de Mi cuenta a secas, que rebota al LMS", () => {
    for (const id of [undefined, 1, "99"]) {
      expect(urlActualizarPago(id)).not.toMatch(/\/mi-cuenta\/?$/);
    }
  });
});

// ---------------------------------------------------------------
// NINGUNA URL DE LA CUENTA ESCRITA A MANO FUERA DE `lib/cuenta-woo.ts`
//
// El aviso de pago pendiente llevaba la suya y era la que rebotaba al LMS.
// Quedan fuera los tests, que comprueban el contrato con la URL literal,
// y el arnés visual local `app/acceso/prueba/`, que no está en el repo.
// ---------------------------------------------------------------

const RAIZ = join(__dirname, "..");
const CARPETAS = ["app", "components", "lib"];
const PERMITIDO = join("lib", "cuenta-woo.ts");
const ARNES_LOCAL = join(RAIZ, "app", "acceso", "prueba");
const URL_DE_LA_CUENTA = /drcacademy\.com\/(mi-cuenta|wp-admin)/;

function ficheros(dir: string): string[] {
  if (dir === ARNES_LOCAL) return [];
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(tsx?|mjs|js)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

describe("las URL de la cuenta de la web", () => {
  it("solo están en lib/cuenta-woo.ts", () => {
    const fuera = CARPETAS.flatMap((c) => ficheros(join(RAIZ, c)))
      .filter((ruta) => relative(RAIZ, ruta) !== PERMITIDO)
      .filter((ruta) => URL_DE_LA_CUENTA.test(readFileSync(ruta, "utf8")))
      .map((ruta) => relative(RAIZ, ruta).split(sep).join("/"));
    expect(fuera).toEqual([]);
  });
});
