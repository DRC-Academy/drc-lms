import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// La ruta de verdad (`app/ampliar-plan/route.ts`), con la sesión
// simulada: a dónde redirige en cada caso.

const sesion = vi.hoisted(() => ({ actual: null as unknown }));
vi.mock("@/lib/sesion-servidor", () => ({ sesionActual: async () => sesion.actual }));

const SECRETO_PUENTE = "q".repeat(40);
const peticion = () => new NextRequest("http://localhost:3001/ampliar-plan");

beforeEach(() => {
  vi.resetModules();
  process.env.SECRETO_PUENTE_WP = SECRETO_PUENTE;
  process.env.SECRETO_WOO = "w".repeat(40);
  process.env.SECRETO_SESION = "s".repeat(40);
  delete process.env.URL_AMPLIAR_PLAN;
});

describe("GET /ampliar-plan", () => {
  it("un alumno va a la entrada del puente con un sobre que WordPress acepta", async () => {
    sesion.actual = { rol: "alumno", email: "alumna@ejemplo.com", alumnoId: "abc", sesionId: "x" };
    const { GET } = await import("@/app/ampliar-plan/route");
    const r = await GET(peticion());
    expect(r.status).toBe(303);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const destino = new URL(r.headers.get("location")!);
    expect(`${destino.origin}${destino.pathname}`).toBe("https://drcacademy.com/wp-admin/admin-post.php");
    expect(destino.searchParams.get("action")).toBe("drc_desde_lms");
    const [cuerpo, firma] = destino.searchParams.get("token")!.split(".");
    const esperada = createHmac("sha256", SECRETO_PUENTE).update(`wp.${cuerpo}`).digest("base64url");
    expect(firma).toBe(esperada);
    expect(JSON.parse(Buffer.from(cuerpo, "base64url").toString()).e).toBe("alumna@ejemplo.com");
  });

  it("el equipo va al enlace de siempre, sin sobre", async () => {
    sesion.actual = { rol: "admin", email: "equipo@drcacademy.com", alumnoId: null, sesionId: "x" };
    const { GET } = await import("@/app/ampliar-plan/route");
    const r = await GET(peticion());
    expect(r.headers.get("location")).toBe("https://drcacademy.com/mi-cuenta/?drc-ampliar-plan=1");
  });

  it("sin la clave del puente, el alumno va al enlace de siempre", async () => {
    delete process.env.SECRETO_PUENTE_WP;
    sesion.actual = { rol: "alumno", email: "alumna@ejemplo.com", alumnoId: "abc", sesionId: "x" };
    const { GET } = await import("@/app/ampliar-plan/route");
    const r = await GET(peticion());
    expect(r.headers.get("location")).toBe("https://drcacademy.com/mi-cuenta/?drc-ampliar-plan=1");
  });

  it("si la clave del puente es la de WooCommerce, no firma y va al enlace de siempre", async () => {
    process.env.SECRETO_PUENTE_WP = process.env.SECRETO_WOO;
    sesion.actual = { rol: "alumno", email: "alumna@ejemplo.com", alumnoId: "abc", sesionId: "x" };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/ampliar-plan/route");
    const r = await GET(peticion());
    expect(r.headers.get("location")).toBe("https://drcacademy.com/mi-cuenta/?drc-ampliar-plan=1");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("sin sesión, a /acceso", async () => {
    sesion.actual = null;
    const { GET } = await import("@/app/ampliar-plan/route");
    const r = await GET(peticion());
    expect(new URL(r.headers.get("location")!).pathname).toBe("/acceso");
  });
});
