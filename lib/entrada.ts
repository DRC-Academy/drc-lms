// ---------------------------------------------------------------
// LO QUE COMPARTEN LAS DOS PUERTAS DE ENTRADA
//
// Al LMS se entra por dos sitios —el enlace del correo y el botón de
// WooCommerce— y los dos acaban igual: abriendo fila en `sesiones` y
// cambiando un sobre de vida corta por la cookie de 30 días. Eso vive
// aquí para que las dos rutas no puedan divergir en cómo se pone la
// cookie ni a dónde se manda a cada rol después.
// ---------------------------------------------------------------

import "server-only";
import { NextResponse } from "next/server";
import { NOMBRE_COOKIE, OPCIONES_COOKIE, DIAS_SESION, crearCookieSesion, type Sesion } from "@/lib/sesion";
import { crearSesion, type OrigenSesion } from "@/lib/sesiones-lms";

/**
 * Por qué se rechaza a alguien en la puerta.
 *
 *   caducado — firma que no cuadra, sobre manipulado o fuera de plazo.
 *              Los tres dan lo mismo: al visitante no le sirve saber
 *              cuál fue, y decírselo ayudaría a quien pruebe sobres.
 *   sinficha — el sobre es bueno pero ese email no tiene ficha en
 *              Gestión. Ahí sí hay algo que contarle.
 *   error    — el sobre era bueno y la ficha existe, pero no se pudo
 *              abrir la sesión en la base. No es culpa de quien entra y
 *              el mensaje se lo dice: que vuelva a intentarlo.
 */
export type MotivoRechazo = "caducado" | "sinficha" | "error";

export function volverAAcceso(urlPeticion: string, motivo: MotivoRechazo) {
  return NextResponse.redirect(new URL(`/acceso?motivo=${motivo}`, urlPeticion));
}

/**
 * Abre la sesión y deja a cada rol donde le toca.
 *
 * Primero la fila y después la cookie, en ese orden y no al revés: la
 * cookie lleva dentro el id de la fila, así que sin fila no hay cookie
 * que poner. Si la base no responde, no se entra —una cookie con un id
 * sin respaldo la rechazaría el primer guard, y el alumno acabaría
 * fuera una pantalla más tarde y sin entender por qué.
 */
export async function entrarComo(urlPeticion: string, sesion: Sesion, origen: OrigenSesion) {
  const sesionId = await crearSesion({
    rol: sesion.rol,
    alumnoId: sesion.alumnoId,
    // El email solo se guarda para los administradores, que no tienen
    // `alumno_id` y cuya única identidad es ese email. El de un alumno
    // vive en Gestión y no se duplica aquí.
    emailAdmin: sesion.rol === "admin" ? sesion.email : null,
    origen,
    expiraEn: new Date(Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000),
  });

  if (!sesionId) return volverAAcceso(urlPeticion, "error");

  const destino = sesion.rol === "admin" ? "/" : `/alumno/${sesion.alumnoId}`;
  const respuesta = NextResponse.redirect(new URL(destino, urlPeticion));
  respuesta.cookies.set(NOMBRE_COOKIE, await crearCookieSesion(sesion, sesionId), OPCIONES_COOKIE);
  return respuesta;
}
