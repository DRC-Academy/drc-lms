import { describe, expect, it } from "vitest";
import {
  ahoraEnEspana,
  calendarioConFechas,
  calendarioSemanaTipo,
  diaInicial,
  semanaInicial,
  type Calendario,
  type EstadoCasilla,
} from "@/lib/autoservicio/calendario";
import { leerAgenda, leerHuecos } from "@/lib/autoservicio/leer";
import { agendaSimulada, huecosSimulados } from "@/lib/autoservicio/simulacion";
import type { Agenda, HuecoLibre } from "@/lib/autoservicio/tipos";

// Martes 10/11/2026, 11:30 en España.
const AHORA = { fecha: "2026-11-10", hora: "11:30" };

const h = (dia: HuecoLibre["dia"], hora: string, fecha: string | null, duracion = 1): HuecoLibre => ({ dia, hora, duracion, fecha });

const agenda = (franjas: [string, string, "libre" | "ocupado"][], hasta = "2026-11-21"): Agenda => ({
  desde: "2026-11-09",
  hasta,
  franjas: franjas.map(([fecha, hora, estado]) => ({ fecha, hora, estado })),
});

function estado<H>(c: Calendario<H>, fecha: string, hora: string): EstadoCasilla | undefined {
  for (const s of c.semanas) for (const d of s.dias) if (d.fecha === fecha) return d.casillas.find((x) => x.hora === hora)?.estado;
  return undefined;
}

/** Cada hueco, las veces que sale pinchable. */
function vecesPinchable<H>(c: Calendario<H>, hueco: H): number {
  return c.semanas.flatMap((s) => s.dias).flatMap((d) => d.casillas).filter((x) => x.estado === "libre" && x.huecos.includes(hueco)).length;
}

describe("calendarioConFechas", () => {
  const ag = agenda([
    ["2026-11-10", "10:00", "libre"],      // ya pasó
    ["2026-11-10", "12:00", "libre"],      // libre, pero no se ofrece (menos de 24 h)
    ["2026-11-11", "10:00", "libre"],      // hueco
    ["2026-11-11", "11:00", "ocupado"],
    ["2026-11-12", "18:00", "ocupado"],    // su clase
    ["2026-11-17", "09:00", "libre"],
  ]);
  const huecos = [h("Miércoles", "10:00", "2026-11-11"), h("Martes", "09:00", "2026-11-17")];
  const c = calendarioConFechas(huecos, ag, { fecha: "2026-11-12", hora: "18:00", duracion: 1 }, AHORA);

  it("de la semana actual a la de `hasta`, de lunes a sábado", () => {
    expect(c.semanas.map((s) => s.lunes)).toEqual(["2026-11-09", "2026-11-16"]);
    expect(c.semanas[0].dias.map((d) => d.dia)).toEqual(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]);
  });

  it("filas seguidas de la primera a la última hora, iguales todas las semanas", () => {
    expect(c.horas).toEqual(["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]);
  });

  it("cada estado", () => {
    expect(estado(c, "2026-11-11", "10:00")).toBe("libre");
    expect(estado(c, "2026-11-11", "11:00")).toBe("ocupado");
    expect(estado(c, "2026-11-12", "18:00")).toBe("tuClase");
    expect(estado(c, "2026-11-10", "10:00")).toBe("pasada");
    expect(estado(c, "2026-11-10", "12:00")).toBe("noDisponible");
    expect(estado(c, "2026-11-11", "15:00")).toBe("fuera");
  });

  it("cuenta los libres por día y por semana", () => {
    expect(c.semanas[0].libres).toBe(1);
    expect(c.semanas[0].dias.find((d) => d.fecha === "2026-11-11")?.libres).toBe(1);
    expect(c.semanas[0].dias.find((d) => d.fecha === "2026-11-09")?.pasado).toBe(true);
  });

  it("un hueco ofrecido se pincha aunque la agenda no lo diga libre (o no venga)", () => {
    const raro = h("Jueves", "20:00", "2026-11-19");
    const c2 = calendarioConFechas([raro], ag, null, AHORA);
    expect(estado(c2, "2026-11-19", "20:00")).toBe("libre");
    expect(vecesPinchable(c2, raro)).toBe(1);
    const sinAgenda = calendarioConFechas(huecos, null, null, AHORA);
    expect(huecos.every((x) => vecesPinchable(sinAgenda, x) === 1)).toBe(true);
    expect(estado(sinAgenda, "2026-11-11", "09:00")).toBe("fuera");
  });

  it("la clase de dos horas marca sus dos casillas", () => {
    const c2 = calendarioConFechas([], ag, { fecha: "2026-11-12", hora: "17:00", duracion: 2 }, AHORA);
    expect(estado(c2, "2026-11-12", "17:00")).toBe("tuClase");
    expect(estado(c2, "2026-11-12", "18:00")).toBe("tuClase");
  });

  it("el domingo solo sale si algo cae en domingo", () => {
    const domingo = h("Domingo", "10:00", "2026-11-15");
    const c2 = calendarioConFechas([domingo], ag, null, AHORA);
    expect(c2.semanas[0].dias.map((d) => d.dia)).toContain("Domingo");
    expect(vecesPinchable(c2, domingo)).toBe(1);
  });

  it("abre en la semana de hoy y, en el móvil, en el primer día desde hoy con huecos", () => {
    expect(semanaInicial(c, AHORA)).toBe(0);
    expect(diaInicial(c.semanas[0])).toBe("2026-11-11");
    expect(diaInicial(c.semanas[1])).toBe("2026-11-17");
  });

  it("con los datos simulados: cada hueco, una casilla pinchable, y ninguna más", () => {
    for (const sesion of ["Martes_18:00", "Jueves_09:00"]) {
      const ahora = new Date("2026-11-10T10:30:00Z");
      const cuerpo = huecosSimulados("puntual", sesion, ahora);
      const lista = leerHuecos(cuerpo, "puntual")!;
      const c2 = calendarioConFechas(lista, leerAgenda(cuerpo), null, ahoraEnEspana(ahora));
      expect(lista.length).toBeGreaterThan(20);
      expect(lista.every((x) => vecesPinchable(c2, x) === 1)).toBe(true);
      const pinchables = c2.semanas.flatMap((s) => s.dias).flatMap((d) => d.casillas).filter((x) => x.estado === "libre");
      expect(pinchables.flatMap((x) => x.huecos)).toHaveLength(lista.length);
    }
  });
});

describe("calendarioSemanaTipo", () => {
  const huecos = [h("Martes", "18:00", null), h("Lunes", "09:00", null), h("Martes", "09:00", null), h("Martes", "09:00", null)];
  const c = calendarioSemanaTipo(huecos);

  it("una sola semana, solo con los días y las horas que tienen hueco", () => {
    expect(c.semanas).toHaveLength(1);
    expect(c.semanas[0].dias.map((d) => d.dia)).toEqual(["Lunes", "Martes"]);
    expect(c.horas).toEqual(["09:00", "18:00"]);
    expect(c.semanas[0].dias[0].casillas.map((x) => x.estado)).toEqual(["libre", "vacia"]);
  });

  it("cada hueco, una vez; el repetido tal cual, una", () => {
    expect(c.semanas[0].libres).toBe(3);
    expect(vecesPinchable(c, huecos[0])).toBe(1);
    expect(vecesPinchable(c, huecos[1])).toBe(1);
  });

  it("dos a la misma hora con algo distinto salen los dos, en la misma casilla", () => {
    const dos = [h("Lunes", "09:00", null, 1), h("Lunes", "09:00", null, 2)];
    const c2 = calendarioSemanaTipo(dos);
    expect(c2.semanas[0].dias[0].casillas[0].huecos).toHaveLength(2);
  });
});

describe("leerAgenda", () => {
  it("solo fecha, hora y estado; descarta lo torcido, lo repetido y lo de fuera de la ventana", () => {
    const a = leerAgenda({
      agenda: {
        desde: "2026-11-09",
        hasta: "2026-11-21",
        franjas: [
          { inicio: "2026-11-10T10:00", fin: "2026-11-10T11:00", estado: "libre", alumno: "Nadie", tipo: "recuperacion" },
          { inicio: "2026-11-10T10:00", fin: "2026-11-10T11:00", estado: "libre" },
          { inicio: "2026-11-10T11:00", fin: "2026-11-10T12:00", estado: "bloqueado" },
          { inicio: "2026-11-10 12:00", estado: "ocupado" },
          { inicio: "2026-12-01T10:00", estado: "ocupado" },
          { inicio: "2026-11-11T09:00", estado: "ocupado" },
        ],
      },
    });
    expect(a).toEqual({
      desde: "2026-11-09",
      hasta: "2026-11-21",
      franjas: [
        { fecha: "2026-11-10", hora: "10:00", estado: "libre" },
        { fecha: "2026-11-11", hora: "09:00", estado: "ocupado" },
      ],
    });
  });

  it("sin agenda, o torcida, null", () => {
    expect(leerAgenda({ ok: true, huecos: [] })).toBeNull();
    expect(leerAgenda({ agenda: { desde: "ayer", hasta: "2026-11-21", franjas: [] } })).toBeNull();
  });

  it("la simulada se lee entera", () => {
    const a = leerAgenda({ agenda: agendaSimulada("2026-11-10") })!;
    expect(a.desde).toBe("2026-11-09");
    expect(a.franjas.length).toBeGreaterThan(200);
  });
});
