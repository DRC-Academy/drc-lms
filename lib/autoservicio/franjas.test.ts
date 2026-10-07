import { describe, expect, it } from "vitest";
import { agruparHuecos, filtrarHuecos, franjaDe, horaFin } from "@/lib/autoservicio/franjas";
import type { HuecoConProfesor, HuecoLibre } from "@/lib/autoservicio/tipos";

const h = (dia: HuecoLibre["dia"], hora: string, fecha: string | null = null, duracion = 1): HuecoLibre => ({ dia, hora, duracion, fecha });

describe("franjaDe", () => {
  it("corta a las 12, a las 15 y a las 20", () => {
    expect(franjaDe("06:00")).toBe("manana");
    expect(franjaDe("11:00")).toBe("manana");
    expect(franjaDe("12:00")).toBe("mediodia");
    expect(franjaDe("14:30")).toBe("mediodia");
    expect(franjaDe("15:00")).toBe("tarde");
    expect(franjaDe("19:00")).toBe("tarde");
    expect(franjaDe("20:00")).toBe("noche");
    expect(franjaDe("23:00")).toBe("noche");
  });

  it("lo de madrugada cuenta como noche", () => {
    expect(franjaDe("05:00")).toBe("noche");
  });
});

describe("horaFin", () => {
  it("suma las horas de la clase", () => {
    expect(horaFin("18:00", 1)).toBe("19:00");
    expect(horaFin("09:30", 2)).toBe("11:30");
  });

  it("pasada la medianoche vuelve a empezar", () => {
    expect(horaFin("23:00", 1)).toBe("00:00");
  });
});

describe("agruparHuecos", () => {
  it("los semanales van de lunes a sábado, con el domingo al final", () => {
    const grupos = agruparHuecos([h("Domingo", "10:00"), h("Miércoles", "10:00"), h("Lunes", "10:00"), h("Sábado", "10:00")]);
    expect(grupos.map((g) => g.dia)).toEqual(["Lunes", "Miércoles", "Sábado", "Domingo"]);
  });

  it("los de una fecha van por fecha, aunque el día de la semana diga otra cosa", () => {
    const grupos = agruparHuecos([h("Lunes", "10:00", "2026-10-19"), h("Viernes", "10:00", "2026-10-16")]);
    expect(grupos.map((g) => g.clave)).toEqual(["2026-10-16", "2026-10-19"]);
  });

  it("dentro de un día, las franjas en orden y solo las que tienen huecos, cada una por hora", () => {
    const [lunes] = agruparHuecos([h("Lunes", "21:00"), h("Lunes", "17:00"), h("Lunes", "09:00"), h("Lunes", "16:00")]);
    expect(lunes.franjas.map((f) => f.franja)).toEqual(["manana", "tarde", "noche"]);
    expect(lunes.franjas[1].huecos.map((x) => x.hora)).toEqual(["16:00", "17:00"]);
  });

  it("un hueco repetido tal cual sale una vez", () => {
    const [lunes] = agruparHuecos([h("Lunes", "09:00"), h("Lunes", "09:00")]);
    expect(lunes.franjas[0].huecos).toHaveLength(1);
  });

  it("dos profesores a la misma hora salen los dos", () => {
    const otros: HuecoConProfesor[] = [
      { ...h("Lunes", "09:00"), profesor: "Daniela" },
      { ...h("Lunes", "09:00"), profesor: "Sol" },
    ];
    const [lunes] = agruparHuecos(otros);
    expect(lunes.franjas[0].huecos.map((x) => x.profesor)).toEqual(["Daniela", "Sol"]);
  });

  it("sin huecos, sin grupos", () => {
    expect(agruparHuecos([])).toEqual([]);
  });
});

describe("filtrarHuecos", () => {
  const lista = [h("Lunes", "09:00"), h("Lunes", "18:00"), h("Martes", "18:00")];

  it("por día, por franja o por las dos", () => {
    expect(filtrarHuecos(lista, "Lunes", null)).toHaveLength(2);
    expect(filtrarHuecos(lista, null, "tarde")).toHaveLength(2);
    expect(filtrarHuecos(lista, "Lunes", "tarde")).toEqual([h("Lunes", "18:00")]);
  });

  it("sin filtros, todos", () => {
    expect(filtrarHuecos(lista, null, null)).toHaveLength(3);
  });
});
