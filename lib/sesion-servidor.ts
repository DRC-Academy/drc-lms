// ---------------------------------------------------------------
// LA SESIÓN, VISTA DESDE EL SERVIDOR
//
// `lib/sesion.ts` sabe firmar y abrir sobres. Este módulo es el que
// los lee de la petición en curso y decide si el que llama puede ver
// lo que ha pedido.
//
// Todo lo de aquí se ejecuta en el servidor y en cada petición. El
// cliente no participa en la decisión: no se mira ningún parámetro de
// la URL, ningún encabezado ni ningún prop. Solo la cookie firmada.
//
// Estos guards NO sobran por tener middleware. El middleware es la
// puerta de la calle y estos son la cerradura de cada habitación: si
// el `matcher` se queda corto un día, o si el runtime deja pasar una
// petición sin evaluarlo, la página sigue sin renderizarse para quien
// no ha entrado.
//
// Y desde que las sesiones se pueden revocar, la diferencia entre las
// dos capas es mayor: el middleware comprueba la firma y la caducidad,
// que no necesitan base de datos y por tanto funcionan en Edge; aquí se
// comprueba además que la sesión siga viva, que sí la necesita.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOMBRE_COOKIE, abrirSesion, type SesionAbierta } from "@/lib/sesion";
import { sesionViva } from "@/lib/sesiones-lms";

/**
 * Quién está pidiendo esta página, o null si no hay sesión válida.
 *
 * Va en `cache()` porque una misma página puede pasar por más de un
 * guard —`exigirAccesoAFicha` llama a `exigirSesion`— y sin esto se
 * abriría el sobre y se preguntaría a la base una vez por llamada.
 */
export const sesionActual = cache(async (): Promise<SesionAbierta | null> => {
  const sesion = await abrirSesion(cookies().get(NOMBRE_COOKIE)?.value);
  if (!sesion) return null;

  // La firma cuadra y no ha caducado, pero pudo revocarse: al cerrar
  // sesión, o a mano desde la tabla.
  return (await sesionViva(sesion.sesionId)) ? sesion : null;
});

/** Igual, pero sin sesión no se sigue: a pedir un enlace. */
export async function exigirSesion(): Promise<SesionAbierta> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/acceso");
  return sesion;
}

/**
 * Para lo que solo es del equipo: el buscador con los 174 alumnos.
 * Un alumno que llegue aquí no ve un error, va a su ficha.
 */
export async function exigirAdministrador(): Promise<SesionAbierta> {
  const sesion = await exigirSesion();
  if (sesion.rol === "alumno") redirect(`/alumno/${sesion.alumnoId}`);
  return sesion;
}

/**
 * Guard de todo lo que cuelga de `/alumno/{id}`.
 *
 * El administrador entra en cualquier ficha. El alumno solo en la suya:
 * si escribe otro id en la barra de direcciones se le devuelve a la
 * propia, que es más amable que un 403 y no le confirma si ese id
 * existe o no.
 */
export async function exigirAccesoAFicha(alumnoId: string): Promise<SesionAbierta> {
  const sesion = await exigirSesion();
  if (sesion.rol === "alumno" && sesion.alumnoId !== alumnoId) {
    redirect(`/alumno/${sesion.alumnoId}`);
  }
  return sesion;
}
