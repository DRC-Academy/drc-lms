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
// ---------------------------------------------------------------

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOMBRE_COOKIE, abrirSesion, type Sesion } from "@/lib/sesion";

/** Quién está pidiendo esta página, o null si no hay sesión válida. */
export async function sesionActual(): Promise<Sesion | null> {
  return abrirSesion(cookies().get(NOMBRE_COOKIE)?.value);
}

/** Igual, pero sin sesión no se sigue: a pedir un enlace. */
export async function exigirSesion(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/acceso");
  return sesion;
}

/**
 * Para lo que solo es del equipo: el buscador con los 184 alumnos.
 * Un alumno que llegue aquí no ve un error, va a su ficha.
 */
export async function exigirAdministrador(): Promise<Sesion> {
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
export async function exigirAccesoAFicha(alumnoId: string): Promise<Sesion> {
  const sesion = await exigirSesion();
  if (sesion.rol === "alumno" && sesion.alumnoId !== alumnoId) {
    redirect(`/alumno/${sesion.alumnoId}`);
  }
  return sesion;
}
