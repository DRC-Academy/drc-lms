// ---------------------------------------------------------------
// CUÁNTOS MESES LLEVA EL ALUMNO, PARA LA LANDING DE WORDPRESS
//
// La landing de drcacademy.com enseña un mensaje distinto según el tramo
// del programa de seis meses en el que está el alumno. El tramo es SOLO
// TIEMPO: meses de calendario completos desde `fecha_inicio`, con tope en
// seis. Ni el contenido completado ni el diploma entran aquí; el seis
// significa «fecha alcanzada», no «diploma conseguido».
//
// EL MISMO RELOJ QUE LA TARJETA DEL DIPLOMA. Los meses se suman con
// `sumarMeses` de `lib/diploma-plazo.ts`, que acota al último día del
// mes: con alta el 31 de enero, el primer mes se cumple el 28 de
// febrero (29 en bisiesto) y el tercero el 30 de abril. Los días son de
// Madrid (`diaLocal`), como en todo el producto.
//
// SIN FECHA NO HAY TRAMO, Y CERO NO ES UN ERROR. Sin `fecha_inicio`, con
// una ilegible o con una que todavía no ha llegado, sale 0: la landing
// tiene que poder enseñar algo a cualquiera.
//
// Módulo puro: quien llama le pasa la fecha ya leída.
// ---------------------------------------------------------------

import { comoDia, sumarMeses, MESES_DE_CURSO } from "@/lib/diploma-plazo";
import { diaLocal } from "@/lib/fechas";

/** Meses de calendario completos desde `fechaInicio` hasta `ahora`, de 0 a 6. */
export function mesesTranscurridos(fechaInicio: string | null | undefined, ahora: Date): number {
  const inicio = comoDia(fechaInicio);
  if (!inicio) return 0;

  const hoy = diaLocal(ahora);
  if (inicio > hoy) return 0;

  let meses = 0;
  while (meses < MESES_DE_CURSO && sumarMeses(inicio, meses + 1) <= hoy) meses++;
  return meses;
}
