import { afterEach, describe, expect, it, vi } from "vitest";
import { urlPublica } from "@/lib/url-publica";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("urlPublica", () => {
  it("devuelve el origen de URL_BASE, sin barra final", () => {
    vi.stubEnv("URL_BASE", "https://drc-lms.vercel.app/");
    expect(urlPublica()).toBe("https://drc-lms.vercel.app");
  });

  it("recorta espacios", () => {
    vi.stubEnv("URL_BASE", "  https://practica.drcacademy.com  ");
    expect(urlPublica()).toBe("https://practica.drcacademy.com");
  });

  it("lanza si falta, en vez de caer en otra dirección", () => {
    vi.stubEnv("URL_BASE", "");
    vi.stubEnv("VERCEL_URL", "drc-lms-abc123-equipo.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "drc-lms.vercel.app");
    expect(() => urlPublica()).toThrow(/Falta URL_BASE/);
  });

  it("no usa nunca VERCEL_URL", () => {
    vi.stubEnv("URL_BASE", "https://drc-lms.vercel.app");
    vi.stubEnv("VERCEL_URL", "drc-lms-abc123-equipo.vercel.app");
    expect(urlPublica()).toBe("https://drc-lms.vercel.app");
  });

  it("lanza si no es una URL", () => {
    vi.stubEnv("URL_BASE", "drc-lms.vercel.app");
    expect(() => urlPublica()).toThrow(/no es una URL válida/);
  });

  it("exige https fuera de local", () => {
    vi.stubEnv("URL_BASE", "http://drc-lms.vercel.app");
    expect(() => urlPublica()).toThrow(/https/);
  });

  it("admite http en localhost", () => {
    vi.stubEnv("URL_BASE", "http://localhost:3000");
    expect(urlPublica()).toBe("http://localhost:3000");
  });

  it("lanza si trae ruta o parámetros", () => {
    vi.stubEnv("URL_BASE", "https://drc-lms.vercel.app/entrar");
    expect(() => urlPublica()).toThrow(/solo el origen/);
    vi.stubEnv("URL_BASE", "https://drc-lms.vercel.app/?x=1");
    expect(() => urlPublica()).toThrow(/solo el origen/);
  });
});
