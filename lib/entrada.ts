// ---------------------------------------------------------------
// LO QUE COMPARTEN LAS DOS PUERTAS DE ENTRADA
//
// Al LMS se entra por dos sitios —el enlace del correo y el botón de
// WooCommerce— y los dos acaban igual: cambiando un sobre de vida corta
// por la cookie de 30 días. Eso vive aquí para que las dos rutas no
// puedan divergir en cómo se pone la cookie ni a dónde se manda a cada
// rol después.
// ---------------------------------------------------------------

import "server-only";
import { NextResponse } from "next/server";
import { NOMBRE_COOKIE, OPCIONES_COOKIE, crearCookieSesion, type Sesion } from "@/lib/sesion";

/**
 * Por qué se rechaza a alguien en la puerta.
 *
 *   caducado — firma que no cuadra, sobre manipulado o fuera de plazo.
 *              Los tres dan lo mismo: al visitante no le sirve saber
 *              cuál fue, y decírselo ayudaría a quien pruebe sobres.
 *   sinficha — el sobre es bueno pero ese email no tiene ficha en
 *              Gestión. Ahí sí hay algo que contarle.
 */
export type MotivoRechazo = "caducado" | "sinficha";

export function volverAAcceso(urlPeticion: string, motivo: MotivoRechazo) {
  return NextResponse.redirect(new URL(`/acceso?motivo=${motivo}`, urlPeticion));
}

/** Abre la sesión y deja a cada rol donde le toca. */
export async function entrarComo(urlPeticion: string, sesion: Sesion) {
  const destino = sesion.rol === "admin" ? "/" : `/alumno/${sesion.alumnoId}`;
  const respuesta = NextResponse.redirect(new URL(destino, urlPeticion));
  respuesta.cookies.set(NOMBRE_COOKIE, await crearCookieSesion(sesion), OPCIONES_COOKIE);
  return respuesta;
}
