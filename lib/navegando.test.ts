import { describe, expect, it } from "vitest";
import { clicQueNavega } from "@/lib/navegando";

const normal = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const aqui = { origin: "https://lms.test", pathname: "/clases", search: "" };
const enlace = (href: string, extra = {}) => ({ href, target: "", descarga: false, ...extra });

describe("clicQueNavega", () => {
  it("un enlace interno a otra pantalla, sí", () => {
    expect(clicQueNavega(normal, enlace("/practica"), aqui)).toBe(true);
    expect(clicQueNavega(normal, enlace("https://lms.test/practica"), aqui)).toBe(true);
  });

  it("la misma pantalla con otra consulta, sí: cambia la semana", () => {
    expect(clicQueNavega(normal, enlace("/clases?semana=1"), aqui)).toBe(true);
  });

  it("la misma pantalla o un ancla, no", () => {
    expect(clicQueNavega(normal, enlace("/clases"), aqui)).toBe(false);
    expect(clicQueNavega(normal, enlace("#dia-2026-11-04"), aqui)).toBe(false);
    expect(clicQueNavega(normal, enlace("/clases#clase-1"), aqui)).toBe(false);
  });

  it("otra web, no", () => {
    expect(clicQueNavega(normal, enlace("https://drcacademy.com/mi-cuenta"), aqui)).toBe(false);
    expect(clicQueNavega(normal, enlace("mailto:hola@drcacademy.com"), aqui)).toBe(false);
  });

  it("otra pestaña o una descarga, no", () => {
    expect(clicQueNavega(normal, enlace("/practica", { target: "_blank" }), aqui)).toBe(false);
    expect(clicQueNavega({ ...normal, metaKey: true }, enlace("/practica"), aqui)).toBe(false);
    expect(clicQueNavega({ ...normal, ctrlKey: true }, enlace("/practica"), aqui)).toBe(false);
    expect(clicQueNavega({ ...normal, button: 1 }, enlace("/practica"), aqui)).toBe(false);
    expect(clicQueNavega(normal, enlace("/practica", { descarga: true }), aqui)).toBe(false);
  });
});
