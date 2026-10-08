import { describe, expect, it } from "vitest";
import { AUTOSERVICIO } from "@/lib/textos/autoservicio";
import { CODIGOS_AUTOSERVICIO, type CodigoAutoservicio } from "@/lib/autoservicio/tipos";

const TODOS: CodigoAutoservicio[] = [...CODIGOS_AUTOSERVICIO, "A_MEDIAS", "GENERICO"];

/** Los que dicen lo mismo a propósito: para el alumno es el mismo caso. */
const MISMO_TEXTO: CodigoAutoservicio[][] = [
  ["HUECO_YA_OCUPADO", "SLOT_NO_DISPONIBLE"],
  ["ERROR_LECTURA", "CALENDARIO_ILEGIBLE"],
];

describe("textos por código de error", () => {
  for (const idioma of ["es", "en"] as const) {
    const t = AUTOSERVICIO[idioma];

    it(`${idioma}: cada código tiene su texto, distinto salvo los que son el mismo caso`, () => {
      const textos = TODOS.map((c) => t.motivo(c));
      expect(textos.every((x) => x.trim().length > 20)).toBe(true);
      for (const grupo of MISMO_TEXTO) expect(new Set(grupo.map((c) => t.motivo(c))).size).toBe(1);
      expect(new Set(textos).size).toBe(TODOS.length - MISMO_TEXTO.reduce((n, g) => n + g.length - 1, 0));
    });

    it(`${idioma}: lo que no se puede hacer desde aquí ofrece el WhatsApp`, () => {
      const sinSalida: CodigoAutoservicio[] = [
        "NO_ELEGIBLE",
        "RECUPERACION_PENDIENTE",
        "CALENDARIO_SIN_ACTUALIZAR",
        "ANTELACION_INSUFICIENTE",
        "MARCA_PUNTUAL_EXISTENTE",
        "FUERA_DE_VENTANA",
        "SESION_NO_ENCONTRADA",
        "ERROR_LECTURA",
        "A_MEDIAS",
        "GENERICO",
      ];
      for (const c of sinSalida) expect(t.motivo(c)).toMatch(/WhatsApp/);
    });

    it(`${idioma}: lo que se resuelve dentro del flujo no manda fuera`, () => {
      for (const c of ["SLOT_NO_DISPONIBLE", "MISMO_HORARIO", "EN_CURSO"] as const) expect(t.motivo(c)).not.toMatch(/WhatsApp/);
    });

    it(`${idioma}: el hueco ocupado es el aviso de la lista, sin mandar fuera`, () => {
      expect(t.motivo("HUECO_YA_OCUPADO")).toBe(t.ocupado);
      expect(t.ocupado).not.toMatch(/WhatsApp/);
    });

    it(`${idioma}: al leer, el genérico habla de cargar y no de un cambio`, () => {
      expect(t.motivoAlLeer("GENERICO")).not.toBe(t.motivo("GENERICO"));
      expect(t.motivoAlLeer("NO_ELEGIBLE")).toBe(t.motivo("NO_ELEGIBLE"));
    });
  }

  it("es: sin lenguaje de error ni de vigilancia", () => {
    const todo = TODOS.map((c) => AUTOSERVICIO.es.motivo(c)).join(" ") + AUTOSERVICIO.es.motivoAlLeer("GENERICO") + AUTOSERVICIO.es.sinProximas;
    expect(todo).not.toMatch(/\berror\b|fallo|incorrect|no permitid|denegad|prohibid|vigil|registramos/i);
  });

  it("en: no error or surveillance wording", () => {
    const todo = TODOS.map((c) => AUTOSERVICIO.en.motivo(c)).join(" ") + AUTOSERVICIO.en.motivoAlLeer("GENERICO");
    expect(todo).not.toMatch(/\berror\b|failed|invalid|not allowed|denied|forbidden|monitor/i);
  });
});

describe("lo que todavía no se puede, con fecha", () => {
  const horario = { movible: false, motivo: "ANTELACION_INSUFICIENTE", disponibleDesde: { fecha: "2026-10-13", hora: "17:00" } } as const;
  const marca = { movible: false, motivo: "MARCA_PUNTUAL_EXISTENTE", disponibleDesde: { fecha: "2026-10-19", hora: "00:00" } } as const;

  it("es: desde cuándo, con la hora solo si no es el día entero", () => {
    const t = AUTOSERVICIO.es;
    expect(t.noMovible(horario, "horario")).toBe(
      "Tu próxima clase con este horario está muy cerca. Podrás cambiarlo a partir del martes 13 de octubre a las 17:00."
    );
    expect(t.noMovible(marca, "clase")).toBe("Ya tienes otra clase de este horario movida. Podrás moverla a partir del lunes 19 de octubre.");
  });

  it("en: from when", () => {
    const t = AUTOSERVICIO.en;
    expect(t.noMovible(horario, "horario")).toBe("Your next class at this time is very close. You'll be able to change it from Tuesday 13 October at 17:00.");
    expect(t.noMovible(marca, "clase")).toBe("You already have another class at this time moved. You'll be able to move it from Monday 19 October.");
  });

  it("sin fecha, el motivo de siempre", () => {
    const t = AUTOSERVICIO.es;
    expect(t.noMovible({ ...horario, disponibleDesde: null }, "clase")).toBe(t.motivo("ANTELACION_INSUFICIENTE"));
    expect(t.noMovible({ movible: true, motivo: null, disponibleDesde: null }, "clase")).toBe("");
  });
});

describe("cómo se escriben las clases", () => {
  it("es: el plural de los días, y las fechas en minúscula dentro de la frase", () => {
    const t = AUTOSERVICIO.es;
    expect(t.sesion("Martes", "18:00", "19:00")).toBe("Los martes, 18:00–19:00");
    expect(t.sesion("Sábado", "10:00", "11:00")).toBe("Los sábados, 10:00–11:00");
    expect(t.clase("2026-10-13", "18:00", "19:00")).toBe("Martes 13 de octubre, 18:00–19:00");
    expect(t.hechoPuntual(t.clase("2026-10-13", "18:00", "19:00"))).toBe("Tu clase pasa al martes 13 de octubre, 18:00–19:00.");
    expect(t.hechoFijo(t.sesion("Jueves", "09:00", "11:00"))).toBe("Desde ahora tus clases son los jueves, 09:00–11:00.");
  });

  it("en: days and dates", () => {
    const t = AUTOSERVICIO.en;
    expect(t.sesion("Miércoles", "18:00", "19:00")).toBe("Wednesdays, 18:00–19:00");
    expect(t.clase("2026-10-13", "18:00", "19:00")).toBe("Tuesday 13 October, 18:00–19:00");
  });
});
