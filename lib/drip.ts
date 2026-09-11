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

import type { TextosBanners } from "@/lib/textos/banners";
import { diaLocal, diasNaturales, sumarDias } from "@/lib/fechas";

export type Apertura =
  | { abierto: true }
  /**
   * Cuántos días naturales faltan —siempre 1 o más— y QUÉ DÍA abre, como
   * "2026-09-26". La fecha sale de los datos y no de `ahora`: es el día
   * de inicio más los días que pide el módulo, así que el servidor y el
   * navegador la escriben igual aunque los separe una medianoche.
   */
  | { abierto: false; diasRestantes: number; abreEl: string };

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

  return {
    abierto: false,
    diasRestantes: visibleAfter - transcurridos,
    abreEl: sumarDias(diaLocal(fechaInicio), visibleAfter),
  };
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

/**
 * «Se abre mañana» · «Se abre en 5 días» · «Se abre el 26 de sept.».
 *
 * SE ABRE, NO «DISPONIBLE» NI «BLOQUEADO». Abrirse es algo que le pasa al
 * módulo en una fecha, sin que el alumno tenga que hacer nada; «disponible»
 * describe un estado que a alguien le falta, y «bloqueado» una puerta.
 *
 * Hasta una semana se cuenta en días, que es como se piensa lo cercano.
 * De ahí en adelante, la fecha: un día en el calendario se siente como
 * algo que llega; un contador de doce días, como una espera. Sin la
 * fecha —el dato viene de datos viejos o de un módulo sin inicio— se
 * sigue contando en días.
 */
export function textoDeEspera(
  diasRestantes: number,
  abreEl: string | null,
  t: TextosBanners
): string {
  if (diasRestantes <= 1) return t.seAbreManana;
  if (diasRestantes <= 7 || !abreEl) return t.seAbreEnDias(diasRestantes);
  const [, mes, dia] = abreEl.split("-").map(Number);
  return t.seAbreElDia(dia, mes - 1);
}
