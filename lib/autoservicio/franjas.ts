// ---------------------------------------------------------------
// LOS HUECOS LIBRES, ORDENADOS COMO LOS BUSCA UN ALUMNO
//
// Nadie busca «el hueco de las 14:00 del miércoles»: busca «algún día
// por la tarde». Así que los huecos se agrupan por día y, dentro de cada
// día, por franja: mañana, mediodía, tarde y noche.
//
// Las horas son las de Gestión, hora peninsular, y se comparan como
// texto «HH:MM»: no hay zona que convertir.
//
// Puro y sin `server-only`: lo usan los componentes de cliente.
// ---------------------------------------------------------------

import { DIAS, type DiaSemana } from "@/lib/clases";
import type { HuecoLibre } from "@/lib/autoservicio/tipos";

export const FRANJAS = ["manana", "mediodia", "tarde", "noche"] as const;
export type Franja = (typeof FRANJAS)[number];

/**
 * La franja de una hora de inicio. Los cortes son los de la academia:
 * hasta las 12 es mañana, de 12 a 15 mediodía, de 15 a 20 tarde y
 * desde las 20 noche. Lo de antes de las 6 cuenta como noche.
 */
export function franjaDe(hora: string): Franja {
  if (hora >= "06:00" && hora < "12:00") return "manana";
  if (hora >= "12:00" && hora < "15:00") return "mediodia";
  if (hora >= "15:00" && hora < "20:00") return "tarde";
  return "noche";
}

/** «18:00» y una hora más: «19:00». Pasada la medianoche vuelve a empezar. */
export function horaFin(hora: string, duracion: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = (h * 60 + m + duracion * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Lunes primero, domingo al final: como se lee una semana en España. */
function posicionEnSemana(dia: DiaSemana): number {
  const i = DIAS.indexOf(dia);
  return i === 0 ? 7 : i;
}

export type GrupoDeHuecos<H extends HuecoLibre = HuecoLibre> = {
  /** La fecha (modo puntual) o el día (modo fijo): la clave del grupo. */
  clave: string;
  dia: DiaSemana;
  fecha: string | null;
  franjas: { franja: Franja; huecos: H[] }[];
};

/**
 * Los huecos por día y franja. Los semanales (sin fecha) van de lunes a
 * domingo; los de una fecha, por fecha. Dentro de cada franja, por hora.
 * Solo salen los días y las franjas que tienen algo: una franja vacía es
 * ruido para quien busca, y un día sin huecos no se puede elegir.
 *
 * Un hueco repetido tal cual sale una vez. Dos a la misma hora con
 * algo distinto —otro profesor, otra duración— salen los dos.
 */
export function agruparHuecos<H extends HuecoLibre>(huecos: H[]): GrupoDeHuecos<H>[] {
  const grupos = new Map<string, GrupoDeHuecos<H>>();
  const vistos = new Set<string>();

  for (const h of huecos) {
    const clave = h.fecha ?? h.dia;
    const id = JSON.stringify(h);
    if (vistos.has(id)) continue;
    vistos.add(id);

    let grupo = grupos.get(clave);
    if (!grupo) {
      grupo = { clave, dia: h.dia, fecha: h.fecha, franjas: [] };
      grupos.set(clave, grupo);
    }
    const franja = franjaDe(h.hora);
    let enFranja = grupo.franjas.find((f) => f.franja === franja);
    if (!enFranja) {
      enFranja = { franja, huecos: [] };
      grupo.franjas.push(enFranja);
    }
    enFranja.huecos.push(h);
  }

  for (const g of Array.from(grupos.values())) {
    g.franjas.sort((a, b) => FRANJAS.indexOf(a.franja) - FRANJAS.indexOf(b.franja));
    for (const f of g.franjas) f.huecos.sort((a, b) => a.hora.localeCompare(b.hora));
  }

  return Array.from(grupos.values()).sort((a, b) =>
    a.fecha !== null && b.fecha !== null
      ? a.fecha.localeCompare(b.fecha)
      : posicionEnSemana(a.dia) - posicionEnSemana(b.dia)
  );
}

/** Solo los huecos de unas franjas y unos días: el buscador de «Cambiar de profesor». */
export function filtrarHuecos<H extends HuecoLibre>(huecos: H[], dia: DiaSemana | null, franja: Franja | null): H[] {
  return huecos.filter((h) => (dia === null || h.dia === dia) && (franja === null || franjaDe(h.hora) === franja));
}

/** Los días de lunes a sábado, para los filtros. El domingo no tiene clases. */
export const DIAS_LABORABLES: DiaSemana[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
