"use server";

import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso } from "@/lib/estado-acceso";
import { descartarValoracion, guardarValoracion, type ResultadoValoracion } from "@/lib/valoraciones-servidor";

/**
 * Valorar una clase, o editar su valoración. Solo el propio alumno: el
 * alumno sale de la cookie y nunca del navegador, y el equipo que revisa
 * una ficha no valora por nadie. Qué clase se puede valorar lo vuelve a
 * comprobar `guardarValoracion`.
 */
export async function enviarValoracion(entrada: {
  claseId: string;
  estrellas: number;
  comentario: string | null;
  origen: "popup" | "mis_clases";
}): Promise<ResultadoValoracion> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno") return { ok: false, motivo: "no_valorable" };
  if ((await estadoDeAcceso(sesion)) === "impago") return { ok: false, motivo: "no_valorable" };
  return guardarValoracion(sesion.alumnoId, entrada);
}

/** El pop-up se cerró sin valorar. */
export async function descartarPopupValoracion(claseId: string): Promise<ResultadoValoracion> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno") return { ok: false, motivo: "no_valorable" };
  if ((await estadoDeAcceso(sesion)) === "impago") return { ok: false, motivo: "no_valorable" };
  return descartarValoracion(sesion.alumnoId, claseId);
}
