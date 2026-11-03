"use server";

import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso } from "@/lib/estado-acceso";
import { apuntarCierreAvisoParaTi } from "@/lib/aviso-para-ti-servidor";

/**
 * El alumno cerró el aviso de «Para ti» sin usarlo (X, Escape o el
 * fondo). Solo el propio alumno: sale de la cookie, nunca del navegador.
 */
export async function cerrarAvisoParaTi(): Promise<boolean> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno") return false;
  if ((await estadoDeAcceso(sesion)) === "impago") return false;
  return apuntarCierreAvisoParaTi(sesion.alumnoId);
}
