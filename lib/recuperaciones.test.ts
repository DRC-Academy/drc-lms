import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leerRecuperacion } from "@/lib/recuperaciones";
import { diasParaProponer, HORAS_PROPUESTA } from "@/lib/recuperaciones-fechas";
import { proponerDirecto } from "@/lib/recuperaciones-vista";
import { RECUPERACIONES } from "@/lib/textos/recuperaciones";
import { elegirRecuperacion } from "@/app/acciones-recuperaciones";
import { idiomaActual } from "@/lib/idioma-servidor";
import { olvidarLecturasDe } from "@/lib/cache-gestion";

// `cache` de React solo existe dentro de un Server Component; aquí, sin él.
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T,>(f: T) => f }));

// Para la acción de servidor: un alumno con sesión, el idioma a mano y
// el olvido de la caché espiado (lo demás de la caché, el de verdad).
vi.mock("@/lib/sesion-servidor", () => ({ sesionActual: async () => ({ rol: "alumno", alumnoId: "s_1" }) }));
vi.mock("@/lib/idioma-servidor", () => ({ idiomaActual: vi.fn(() => "es") }));
vi.mock("@/lib/cache-gestion", async (original) => ({
  ...(await original<typeof import("@/lib/cache-gestion")>()),
  olvidarLecturasDe: vi.fn(),
}));

// El ejemplo del contrato con Gestión (docs/recuperaciones-contrato.md de allí).
const EJEMPLO = {
  id: "rec_mg1abc2def",
  estado: "esperando_alumno",
  profesor: "Ignacio",
  clase_cancelada: { fecha: "2026-10-08", hora: "17:00", horas: 1 },
  parte: { numero: 1, de: 1 },
  ronda: 1,
  opciones: [
    { indice: 0, fecha: "2026-10-12", hora: "17:00", horas: 1 },
    { indice: 1, fecha: "2026-10-13", hora: "19:00", horas: 1 },
  ],
  mis_propuestas: [],
  mi_nota: null,
  fecha_confirmada: null,
  puede_elegir: true,
  puede_decir_ninguna: true,
};

describe("leerRecuperacion", () => {
  it("lee el ejemplo del contrato", () => {
    const r = leerRecuperacion(EJEMPLO);
    expect(r).not.toBeNull();
    expect(r!.estado).toBe("esperando_alumno");
    expect(r!.opciones.map((o) => o.indice)).toEqual([0, 1]);
    expect(r!.puedeElegir).toBe(true);
    expect(r!.fechaConfirmada).toBeNull();
  });

  it("descarta lo que no tiene forma de recuperación", () => {
    expect(leerRecuperacion(null)).toBeNull();
    expect(leerRecuperacion({ ...EJEMPLO, estado: "otro" })).toBeNull();
    expect(leerRecuperacion({ ...EJEMPLO, id: "" })).toBeNull();
    expect(leerRecuperacion({ ...EJEMPLO, clase_cancelada: { fecha: "8/10", hora: "17:00" } })).toBeNull();
  });

  it("sin el campo origen, como hasta ahora: «profesor»", () => {
    expect(leerRecuperacion(EJEMPLO)!.origen).toBe("profesor");
    expect(leerRecuperacion({ ...EJEMPLO, origen: "otro" })!.origen).toBe("profesor");
    expect(proponerDirecto(leerRecuperacion(EJEMPLO)!)).toBe(false);
  });

  it("origen «ausencia» con 4 opciones: las cuatro, para elegir", () => {
    const r = leerRecuperacion({
      ...EJEMPLO,
      origen: "ausencia",
      opciones: [
        { indice: 0, fecha: "2026-10-12", hora: "17:00", horas: 1 },
        { indice: 1, fecha: "2026-10-13", hora: "18:00", horas: 1 },
        { indice: 2, fecha: "2026-10-14", hora: "17:00", horas: 1 },
        { indice: 3, fecha: "2026-10-15", hora: "19:00", horas: 1 },
      ],
    })!;
    expect(r.origen).toBe("ausencia");
    expect(r.opciones.map((o) => o.indice)).toEqual([0, 1, 2, 3]);
    expect(r.puedeElegir).toBe(true);
    expect(proponerDirecto(r)).toBe(false);
  });

  it("origen «ausencia» sin opciones: el formulario de proponer, directo", () => {
    const r = leerRecuperacion({ ...EJEMPLO, origen: "ausencia", opciones: [], puede_elegir: false, puede_decir_ninguna: true })!;
    expect(r.opciones).toEqual([]);
    expect(r.puedeElegir).toBe(false);
    expect(proponerDirecto(r)).toBe(true);
    // Sin poder proponer, o ya en otro estado, no hay formulario.
    expect(proponerDirecto({ ...r, puedeDecirNinguna: false })).toBe(false);
    expect(proponerDirecto({ ...r, estado: "alumno_propuso" })).toBe(false);
  });

  it("los botones solo con un true explícito", () => {
    const r = leerRecuperacion({ ...EJEMPLO, puede_elegir: "true", puede_decir_ninguna: undefined });
    expect(r!.puedeElegir).toBe(false);
    expect(r!.puedeDecirNinguna).toBe(false);
  });
});

describe("diasParaProponer", () => {
  it("de mañana a 7 días, sin domingos", () => {
    // 2026-10-02 es viernes: del sábado 3 al viernes 9, sin el domingo 4.
    expect(diasParaProponer("2026-10-02")).toEqual([
      "2026-10-03", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09",
    ]);
  });

  it("horas de 09:00 a 21:00 en punto", () => {
    expect(HORAS_PROPUESTA[0]).toBe("09:00");
    expect(HORAS_PROPUESTA.at(-1)).toBe("21:00");
    expect(HORAS_PROPUESTA).toHaveLength(13);
  });
});

describe("textos", () => {
  it("escribe las fechas como en el encargo", () => {
    const es = RECUPERACIONES.es;
    expect(es.opcion("2026-10-12", "17:00")).toBe("Lunes 12 de octubre · 17:00");
    expect(es.confirmas("2026-10-12", "17:00")).toBe("¿Confirmas el lunes 12 a las 17:00?");
    expect(es.hecho("2026-10-12", "17:00")).toBe("¡Hecho! Tu clase de recuperación es el lunes 12 a las 17:00");
    expect(es.noPuede("Ignacio", "2026-10-08", "17:00", 2)).toBe(
      "Ignacio no puede dar tu clase del jueves 8 de octubre a las 17:00. Te propone dos fechas para recuperarla:"
    );
    expect(RECUPERACIONES.en.opcion("2026-10-12", "17:00")).toBe("Monday 12 October · 17:00");
  });

  it("cuenta hasta cuatro fechas, y sin ninguna no promete fechas", () => {
    expect(RECUPERACIONES.es.noPuede("Ignacio", "2026-10-08", "17:00", 4)).toMatch(/Te propone cuatro fechas/);
    expect(RECUPERACIONES.es.noPuede("Ignacio", "2026-10-08", "17:00", 0)).toBe(
      "Ignacio no puede dar tu clase del jueves 8 de octubre a las 17:00."
    );
    expect(RECUPERACIONES.en.noPuede("Ignacio", "2026-10-08", "17:00", 0)).toBe(
      "Ignacio can't teach your class on Thursday 8 October at 17:00."
    );
  });
});

describe("elegir un hueco que ya no está (409 hueco_no_disponible)", () => {
  let fetchFalso: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubEnv("GESTION_URL", "https://gestion.test");
    vi.stubEnv("LMS_GESTION_SECRET", "secreto-de-prueba");
    fetchFalso = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "hueco_no_disponible", mensaje: "Ese hueco ya no está libre. Elige otro." }), { status: 409 })
    );
    vi.stubGlobal("fetch", fetchFalso);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.mocked(idiomaActual).mockReturnValue("es");
    vi.mocked(olvidarLecturasDe).mockClear();
  });

  it("enseña el mensaje de Gestión, una sola llamada, y tira lo cacheado para pedir la lista de nuevo", async () => {
    const r = await elegirRecuperacion("rec_mg1abc2def", 2);
    expect(r).toEqual({ ok: false, mensaje: "Ese hueco ya no está libre. Elige otro.", problemas: [], invalido: false });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gestion.test/api/lms/recuperaciones/rec_mg1abc2def/elegir");
    expect(JSON.parse(init.body as string)).toEqual({ alumno_id: "s_1", indice: 2 });
    expect(olvidarLecturasDe).toHaveBeenCalledWith("s_1");
  });

  it("en inglés, el del diccionario", async () => {
    vi.mocked(idiomaActual).mockReturnValue("en");
    const r = await elegirRecuperacion("rec_mg1abc2def", 2);
    expect(r).toMatchObject({ ok: false, mensaje: "That date is no longer free. Please choose another.", invalido: false });
  });
});
