"use server";

import { sesionActual } from "@/lib/sesion-servidor";
import { marcarTutorialVisto } from "@/lib/tutorial/estado";

/**
 * El onboarding ha arrancado: se marca como visto para el alumno de la
 * sesión. Solo el propio alumno: el equipo revisando una ficha no marca
 * nada, y el alumno no se elige desde el navegador.
 */
export async function marcarRecorridoVisto(): Promise<void> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno") return;
  await marcarTutorialVisto(sesion.alumnoId);
}
