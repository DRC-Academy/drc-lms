/**
 * HACIA DÓNDE SEÑALA LA MASCOTA. El único sitio que lo decide.
 *
 * Nadie orienta la mascota por su cuenta: quien quiere que señale algo
 * se lo pide al store con el elemento (`storeMascota.senalar(el)`), y la
 * capa (CapaMascota) llama a esto en cada frame con el rectángulo del
 * objetivo y el de la mascota. Así la dirección se recalcula sola con el
 * scroll, al cambiar el tamaño de la ventana y al cambiar de paso.
 *
 * SOLO HAY DOS POSES QUE SEÑALAN: a la izquierda (el render de «senala»
 * tal cual) y a la derecha (la misma figura volteada, ver `espejo` en
 * Geckonoid). No hay arriba ni abajo. Lo que queda encima o debajo de la
 * mascota recibe la pose neutra, y el texto dice dónde está.
 *
 * ANTE LA DUDA, NEUTRA. Mejor que no señale a que señale mal:
 *   · sin objetivo, o con un objetivo que no se ve;
 *   · con el objetivo encima de la mascota o pegado a ella;
 *   · con el objetivo por encima o por debajo del cuerpo de la mascota,
 *     aunque esté algo desplazado a un lado: el brazo sale en horizontal
 *     a media altura, y apuntaría a lo que haya a esa altura, no a él.
 *
 * Módulo puro: sin React ni DOM, solo rectángulos.
 */

export type LadoSenala = "izq" | "der";
export type PoseMascota = { tipo: "senala"; lado: LadoSenala } | { tipo: "neutra" };

export type Rect = { left: number; top: number; width: number; height: number };

const NEUTRA: PoseMascota = { tipo: "neutra" };

/** Lo que tiene que separar a la mascota del objetivo para que la flecha se entienda. */
const HOLGURA_PX = 6;
/**
 * La franja del cuerpo, como fracción de su alto, que el objetivo tiene
 * que cruzar para leerse como «a un lado»: de los hombros a los pies. El
 * brazo de «senala» sale a mitad de altura y en horizontal; un objetivo
 * entero por encima o por debajo de esta franja no está donde apunta.
 * Medido a 375 px con la pestaña de «Para ti» justo debajo de la
 * mascota: con una regla de pendiente, la señalaba de lado y la flecha
 * caía sobre el botón «Siguiente».
 */
const FRANJA = { desde: 0.2, hasta: 1 };
/** Lo que el objetivo puede quedarse fuera de la franja, como fracción del alto. */
const TOLERANCIA = 0.05;

export function calcularPoseMascota(
  objetivo: Rect | null,
  mascota: Rect | null,
  vista: { ancho: number; alto: number } | null = null
): PoseMascota {
  if (!objetivo || !mascota) return NEUTRA;
  if (objetivo.width <= 0 || objetivo.height <= 0 || mascota.width <= 0 || mascota.height <= 0) return NEUTRA;

  const o = { l: objetivo.left, r: objetivo.left + objetivo.width, t: objetivo.top, b: objetivo.top + objetivo.height };
  const m = { l: mascota.left, r: mascota.left + mascota.width, t: mascota.top, b: mascota.top + mascota.height };

  // Fuera de la pantalla no se señala: el alumno no vería a qué.
  if (vista && (o.r <= 0 || o.l >= vista.ancho || o.b <= 0 || o.t >= vista.alto)) return NEUTRA;

  // Encima, debajo o pegado: los tramos horizontales se solapan (con
  // holgura), y una flecha lateral apuntaría al vacío.
  if (o.l < m.r + HOLGURA_PX && o.r > m.l - HOLGURA_PX) return NEUTRA;

  // Encima o debajo del cuerpo, aunque esté algo a un lado.
  const franjaArriba = m.t + mascota.height * FRANJA.desde;
  const franjaAbajo = m.t + mascota.height * FRANJA.hasta;
  const tolerancia = mascota.height * TOLERANCIA;
  if (o.b < franjaArriba - tolerancia || o.t > franjaAbajo + tolerancia) return NEUTRA;

  return { tipo: "senala", lado: o.r <= m.l ? "izq" : "der" };
}
