// ---------------------------------------------------------------
// QUIÉN VE EL INICIO DEL BLACK PASS
//
// Pura, sin base ni red: la comparten `lib/acceso-alumno.ts`, el inicio,
// `/elegir-curso` y `app/ampliar-plan`.
// ---------------------------------------------------------------

import type { AccesoAlumno } from "@/lib/acceso-alumno";

/**
 * ¿VE EL INICIO DEL BLACK PASS? Quien tiene pase y no tiene plan con profesor
 * activo: el que solo tiene pase (id `pase-…`) y el ex-alumno con ficha que
 * compra el Black Pass. Ese inicio lleva el saludo sin género, la prueba de
 * nivel, «Otros niveles» y la invitación a las clases, en vez de la
 * comparativa de ritmo y el calendario.
 *
 * NO lo ve quien tiene el plan en espera de pago: sigue siendo alumno con
 * plan, y su inicio es el de siempre con el aviso de pago encima.
 *
 * Decisión de Facundo, 10/11/2026.
 */
export function conInicioBlackPass(acceso: Pick<AccesoAlumno, "tienePase" | "origen" | "avisoPago">): boolean {
  return acceso.tienePase && acceso.origen === "pase" && !acceso.avisoPago;
}
