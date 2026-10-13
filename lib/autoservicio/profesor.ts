// ---------------------------------------------------------------
// «CAMBIAR DE PROFESOR»: LAS REGLAS QUE DECIDE EL LMS
//
// Contrato v3: el alumno NO elige profesor, elige horarios, y Gestión le
// asigna el profesor que mejor encaje. Se elige una clase detrás de
// otra: con cada horario elegido se piden los de la siguiente mandando
// los `elegidos`, y Gestión solo devuelve horarios que un MISMO profesor
// puede cubrir junto con los ya elegidos. Así que aquí queda poco:
//
//   · EN ORDEN. Los elegidos son siempre un principio de sus sesiones:
//     el primero para la primera, el segundo para la segunda… Cambiar
//     uno ya elegido deshace también los de detrás, porque se eligieron
//     contando con él.
//   · NO MANDAR NADA QUE NO CUADRE. Uno por sesión, de su misma duración
//     y sin chocar: Gestión lo rechazaría igualmente.
//
// Ni rastro de profesores: ni ids ni nombres hasta que el cambio está
// hecho.
//
// Puro y sin `server-only`: lo usan la pantalla y las pruebas.
// ---------------------------------------------------------------

import type { SesionOrigen } from "@/lib/autoservicio/tipos";

const enHoras = (hora: string): number => Number(hora.slice(0, 2));

/**
 * Si dos bloques del mismo día chocan, con la regla de Gestión: se pisan
 * O VAN SEGUIDOS. «15–17» y «16–18» chocan, y «15–16» y «16–17» también:
 * en el calendario serían una sola clase de dos horas y el alumno dejaría
 * de tener las clases que tiene.
 */
export function chocan(a: SesionOrigen, b: SesionOrigen): boolean {
  if (a.dia !== b.dia) return false;
  const inicioA = enHoras(a.hora);
  const inicioB = enHoras(b.hora);
  return inicioA <= inicioB + b.duracion && inicioB <= inicioA + a.duracion;
}

/**
 * Si los elegidos están bien encaminados: no más que sesiones, cada uno
 * de la duración de SU sesión y sin chocar entre ellos.
 */
export function elegidosValidos(sesiones: SesionOrigen[], elegidos: SesionOrigen[]): boolean {
  if (elegidos.length > sesiones.length) return false;
  return elegidos.every(
    (e, i) => e.duracion === sesiones[i].duracion && elegidos.every((otro, j) => j === i || !chocan(e, otro))
  );
}

/** Si ya tiene horario para todas sus clases y se puede confirmar. */
export function destinosListos(sesiones: SesionOrigen[], elegidos: SesionOrigen[]): boolean {
  return sesiones.length > 0 && elegidos.length === sesiones.length && elegidosValidos(sesiones, elegidos);
}

/** La sesión a la que le toca elegir horario, o null si ya están todas. */
export function siguienteSesion(sesiones: SesionOrigen[], elegidos: SesionOrigen[]): number | null {
  return elegidos.length < sesiones.length ? elegidos.length : null;
}

/** Elegir un horario para la siguiente sesión. */
export function elegir<H extends SesionOrigen>(elegidos: H[], horario: H): H[] {
  return [...elegidos, horario];
}

/** Cambiar el horario de la sesión `indice`: se deshacen ese y los de detrás. */
export function cambiarDesde<H extends SesionOrigen>(elegidos: H[], indice: number): H[] {
  return elegidos.slice(0, Math.max(0, indice));
}

/**
 * Los horarios que valen para una sesión: de su duración y sin chocar
 * con lo elegido. Gestión ya los manda así; esto es para no fiarse.
 */
export function horariosQueValen<H extends SesionOrigen>(sesion: SesionOrigen, elegidos: SesionOrigen[], horarios: H[]): H[] {
  return horarios.filter((h) => h.duracion === sesion.duracion && !elegidos.some((e) => chocan(h, e)));
}

/** Un horario como destino del POST, o como elegido en la consulta: solo lo que pide el contrato. */
export function aDestino(h: SesionOrigen): SesionOrigen {
  return { dia: h.dia, hora: h.hora, duracion: h.duracion };
}
