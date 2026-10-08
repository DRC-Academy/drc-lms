import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { llamarGestion } from "@/lib/gestion-api";

// La API de Gestión (`/api/lms/…`) se llama UNA vez por petición: ni el
// LMS ni el cliente reintentan. Si un día alguien añade reintentos aquí,
// estos tests lo dicen.

let fetchFalso: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("GESTION_URL", "https://gestion.test");
  vi.stubEnv("LMS_GESTION_SECRET", "secreto-de-prueba");
  fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("llamarGestion: sin reintentos", () => {
  it.each([500, 502, 503, 520])("un %i se devuelve a la primera", async (status) => {
    fetchFalso.mockResolvedValue(new Response(JSON.stringify({ error: "saturada" }), { status }));
    const r = await llamarGestion("prueba", "/api/lms/autoservicio/estado?alumno_id=s_1", { method: "GET" });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ ok: false, status });
  });

  it("sin respuesta, un 503 propio y una sola llamada", async () => {
    fetchFalso.mockRejectedValue(new DOMException("Se agotó el tiempo", "TimeoutError"));
    const r = await llamarGestion("prueba", "/api/lms/recuperaciones?alumno_id=s_1", { method: "GET" });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ ok: false, status: 503, error: "sin_respuesta" });
  });

  it("sale con su tope de espera y sin caché", async () => {
    fetchFalso.mockResolvedValue(new Response("{}", { status: 200 }));
    await llamarGestion("prueba", "/api/lms/autoservicio/estado?alumno_id=s_1", { method: "GET" });
    const init = fetchFalso.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe("no-store");
  });
});
