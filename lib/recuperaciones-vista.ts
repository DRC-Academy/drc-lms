// ---------------------------------------------------------------
// QUÉ ENSEÑA UNA RECUPERACIÓN QUE ESPERA AL ALUMNO
//
// Módulo puro, para la tarjeta (`components/clases/TarjetaRecuperacion.
// tsx`) y para los tests. Lo que se puede hacer lo sigue diciendo
// Gestión con `puedeElegir` y `puedeDecirNinguna`; esto solo decide la
// forma.
// ---------------------------------------------------------------

import type { Recuperacion } from "@/lib/recuperaciones";

/**
 * Sin fechas que elegir (contrato 1.1: `opciones: []`, `puede_elegir:
 * false`) y con la puerta de proponer abierta: el formulario de «Ninguna
 * me viene bien» sale directo, sin lista ni botón para llegar a él.
 */
export function proponerDirecto(rec: Pick<Recuperacion, "estado" | "opciones" | "puedeDecirNinguna">): boolean {
  return rec.estado === "esperando_alumno" && rec.opciones.length === 0 && rec.puedeDecirNinguna;
}
