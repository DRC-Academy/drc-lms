// ---------------------------------------------------------------
// DÍAS NATURALES, EN LA ZONA DE ESPAÑA
//
// Dos cosas del producto se miden en días —cuándo se renueva un bloque
// de práctica y cuándo se abre un módulo del curso— y las dos tienen que
// contar igual: por cambio de fecha en España, no por periodos de 24
// horas ni por UTC.
//
// Con UTC el corte cae a la 01:00 o las 02:00 hora local, así que un
// alumno que mira a las once y media de la noche estaría un día por
// detrás de lo que dice su calendario.
//
// Módulo puro y compartido: lo usan `lib/limites.ts` y `lib/drip.ts`.
// ---------------------------------------------------------------

const ZONA = "Europe/Madrid";

// `en-CA` da exactamente "AAAA-MM-DD", que es lo que se quiere comparar.
const FORMATO_DIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** El día natural español de un instante, como "2026-08-13". */
export function diaLocal(momento: Date): string {
  return FORMATO_DIA.format(momento);
}

/**
 * Días naturales entre dos instantes, contando cambios de fecha y no
 * periodos de 24 horas: de las 23:00 del lunes a las 09:00 del martes
 * hay un día, no cero.
 *
 * Puede ser negativo, que es justo lo que hace falta para una fecha de
 * inicio en el futuro.
 */
export function diasNaturales(desde: Date, hasta: Date): number {
  const enDias = (dia: string) => Math.round(Date.parse(`${dia}T00:00:00Z`) / 86_400_000);
  return enDias(diaLocal(hasta)) - enDias(diaLocal(desde));
}

/**
 * Una fecha de la base, que llega como texto y puede venir vacía o
 * torcida. Devuelve null antes que un `Invalid Date`, que compararía
 * como NaN y dejaría pasar cualquier cosa.
 */
export function comoFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const momento = Date.parse(valor);
  return Number.isFinite(momento) ? new Date(momento) : null;
}
