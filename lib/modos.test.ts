import { describe, expect, it } from "vitest";
import type { PerfilAlumno, UltimaClase } from "@/lib/data";
import { PRACTICA } from "@/lib/textos/practica";
import { calcularTarjeta } from "@/lib/modos";

const t = PRACTICA.es;

const perfil: PerfilAlumno = {
  alumnoId: "s_1",
  nombre: "Carla Seco",
  email: "carla@example.com",
  nivel: "B2",
  nivelProfesor: "B1",
  nivelFicha: null,
  nivelPrueba: "B2",
  profesor: "Noeli",
  plan: "Intensivo FCE — 12:00-13:00 · 01/09/2026",
  fechaInicio: "2026-09-01",
  ocupacion: "Farmacéutica.",
  objetivoPerfil: "Sacarse el B2 First.",
  tienePerfil: true,
  formToken: null,
  formTokenEnviadoEn: null,
} as PerfilAlumno;

const clase: UltimaClase = {
  alumnoId: "s_1",
  fechaClase: "2026-09-17",
  titulo: "Conversación sobre mudanza a Madrid y transporte",
  temas: "",
  errores: "",
  notasProgreso: "",
  guiaProxima: null,
  analizadoEn: "2026-09-17T11:15:00+00:00",
};

describe("calcularTarjeta", () => {
  it("3a · sin clase analizada no hay tarjeta, aunque haya perfil y examen", () => {
    expect(calcularTarjeta(perfil, null, null, t)).toBeNull();
  });

  it("3b · con clase y sin generación previa: abierta, y con la clase que usaría", () => {
    const tarjeta = calcularTarjeta(perfil, clase, null, t);
    expect(tarjeta).not.toBeNull();
    expect(tarjeta!.espera).toBeNull();
    expect(tarjeta!.clase).toEqual({ fecha: "2026-09-17", profesor: "Noeli" });
    expect(tarjeta!.fuentes).toEqual({ clase: true, contexto: true });
  });

  it("3c · generado después de la última clase analizada: cerrada hasta la próxima", () => {
    const tarjeta = calcularTarjeta(perfil, clase, "2026-09-18T09:00:00+00:00", t);
    expect(tarjeta!.espera).not.toBeNull();
  });

  it("3c · una clase analizada después de la última generación vuelve a abrir", () => {
    const tarjeta = calcularTarjeta(perfil, clase, "2026-09-10T09:00:00+00:00", t);
    expect(tarjeta!.espera).toBeNull();
  });
});
