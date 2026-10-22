// ---------------------------------------------------------------
// LA SEMANA Y EL MES EN CURSO, CONTRA EL MISMO TRAMO DEL ANTERIOR
//
// Las dos comparaciones fijas del panel y los meses del gráfico. No
// dependen del selector de fechas: siempre son la semana y el mes de hoy.
// Módulo puro, como `lib/panel-rango.ts`.
//
// LAS REGLAS:
//   · Todo en hora de pared de Madrid, "AAAA-MM-DDTHH:MM". Un tramo va de
//     `desde` (incluido) a `hasta` (excluido); la base pasa esas horas a
//     instante con la regla de cada una (`panel_ia`), y el cruce del botón
//     compara las claves "fecha T hora" de los partes, que ya son hora de
//     pared. Así «la misma hora» es la misma en el reloj de Madrid, también
//     la semana del cambio de hora.
//   · El tramo en curso llega hasta ahora; el anterior, hasta la misma hora
//     del mismo día de la semana (o del mes) anterior. Hoy no sale siempre
//     por debajo por estar a medias.
//   · Semana: de lunes a hoy contra de lunes al mismo día de la anterior.
//   · Mes: del 1 a hoy contra del 1 al mismo día del anterior. Si el
//     anterior no tiene ese día (31 de marzo contra febrero), se compara
//     con el mes anterior entero y `recortado` lo dice.
//   · El gráfico por meses: los 6 meses naturales que acaban en el mes del
//     final del rango; el de hoy, hasta hoy y marcado «en curso».
// ---------------------------------------------------------------

import { sumarDias } from "@/lib/fechas";
import { lunesDe, type Rango } from "@/lib/panel-rango";

/** "AAAA-MM-DDTHH:MM", hora de pared de Madrid. */
export type Pared = string;

/** [desde, hasta), en hora de pared de Madrid. */
export type Tramo = { desde: Pared; hasta: Pared };

export type Comparacion = {
  actual: Tramo;
  anterior: Tramo;
  /** El mes anterior es más corto que el día de hoy: se compara con él entero. */
  recortado: boolean;
};

export type TramosFijos = { ahora: Pared; semana: Comparacion; mes: Comparacion };

/** Meses del gráfico. */
export const MESES_GRAFICO = 6;

const PARED = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** La hora de pared de Madrid de un instante, al minuto. */
export function paredDe(momento: Date): Pared {
  return PARED.format(momento).replace(" ", "T");
}

/** "2026-10-22" → "2026-10-22T00:00". */
export function inicioDelDia(dia: string): Pared {
  return `${dia}T00:00`;
}

/** Días de un mes "AAAA-MM". */
function diasDelMes(mes: string): number {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** "2026-10" + n meses. */
export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function tramosFijos(ahora: Pared): TramosFijos {
  const hoy = ahora.slice(0, 10);
  const hora = ahora.slice(11);
  const lunes = lunesDe(hoy);

  const mes = hoy.slice(0, 7);
  const mesAnterior = sumarMeses(mes, -1);
  const dia = Number(hoy.slice(8));
  const recortado = dia > diasDelMes(mesAnterior);

  return {
    ahora,
    semana: {
      actual: { desde: inicioDelDia(lunes), hasta: ahora },
      anterior: { desde: inicioDelDia(sumarDias(lunes, -7)), hasta: `${sumarDias(hoy, -7)}T${hora}` },
      recortado: false,
    },
    mes: {
      actual: { desde: inicioDelDia(`${mes}-01`), hasta: ahora },
      anterior: {
        desde: inicioDelDia(`${mesAnterior}-01`),
        hasta: recortado ? inicioDelDia(`${mes}-01`) : `${mesAnterior}-${hoy.slice(8)}T${hora}`,
      },
      recortado,
    },
  };
}

/** ¿Tiene algún minuto? A las 00:00 del lunes la semana en curso aún no. */
export function tramoVacio(t: Tramo): boolean {
  return t.desde >= t.hasta;
}

/**
 * Los días que toca un tramo, los dos incluidos: para la disponibilidad,
 * que va por días. Un tramo que acaba a las 00:00 no toca ese día.
 */
export function diasDelTramo(t: Tramo): Rango {
  const ultimo = t.hasta.slice(11) === "00:00" ? sumarDias(t.hasta.slice(0, 10), -1) : t.hasta.slice(0, 10);
  return { desde: t.desde.slice(0, 10), hasta: ultimo < t.desde.slice(0, 10) ? t.desde.slice(0, 10) : ultimo };
}

/** Un rango de días como tramo: de las 00:00 del primero a las 00:00 del día siguiente al último. */
export function tramoDeDias(r: Rango): Tramo {
  return { desde: inicioDelDia(r.desde), hasta: inicioDelDia(sumarDias(r.hasta, 1)) };
}

// ---------------------------------------------------------------
// LOS MESES DEL GRÁFICO
// ---------------------------------------------------------------

export type Mes = {
  /** El día 1. */
  periodo: string;
  /** Los días que cuentan: el mes entero, o hasta hoy si es el de hoy. */
  desde: string;
  hasta: string;
  enCurso: boolean;
};

/** Los 6 meses que acaban en el mes de `hasta`. Ninguno pasa de hoy. */
export function mesesDelGrafico(hasta: string, hoy: string): Mes[] {
  const ultimo = hasta.slice(0, 7);
  const meses: Mes[] = [];
  for (let i = MESES_GRAFICO - 1; i >= 0; i--) {
    const mes = sumarMeses(ultimo, -i);
    const fin = `${mes}-${String(diasDelMes(mes)).padStart(2, "0")}`;
    const enCurso = mes === hoy.slice(0, 7);
    meses.push({ periodo: `${mes}-01`, desde: `${mes}-01`, hasta: enCurso ? hoy : fin, enCurso });
  }
  return meses;
}
