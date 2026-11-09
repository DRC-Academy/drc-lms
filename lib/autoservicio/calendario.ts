// ---------------------------------------------------------------
// EL CALENDARIO DE LOS HUECOS, MONTADO
//
// Lo que pinta `CalendarioHuecos`, calculado aquí para poder probarlo:
// semanas, días, filas de horas y el estado de cada casilla.
//
// LO PINCHABLE SALE SOLO DE LOS HUECOS. La agenda de Gestión (solo en
// «Solo esta clase») sirve para pintar el resto —ocupado, fuera de
// horario— y nunca hace pinchable nada. Y al revés: un hueco ofrecido es
// SIEMPRE una casilla libre, diga lo que diga la agenda. Así ningún
// hueco se queda sin poder elegirse.
//
// Dos formas:
//   · con fechas («Solo esta clase»): semanas de lunes a sábado, de la
//     actual a la última con huecos, con la agenda y «Tu clase»;
//   · semana tipo («Desde ahora, todas» y «Cambiar de profesor»): una
//     sola semana, solo con los huecos.
//
// Horas de España como texto «HH:MM»: no hay zona que convertir.
// Puro y sin `server-only`: lo usa un componente de cliente.
// ---------------------------------------------------------------

import { DIAS, type DiaSemana } from "@/lib/clases";
import { sumarDias } from "@/lib/fechas";
import type { Agenda, HuecoLibre } from "@/lib/autoservicio/tipos";

/**
 *   libre         un hueco ofrecido: lo único que se pincha
 *   tuClase       la clase que se mueve
 *   ocupado       el profe tiene clase (sin decir con quién ni de qué tipo)
 *   noDisponible  libre en el calendario del profe, pero no vale para esta
 *                 clase (no cabe, antelación, ya tiene una marca…)
 *   pasada        ya empezó
 *   fuera         fuera del horario del profe, o fuera de la ventana
 *   vacia         semana tipo: a esa hora, ese día, no hay hueco
 */
export type EstadoCasilla = "libre" | "tuClase" | "ocupado" | "noDisponible" | "pasada" | "fuera" | "vacia";

export type Casilla<H> = { hora: string; estado: EstadoCasilla; huecos: H[] };

export type DiaCalendario<H> = {
  /** La fecha, o el día en la semana tipo. */
  clave: string;
  dia: DiaSemana;
  fecha: string | null;
  casillas: Casilla<H>[];
  libres: number;
  /** El día entero ya pasó. */
  pasado: boolean;
};

export type SemanaCalendario<H> = { lunes: string | null; dias: DiaCalendario<H>[]; libres: number };

export type Calendario<H> = {
  /** Las filas: las mismas en todas las semanas, para no perder la referencia al pasar de una a otra. */
  horas: string[];
  semanas: SemanaCalendario<H>[];
};

/** Un momento de España: «2026-11-10» y «17:30». */
export type Ahora = { fecha: string; hora: string };

/** La clase que se mueve, para marcarla como «Tu clase». */
export type ClaseQueSeMueve = { fecha: string; hora: string; duracion: number };

const ORDEN: DiaSemana[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const FORMATO_AHORA = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Ahora mismo, en España. */
export function ahoraEnEspana(d: Date = new Date()): Ahora {
  const p = Object.fromEntries(FORMATO_AHORA.formatToParts(d).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

export function diaDeFecha(fecha: string): DiaSemana {
  return DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
}

export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return sumarDias(fecha, d === 0 ? -6 : 1 - d);
}

const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const textoHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Un hueco repetido tal cual cuenta una vez (como en `agruparHuecos`). */
function sinRepetir<H extends HuecoLibre>(huecos: H[]): H[] {
  const vistos = new Set<string>();
  return huecos.filter((h) => {
    const id = JSON.stringify(h);
    if (vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
}

/** De la primera a la última hora en punto, sin huecos en medio: es un calendario, no una lista. */
function filasDeHoras(horas: Iterable<string>): string[] {
  const ms = Array.from(horas, minutos).filter((m) => Number.isFinite(m));
  if (ms.length === 0) return [];
  const desde = Math.floor(Math.min(...ms) / 60) * 60;
  const hasta = Math.max(...ms);
  const filas = new Set<number>();
  for (let m = desde; m <= hasta; m += 60) filas.add(m);
  // Un hueco que no empiece en punto también tiene su fila.
  for (const m of ms) filas.add(m);
  return Array.from(filas).sort((a, b) => a - b).map(textoHora);
}

/**
 * «Solo esta clase»: semanas con fechas, de la actual a la última con
 * huecos o con agenda. Sin agenda (Gestión aún sin ella) se pintan solo
 * los huecos y lo demás sale fuera de horario.
 */
export function calendarioConFechas<H extends HuecoLibre>(
  todos: H[],
  agenda: Agenda | null,
  tuClase: ClaseQueSeMueve | null,
  ahora: Ahora
): Calendario<H> {
  const huecos = sinRepetir(todos.filter((h): h is H & { fecha: string } => h.fecha !== null));
  const fechasHuecos = huecos.map((h) => h.fecha).sort();

  const primera = [ahora.fecha, fechasHuecos[0]].filter(Boolean).sort()[0];
  const ultima = [ahora.fecha, agenda?.hasta, fechasHuecos[fechasHuecos.length - 1]].filter((x): x is string => !!x).sort().reverse()[0];

  // El domingo solo si algo cae en domingo: Gestión no tiene calendario ese día.
  const conDomingo = huecos.some((h) => diaDeFecha(h.fecha) === "Domingo") || (tuClase !== null && diaDeFecha(tuClase.fecha) === "Domingo");
  const diasSemana = conDomingo ? ORDEN : ORDEN.slice(0, 6);

  const porCasilla = new Map<string, H[]>();
  for (const h of huecos) {
    const k = `${h.fecha}|${h.hora}`;
    porCasilla.set(k, [...(porCasilla.get(k) ?? []), h]);
  }
  const enAgenda = new Map<string, "libre" | "ocupado">();
  for (const f of agenda?.franjas ?? []) enAgenda.set(`${f.fecha}|${f.hora}`, f.estado);
  const deTuClase = new Set<string>();
  if (tuClase) {
    for (let i = 0; i < tuClase.duracion; i++) deTuClase.add(`${tuClase.fecha}|${textoHora(minutos(tuClase.hora) + i * 60)}`);
  }

  const horas = filasDeHoras([
    ...(agenda?.franjas ?? []).map((f) => f.hora),
    ...huecos.map((h) => h.hora),
    ...Array.from(deTuClase, (k) => k.split("|")[1]),
  ]);

  const pasada = (fecha: string, hora: string) => fecha < ahora.fecha || (fecha === ahora.fecha && hora <= ahora.hora);

  const estadoDe = (fecha: string, hora: string): Casilla<H> => {
    const k = `${fecha}|${hora}`;
    const ofrecidos = porCasilla.get(k);
    if (ofrecidos) return { hora, estado: "libre", huecos: ofrecidos };
    if (deTuClase.has(k)) return { hora, estado: "tuClase", huecos: [] };
    const a = enAgenda.get(k);
    if (!a) return { hora, estado: "fuera", huecos: [] };
    if (pasada(fecha, hora)) return { hora, estado: "pasada", huecos: [] };
    return { hora, estado: a === "ocupado" ? "ocupado" : "noDisponible", huecos: [] };
  };

  const semanas: SemanaCalendario<H>[] = [];
  for (let lunes = lunesDe(primera); lunes <= lunesDe(ultima); lunes = sumarDias(lunes, 7)) {
    const dias = diasSemana.map((dia, i): DiaCalendario<H> => {
      const fecha = sumarDias(lunes, i);
      const casillas = horas.map((hora) => estadoDe(fecha, hora));
      return {
        clave: fecha,
        dia,
        fecha,
        casillas,
        libres: casillas.reduce((n, c) => n + c.huecos.length, 0),
        pasado: fecha < ahora.fecha,
      };
    });
    semanas.push({ lunes, dias, libres: dias.reduce((n, d) => n + d.libres, 0) });
  }
  return { horas, semanas };
}

/**
 * «Desde ahora, todas» y «Cambiar de profesor»: una semana tipo con
 * solo los huecos, de los días y a las horas en que los hay.
 */
export function calendarioSemanaTipo<H extends HuecoLibre>(todos: H[]): Calendario<H> {
  const huecos = sinRepetir(todos);
  const horas = Array.from(new Set(huecos.map((h) => h.hora))).sort((a, b) => minutos(a) - minutos(b));
  const dias = ORDEN.filter((d) => huecos.some((h) => h.dia === d)).map((dia): DiaCalendario<H> => {
    const casillas = horas.map((hora): Casilla<H> => {
      const aqui = huecos.filter((h) => h.dia === dia && h.hora === hora);
      return { hora, estado: aqui.length > 0 ? "libre" : "vacia", huecos: aqui };
    });
    return { clave: dia, dia, fecha: null, casillas, libres: casillas.reduce((n, c) => n + c.huecos.length, 0), pasado: false };
  });
  return { horas, semanas: [{ lunes: null, dias, libres: huecos.length }] };
}

/** La semana con la que se abre: la que tiene hoy (o la primera). */
export function semanaInicial<H>(c: Calendario<H>, ahora: Ahora): number {
  const i = c.semanas.findIndex((s) => s.lunes !== null && s.lunes === lunesDe(ahora.fecha));
  return i >= 0 ? i : 0;
}

/**
 * El día que se enseña primero en el móvil: el primero desde hoy con
 * huecos; si no hay, el primero desde hoy; si la semana entera pasó, el
 * primero.
 */
export function diaInicial<H>(s: SemanaCalendario<H>): string | null {
  const vigentes = s.dias.filter((d) => !d.pasado);
  return (vigentes.find((d) => d.libres > 0) ?? vigentes[0] ?? s.dias[0])?.clave ?? null;
}
