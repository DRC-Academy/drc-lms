// ---------------------------------------------------------------
// EL RANGO DEL PANEL
//
// Qué días mira el panel, cuál es el periodo con el que se compara y si
// la serie va por días o por semanas. Módulo puro y compartido: lo usan
// la capa de datos (`lib/panel-metricas.ts`) y el selector de fechas.
//
// LAS REGLAS:
//   · Días naturales de Madrid, "AAAA-MM-DD", los dos extremos incluidos.
//   · Semanas de lunes a domingo.
//   · Por defecto, la última semana completa: la que acabó el domingo
//     pasado. Una semana a medias no se compara con una entera.
//   · Hasta 12 meses (366 días) y nunca más allá de hoy. Lo que no
//     cumple las reglas —también una fecha mal escrita en la URL— da el
//     rango por defecto, no un error.
//   · El periodo anterior dura lo mismo y acaba el día antes.
//   · Hasta 31 días la serie va por días; con más, por semanas.
// ---------------------------------------------------------------

import { sumarDias } from "@/lib/fechas";

/** Días "AAAA-MM-DD" de Madrid, los dos incluidos. */
export type Rango = { desde: string; hasta: string };

export type Granularidad = "dia" | "semana";

/** 12 meses, con el bisiesto dentro. */
export const DIAS_MAXIMOS = 366;

/** Hasta aquí la serie va por días. */
export const DIAS_SERIE_DIARIA = 31;

const FORMA_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Una fecha "AAAA-MM-DD" que existe: el 31 de febrero no lo es. */
export function esDia(valor: unknown): valor is string {
  if (typeof valor !== "string" || !FORMA_DIA.test(valor)) return false;
  const ms = Date.parse(`${valor}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === valor;
}

function enDias(dia: string): number {
  return Math.round(Date.parse(`${dia}T00:00:00Z`) / 86_400_000);
}

/** Cuántos días tiene el rango, los dos extremos incluidos. */
export function diasDelRango(rango: Rango): number {
  return enDias(rango.hasta) - enDias(rango.desde) + 1;
}

/** El lunes de la semana de un día. */
export function lunesDe(dia: string): string {
  // getUTCDay: 0 = domingo. Desde el lunes: (d + 6) % 7.
  const desdeLunes = (new Date(`${dia}T00:00:00Z`).getUTCDay() + 6) % 7;
  return sumarDias(dia, -desdeLunes);
}

export function granularidadDe(rango: Rango): Granularidad {
  return diasDelRango(rango) <= DIAS_SERIE_DIARIA ? "dia" : "semana";
}

/** La última semana completa: de lunes a domingo, la que acabó antes de hoy. */
export function rangoPorDefecto(hoy: string): Rango {
  const lunes = sumarDias(lunesDe(hoy), -7);
  return { desde: lunes, hasta: sumarDias(lunes, 6) };
}

/** El periodo de la misma duración que acaba el día antes. */
export function rangoAnterior(rango: Rango): Rango {
  const dias = diasDelRango(rango);
  return { desde: sumarDias(rango.desde, -dias), hasta: sumarDias(rango.desde, -1) };
}

/** ¿Cumple las reglas? Ver la cabecera. */
export function esRangoValido(rango: Rango, hoy: string): boolean {
  return (
    esDia(rango.desde) &&
    esDia(rango.hasta) &&
    rango.desde <= rango.hasta &&
    rango.hasta <= hoy &&
    diasDelRango(rango) <= DIAS_MAXIMOS
  );
}

/**
 * El rango de la URL (`?desde=&hasta=`), o el de por defecto si falta o
 * no cumple las reglas. `porDefecto` dice cuál de los dos fue.
 */
export function leerRango(
  desde: string | string[] | undefined,
  hasta: string | string[] | undefined,
  hoy: string
): { rango: Rango; porDefecto: boolean } {
  const pedido = { desde: typeof desde === "string" ? desde : "", hasta: typeof hasta === "string" ? hasta : "" };
  return esRangoValido(pedido, hoy)
    ? { rango: pedido, porDefecto: false }
    : { rango: rangoPorDefecto(hoy), porDefecto: true };
}
