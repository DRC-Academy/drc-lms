// ---------------------------------------------------------------
// LA RACHA
//
// Cuántos días seguidos ha tocado el alumno su práctica, contando hacia
// atrás desde hoy.
//
// LO QUE HOY PUEDE VER, Y ES MENOS DE LO QUE PARECE. Las fechas que le
// llegan son las de `progreso_bloques.completado_en` y
// `avance_bloques.actualizado_en`, y las dos son UNA POR BLOQUE: la del
// último movimiento. Si el alumno tocó el mismo bloque cinco días
// seguidos, aquí consta un solo día.
//
// Así que esto NO es todavía la racha de verdad: es el suelo de la
// racha, y por eso `racha()` no devuelve nada por debajo de dos días —
// un "1 día seguido" no dice nada y sería la mitad de las veces falso.
//
// PARA QUE SEA EXACTA hace falta un registro de actividad por día, que
// hoy no existe: una tabla con una fila por alumno y día, escrita desde
// `/api/progreso` y `/api/progreso-leccion`. Mientras no esté, la cifra
// se queda corta pero nunca se inventa una que no haya pasado.
//
// Módulo puro: quien llama le pasa las fechas ya leídas.
// ---------------------------------------------------------------

import { diaLocal } from "@/lib/fechas";

const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Días seguidos con actividad, o null si no llega a dos.
 *
 * La cuenta admite que hoy todavía no se haya practicado: una racha que
 * se rompe a las 00:00 castiga por no haber entrado de madrugada. Se
 * arranca desde hoy o desde ayer, lo que haya.
 */
export function racha(fechas: string[], ahora: Date = new Date()): number | null {
  const dias = new Set<string>();
  for (const fecha of fechas) {
    const cuando = new Date(fecha);
    if (!Number.isNaN(cuando.getTime())) dias.add(diaLocal(cuando));
  }
  if (dias.size < 2) return null;

  const hoy = diaLocal(ahora);
  const ayer = diaLocal(new Date(ahora.getTime() - UN_DIA));

  let cursor: Date;
  if (dias.has(hoy)) cursor = ahora;
  else if (dias.has(ayer)) cursor = new Date(ahora.getTime() - UN_DIA);
  else return null;

  let total = 0;
  while (dias.has(diaLocal(cursor))) {
    total += 1;
    cursor = new Date(cursor.getTime() - UN_DIA);
  }

  return total >= 2 ? total : null;
}
