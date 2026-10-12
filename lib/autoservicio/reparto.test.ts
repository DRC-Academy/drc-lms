import { describe, expect, it } from "vitest";
import { destinosListos, estadoReparto, hayCombinacion } from "@/lib/autoservicio/profesor";
import { leerHuecosDeProfesor } from "@/lib/autoservicio/leer";
import { huecosDeProfesorSimulados } from "@/lib/autoservicio/simulacion";
import { AUTOSERVICIO } from "@/lib/textos/autoservicio";
import type { DiaSemana } from "@/lib/clases";
import type { SesionOrigen } from "@/lib/autoservicio/tipos";

// «Cambiar de profesor»: TODAS sus clases semanales pasan al profesor
// nuevo, cada una con su misma duración. Un plan de 3 h en 1+1+1 elige
// tres huecos de 1 h; uno de 2+1, uno de 2 h seguidas y otro de 1 h.

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

/**
 * Los huecos del profesor nuevo para cada clase: dos de su duración (a
 * las 9:00 de su día y del siguiente, que no se pisan con los de las
 * demás) y uno de otra duración, que no vale.
 */
const huecosDe = (forma: number[]) =>
  forma.map((h, i) => [s(DIAS[i], "09:00", h), s(DIAS[(i + 1) % 5], "14:00", h), s(DIAS[i], "16:00", h === 1 ? 2 : 1)]);

const horas = (forma: number[]) => forma.reduce((a, b) => a + b, 0);

describe("planes de 1 a 5 horas: todas las clases, cada una con su duración", () => {
  for (const forma of FORMAS) {
    const nombre = `${horas(forma)} h en ${forma.join("+")}`;
    const sesiones = sesionesDe(forma);
    const huecos = huecosDe(forma);

    it(`${nombre}: el contador cuenta, y solo está listo con TODAS elegidas`, () => {
      const destinos: (SesionOrigen | null)[] = sesiones.map(() => null);
      for (let i = 0; i < sesiones.length; i++) {
        const r = estadoReparto(sesiones, huecos, destinos);
        expect(r.total).toBe(forma.length);
        expect(r.elegidas).toBe(i);
        expect(r.listo).toBe(false);
        destinos[i] = huecos[i][0];
      }
      const final = estadoReparto(sesiones, huecos, destinos);
      expect(final).toMatchObject({ elegidas: forma.length, listo: true, sinHueco: [], imposible: false });
    });

    it(`${nombre}: un hueco de otra duración no vale`, () => {
      const destinos = huecos.map((h) => h[0]);
      destinos[0] = huecos[0][2];
      expect(destinosListos(sesiones, destinos)).toBe(false);
      expect(estadoReparto(sesiones, huecos, destinos).elegidas).toBe(forma.length - 1);
    });

    if (forma.length > 1) {
      it(`${nombre}: dos huecos que se pisan no valen`, () => {
        // La segunda clase, en el mismo sitio que la primera.
        const destinos = huecos.map((h) => h[0]);
        destinos[1] = s(destinos[0]!.dia, destinos[0]!.hora, forma[1]);
        expect(destinosListos(sesiones, destinos)).toBe(false);
      });
    }

    it(`${nombre}: sin hueco de una duración, lo dice y no hay combinación`, () => {
      const sinUna = huecos.map((h, i) => (i === forma.length - 1 ? h.filter((x) => x.duracion !== forma[i]) : h));
      const r = estadoReparto(sesiones, sinUna, sesiones.map(() => null));
      expect(r.sinHueco).toEqual([forma.length - 1]);
      expect(r.imposible).toBe(false);
      expect(hayCombinacion(sesiones, sinUna)).toBe(false);
    });
  }
});

describe("hay hueco para cada una, pero no caben todas", () => {
  it("2+1 con un único hueco de 2 h que pisa el único de 1 h", () => {
    const sesiones = [s("Martes", "18:00", 2), s("Jueves", "09:00", 1)];
    const huecos = [[s("Lunes", "10:00", 2)], [s("Lunes", "11:00", 1)]];
    const r = estadoReparto(sesiones, huecos, [null, null]);
    expect(r).toMatchObject({ sinHueco: [], imposible: true, listo: false });
  });

  it("1+1+1 con solo dos huecos distintos: falta uno", () => {
    const sesiones = [s("Lunes", "18:00", 1), s("Martes", "18:00", 1), s("Miércoles", "18:00", 1)];
    const dos = [s("Viernes", "09:00", 1), s("Viernes", "10:00", 1)];
    expect(hayCombinacion(sesiones, [dos, dos, dos])).toBe(false);
    expect(hayCombinacion(sesiones, [dos, dos, [...dos, s("Viernes", "11:00", 1)]])).toBe(true);
  });

  it("encuentra el reparto aunque el primer hueco de cada una lleve a un callejón", () => {
    // La de 2 h solo cabe a las 10:00; la de 1 h tiene que ir a las 12:00.
    const sesiones = [s("Lunes", "18:00", 1), s("Martes", "18:00", 2)];
    const huecos = [
      [s("Viernes", "10:00", 1), s("Viernes", "12:00", 1)],
      [s("Viernes", "10:00", 2)],
    ];
    expect(hayCombinacion(sesiones, huecos)).toBe(true);
  });
});

describe("la lectura no deja pasar huecos de otra duración", () => {
  it("una clase de 2 h no recibe huecos de 1 h aunque Gestión los mande", () => {
    const h = leerHuecosDeProfesor({
      ok: true,
      tipo: "profesor",
      profesor: { id: "t15", nombre: "Carla" },
      sesiones: [
        {
          indice: 0,
          dia: "Jueves",
          hora: "09:00",
          duracion: 2,
          huecos: [
            { profesor: { id: "t15", nombre: "Carla" }, dia: "Lunes", hora: "10:00", duracion: 2, fecha_primera_clase: "2026-10-19" },
            { profesor: { id: "t15", nombre: "Carla" }, dia: "Lunes", hora: "13:00", duracion: 1, fecha_primera_clase: "2026-10-19" },
          ],
        },
      ],
    })!;
    expect(h.sesiones[0].huecos.map((x) => x.hora)).toEqual(["10:00"]);
  });
});

describe("la simulación: los dos callejones sin salida", () => {
  const lunes = new Date("2026-10-12T10:00:00Z");
  const reparto = (id: string) => {
    const h = leerHuecosDeProfesor(huecosDeProfesorSimulados(id, lunes))!;
    const sesiones = h.sesiones.map((x) => x.sesion);
    return estadoReparto(sesiones, h.sesiones.map((x) => x.huecos), sesiones.map(() => null));
  };

  it("Bruno no tiene hueco para la clase de 2 horas", () => {
    expect(reparto("t25")).toMatchObject({ sinHueco: [1], imposible: false });
  });

  it("con Elena no caben las dos sin pisarse", () => {
    expect(reparto("t26")).toMatchObject({ sinHueco: [], imposible: true });
  });

  it("con Daniela se puede", () => {
    expect(reparto("t21")).toMatchObject({ sinHueco: [], imposible: false });
  });
});

describe("los textos del reparto", () => {
  it("es", () => {
    const t = AUTOSERVICIO.es;
    expect(t.tuClaseDe("Martes", 1)).toBe("Tu clase de los martes, 1 hora");
    expect(t.tuClaseDe("Jueves", 2)).toBe("Tu clase de los jueves, 2 horas");
    expect(t.tuClaseDe("Sábado", 2)).toBe("Tu clase de los sábados, 2 horas");
    expect(t.contadorClases(2, 3)).toBe("Has elegido 2 de 3 clases");
    expect(t.sinHuecoPara(2)).toBe("Este profesor no tiene hueco para tu clase de 2 horas.");
    expect(t.sinHuecoPara(1)).toBe("Este profesor no tiene hueco para tu clase de 1 hora.");
  });

  it("en", () => {
    const t = AUTOSERVICIO.en;
    expect(t.tuClaseDe("Martes", 1)).toBe("Your Tuesday class, 1 hour");
    expect(t.contadorClases(2, 3)).toBe("You've chosen 2 of 3 classes");
    expect(t.sinHuecoPara(2)).toBe("This teacher has no slot for your 2-hour class.");
  });
});
