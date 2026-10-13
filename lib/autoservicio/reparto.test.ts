import { describe, expect, it } from "vitest";
import { chocan, destinosListos, elegir, siguienteSesion } from "@/lib/autoservicio/profesor";
import { leerHorariosProfesor, leerResultadoCambioProfesor } from "@/lib/autoservicio/leer";
import { cambioProfesorSimulado, horariosProfesorSimulados, type ProfesorSimulado } from "@/lib/autoservicio/simulacion";
import { AUTOSERVICIO } from "@/lib/textos/autoservicio";
import type { DiaSemana } from "@/lib/clases";
import type { HorarioNuevo, SesionOrigen } from "@/lib/autoservicio/tipos";

// «Cambiar de profesor» en v3: TODAS sus clases semanales pasan a un
// profesor nuevo, cada una con su misma duración, y el alumno solo elige
// horarios. Un plan de 3 h en 1+1+1 elige tres horarios de 1 h; uno de
// 2+1, uno de 2 h seguidas y otro de 1 h. Gestión (aquí, la simulación)
// solo ofrece para cada clase lo que un mismo profesor puede cubrir con
// lo ya elegido.

const DIAS: DiaSemana[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const s = (dia: DiaSemana, hora: string, duracion: number): SesionOrigen => ({ dia, hora, duracion });

/**
 * Las formas de los planes de 1 a 5 horas semanales: cada número es una
 * clase y su duración. Las clases actuales van una por día, a las 18:00.
 */
const FORMAS: number[][] = [
  [1],
  [2],
  [1, 1],
  [3],
  [2, 1],
  [1, 1, 1],
  [4],
  [2, 2],
  [3, 1],
  [2, 1, 1],
  [1, 1, 1, 1],
  [5],
  [3, 2],
  [2, 2, 1],
  [3, 1, 1],
  [2, 1, 1, 1],
  [1, 1, 1, 1, 1],
];

const sesionesDe = (forma: number[]) => forma.map((h, i) => s(DIAS[i], "18:00", h));
const horas = (forma: number[]) => forma.reduce((a, b) => a + b, 0);

/** Un profesor con el martes y el miércoles libres de 8:00 a 22:00: cabe cualquier plan. */
const AMPLIO: ProfesorSimulado = {
  nombre: "Amplio",
  libres: { Martes: Array.from({ length: 15 }, (_, i) => 8 + i), Miércoles: Array.from({ length: 15 }, (_, i) => 8 + i) },
};

const lunes = new Date("2026-10-12T10:00:00Z");
const pedir = (elegidos: SesionOrigen[], sesiones: SesionOrigen[], profesores: ProfesorSimulado[]) =>
  leerHorariosProfesor(horariosProfesorSimulados(elegidos, { sesiones, profesores, ahora: lunes }))!;

describe("planes de 1 a 5 horas: todas las clases, una detrás de otra, cada una con su duración", () => {
  for (const forma of FORMAS) {
    const nombre = `${horas(forma)} h en ${forma.join("+")}`;
    const sesiones = sesionesDe(forma);

    it(`${nombre}: se eligen todas, el contador cuenta y solo está listo al final`, () => {
      let elegidos: HorarioNuevo[] = [];
      for (let i = 0; i < forma.length; i++) {
        expect(siguienteSesion(sesiones, elegidos)).toBe(i);
        expect(destinosListos(sesiones, elegidos)).toBe(false);
        expect(AUTOSERVICIO.es.contadorClases(elegidos.length, forma.length)).toBe(
          `Has elegido ${i} de ${forma.length} ${forma.length === 1 ? "clase" : "clases"}`
        );
        const r = pedir(elegidos, sesiones, [AMPLIO]);
        expect(r.sesiones).toEqual(sesiones);
        expect(r.horarios.length).toBeGreaterThan(0);
        // Todos de la duración de SU clase, y ninguno choca con lo elegido.
        expect(r.horarios.every((h) => h.duracion === forma[i])).toBe(true);
        expect(r.horarios.some((h) => elegidos.some((e) => chocan(h, e)))).toBe(false);
        elegidos = elegir(elegidos, r.horarios[0]);
      }
      expect(siguienteSesion(sesiones, elegidos)).toBeNull();
      expect(destinosListos(sesiones, elegidos)).toBe(true);
      expect(pedir(elegidos, sesiones, [AMPLIO]).horarios).toEqual([]);
      expect(leerResultadoCambioProfesor(cambioProfesorSimulado(elegidos, { sesiones, profesores: [AMPLIO] }))).toMatchObject({
        ok: true,
        profesorNuevo: "Amplio",
      });
    });

    if (forma.length > 1) {
      it(`${nombre}: si con lo elegido no queda nadie para la siguiente, llega vacío`, () => {
        // Solo «Justo» tiene el lunes a las 10:00, y nada más.
        const justo: ProfesorSimulado = {
          nombre: "Justo",
          libres: { Lunes: Array.from({ length: forma[0] }, (_, k) => 10 + k) },
        };
        const r = pedir([s("Lunes", "10:00", forma[0])], sesiones, [AMPLIO, justo]);
        expect(r).toMatchObject({ elegidosDisponibles: true, horarios: [] });
      });
    }
  }
});

describe("los textos de la elección", () => {
  it("es", () => {
    const t = AUTOSERVICIO.es;
    expect(t.profesorIntro).toBe("Elige los horarios que te vienen bien y te asignamos el profesor que mejor encaje.");
    expect(t.tuClaseDe(1)).toBe("Tu clase de 1 hora");
    expect(t.tuClaseDe(2)).toBe("Tu clase de 2 horas");
    expect(t.ahora("Sábado", "10:00", "12:00")).toBe("Ahora: los sábados, 10:00–12:00");
    expect(t.contadorClases(2, 3)).toBe("Has elegido 2 de 3 clases");
    expect(t.sinHorariosParaOtra(1)).toMatch(/^Con estos horarios no hay ningún profesor libre para tu otra clase\./);
    expect(t.sinHorariosParaOtra(2)).toMatch(/para el resto de tus clases\./);
    expect(t.sinHorariosParaOtra(1)).toMatch(/WhatsApp/);
  });

  it("en", () => {
    const t = AUTOSERVICIO.en;
    expect(t.tuClaseDe(1)).toBe("Your 1-hour class");
    expect(t.ahora("Martes", "18:00", "19:00")).toBe("Now: Tuesdays, 18:00–19:00");
    expect(t.contadorClases(2, 3)).toBe("You've chosen 2 of 3 classes");
    expect(t.sinHorariosParaOtra(1)).toMatch(/^With these times there's no teacher free for your other class\./);
  });
});
