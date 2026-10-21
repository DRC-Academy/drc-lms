import { describe, expect, it } from "vitest";
import {
  atajosDeFechas,
  diasDelRango,
  esDia,
  leerRango,
  lunesDe,
  rangoAnterior,
  rangoGrafico,
  rangoPorDefecto,
} from "@/lib/panel-rango";
import type { FilaEntrada } from "@/lib/entradas-clase";
import { contraQue, diaCorto, etiquetaPeriodo, mesLargo, rangoLegible, tituloPeriodo } from "@/lib/panel-formato";
import { disponibilidad, medirClase, recortar, semanasDelRango } from "@/lib/panel-calculos";

// Hoy es martes 20 oct 2026 en todos los casos.
const HOY = "2026-10-20";

describe("el rango", () => {
  it("por defecto, la última semana completa de lunes a domingo", () => {
    expect(rangoPorDefecto(HOY)).toEqual({ desde: "2026-10-12", hasta: "2026-10-18" });
    // Un lunes: la semana que acabó ayer.
    expect(rangoPorDefecto("2026-10-19")).toEqual({ desde: "2026-10-12", hasta: "2026-10-18" });
    // Un domingo: la semana en curso no está completa hasta que acabe.
    expect(rangoPorDefecto("2026-10-18")).toEqual({ desde: "2026-10-05", hasta: "2026-10-11" });
  });

  it("el anterior dura lo mismo y acaba el día antes", () => {
    expect(rangoAnterior({ desde: "2026-10-12", hasta: "2026-10-18" })).toEqual({ desde: "2026-10-05", hasta: "2026-10-11" });
    expect(rangoAnterior({ desde: "2026-10-15", hasta: "2026-10-15" })).toEqual({ desde: "2026-10-14", hasta: "2026-10-14" });
    // 45 días, cruzando el cambio de mes.
    const r = { desde: "2026-09-05", hasta: "2026-10-19" };
    expect(diasDelRango(r)).toBe(45);
    expect(rangoAnterior(r)).toEqual({ desde: "2026-07-22", hasta: "2026-09-04" });
  });

  it("el gráfico: las 12 semanas que acaban en la del final, o el rango entero si es más largo", () => {
    // La semana del 12 oct: de la del 27 jul a la del 12 oct.
    expect(rangoGrafico({ desde: "2026-10-12", hasta: "2026-10-18" })).toEqual({ desde: "2026-07-27", hasta: "2026-10-18" });
    // Esta semana, a medias: hasta hoy.
    expect(rangoGrafico({ desde: "2026-10-19", hasta: "2026-10-20" })).toEqual({ desde: "2026-08-03", hasta: "2026-10-20" });
    // 16 semanas, empezando a mitad de una: desde su lunes.
    expect(rangoGrafico({ desde: "2026-07-01", hasta: "2026-10-18" })).toEqual({ desde: "2026-06-29", hasta: "2026-10-18" });
    expect(semanasDelRango(rangoGrafico({ desde: "2026-10-12", hasta: "2026-10-18" }))).toHaveLength(12);
  });

  it("lo que no cumple las reglas da el de por defecto", () => {
    const defecto = { rango: rangoPorDefecto(HOY), porDefecto: true };
    expect(leerRango("2026-10-01", "2026-10-15", HOY)).toEqual({ rango: { desde: "2026-10-01", hasta: "2026-10-15" }, porDefecto: false });
    expect(leerRango(undefined, undefined, HOY)).toEqual(defecto);
    expect(leerRango("2026-10-15", "2026-10-01", HOY)).toEqual(defecto); // al revés
    expect(leerRango("2026-10-01", "2026-10-21", HOY)).toEqual(defecto); // futuro
    expect(leerRango("2025-10-19", "2026-10-20", HOY)).toEqual(defecto); // 367 días
    expect(leerRango("2025-10-20", "2026-10-20", HOY).porDefecto).toBe(false); // 366
    expect(leerRango("2026-02-31", "2026-03-02", HOY)).toEqual(defecto); // no existe
    expect(leerRango(["2026-10-01"], "2026-10-02", HOY)).toEqual(defecto); // repetido en la URL
  });

  it("días y lunes", () => {
    expect(esDia("2028-02-29")).toBe(true);
    expect(esDia("2026-02-29")).toBe(false);
    expect(esDia("2026-1-05")).toBe(false);
    expect(lunesDe("2026-10-18")).toBe("2026-10-12");
    expect(lunesDe("2026-10-12")).toBe("2026-10-12");
    expect(lunesDe("2026-10-25")).toBe("2026-10-19"); // el domingo del cambio de hora
  });
});

describe("la disponibilidad", () => {
  const semana = { desde: "2026-10-12", hasta: "2026-10-18" };
  it("completo, parcial desde, o sin datos", () => {
    expect(disponibilidad("2026-10-13", { desde: "2026-10-19", hasta: "2026-10-19" })).toEqual({ estado: "completo" });
    expect(disponibilidad("2026-10-13", semana)).toEqual({ estado: "parcial", desde: "2026-10-13" });
    expect(disponibilidad("2026-10-13", { desde: "2026-10-05", hasta: "2026-10-11" })).toEqual({ estado: "sin_datos" });
    expect(disponibilidad(null, semana)).toEqual({ estado: "sin_datos" });
  });

  it("el recorte deja solo los días con datos", () => {
    expect(recortar(semana, "2026-10-13")).toEqual({ desde: "2026-10-13", hasta: "2026-10-18" });
    expect(recortar(semana, "2026-10-01")).toEqual(semana);
    expect(recortar(semana, "2026-10-19")).toBeNull();
    expect(recortar(semana, null)).toBeNull();
  });
});

describe("las semanas del gráfico", () => {
  it("de lunes a domingo, recortadas a los bordes", () => {
    expect(semanasDelRango({ desde: "2026-09-30", hasta: "2026-10-14" })).toEqual([
      { periodo: "2026-09-28", desde: "2026-09-30", hasta: "2026-10-04" },
      { periodo: "2026-10-05", desde: "2026-10-05", hasta: "2026-10-11" },
      { periodo: "2026-10-12", desde: "2026-10-12", hasta: "2026-10-14" },
    ]);
  });
});

describe("las clases con entrada", () => {
  const parte = (alumnoId: string, fecha: string, hora: string, tipo = "normal") => ({ alumnoId, fecha, hora, tipo, profesor: null });
  const clic = (alumnoId: string, clave: string): FilaEntrada => ({
    alumno_id: alumnoId,
    clase_id: `${clave}|t1`,
    clase_inicio: null,
    profesor: null,
    clicked_at: `${clave}:00Z`,
    minutos_desde_inicio: 0,
    origen: "dashboard",
  });
  it("cuenta solo los partes y clics de los días del trozo", () => {
    const partes = [parte("a", "2026-10-13", "10:00"), parte("a", "2026-10-15", "10:00"), parte("b", "2026-10-20", "10:00")];
    const entradas = [clic("a", "2026-10-13T10:00"), clic("a", "2026-10-13T10:00"), clic("b", "2026-10-20T10:00")];
    expect(medirClase(partes, entradas, { desde: "2026-10-12", hasta: "2026-10-18" })).toEqual({
      clases: 2,
      clasesConEntrada: 1,
      alumnos: 1,
      alumnosConEntrada: 1,
      porAlumno: { a: { clases: 2, conEntrada: 1, ultima: "2026-10-13T10:00" } },
    });
  });

  it("la lista: también quien no usó el botón, y la última clase abierta con él", () => {
    const partes = [
      parte("a", "2026-10-13", "10:00"),
      parte("a", "2026-10-16", "10:00"),
      parte("b", "2026-10-14", "18:00"),
      parte("c", "2026-10-15", "09:00", "falta_sin_aviso"),
    ];
    // a abre las dos; c pulsa en una falta, que no cuenta; d pulsa sin parte.
    const entradas = [clic("a", "2026-10-16T10:00"), clic("a", "2026-10-13T10:00"), clic("c", "2026-10-15T09:00"), clic("d", "2026-10-15T12:00")];
    const r = medirClase(partes, entradas, { desde: "2026-10-12", hasta: "2026-10-18" });
    expect(r.porAlumno).toEqual({
      a: { clases: 2, conEntrada: 2, ultima: "2026-10-16T10:00" },
      b: { clases: 1, conEntrada: 0, ultima: null },
    });
    expect([r.alumnos, r.alumnosConEntrada, r.clases, r.clasesConEntrada]).toEqual([2, 1, 3, 2]);
  });
});

describe("los atajos del selector", () => {
  const por = (hoy: string) => Object.fromEntries(atajosDeFechas(hoy).map((a) => [a.id, a.rango]));
  it("semanas completas que acaban el domingo pasado; este mes y esta semana hasta hoy", () => {
    expect(por(HOY)).toEqual({
      "esta-semana": { desde: "2026-10-19", hasta: "2026-10-20" },
      "semana-pasada": { desde: "2026-10-12", hasta: "2026-10-18" },
      "4-semanas": { desde: "2026-09-21", hasta: "2026-10-18" },
      "12-semanas": { desde: "2026-07-27", hasta: "2026-10-18" },
      "este-mes": { desde: "2026-10-01", hasta: "2026-10-20" },
      "mes-pasado": { desde: "2026-09-01", hasta: "2026-09-30" },
    });
  });
  it("en enero, el mes pasado es diciembre del año anterior", () => {
    expect(por("2027-01-05")["mes-pasado"]).toEqual({ desde: "2026-12-01", hasta: "2026-12-31" });
  });
  it("todos cumplen las reglas del rango", () => {
    for (const a of atajosDeFechas(HOY)) expect(leerRango(a.rango.desde, a.rango.hasta, HOY).porDefecto).toBe(false);
  });
});

describe("cómo se escriben las fechas", () => {
  it("el rango en corto", () => {
    expect(rangoLegible({ desde: "2026-10-12", hasta: "2026-10-18" })).toBe("12 – 18 oct 2026");
    expect(rangoLegible({ desde: "2026-09-28", hasta: "2026-10-04" })).toBe("28 sep – 4 oct 2026");
    expect(rangoLegible({ desde: "2025-12-28", hasta: "2026-01-03" })).toBe("28 dic 2025 – 3 ene 2026");
    expect(rangoLegible({ desde: "2026-10-15", hasta: "2026-10-15" })).toBe("15 oct 2026");
    expect(rangoLegible({ desde: "2026-10-05", hasta: "2026-10-11" }, false)).toBe("5 – 11 oct");
  });
  it("contra qué se compara, con año solo si cambia", () => {
    expect(contraQue({ desde: "2026-10-05", hasta: "2026-10-11" }, { desde: "2026-10-12", hasta: "2026-10-18" })).toBe("vs. 5 – 11 oct");
    expect(contraQue({ desde: "2025-12-29", hasta: "2026-01-04" }, { desde: "2026-01-05", hasta: "2026-01-11" })).toBe("vs. 29 dic 2025 – 4 ene 2026");
  });
  it("periodos y meses", () => {
    expect(diaCorto("2026-09-07")).toBe("7 sep");
    expect(etiquetaPeriodo("2026-10-12")).toBe("12 oct");
    expect(tituloPeriodo("2026-10-12")).toBe("Semana del 12 oct");
    expect(mesLargo("2026-10-01")).toBe("Octubre de 2026");
  });
});
