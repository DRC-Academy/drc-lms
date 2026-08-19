// ---------------------------------------------------------------
// CUÁNDO SE PUEDE GENERAR OTRO BLOQUE
//
// UNA SOLA REGLA: se desbloquea cuando entra un transcript nuevo.
//
// No es un cupo, es una pregunta: ¿ha cambiado la materia prima desde el
// último bloque? Si no ha cambiado, el modelo escribiría una variación
// sobre exactamente el mismo material, y eso no es práctica nueva: es el
// mismo bloque con otras palabras.
//
// Antes había tres reglas, una por modo: repaso miraba la última clase,
// contexto se renovaba cada tres días y examen permitía uno al día. Las
// dos últimas se han ido con los modos. Y no se han ido solo por
// simetría: eran las dos que no tenían nada detrás. El perfil de un
// alumno no cambia el jueves porque hayan pasado tres días desde el
// lunes, y el formato del First no cambia nunca, así que "uno al día"
// era un cupo disfrazado de regla. La clase sí cambia de verdad, y es la
// única de las cuatro fuentes que trae material nuevo.
//
// Consecuencia asumida: un alumno sin ninguna clase analizada genera su
// primer bloque —con su perfil y su examen— y después espera a su
// primera clase. Es lo correcto: con las mismas dos frases de su
// formulario, el segundo bloque sería el primero otra vez.
//
// Módulo puro: sin `server-only`, porque lo usan la ruta (para decidir)
// y `lib/modos.ts` (para redactar lo que ve el alumno). Ni toca la base
// ni el navegador; quien llama le pasa las fechas ya leídas.
// ---------------------------------------------------------------

import { comoFecha } from "@/lib/fechas";

// Se reexportan porque media aplicación los importaba desde aquí, y
// porque quien razona sobre límites razona sobre días naturales.
export { comoFecha, diaLocal, diasNaturales } from "@/lib/fechas";

/**
 * Si se puede generar, o de qué depende que se pueda.
 *
 * `motivo` sobrevive con un único valor y no se ha quitado a propósito:
 * es lo que la ruta manda en el 409 para que el cliente sepa que ese
 * error no es un fallo suyo sino un "todavía no toca", y esa distinción
 * decide si se ofrece o no el botón de reintentar.
 */
export type Disponibilidad =
  | { disponible: true }
  /** Depende de su próxima clase, no de un plazo. */
  | { disponible: false; motivo: "clase" };

const DISPONIBLE: Disponibilidad = { disponible: true };
const ESPERANDO_CLASE: Disponibilidad = { disponible: false, motivo: "clase" };

/**
 * ¿Puede este alumno generar ahora un bloque?
 *
 * @param ultimaGeneracion  Cuándo generó su último bloque, o null si ninguno.
 * @param claseAnalizadaEn  Cuándo se analizó su última clase, o null si no tiene.
 */
export function calcularDisponibilidad(
  ultimaGeneracion: Date | null,
  claseAnalizadaEn: Date | null,
  _ahora: Date = new Date()
): Disponibilidad {
  // LA PRIMERA VEZ SIEMPRE SE PUEDE.
  //
  // Importa más de lo que parece: un alumno con una clase de hace un mes
  // y ninguna nueva nunca tendría material "posterior a su último
  // bloque" —porque no tiene ninguno— y con la regla estricta se
  // quedaría fuera para siempre. Su primera clase analizada es material
  // nuevo para él aunque sea vieja para el calendario.
  if (!ultimaGeneracion) return DISPONIBLE;

  // Sin clase analizada no hay nada que pueda haber cambiado desde su
  // bloque anterior: su perfil y su examen son los mismos de entonces.
  if (!claseAnalizadaEn) return ESPERANDO_CLASE;

  return claseAnalizadaEn.getTime() > ultimaGeneracion.getTime() ? DISPONIBLE : ESPERANDO_CLASE;
}
