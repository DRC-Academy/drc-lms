// ---------------------------------------------------------------
// LAS FECHAS DE LAS RECUPERACIONES
//
// Gestión las manda como texto y en hora de España —"2026-10-12",
// "17:00"— y así se quedan: aquí no se convierte nada de zona. El día de
// la semana se saca de la fecha como día del calendario (en UTC, que no
// tiene cambios de hora), no como instante.
//
// Módulo puro: lo usan el diccionario, el servidor y los componentes de
// cliente.
// ---------------------------------------------------------------

import { sumarDias } from "@/lib/fechas";

/** Domingo = 0, como `getUTCDay`. */
export type PartesFecha = { diaSemana: number; numero: number; mes: number };

export function partesFecha(fecha: string): PartesFecha {
  const d = new Date(`${fecha}T00:00:00Z`);
  return { diaSemana: d.getUTCDay(), numero: d.getUTCDate(), mes: d.getUTCMonth() };
}

/** Las horas que se ofrecen al proponer: de 09:00 a 21:00, en punto. */
export const HORAS_PROPUESTA: string[] = Array.from({ length: 13 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);

/** Lo máximo que acepta Gestión. */
export const MAX_PROPUESTAS = 3;
export const MAX_NOTA = 500;

/**
 * Los días que se pueden proponer: de mañana a 7 días, de lunes a
 * sábado. `hoy` es el día de España ("2026-10-02"), y lo calcula el
 * servidor para que el navegador no diga otra cosa cerca de medianoche.
 */
export function diasParaProponer(hoy: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i + 1)).filter((dia) => partesFecha(dia).diaSemana !== 0);
}
