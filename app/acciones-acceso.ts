"use server";

import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso, type EstadoAcceso } from "@/lib/estado-acceso";

/**
 * «Ya lo he hecho»: vuelve a preguntar el estado, sin caché. El aviso
 * recarga la página si sale `activo`. No escribe nada.
 */
export async function comprobarAcceso(): Promise<EstadoAcceso> {
  return estadoDeAcceso(await sesionActual());
}
