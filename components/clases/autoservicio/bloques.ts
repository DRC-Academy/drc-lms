// ---------------------------------------------------------------
// CÓMO SE DIBUJA EL CALENDARIO DE LOS HUECOS
//
// Solo presentación: qué casillas se juntan en un bloque, dónde va la
// línea de ahora y a qué día salta «Siguiente hueco libre». Lo que es
// libre u ocupado, y lo que se puede pinchar, sigue saliendo de
// `lib/autoservicio/calendario.ts`, sin tocarlo.
// ---------------------------------------------------------------

import type { Calendario, Casilla } from "@/lib/autoservicio/calendario";

/** Lo que se dibuja como bloque. Fuera de horario, no disponible, pasada y vacía son solo fondo. */
export type EstadoDibujado = "libre" | "ocupado" | "tuClase";

export type Bloque<H> = {
  estado: EstadoDibujado;
  /** La fila donde empieza y cuántas ocupa. */
  fila: number;
  filas: number;
  /** «10:00» y «13:00»: del inicio de la primera fila al final de la última. */
  desde: string;
  hasta: string;
  casillas: Casilla<H>[];
};

const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const textoHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const dibujado = (e: Casilla<unknown>["estado"]): e is EstadoDibujado => e === "libre" || e === "ocupado" || e === "tuClase";

/**
 * Las horas seguidas con el mismo estado, en un solo bloque. «Seguidas»
 * de verdad: en la semana tipo las filas saltan (11:00 y luego 13:00) y
 * esas no se juntan aunque vayan una debajo de otra.
 */
export function bloquesDe<H>(casillas: Casilla<H>[]): Bloque<H>[] {
  const bloques: Bloque<H>[] = [];
  casillas.forEach((c, i) => {
    if (!dibujado(c.estado)) return;
    const ultimo = bloques[bloques.length - 1];
    const anterior = casillas[i - 1];
    if (ultimo && ultimo.estado === c.estado && ultimo.fila + ultimo.filas === i && minutos(anterior.hora) + 60 === minutos(c.hora)) {
      ultimo.filas += 1;
      ultimo.hasta = textoHora(minutos(c.hora) + 60);
      ultimo.casillas.push(c);
      return;
    }
    bloques.push({ estado: c.estado, fila: i, filas: 1, desde: c.hora, hasta: textoHora(minutos(c.hora) + 60), casillas: [c] });
  });
  return bloques;
}

/**
 * Dónde cae `hora` en las filas, en filas (2,5 = a mitad de la tercera).
 * Null si cae antes de la primera, después de la última o en un salto.
 */
export function filaDeHora(horas: string[], hora: string): number | null {
  const m = minutos(hora);
  for (let i = 0; i < horas.length; i++) {
    const desde = minutos(horas[i]);
    const hasta = Math.min(desde + 60, i + 1 < horas.length ? minutos(horas[i + 1]) : Infinity);
    if (m >= desde && m < hasta) return i + (m - desde) / (hasta - desde);
  }
  return null;
}

/**
 * «Siguiente hueco libre»: el primer día con huecos después de
 * `despuesDe` (una clave de día), en esa semana o en las siguientes.
 * Null si no queda ninguno por delante.
 */
export function siguienteConHuecos<H>(cal: Calendario<H>, despuesDe: string | null): { semana: number; dia: string } | null {
  let pasado = despuesDe === null;
  for (let s = 0; s < cal.semanas.length; s++) {
    for (const d of cal.semanas[s].dias) {
      if (pasado && d.libres > 0 && !d.pasado) return { semana: s, dia: d.clave };
      if (d.clave === despuesDe) pasado = true;
    }
  }
  return null;
}
