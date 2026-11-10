import { describe, expect, it } from "vitest";
import { bloquesDe, filaDeHora, siguienteConHuecos } from "@/components/clases/autoservicio/bloques";
import { calendarioConFechas, type Casilla } from "@/lib/autoservicio/calendario";
import type { HuecoLibre } from "@/lib/autoservicio/tipos";

const c = (hora: string, estado: Casilla<never>["estado"]): Casilla<never> => ({ hora, estado, huecos: [] });

describe("bloquesDe", () => {
  it("junta las horas seguidas con el mismo estado", () => {
    const b = bloquesDe([c("09:00", "ocupado"), c("10:00", "libre"), c("11:00", "libre"), c("12:00", "libre"), c("13:00", "ocupado")]);
    expect(b.map((x) => [x.estado, x.fila, x.filas, x.desde, x.hasta])).toEqual([
      ["ocupado", 0, 1, "09:00", "10:00"],
      ["libre", 1, 3, "10:00", "13:00"],
      ["ocupado", 4, 1, "13:00", "14:00"],
    ]);
  });

  it("fuera de horario, no disponible y pasada no se dibujan y cortan el bloque", () => {
    const b = bloquesDe([c("09:00", "libre"), c("10:00", "fuera"), c("11:00", "libre"), c("12:00", "noDisponible"), c("13:00", "pasada")]);
    expect(b.map((x) => [x.fila, x.filas])).toEqual([
      [0, 1],
      [2, 1],
    ]);
  });

  it("no junta filas que saltan horas (semana tipo)", () => {
    const b = bloquesDe([c("11:00", "libre"), c("13:00", "libre")]);
    expect(b).toHaveLength(2);
    expect(b[0].hasta).toBe("12:00");
  });
});

describe("filaDeHora", () => {
  const horas = ["09:00", "10:00", "11:00"];
  it("da la fila y la fracción", () => {
    expect(filaDeHora(horas, "10:30")).toBe(1.5);
    expect(filaDeHora(horas, "09:00")).toBe(0);
  });
  it("fuera de las filas, null", () => {
    expect(filaDeHora(horas, "08:59")).toBeNull();
    expect(filaDeHora(horas, "12:00")).toBeNull();
    expect(filaDeHora(["11:00", "13:00"], "12:15")).toBeNull();
  });
});

describe("siguienteConHuecos", () => {
  const hueco = (fecha: string, hora: string, dia: HuecoLibre["dia"]): HuecoLibre => ({ fecha, hora, dia, duracion: 1 });
  // Lunes 9 de noviembre de 2026; huecos el miércoles 11 y el martes 17.
  const cal = calendarioConFechas([hueco("2026-11-11", "10:00", "Miércoles"), hueco("2026-11-17", "12:00", "Martes")], null, null, {
    fecha: "2026-11-09",
    hora: "08:00",
  });

  it("salta al siguiente día con huecos, aunque sea otra semana", () => {
    expect(siguienteConHuecos(cal, "2026-11-09")).toEqual({ semana: 0, dia: "2026-11-11" });
    expect(siguienteConHuecos(cal, "2026-11-11")).toEqual({ semana: 1, dia: "2026-11-17" });
    expect(siguienteConHuecos(cal, "2026-11-14")).toEqual({ semana: 1, dia: "2026-11-17" });
  });

  it("sin nada por delante, null", () => {
    expect(siguienteConHuecos(cal, "2026-11-17")).toBeNull();
  });
});
