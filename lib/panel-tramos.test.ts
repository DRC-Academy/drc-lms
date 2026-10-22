import { describe, expect, it } from "vitest";
import { diasDelTramo, mesesDelGrafico, paredDe, tramosFijos, tramoVacio } from "@/lib/panel-tramos";
import { medirClaseTramo, recortarTramo } from "@/lib/panel-calculos";
import { etiquetaMes, tramoCorto, tramoLargo, variacionEnNumero, variacionEnPuntos } from "@/lib/panel-formato";
import type { FilaEntrada } from "@/lib/entradas-clase";

describe("la semana y el mes en curso", () => {
  it("un jueves por la noche: lun–jue contra lun–jue, hasta la misma hora", () => {
    const t = tramosFijos("2026-10-22T23:02");
    expect(t.semana.actual).toEqual({ desde: "2026-10-19T00:00", hasta: "2026-10-22T23:02" });
    expect(t.semana.anterior).toEqual({ desde: "2026-10-12T00:00", hasta: "2026-10-15T23:02" });
    expect(t.mes.actual).toEqual({ desde: "2026-10-01T00:00", hasta: "2026-10-22T23:02" });
    expect(t.mes.anterior).toEqual({ desde: "2026-09-01T00:00", hasta: "2026-09-22T23:02" });
    expect(t.mes.recortado).toBe(false);
  });

  it("el 31 de marzo contra febrero: febrero entero, y lo dice", () => {
    const t = tramosFijos("2027-03-31T10:00");
    expect(t.mes.anterior).toEqual({ desde: "2027-02-01T00:00", hasta: "2027-03-01T00:00" });
    expect(t.mes.recortado).toBe(true);
    // El 28 aún cabe: hasta la misma hora del 28 de febrero.
    expect(tramosFijos("2027-03-28T10:00").mes.anterior.hasta).toBe("2027-02-28T10:00");
    expect(tramosFijos("2027-03-28T10:00").mes.recortado).toBe(false);
  });

  it("enero contra diciembre del año anterior", () => {
    expect(tramosFijos("2027-01-05T09:30").mes.anterior).toEqual({ desde: "2026-12-01T00:00", hasta: "2026-12-05T09:30" });
  });

  it("la semana del cambio de hora compara la misma hora del reloj", () => {
    // Lunes 26 oct 2026, después del cambio del domingo 25.
    const t = tramosFijos("2026-10-26T10:00");
    expect(t.semana.anterior).toEqual({ desde: "2026-10-19T00:00", hasta: "2026-10-19T10:00" });
    // Y la hora de pared sale de Madrid, no de UTC: 08:00 UTC en verano son las 10:00.
    expect(paredDe(new Date("2026-10-22T08:00:00Z"))).toBe("2026-10-22T10:00");
    expect(paredDe(new Date("2026-10-26T09:00:00Z"))).toBe("2026-10-26T10:00");
  });

  it("el lunes a las 00:00 la semana en curso aún no tiene ningún minuto", () => {
    const t = tramosFijos("2026-10-19T00:00");
    expect(tramoVacio(t.semana.actual)).toBe(true);
    expect(tramoVacio(t.semana.anterior)).toBe(true);
  });

  it("los días de un tramo: el que acaba a las 00:00 no toca ese día", () => {
    expect(diasDelTramo({ desde: "2026-10-12T00:00", hasta: "2026-10-15T23:02" })).toEqual({ desde: "2026-10-12", hasta: "2026-10-15" });
    expect(diasDelTramo({ desde: "2027-02-01T00:00", hasta: "2027-03-01T00:00" })).toEqual({ desde: "2027-02-01", hasta: "2027-02-28" });
  });

  it("se recorta al primer día con datos", () => {
    expect(recortarTramo({ desde: "2026-10-12T00:00", hasta: "2026-10-15T23:02" }, "2026-10-13")).toEqual({ desde: "2026-10-13T00:00", hasta: "2026-10-15T23:02" });
    expect(recortarTramo({ desde: "2026-09-01T00:00", hasta: "2026-09-22T23:02" }, "2026-10-13")).toBeNull();
    expect(recortarTramo({ desde: "2026-10-01T00:00", hasta: "2026-10-22T23:02" }, null)).toBeNull();
  });
});

describe("los meses del gráfico", () => {
  it("los 6 que acaban en el mes del final del rango; el de hoy, hasta hoy y en curso", () => {
    const m = mesesDelGrafico("2026-10-22", "2026-10-22");
    expect(m.map((x) => x.periodo)).toEqual(["2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
    expect(m[5]).toEqual({ periodo: "2026-10-01", desde: "2026-10-01", hasta: "2026-10-22", enCurso: true });
    expect(m[4]).toEqual({ periodo: "2026-09-01", desde: "2026-09-01", hasta: "2026-09-30", enCurso: false });
  });

  it("un rango que acaba en un mes pasado: meses enteros, ninguno en curso", () => {
    const m = mesesDelGrafico("2026-08-10", "2026-10-22");
    expect(m[0].periodo).toBe("2026-03-01");
    expect(m[5]).toEqual({ periodo: "2026-08-01", desde: "2026-08-01", hasta: "2026-08-31", enCurso: false });
  });

  it("cruzando el año", () => {
    expect(mesesDelGrafico("2027-02-03", "2027-02-03").map((x) => x.periodo)).toEqual([
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
    ]);
  });
});

describe("las clases con el botón, hasta una hora", () => {
  const parte = (alumnoId: string, fecha: string, hora: string | null) => ({ alumnoId, fecha, hora, tipo: "normal", profesor: "Ana" });
  const clic = (alumno_id: string, clave: string): FilaEntrada => ({
    alumno_id,
    clase_id: `${clave}|t-1`,
    clase_inicio: null,
    profesor: null,
    clicked_at: `${clave}:00Z`,
    origen: "dashboard",
    minutos_desde_inicio: 0,
  });

  it("una clase entra si empieza antes de la hora del corte", () => {
    const partes = [parte("a", "2026-10-15", "10:00"), parte("a", "2026-10-15", "23:30"), parte("b", "2026-10-15", "18:00")];
    const entradas = [clic("a", "2026-10-15T10:00"), clic("a", "2026-10-15T23:30")];
    expect(medirClaseTramo(partes, entradas, { desde: "2026-10-12T00:00", hasta: "2026-10-15T23:02" })).toEqual({
      clases: 2,
      clasesConEntrada: 1,
      alumnos: 2,
      alumnosConEntrada: 1,
    });
  });
});

describe("cómo se escriben las comparaciones", () => {
  it("porcentajes: puntos y el valor anterior", () => {
    expect(variacionEnPuntos(19, 16)).toEqual({ texto: "+3 pts · vs. 16 %", signo: 1 });
    expect(variacionEnPuntos(15, 16)).toEqual({ texto: "−1 pt · vs. 16 %", signo: -1 });
    expect(variacionEnPuntos(16, 16).signo).toBe(0);
  });

  it("números: diferencia y porcentaje; contra cero, sin porcentaje", () => {
    expect(variacionEnNumero(20, 14)).toEqual({ texto: "+6 · +43 %", signo: 1 });
    expect(variacionEnNumero(10, 11)).toEqual({ texto: "−1 · −9 %", signo: -1 });
    expect(variacionEnNumero(3, 0)).toEqual({ texto: "+3 · vs. 0", signo: 1 });
  });

  it("el tramo en pequeño y en largo", () => {
    expect(tramoCorto("2026-10-22T23:02", "semana")).toBe("lun–jue");
    expect(tramoCorto("2026-10-19T08:00", "semana")).toBe("lun");
    expect(tramoCorto("2026-10-22T23:02", "mes")).toBe("1–22");
    expect(tramoCorto("2026-10-01T08:00", "mes")).toBe("día 1");
    expect(tramoLargo({ desde: "2026-10-12T00:00", hasta: "2026-10-15T23:02" })).toBe("lun 12 oct, 00:00 – jue 15 oct, 23:02");
    expect(tramoLargo({ desde: "2027-02-01T00:00", hasta: "2027-03-01T00:00" })).toBe("lun 1 feb – dom 28 feb, el día entero");
    expect(etiquetaMes("2026-09-01")).toBe("sep");
  });
});
