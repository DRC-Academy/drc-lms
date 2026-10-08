import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La sesión de la cookie, la que diga cada test.
const sesion = vi.hoisted(() => ({ actual: null as null | { rol: string; email: string; alumnoId: string | null } }));
vi.mock("@/lib/sesion-servidor", () => ({ sesionActual: async () => sesion.actual }));

import { alumnosDePrueba, autoservicioActivoPara } from "@/lib/autoservicio";
import { cambiarHorarioAutoservicio, huecosAutoservicio } from "@/app/acciones-autoservicio";

const PRUEBA = "s_1785241971018";
const OTRO = "s_1784840663431";

describe("autoservicioActivoPara", () => {
  it("encendido: todos los alumnos", () => {
    expect(autoservicioActivoPara(OTRO, { AUTOSERVICIO_ACTIVO: "1" })).toBe(true);
    expect(autoservicioActivoPara(OTRO, { AUTOSERVICIO_ACTIVO: " 1 ", AUTOSERVICIO_ALUMNOS_PRUEBA: PRUEBA })).toBe(true);
  });

  it("apagado: solo los de la lista de prueba", () => {
    const env = { AUTOSERVICIO_ACTIVO: "", AUTOSERVICIO_ALUMNOS_PRUEBA: ` ${PRUEBA} , s_otro,,` };
    expect(autoservicioActivoPara(PRUEBA, env)).toBe(true);
    expect(autoservicioActivoPara("s_otro", env)).toBe(true);
    expect(autoservicioActivoPara(OTRO, env)).toBe(false);
    expect(autoservicioActivoPara(OTRO, { AUTOSERVICIO_ACTIVO: "true", AUTOSERVICIO_ALUMNOS_PRUEBA: PRUEBA })).toBe(false);
  });

  it("sin variables, o sin alumno, nadie", () => {
    expect(autoservicioActivoPara(PRUEBA, {})).toBe(false);
    expect(autoservicioActivoPara(null, { AUTOSERVICIO_ACTIVO: "1" })).toBe(false);
    expect(autoservicioActivoPara("", { AUTOSERVICIO_ALUMNOS_PRUEBA: "" })).toBe(false);
  });

  it("la lista no tiene huecos vacíos: «,,» no deja pasar al alumno sin id", () => {
    expect(alumnosDePrueba(" a, ,b,")).toEqual(new Set(["a", "b"]));
    expect(alumnosDePrueba(undefined).size).toBe(0);
  });
});

describe("las acciones de servidor siguen la misma regla", () => {
  beforeEach(() => {
    vi.stubEnv("AUTOSERVICIO_ACTIVO", "");
    vi.stubEnv("AUTOSERVICIO_ALUMNOS_PRUEBA", PRUEBA);
    vi.stubEnv("AUTOSERVICIO_SIMULADO", "1");
    vi.stubEnv("VERCEL_ENV", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    sesion.actual = null;
  });

  const alumno = (alumnoId: string) => ({ rol: "alumno", email: `${alumnoId}@prueba`, alumnoId });

  it("el alumno de prueba lee huecos con el interruptor apagado", async () => {
    sesion.actual = alumno(PRUEBA);
    const r = await huecosAutoservicio("fijo", "Martes_18:00");
    expect(r.ok).toBe(true);
  });

  it("otro alumno, no: ni huecos ni cambio", async () => {
    sesion.actual = alumno(OTRO);
    expect(await huecosAutoservicio("fijo", "Martes_18:00")).toEqual({ ok: false, codigo: "GENERICO" });
    const cambio = await cambiarHorarioAutoservicio({
      modo: "fijo",
      sesionOrigen: { dia: "Martes", hora: "18:00", duracion: 1 },
      fechaOrigen: null,
      destino: { dia: "Lunes", hora: "09:00", duracion: 1, fecha: null, primeraClase: null },
      idempotencyKey: "0f8b3c2e-aaaa",
    });
    expect(cambio).toEqual({ ok: false, codigo: "GENERICO", mensaje: null });
  });

  it("encendido, cualquier alumno; el equipo, nunca", async () => {
    vi.stubEnv("AUTOSERVICIO_ACTIVO", "1");
    sesion.actual = alumno(OTRO);
    expect((await huecosAutoservicio("fijo", "Martes_18:00")).ok).toBe(true);
    sesion.actual = { rol: "admin", email: "equipo@prueba", alumnoId: null };
    expect((await huecosAutoservicio("fijo", "Martes_18:00")).ok).toBe(false);
  });
});
