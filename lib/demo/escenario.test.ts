import { describe, expect, it } from "vitest";
import { sumarDias } from "@/lib/fechas";
import { proximaDelAlumno, semanasDelAlumno } from "@/lib/clases";
import { asGuiaProxima } from "@/lib/perfil";
import { calcularEstimacion, nivelDelAlumno, nivelEsFiable, origenDelNivel } from "@/lib/estimacion";
import { calcularApertura } from "@/lib/drip";
import { cursosDelPlan } from "@/lib/cursos";
import { TEXTOS } from "@/lib/textos";
import {
  CLASES_CON_BLOQUE,
  DIAS_DE_CURSO,
  ID_DEMO,
  TOTAL_CLASES,
  clasesFechadas,
  escenarioDemo,
  proximaDemo,
} from "@/lib/demo/escenario";

// Siete anclas seguidas: una por día de la semana.
const ANCLAS = Array.from({ length: 7 }, (_, i) => sumarDias("2026-09-21", i));
const lejos = new Date("2030-01-01T00:00:00Z");

describe("el escenario de la demo", () => {
  it("pone la próxima clase a dos o tres días del ancla, sea el día que sea", () => {
    for (const ancla of ANCLAS) {
      const { fecha } = proximaDemo(ancla);
      const dias = (Date.parse(fecha) - Date.parse(ancla)) / 86_400_000;
      expect(dias === 2 || dias === 3).toBe(true);
    }
  });

  it("la próxima clase del calendario es la del escenario, con su sala", () => {
    for (const ancla of ANCLAS) {
      const { calendario, excepciones } = escenarioDemo(ancla, lejos);
      const ahora = new Date(`${ancla}T10:00:00Z`);
      const proxima = proximaDelAlumno(calendario, excepciones, ahora);
      expect(proxima?.fecha).toBe(proximaDemo(ancla).fecha);
      expect(proxima?.horas).toBe(1);
      expect(proxima?.meetLink).toMatch(/^https:\/\/meet\.google\.com\//);
    }
  });

  it("las clases pasadas caen en su día de calendario, desde la matrícula", () => {
    const ancla = "2026-09-25";
    const inicio = sumarDias(ancla, -DIAS_DE_CURSO);
    const { calendario, excepciones } = escenarioDemo(ancla, lejos);
    for (const clase of clasesFechadas(ancla)) {
      expect(clase.fecha >= inicio).toBe(true);
      expect(clase.fecha < ancla).toBe(true);
      // El calendario de Gestión reconoce ese día como día de clase.
      const semana = semanasDelAlumno(calendario, excepciones, new Date(`${clase.fecha}T05:00:00Z`), 1, {
        conPasadas: true,
      });
      const delDia = semana[0].dias.find((d) => d.fecha === clase.fecha);
      expect(delDia?.clases.length).toBe(1);
    }
  });

  it("veinticuatro clases, dos por semana, la última hace uno o dos días, sea cual sea el ancla", () => {
    for (const ancla of ANCLAS) {
      const clases = clasesFechadas(ancla);
      expect(clases.length).toBe(TOTAL_CLASES);
      const dias = (Date.parse(ancla) - Date.parse(clases[clases.length - 1].fecha)) / 86_400_000;
      expect(dias === 1 || dias === 2).toBe(true);
      // Nunca en domingo, y nunca dos clases el mismo día.
      expect(clases.every((c) => new Date(`${c.fecha}T00:00:00Z`).getUTCDay() !== 0)).toBe(true);
      expect(new Set(clases.map((c) => c.fecha)).size).toBe(clases.length);
    }
  });

  it("doce paradas, y la última clase sin bloque", () => {
    expect(CLASES_CON_BLOQUE.length).toBe(12);
    expect(CLASES_CON_BLOQUE).not.toContain(TOTAL_CLASES);
    expect(Math.max(...CLASES_CON_BLOQUE)).toBeLessThanOrEqual(TOTAL_CLASES);
  });

  it("una clase que aún no se ha analizado no existe", () => {
    const ancla = "2026-09-25";
    const clases = clasesFechadas(ancla);
    const tercera = clases[2];
    const justoDespues = new Date(tercera.analizadaEn.getTime() + 1000);
    const { clases: vistas } = escenarioDemo(ancla, justoDespues);
    expect(vistas.length).toBe(3);
    expect(vistas[0].class_date).toBe(tercera.fecha);
    expect(escenarioDemo(ancla, new Date(tercera.analizadaEn.getTime() - 1000)).clases.length).toBe(2);
  });

  it("las filas tienen la forma de Gestión", () => {
    const { clases, perfil } = escenarioDemo("2026-09-25", lejos);
    for (const fila of clases) {
      expect(fila.student_id).toBe(ID_DEMO);
      expect(asGuiaProxima(fila.next_class_guide)).not.toBeNull();
      expect(String(fila.errors_detected).length).toBeGreaterThan(200);
    }
    expect(perfil.alumno_id).toBe(ID_DEMO);
  });

  it("B1 confirmado, sin examen, curso general y banner de ampliación", () => {
    const { perfil } = escenarioDemo("2026-09-25", lejos);
    const p = {
      nivel: perfil.nivel as string,
      nivelProfesor: perfil.nivel_profesor as string,
      nivelFicha: perfil.nivel_ficha as string,
      nivelPrueba: null,
    };
    expect(nivelDelAlumno(ID_DEMO, p)).toBe("B1");
    expect(nivelEsFiable(origenDelNivel(p.nivelProfesor, p.nivelFicha, null, p.nivel))).toBe(true);

    const cursos = [
      { tipo: "general", nivel: "B1", examen: null },
      { tipo: "examen", nivel: "B1", examen: "b1_preliminary" },
    ];
    expect(cursosDelPlan(perfil.plan as string, "B1", cursos)).toEqual([cursos[0]]);

    const estimacion = calcularEstimacion({
      nivelActual: "B1",
      horasSemanales: perfil.horas_semanales as number,
      textosDelPlan: [perfil.plan_contratado as string, perfil.objetivo_setter as string, perfil.objetivo_perfil as string],
      t: TEXTOS.es.banners,
    });
    expect(estimacion?.meta.nivel).toBe("B2");
    expect(estimacion?.hayAmpliacion).toBe(true);
  });

  it("trece semanas de drip: abre lo de 91 días y nada más", () => {
    const ancla = "2026-09-25";
    const { perfil } = escenarioDemo(ancla, lejos);
    const inicio = new Date(`${perfil.fecha_inicio as string}T12:00:00Z`);
    const ahora = new Date(`${ancla}T12:00:00Z`);
    expect(calcularApertura(91, inicio, ahora).abierto).toBe(true);
    expect(calcularApertura(98, inicio, ahora).abierto).toBe(false);
  });
});
