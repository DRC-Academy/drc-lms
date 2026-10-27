import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (original) => ({ ...(await original<object>()), cache: (fn: unknown) => fn }));

const enEspera = vi.fn<(id: string) => Promise<boolean>>();
vi.mock("@/lib/gestion", () => ({ leerEnEspera: (id: string) => enEspera(id) }));

const rpc = vi.fn<(nombre: string, p: unknown) => Promise<{ data: unknown; error: { message: string } | null }>>();
vi.mock("@/lib/supabase-lms", () => ({ baseLms: () => ({ rpc: (n: string, p: unknown) => rpc(n, p) }) }));

vi.mock("@/lib/idioma-servidor", () => ({ textosActuales: () => ({ impago: { api: "en espera" } }) }));

import { RUTAS_SIN_BLOQUEO, estadoDeAcceso, respuestaImpago } from "@/lib/estado-acceso";

const alumno = (alumnoId = "s_1") => ({ rol: "alumno" as const, alumnoId });

// ---------------------------------------------------------------
// LA REGLA
// ---------------------------------------------------------------

describe("estadoDeAcceso", () => {
  beforeEach(() => {
    enEspera.mockReset();
    rpc.mockReset();
    rpc.mockResolvedValue({ data: false, error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sin sesión o del equipo: activo, sin preguntar a Gestión", async () => {
    expect(await estadoDeAcceso(null)).toBe("activo");
    expect(await estadoDeAcceso({ rol: "admin", alumnoId: null })).toBe("activo");
    expect(enEspera).not.toHaveBeenCalled();
  });

  it("Gestión no le tiene en espera: activo, sin mirar exenciones", async () => {
    enEspera.mockResolvedValue(false);
    expect(await estadoDeAcceso(alumno())).toBe("activo");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("en espera y no exento: impago", async () => {
    enEspera.mockResolvedValue(true);
    expect(await estadoDeAcceso(alumno())).toBe("impago");
    expect(rpc).toHaveBeenCalledWith("metricas_excluido", { p_alumno_id: "s_1" });
  });

  it("en espera pero cuenta de pruebas o demo: activo", async () => {
    enEspera.mockResolvedValue(true);
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await estadoDeAcceso(alumno())).toBe("activo");
  });

  it("si Gestión falla, se deja pasar y se apunta", async () => {
    enEspera.mockRejectedValue(new Error("timeout"));
    expect(await estadoDeAcceso(alumno())).toBe("activo");
    expect(console.error).toHaveBeenCalled();
  });

  it("si la lista de exentos falla, también se deja pasar", async () => {
    enEspera.mockResolvedValue(true);
    rpc.mockResolvedValue({ data: null, error: { message: "caída" } });
    expect(await estadoDeAcceso(alumno())).toBe("activo");
  });

  it("simulación fuera de producción: impago aunque sea cuenta de pruebas", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("ESTADO_ACCESO_SIMULADO", "s_otro:fallo, s_1:impago");
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await estadoDeAcceso(alumno())).toBe("impago");
    expect(enEspera).not.toHaveBeenCalled();
  });

  it("simulación de fallo: deja pasar, como un fallo de verdad", async () => {
    vi.stubEnv("ESTADO_ACCESO_SIMULADO", "s_1:fallo");
    expect(await estadoDeAcceso(alumno())).toBe("activo");
    expect(enEspera).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("simulación para otro alumno: no le afecta", async () => {
    vi.stubEnv("ESTADO_ACCESO_SIMULADO", "s_otro:impago");
    enEspera.mockResolvedValue(false);
    expect(await estadoDeAcceso(alumno())).toBe("activo");
  });

  it("en producción la simulación se ignora y se avisa", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ESTADO_ACCESO_SIMULADO", "s_1:impago");
    enEspera.mockResolvedValue(false);
    expect(await estadoDeAcceso(alumno())).toBe("activo");
    expect(enEspera).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("el rechazo de la API es un 403 sin lenguaje de error", async () => {
    const r = respuestaImpago();
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ codigo: "pago_pendiente", error: "en espera" });
  });
});

// ---------------------------------------------------------------
// NINGUNA RUTA LA ESQUIVA
//
// Recorre `app/` entero. Cada ruta (`route.ts`), cada archivo con
// acciones de servidor y cada página que no cuelga del layout del alumno
// tiene que llamar a `estadoDeAcceso`, o estar aquí con su motivo. Una
// ruta nueva que no haga ninguna de las dos cosas rompe este test.
// ---------------------------------------------------------------

const RAIZ = join(__dirname, "..");
const APP = join(RAIZ, "app");

/** Lo que no tiene a un alumno con sesión delante, o no hace nada. Con su motivo. */
const SIN_ALUMNO: Record<string, string> = {
  "app/entrar/route.ts": "Login: el bloqueo es después de entrar.",
  "app/entrar/woo/route.ts": "Login desde WooCommerce.",
  "app/salir/route.ts": "Cerrar sesión.",
  "app/acceso/acciones.ts": "Pedir el enlace de entrada.",
  "app/mis-clases/route.ts": "Solo redirige a /clases, que pinta el aviso; no lee ni escribe.",
  "app/api/avisos-apertura/route.ts": "Cron con CRON_SECRET (los correos quedan fuera de alcance).",
  "app/api/garantia/route.ts": "Cron con CRON_SECRET.",
  "app/api/avisos/baja/route.ts": "Baja de correos con token firmado.",
  "app/api/externo/diploma/route.ts": "Gestión, servidor a servidor.",
  "app/api/wp/progreso-diploma/route.ts": "WordPress, servidor a servidor.",
  "app/avisos/baja/page.tsx": "Baja de correos con token firmado.",
};

/** Páginas y acciones solo del equipo: el equipo nunca se bloquea. */
const DEL_EQUIPO = /exigirAdministrador\(\)/;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const rel = (ruta: string) => relative(RAIZ, ruta).split(sep).join("/");

/** La URL de una `route.ts`: sin grupos `(…)`. */
function urlDe(ruta: string): string {
  return (
    "/" +
    rel(ruta)
      .replace(/^app\//, "")
      .replace(/\/route\.ts$/, "")
      .split("/")
      .filter((s) => !/^\(.*\)$/.test(s))
      .join("/")
  );
}

describe("ninguna ruta esquiva estadoDeAcceso", () => {
  const todos = archivos(APP).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));

  // El arnés visual (/acceso/prueba*) vive sin trackear y detrás de /acceso, que es pública.
  const candidatos = todos.filter((f) => !rel(f).startsWith("app/acceso/prueba"));

  const rutas = candidatos.filter((f) => f.endsWith(`${sep}route.ts`));
  const acciones = candidatos.filter((f) => /^\s*["']use server["']/m.test(readFileSync(f, "utf8")));
  const paginasSueltas = candidatos.filter(
    (f) => f.endsWith(`${sep}page.tsx`) && !rel(f).startsWith("app/(alumno)/") && !rel(f).startsWith("app/dev/")
  );

  function revisar(f: string): string | null {
    const r = rel(f);
    const codigo = readFileSync(f, "utf8");
    if (/estadoDeAcceso\(/.test(codigo)) return null;
    if (r in SIN_ALUMNO) return null;
    if (DEL_EQUIPO.test(codigo) && !/sesion\.rol === "alumno"|rol !== "alumno"/.test(codigo)) return null;
    if (f.endsWith("route.ts") && urlDe(f) in RUTAS_SIN_BLOQUEO) return null;
    if (r.startsWith("app/acceso/")) return null; // /acceso: pública, es donde se entra.
    return r;
  }

  it("el layout del alumno la usa", () => {
    expect(readFileSync(join(APP, "(alumno)", "layout.tsx"), "utf8")).toMatch(/estadoDeAcceso\(/);
  });

  it("todas las rutas, acciones y páginas sueltas pasan por ella o tienen motivo", () => {
    const sueltas = Array.from(new Set([...rutas, ...acciones, ...paginasSueltas])).map(revisar).filter(Boolean);
    expect(sueltas).toEqual([]);
  });

  it("la única excepción de alumno es /ampliar-plan", () => {
    expect(Object.keys(RUTAS_SIN_BLOQUEO)).toEqual(["/ampliar-plan"]);
  });

  it("las listas no tienen entradas muertas", () => {
    const existentes = new Set(todos.map(rel));
    expect(Object.keys(SIN_ALUMNO).filter((r) => !existentes.has(r))).toEqual([]);
  });
});
