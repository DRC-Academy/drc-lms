import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// `cache` de React solo existe en el runtime de servidor de Next.
vi.mock("react", async (original) => ({ ...(await original<object>()), cache: (fn: unknown) => fn }));

// Ningún alumno de estos tests es la demo: así la lectura va a Gestión.
vi.mock("@/lib/demo/cuenta", () => ({
  escenarioDe: async () => null,
  escenarioPorEmail: async () => null,
  esIdDemo: () => false,
}));

let servidor: typeof import("@/lib/supabase-server");
let gestion: typeof import("@/lib/gestion");
beforeAll(async () => {
  vi.stubEnv("SUPABASE_URL", "https://gestion.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-de-prueba");
  servidor = await import("@/lib/supabase-server");
  gestion = await import("@/lib/gestion");
});

const leer = () =>
  servidor.soloLectura("vista_perfil_alumno").select("alumno_id").eq("alumno_id", "s_1").returns<unknown[]>();

let fetchFalso: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Un `fetch` que no contesta nunca: solo acaba si se aborta su señal. */
function sinRespuesta() {
  fetchFalso.mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise((_, rechazar) => init.signal?.addEventListener("abort", () => rechazar(init.signal?.reason)))
  );
}

/** Sustituye el tope de `AbortSignal.timeout` por uno que el test dispara a mano. */
function topeManual() {
  const control = new AbortController();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(control.signal);
  const agotar = () => control.abort(new DOMException("Se agotó el tiempo", "TimeoutError"));
  return { timeout, agotar };
}

describe("lecturas de Gestión: sin reintentos", () => {
  it("un 503 es un error a la primera, sin volver a preguntar", async () => {
    fetchFalso.mockResolvedValue(new Response(JSON.stringify({ message: "saturada" }), { status: 503 }));
    const { data, error } = await leer();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("un 520 tampoco se repite", async () => {
    fetchFalso.mockResolvedValue(new Response("", { status: 520 }));
    const { error } = await leer();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(error).not.toBeNull();
  });

  it("una red caída es un error, sin lanzar y sin reintentar", async () => {
    fetchFalso.mockRejectedValue(new TypeError("fetch failed"));
    const { data, error } = await leer();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});

describe("lecturas de Gestión: tope de espera", () => {
  it("cada lectura sale con un tope de MS_LECTURA y sin caché", async () => {
    fetchFalso.mockResolvedValue(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const { error } = await leer();
    expect(error).toBeNull();
    expect(servidor.MS_LECTURA).toBe(5000);
    expect(timeout).toHaveBeenCalledWith(5000);
    const init = fetchFalso.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe("no-store");
  });

  it("un tiempo agotado es un error de lectura, una sola vez", async () => {
    sinRespuesta();
    const { agotar } = topeManual();
    // El builder no sale hasta que alguien lo espera: se arranca aquí.
    const lectura = Promise.resolve(leer());
    await vi.waitFor(() => expect(fetchFalso).toHaveBeenCalledTimes(1));
    agotar();
    const { data, error } = await lectura;
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(data).toBeNull();
    expect(error?.message).toMatch(/TimeoutError/);
  });

  it("la pantalla recibe el «no se pudo» de siempre, no una excepción", async () => {
    sinRespuesta();
    const { agotar } = topeManual();
    const contadas = gestion.obtenerClasesContadas("s_1");
    const calendario = gestion.obtenerCalendario("s_1");
    // Las dos lecturas tienen que haber salido antes de agotar el tope.
    await vi.waitFor(() => expect(fetchFalso).toHaveBeenCalledTimes(2));
    agotar();
    await expect(contadas).resolves.toBeNull();
    await expect(calendario).resolves.toEqual([]);
  });
});
