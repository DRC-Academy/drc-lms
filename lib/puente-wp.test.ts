import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// El sobre `wp` lo verifica WordPress (`wordpress/drc-desde-lms.php`), no
// el LMS. Estas pruebas lo abren COMO LO HACE EL PHP —HMAC-SHA256 de
// "wp." + cuerpo, comparado byte a byte— para que un cambio en un lado
// que rompa el contrato salte aquí y no en la tienda.

const SECRETO_PUENTE = "p".repeat(20) + "0123456789abcdef0123";
const SECRETO_WOO = "w".repeat(40);
const SECRETO_SESION = "s".repeat(40);

function b64urlABuffer(texto: string): Buffer {
  return Buffer.from(texto.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Lo que hace `DRC_Desde_LMS::verificar`, sin el nonce ni el usuario. */
function verificarComoWordPress(token: string, secreto: string) {
  const [cuerpo, firma] = token.split(".");
  const esperada = createHmac("sha256", secreto).update(`wp.${cuerpo}`).digest();
  if (!esperada.equals(b64urlABuffer(firma))) return null;
  return JSON.parse(b64urlABuffer(cuerpo).toString("utf8")) as { e: string; t: number; n: string; d: string };
}

beforeEach(() => {
  vi.resetModules();
  process.env.SECRETO_PUENTE_WP = SECRETO_PUENTE;
  process.env.SECRETO_WOO = SECRETO_WOO;
  process.env.SECRETO_SESION = SECRETO_SESION;
});

describe("el sobre del puente hacia WordPress", () => {
  it("se verifica con la clave del puente y lleva los cuatro campos del contrato", async () => {
    const { crearTokenPuenteWp } = await import("@/lib/sesion");
    const antes = Date.now();
    const token = await crearTokenPuenteWp("  Alumna@Ejemplo.COM ", "cambio-plan");

    const datos = verificarComoWordPress(token, SECRETO_PUENTE);
    expect(datos).not.toBeNull();
    expect(datos!.e).toBe("alumna@ejemplo.com");
    expect(datos!.d).toBe("cambio-plan");
    expect(Number.isInteger(datos!.t)).toBe(true);
    expect(datos!.t).toBeGreaterThanOrEqual(antes);
    expect(datos!.t).toBeLessThanOrEqual(Date.now());
    // El mismo patrón que exige el snippet para el nonce.
    expect(datos!.n).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
  });

  it("no se verifica con la clave de WooCommerce ni con la de sesión", async () => {
    const { crearTokenPuenteWp } = await import("@/lib/sesion");
    const token = await crearTokenPuenteWp("a@b.es", "cambio-plan");
    expect(verificarComoWordPress(token, SECRETO_WOO)).toBeNull();
    expect(verificarComoWordPress(token, SECRETO_SESION)).toBeNull();
  });

  it("cada sobre lleva un nonce distinto", async () => {
    const { crearTokenPuenteWp } = await import("@/lib/sesion");
    const a = verificarComoWordPress(await crearTokenPuenteWp("a@b.es", "cambio-plan"), SECRETO_PUENTE);
    const b = verificarComoWordPress(await crearTokenPuenteWp("a@b.es", "cambio-plan"), SECRETO_PUENTE);
    expect(a!.n).not.toBe(b!.n);
  });

  it("se niega a firmar si la clave del puente es la de WooCommerce o la de sesión", async () => {
    process.env.SECRETO_PUENTE_WP = SECRETO_WOO;
    const { crearTokenPuenteWp } = await import("@/lib/sesion");
    await expect(crearTokenPuenteWp("a@b.es", "cambio-plan")).rejects.toThrow(/no puede ser la misma clave/);

    vi.resetModules();
    process.env.SECRETO_PUENTE_WP = SECRETO_SESION;
    const otra = await import("@/lib/sesion");
    await expect(otra.crearTokenPuenteWp("a@b.es", "cambio-plan")).rejects.toThrow(/no puede ser la misma clave/);
  });
});

describe("por dónde va el clic de ampliar plan", () => {
  const alumno = { rol: "alumno" as const, email: "a@b.es", alumnoId: "abc-123" };

  it("un alumno con el puente activo va por el puente", async () => {
    const { viaDeAmpliar } = await import("@/lib/ampliar-plan");
    expect(viaDeAmpliar(alumno, true)).toBe("puente");
  });

  it("sin el puente activo, al enlace de siempre", async () => {
    const { viaDeAmpliar } = await import("@/lib/ampliar-plan");
    expect(viaDeAmpliar(alumno, false)).toBe("tienda");
  });

  it("el equipo revisando una ficha nunca va por el puente", async () => {
    const { viaDeAmpliar } = await import("@/lib/ampliar-plan");
    expect(viaDeAmpliar({ rol: "admin", email: "equipo@drcacademy.com", alumnoId: null }, true)).toBe("tienda");
  });

  it("la cuenta demo nunca va por el puente", async () => {
    const { viaDeAmpliar } = await import("@/lib/ampliar-plan");
    expect(viaDeAmpliar({ ...alumno, alumnoId: "demo-diego-ruiz", email: "info@drcacademy.com" }, true)).toBe("tienda");
  });

  it("el puente solo cuenta como activo con una clave de 32 caracteres o más", async () => {
    const { puenteWpActivo } = await import("@/lib/ampliar-plan");
    expect(puenteWpActivo()).toBe(true);
    process.env.SECRETO_PUENTE_WP = "corta";
    expect(puenteWpActivo()).toBe(false);
    delete process.env.SECRETO_PUENTE_WP;
    expect(puenteWpActivo()).toBe(false);
  });
});
