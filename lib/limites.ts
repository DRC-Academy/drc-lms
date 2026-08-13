// ---------------------------------------------------------------
// CUÁNDO SE PUEDE GENERAR OTRO BLOQUE
//
// La regla no es un cupo, es una pregunta: ¿ha cambiado la materia
// prima desde el último bloque de este modo? Si no ha cambiado, el
// modelo escribiría una variación sobre exactamente el mismo material,
// y eso no es práctica nueva: es el mismo bloque con otras palabras.
//
// De ahí salen tres reglas distintas, una por modo:
//
//   · repaso   — la materia prima es la última clase analizada. Se
//                desbloquea cuando hay una analizada DESPUÉS del último
//                bloque de repaso. Es exacto: mientras no haya otra
//                clase, no hay nada nuevo de donde tirar.
//   · contexto — la materia prima es su perfil, que no cambia a diario
//                pero tampoco es fijo. Cada tres días.
//   · examen   — la materia prima es el formato del examen, que no
//                cambia nunca. Aquí el criterio no aplica, así que se
//                acota por otro lado: uno al día.
//
// Módulo puro: sin `server-only`, porque lo usan la ruta (para decidir)
// y `lib/modos.ts` (para redactar lo que ve el alumno). Ni toca la base
// ni el navegador; quien llama le pasa las fechas ya leídas.
// ---------------------------------------------------------------

import type { ModoGeneracion } from "@/lib/modos";
import { comoFecha, diasNaturales } from "@/lib/fechas";

// Se reexportan porque media aplicación los importaba desde aquí, y
// porque quien razona sobre límites razona sobre días naturales.
export { comoFecha, diaLocal, diasNaturales } from "@/lib/fechas";

/** Cada cuántos días naturales se renueva el bloque de contexto. */
export const DIAS_CONTEXTO = 3;

/**
 * Por qué no se puede generar todavía, o que sí se puede.
 *
 * `motivo` no es un código de error: es lo que decide qué se le cuenta
 * al alumno, y cada uno se cuenta distinto.
 */
export type Disponibilidad =
  | { disponible: true }
  /** Contexto: faltan días y se saben cuántos. */
  | { disponible: false; motivo: "dias"; diasRestantes: number }
  /** Repaso: depende de su próxima clase, no de un plazo. */
  | { disponible: false; motivo: "clase" }
  /** Examen: ya lo hizo hoy. */
  | { disponible: false; motivo: "hoy" };

const DISPONIBLE: Disponibilidad = { disponible: true };

/**
 * ¿Puede este alumno generar ahora un bloque de este modo?
 *
 * @param ultimaGeneracion  Cuándo generó el último bloque DE ESTE MODO, o null si ninguno.
 * @param claseAnalizadaEn  Cuándo se analizó su última clase, o null si no tiene.
 */
export function calcularDisponibilidad(
  modo: ModoGeneracion,
  ultimaGeneracion: Date | null,
  claseAnalizadaEn: Date | null,
  ahora: Date
): Disponibilidad {
  // LA PRIMERA VEZ SIEMPRE SE PUEDE, en los tres modos.
  //
  // Importa sobre todo en repaso: un alumno con una clase de hace un mes
  // y ninguna nueva nunca tendría material "posterior a su último
  // bloque" —porque no tiene ninguno— y con la regla estricta se
  // quedaría fuera para siempre. Su primera clase analizada es material
  // nuevo para él aunque sea vieja para el calendario.
  if (!ultimaGeneracion) return DISPONIBLE;

  if (modo === "repaso") {
    // Sin clase analizada no habría llegado hasta aquí: la tarjeta de
    // repaso no se ofrece. Se comprueba igual por si acaso.
    if (!claseAnalizadaEn) return { disponible: false, motivo: "clase" };

    return claseAnalizadaEn.getTime() > ultimaGeneracion.getTime()
      ? DISPONIBLE
      : { disponible: false, motivo: "clase" };
  }

  if (modo === "contexto") {
    const pasados = diasNaturales(ultimaGeneracion, ahora);
    return pasados >= DIAS_CONTEXTO
      ? DISPONIBLE
      : { disponible: false, motivo: "dias", diasRestantes: DIAS_CONTEXTO - pasados };
  }

  // examen
  return diasNaturales(ultimaGeneracion, ahora) >= 1
    ? DISPONIBLE
    : { disponible: false, motivo: "hoy" };
}
