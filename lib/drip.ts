// ---------------------------------------------------------------
// LA APERTURA PROGRESIVA DEL CURSO
//
// El curso está pensado para durar seis meses, y el desbloqueo semanal
// es lo que lo sostiene: cada módulo se abre a los N días de la
// matrícula del alumno. Venía de LearnDash y se perdió en la primera
// importación; esto lo devuelve tal cual estaba.
//
// TRES REGLAS QUE NO SE TOCAN:
//
//   1. LO COMPLETADO NUNCA SE CIERRA. No es una excepción al drip, es
//      cómo funcionaba LearnDash: una lección desbloqueada seguía
//      abierta después. Con 4.073 lecciones ya migradas, un alumno que
//      viera bloqueado algo que su propio progreso dice que hizo
//      pensaría —con razón— que la plataforma se ha comido su trabajo.
//   2. SE FALLA ABIERTO. Sin fecha de inicio, sin dato de drip o con una
//      fecha ilegible, la lección se muestra. Dejar a alguien fuera por
//      un campo vacío es peor que abrir de más.
//   3. LO BLOQUEADO SE VE. El alumno tiene que saber que existe y cuándo
//      lo tendrá: es la expectativa lo que retiene. Un contenido
//      invisible no retiene, solo desconcierta.
//
// Módulo puro: quien llama le pasa las fechas ya leídas.
// ---------------------------------------------------------------

import { diasNaturales } from "@/lib/fechas";

export type Apertura =
  | { abierto: true }
  /** Cuántos días naturales faltan. Siempre 1 o más. */
  | { abierto: false; diasRestantes: number };

const ABIERTO: Apertura = { abierto: true };

/**
 * ¿Está abierto este módulo para este alumno?
 *
 * @param visibleAfter  Días desde la matrícula que pide el módulo. 0 = desde el principio.
 * @param fechaInicio   Cuándo empezó el alumno, o null si no lo sabemos.
 */
export function calcularApertura(
  visibleAfter: number,
  fechaInicio: Date | null,
  ahora: Date
): Apertura {
  // Regla 2: sin dato, abierto.
  if (visibleAfter <= 0) return ABIERTO;
  if (!fechaInicio) return ABIERTO;

  // Una fecha de inicio en el futuro cuenta como día 0, no como días
  // negativos: hay alumnos dados de alta con fecha por delante, y sin
  // este tope su primer módulo saldría con más días de espera de los
  // que el drip pide.
  const transcurridos = Math.max(0, diasNaturales(fechaInicio, ahora));
  if (transcurridos >= visibleAfter) return ABIERTO;

  return { abierto: false, diasRestantes: visibleAfter - transcurridos };
}

/**
 * Lo mismo, pero para una lección concreta, que es donde entra la regla 1.
 *
 * El orden importa: se mira lo completado ANTES que el calendario. Da
 * igual en qué día del drip caiga; si consta como hecha, está abierta.
 */
export function aperturaDeLeccion(
  visibleAfter: number,
  fechaInicio: Date | null,
  completada: boolean,
  ahora: Date
): Apertura {
  if (completada) return ABIERTO;
  return calcularApertura(visibleAfter, fechaInicio, ahora);
}

/** "Mañana", "En 3 días". Lo que se le enseña al alumno. */
export function textoDeEspera(diasRestantes: number): string {
  return diasRestantes <= 1 ? "Disponible mañana" : `Disponible en ${diasRestantes} días`;
}
