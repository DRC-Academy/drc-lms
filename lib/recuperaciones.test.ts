import { describe, expect, it, vi } from "vitest";
import { leerRecuperacion } from "@/lib/recuperaciones";
import { diasParaProponer, HORAS_PROPUESTA } from "@/lib/recuperaciones-fechas";
import { RECUPERACIONES } from "@/lib/textos/recuperaciones";

// `cache` de React solo existe dentro de un Server Component; aquí, sin él.
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T,>(f: T) => f }));

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
});
