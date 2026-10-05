import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La ruta de verdad (`app/api/wp/progreso-diploma/route.ts`), con Gestión
// y los vínculos simulados: qué responde en cada caso.

const datos = vi.hoisted(() => ({
  vinculos: new Map<number, string>(),
  porEmail: new Map<string, string>(),
  perfiles: new Map<string, { fechaInicio: string | null }>(),
}));

vi.mock("@/lib/vinculos", () => ({
  resolverPorWooUserId: vi.fn(async (u: number) => datos.vinculos.get(u) ?? null),
}));

vi.mock("@/lib/gestion", () => ({
  buscarAlumnoPorEmail: vi.fn(async (email: string) => {
    const id = datos.porEmail.get(email);
    return id ? { alumnoId: id, nombre: "", email, nivel: "", profesor: "" } : null;
  }),
  obtenerPerfil: vi.fn(async (id: string) => datos.perfiles.get(id) ?? null),
}));

const SECRETO = "d".repeat(64);
const AHORA = new Date("2026-10-05T10:00:00Z");
const TS = Math.floor(AHORA.getTime() / 1000);

function firmar(email: string, u: number | null, ts: number, secreto = SECRETO) {
  return createHmac("sha256", secreto).update(`${email}|${u ?? ""}|${ts}`).digest("hex");
}

function peticion(cuerpo: unknown) {
  return new Request("http://localhost:3001/api/wp/progreso-diploma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

/** Un cuerpo bien firmado, con lo que se quiera cambiar encima. */
function cuerpo(email: string, u: number | null, extra: Record<string, unknown> = {}) {
  return { email, u, ts: TS, sig: firmar(email, u, TS), ...extra };
}

async function llamar(c: unknown) {
  const { POST } = await import("@/app/api/wp/progreso-diploma/route");
  return POST(peticion(c));
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
  process.env.DIPLOMA_HMAC_SECRET = SECRETO;
  datos.vinculos.clear();
  datos.porEmail.clear();
  datos.perfiles.clear();

  datos.porEmail.set("alumna@ejemplo.com", "a1");
  datos.perfiles.set("a1", { fechaInicio: "2026-07-24" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/wp/progreso-diploma", () => {
  it("con firma válida devuelve los meses del alumno, sin caché", async () => {
    const r = await llamar(cuerpo("alumna@ejemplo.com", null));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ meses: 2 });
  });

  it("firma el email ya normalizado: mayúsculas y espacios dan lo mismo", async () => {
    const r = await llamar({ ...cuerpo("alumna@ejemplo.com", null), email: "  Alumna@Ejemplo.COM " });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ meses: 2 });
  });

  it("con firma inválida, 401", async () => {
    const r = await llamar(cuerpo("alumna@ejemplo.com", null, { sig: firmar("alumna@ejemplo.com", null, TS, "x".repeat(64)) }));
    expect(r.status).toBe(401);
  });

  it("si cambia cualquier campo firmado, 401", async () => {
    const buena = cuerpo("alumna@ejemplo.com", 7);
    expect((await llamar({ ...buena, email: "otra@ejemplo.com" })).status).toBe(401);
    expect((await llamar({ ...buena, u: 8 })).status).toBe(401);
    expect((await llamar({ ...buena, u: null })).status).toBe(401);
    expect((await llamar({ ...buena, ts: TS + 1 })).status).toBe(401);
  });

  it("con una firma que no es hexadecimal de 64, o un cuerpo que no es el del contrato, 401", async () => {
    expect((await llamar(cuerpo("alumna@ejemplo.com", null, { sig: "zz" }))).status).toBe(401);
    expect((await llamar(cuerpo("alumna@ejemplo.com", null, { sig: "g".repeat(64) }))).status).toBe(401);
    expect((await llamar("{no es json")).status).toBe(401);
    expect((await llamar(cuerpo("alumna@ejemplo.com", null, { u: "7" }))).status).toBe(401);
    expect((await llamar(cuerpo("alumna@ejemplo.com", null, { ts: String(TS) }))).status).toBe(401);
  });

  it("con ts caducado o del futuro más allá de 300 s, 401; en el borde, 200", async () => {
    for (const ts of [TS - 301, TS + 301]) {
      const r = await llamar({ email: "alumna@ejemplo.com", u: null, ts, sig: firmar("alumna@ejemplo.com", null, ts) });
      expect(r.status).toBe(401);
    }
    for (const ts of [TS - 300, TS + 300]) {
      const r = await llamar({ email: "alumna@ejemplo.com", u: null, ts, sig: firmar("alumna@ejemplo.com", null, ts) });
      expect(r.status).toBe(200);
    }
  });

  it("sin la clave en el entorno, 500 sin detalles", async () => {
    delete process.env.DIPLOMA_HMAC_SECRET;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await llamar(cuerpo("alumna@ejemplo.com", null));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "error_interno" });
  });

  it("alumno desconocido: 0, y una línea en el log sin el email", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await llamar(cuerpo("nadie@ejemplo.com", null));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ meses: 0 });
    expect(info).toHaveBeenCalledWith("progreso-diploma: sin coincidencia (sin u)");
    expect(JSON.stringify(info.mock.calls)).not.toContain("nadie");
  });

  it("alumno desconocido con u: el log dice que venía u", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await llamar(cuerpo("nadie@ejemplo.com", 99));
    expect(await r.json()).toEqual({ meses: 0 });
    expect(info).toHaveBeenCalledWith("progreso-diploma: sin coincidencia (con u)");
  });

  it("resuelve por u antes que por email", async () => {
    // El email apunta a otra ficha: manda el vínculo, como en la entrada.
    datos.vinculos.set(534, "pruebas");
    datos.perfiles.set("pruebas", { fechaInicio: "2026-04-01" });
    const r = await llamar(cuerpo("alumna@ejemplo.com", 534));
    expect(await r.json()).toEqual({ meses: 6 });
  });

  it("con u sin vínculo, resuelve por email", async () => {
    const r = await llamar(cuerpo("alumna@ejemplo.com", 534));
    expect(await r.json()).toEqual({ meses: 2 });
  });

  it("con u vinculado a una ficha que ya no existe, resuelve por email", async () => {
    datos.vinculos.set(534, "borrada");
    const r = await llamar(cuerpo("alumna@ejemplo.com", 534));
    expect(await r.json()).toEqual({ meses: 2 });
  });

  it("sin fecha de inicio, 0 (y no cuenta como sin coincidencia)", async () => {
    datos.perfiles.set("a1", { fechaInicio: null });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await llamar(cuerpo("alumna@ejemplo.com", null));
    expect(await r.json()).toEqual({ meses: 0 });
    expect(info).not.toHaveBeenCalled();
  });

  it("con fecha de inicio futura, 0", async () => {
    datos.perfiles.set("a1", { fechaInicio: "2026-11-01" });
    const r = await llamar(cuerpo("alumna@ejemplo.com", null));
    expect(await r.json()).toEqual({ meses: 0 });
  });

  it("límites del mes 0→1 y 5→6, y alta el 31 de enero", async () => {
    const casos: Array<[string, string, number]> = [
      ["2026-09-05", "2026-10-04T10:00:00Z", 0],
      ["2026-09-05", "2026-10-05T10:00:00Z", 1],
      ["2026-04-05", "2026-10-04T10:00:00Z", 5],
      ["2026-04-05", "2026-10-05T10:00:00Z", 6],
      ["2026-01-31", "2026-02-28T10:00:00Z", 1],
      ["2026-01-31", "2026-07-30T10:00:00Z", 5],
      ["2026-01-31", "2026-07-31T10:00:00Z", 6],
    ];
    for (const [inicio, momento, esperado] of casos) {
      vi.setSystemTime(new Date(momento));
      const ts = Math.floor(new Date(momento).getTime() / 1000);
      datos.perfiles.set("a1", { fechaInicio: inicio });
      const r = await llamar({ email: "alumna@ejemplo.com", u: null, ts, sig: firmar("alumna@ejemplo.com", null, ts) });
      expect(await r.json(), `${inicio} a ${momento}`).toEqual({ meses: esperado });
    }
  });
});
