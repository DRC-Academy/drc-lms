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

// ---------------------------------------------------------------
// LOS MESES DEL GRÁFICO Y LOS TRAMOS DE LAS COMPARACIONES FIJAS
// ---------------------------------------------------------------

const MES_CORTO = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "short" });
const DIA_SEMANA = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "short" });

/** El rótulo de un mes en el eje: "oct". */
export function etiquetaMes(periodo: string): string {
  return MES_CORTO.format(comoFecha(periodo)).replace(".", "").replace("sept", "sep");
}

/** "2026-10-22" → "jue". */
export function diaDeLaSemana(dia: string): string {
  return DIA_SEMANA.format(comoFecha(dia)).replace(".", "");
}

/**
 * El tramo en pequeño, como se lee junto a la comparación: «lun–jue» o
 * «1–22». El lunes, o el día 1, solo «lun» o «día 1».
 */
export function tramoCorto(hasta: string, de: "semana" | "mes"): string {
  const dia = hasta.slice(0, 10);
  if (de === "semana") return diaDeLaSemana(dia) === "lun" ? "lun" : `lun–${diaDeLaSemana(dia)}`;
  const n = Number(dia.slice(8));
  return n === 1 ? "día 1" : `1–${n}`;
}

/**
 * Un tramo en largo, para el tooltip: «lun 19 oct, 00:00 – jue 22 oct,
 * 23:02». El que acaba a las 00:00 se dice hasta el final del día antes.
 */
export function tramoLargo(t: { desde: string; hasta: string }): string {
  const dia = (d: string) => `${diaDeLaSemana(d)} ${diaCorto(d)}`;
  const desde = t.desde.slice(0, 10);
  if (t.hasta.slice(11) === "00:00") {
    const fin = new Date(Date.parse(`${t.hasta.slice(0, 10)}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    return `${dia(desde)} – ${dia(fin)}, el día entero`;
  }
  return `${dia(desde)}, ${t.desde.slice(11)} – ${dia(t.hasta.slice(0, 10))}, ${t.hasta.slice(11)}`;
}

/** Una variación ya escrita: el texto y hacia dónde va (para el color). */
export type Variacion = { texto: string; signo: -1 | 0 | 1 };

const conSigno = (n: number) => (n > 0 ? `+${numero(n)}` : n < 0 ? `−${numero(-n)}` : "0");

/** Porcentajes: diferencia en puntos y el valor anterior. «+3 pts · vs. 16 %». */
export function variacionEnPuntos(actual: number, anterior: number): Variacion {
  const d = actual - anterior;
  return { texto: `${conSigno(d)} ${Math.abs(d) === 1 ? "pt" : "pts"} · vs. ${anterior} %`, signo: Math.sign(d) as -1 | 0 | 1 };
}

/** Números: diferencia absoluta y relativa. «+6 · +43 %»; contra un cero, «+6 · vs. 0». */
export function variacionEnNumero(actual: number, anterior: number): Variacion {
  const d = actual - anterior;
  const relativo = anterior > 0 ? `${conSigno(Math.round((d / anterior) * 100))} %` : `vs. ${numero(anterior)}`;
  return { texto: `${conSigno(d)} · ${relativo}`, signo: Math.sign(d) as -1 | 0 | 1 };
}
