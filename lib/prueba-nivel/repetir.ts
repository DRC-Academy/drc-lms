// ---------------------------------------------------------------
// CADA CUÁNTO SE PUEDE REPETIR LA PRUEBA DE NIVEL
//
// Cada intento cuesta una corrección de la redacción con IA. Para que el
// gasto no dependa de cuántas veces se pulse «Repetir la prueba», un alumno
// puede empezar otra 24 horas después de TERMINAR la última. La primera no
// espera nada, y retomar la que está a medias tampoco (no es otro intento).
//
// La regla la aplica el servidor al crear la fila (`empezar`); la pantalla
// solo enseña desde cuándo. Puro: lo usan el servidor y las pantallas.
// ---------------------------------------------------------------

export const HORAS_ENTRE_INTENTOS = 24;

const ZONA = "Europe/Madrid";

/** Desde cuándo puede empezar otra (ISO), o null si ya puede. */
export function repetirDesde(terminadaEn: string | null | undefined, ahora: Date): string | null {
  const fin = terminadaEn ? Date.parse(terminadaEn) : NaN;
  if (!Number.isFinite(fin)) return null;
  const desde = fin + HORAS_ENTRE_INTENTOS * 3_600_000;
  return ahora.getTime() < desde ? new Date(desde).toISOString() : null;
}

const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });
const HORA = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "numeric", minute: "2-digit", hour12: false });

/**
 * Para decirlo: «hoy» o «mañana» y la hora, en hora de España. Como la espera
 * es de 24 horas, no hay otro caso; si lo hubiera (un reloj torcido), «mañana».
 */
export function cuandoRepetir(desde: string, ahora: Date): { dia: "hoy" | "manana"; hora: string } {
  const momento = new Date(desde);
  return {
    dia: DIA.format(momento) === DIA.format(ahora) ? "hoy" : "manana",
    hora: HORA.format(momento),
  };
}
