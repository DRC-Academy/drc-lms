import { afterEach, describe, expect, it, vi } from "vitest";
import { autoservicioActivo, autoservicioProfesorActivo, autoservicioVisible } from "@/lib/autoservicio";

// Un interruptor por función: «Cambiar de horario» y «Cambiar de
// profesor» se encienden por separado.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("los interruptores del autoservicio", () => {
  it("por defecto, los dos apagados", () => {
    vi.stubEnv("AUTOSERVICIO_ACTIVO", "");
    vi.stubEnv("AUTOSERVICIO_PROFESOR_ACTIVO", "");
    expect(autoservicioActivo()).toBe(false);
    expect(autoservicioProfesorActivo()).toBe(false);
    expect(autoservicioVisible()).toBe(false);
  });

  it("el de horario encendido NO enciende el de profesor", () => {
    vi.stubEnv("AUTOSERVICIO_ACTIVO", "1");
    vi.stubEnv("AUTOSERVICIO_PROFESOR_ACTIVO", "");
    expect(autoservicioActivo()).toBe(true);
    expect(autoservicioProfesorActivo()).toBe(false);
    expect(autoservicioVisible()).toBe(true);
  });

  it("el de profesor, solo, monta la sección sin el de horario", () => {
    vi.stubEnv("AUTOSERVICIO_ACTIVO", "");
    vi.stubEnv("AUTOSERVICIO_PROFESOR_ACTIVO", "1");
    expect(autoservicioActivo()).toBe(false);
    expect(autoservicioProfesorActivo()).toBe(true);
    expect(autoservicioVisible()).toBe(true);
  });

  it("solo «1» enciende", () => {
    vi.stubEnv("AUTOSERVICIO_PROFESOR_ACTIVO", "true");
    expect(autoservicioProfesorActivo()).toBe(false);
  });
});
