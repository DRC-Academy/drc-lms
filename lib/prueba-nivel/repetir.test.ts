import { describe, expect, it } from "vitest";
import { cuandoRepetir, repetirDesde } from "@/lib/prueba-nivel/repetir";
import { PRUEBA_NIVEL } from "@/lib/textos/prueba-nivel";

const FIN = "2026-11-19T09:40:00.000Z"; // 10:40 en Madrid

describe("repetirDesde: 24 horas desde que terminó la última", () => {
  it("antes de las 24 horas, desde cuándo; a las 24 horas justas, ya puede", () => {
    expect(repetirDesde(FIN, new Date("2026-11-19T09:41:00Z"))).toBe("2026-11-20T09:40:00.000Z");
    expect(repetirDesde(FIN, new Date("2026-11-20T09:39:59Z"))).toBe("2026-11-20T09:40:00.000Z");
    expect(repetirDesde(FIN, new Date("2026-11-20T09:40:00Z"))).toBeNull();
  });

  it("sin fecha de fin (o torcida), no frena", () => {
    expect(repetirDesde(null, new Date())).toBeNull();
    expect(repetirDesde(undefined, new Date())).toBeNull();
    expect(repetirDesde("no es una fecha", new Date())).toBeNull();
  });
});

describe("cuandoRepetir: hoy o mañana, en hora de España", () => {
  const desde = "2026-11-20T09:40:00.000Z";
  it("el mismo día de España es «hoy»; el anterior, «mañana»", () => {
    expect(cuandoRepetir(desde, new Date("2026-11-19T12:00:00Z"))).toEqual({ dia: "manana", hora: "10:40" });
    expect(cuandoRepetir(desde, new Date("2026-11-19T23:30:00Z"))).toEqual({ dia: "hoy", hora: "10:40" }); // 00:30 del 20 en Madrid
  });

  it("el texto: «la 1:05» y «las 10:40»", () => {
    const t = PRUEBA_NIVEL.es;
    expect(t.repetirDesde("manana", "10:40")).toBe("Podrás repetirla mañana a partir de las 10:40.");
    expect(t.repetirDesde("hoy", "1:05")).toBe("Podrás repetirla hoy a partir de la 1:05.");
    expect(t.repetirDesde("hoy", "13:05")).toBe("Podrás repetirla hoy a partir de las 13:05.");
  });
});
