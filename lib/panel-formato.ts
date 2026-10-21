// ---------------------------------------------------------------
// CÓMO SE ESCRIBEN LAS CIFRAS Y LAS FECHAS DEL PANEL
//
// Módulo puro y compartido: lo usan la página (servidor) y los gráficos,
// el selector de fechas y la tabla (cliente). Fechas con Intl, nada más,
// y siempre sobre días "AAAA-MM-DD" ya en hora de Madrid: se formatean a
// mediodía UTC para que ninguna zona los mueva de día.
// ---------------------------------------------------------------

import type { Rango } from "@/lib/panel-rango";

/**
 * Los dos colores de serie, siempre en este orden: la primera serie es
 * verde y la segunda azul en todos los gráficos. Aquí y no en los
 * gráficos porque los usa también el servidor (leyendas y barras).
 */
export const COLOR_SERIE = ["#1E9E3A", "#2F6FB0"] as const;

/** Por debajo de esta base un porcentaje va en gris y con «muestra pequeña». */
export const MUESTRA_MINIMA = 10;

const NUMERO = new Intl.NumberFormat("es-ES");

/** 1234 → "1234"; 12345 → "12.345". */
export function numero(n: number): string {
  return NUMERO.format(n);
}

/** Porcentaje redondeado; 0 si la base es 0. */
export function porcentaje(parte: number, base: number): number {
  return base > 0 ? Math.round((parte / base) * 100) : 0;
}

const DIA_MES = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });
const MES_ANIO = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "long", year: "numeric" });

const comoFecha = (dia: string) => new Date(`${dia}T12:00:00Z`);

/** "2026-10-13" → "13 oct". Sin el punto de la abreviatura, y "sept" como "sep". */
export function diaCorto(dia: string): string {
  return DIA_MES.format(comoFecha(dia)).replace(".", "").replace("sept", "sep");
}

/** "2026-10-01" → "Octubre de 2026". */
export function mesLargo(dia: string): string {
  const texto = MES_ANIO.format(comoFecha(dia));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * El rango en corto:
 *   "12 – 18 oct 2026", "28 sep – 4 oct 2026", "28 dic 2025 – 3 ene 2026",
 *   "15 oct 2026" si es un solo día. Sin el año si `conAnio` es false.
 */
export function rangoLegible(rango: Rango, conAnio = true): string {
  const { desde, hasta } = rango;
  const anio = (dia: string) => (conAnio ? ` ${dia.slice(0, 4)}` : "");
  if (desde === hasta) return `${diaCorto(desde)}${anio(desde)}`;
  if (desde.slice(0, 4) !== hasta.slice(0, 4)) {
    return `${diaCorto(desde)} ${desde.slice(0, 4)} – ${diaCorto(hasta)} ${hasta.slice(0, 4)}`;
  }
  if (desde.slice(0, 7) === hasta.slice(0, 7)) {
    return `${Number(desde.slice(8))} – ${diaCorto(hasta)}${anio(hasta)}`;
  }
  return `${diaCorto(desde)} – ${diaCorto(hasta)}${anio(hasta)}`;
}

/** Contra qué se compara: "vs. 5 – 11 oct". Con año solo si cambia respecto al rango. */
export function contraQue(anterior: Rango, rango: Rango): string {
  return `vs. ${rangoLegible(anterior, anterior.desde.slice(0, 4) !== rango.hasta.slice(0, 4))}`;
}

/** El rótulo de una semana en el eje: su lunes, "12 oct". */
export function etiquetaPeriodo(periodo: string): string {
  return diaCorto(periodo);
}

/** El título de una semana en el tooltip y la tabla: "Semana del 12 oct". */
export function tituloPeriodo(periodo: string): string {
  return `Semana del ${diaCorto(periodo)}`;
}
