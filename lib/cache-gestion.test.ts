import { describe, expect, it, vi } from "vitest";
import { LecturaFallida, NoSeGuarda, conCache, etiquetaAlumno, fallo } from "@/lib/cache-gestion";

// Fuera de Next, `unstable_cache` no tiene dónde guardar: `conCache` lee
// directamente. Lo que se prueba aquí es qué devuelve en cada caso.

describe("conCache", () => {
  it("devuelve lo leído", async () => {
    expect(await conCache(["prueba", "a1"], 90, [etiquetaAlumno("a1")], async () => [1, 2], [])).toEqual([1, 2]);
  });

  it("una lectura fallida devuelve la reserva", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const leido = await conCache(["prueba", "a1"], 90, [], async () => fallo("No se pudo leer", { message: "503" }), null);
    expect(leido).toBeNull();
    error.mockRestore();
  });

  it("un resultado que no se guarda se devuelve igual", async () => {
    const leido = await conCache<{ ok: boolean }>(["prueba", "a1"], 90, [], async () => {
      throw new NoSeGuarda({ ok: false });
    }, { ok: true });
    expect(leido).toEqual({ ok: false });
  });

  it("un error inesperado también devuelve la reserva, y se apunta", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const leido = await conCache(["prueba", "a1"], 90, [], async () => {
      throw new TypeError("raro");
    }, "reserva");
    expect(leido).toBe("reserva");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("fallo lanza una LecturaFallida", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => fallo("x", { message: "y" })).toThrow(LecturaFallida);
    error.mockRestore();
  });
});

describe("etiquetaAlumno", () => {
  it("una por alumno", () => {
    expect(etiquetaAlumno("s_1")).toBe("gestion-alumno:s_1");
    expect(etiquetaAlumno("s_1")).not.toBe(etiquetaAlumno("s_2"));
  });
});
