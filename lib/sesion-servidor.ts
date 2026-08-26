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
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NOMBRE_COOKIE, abrirSesion, type SesionAbierta } from "@/lib/sesion";
import { sesionViva } from "@/lib/sesiones-lms";
import { CABECERA_URL, PARAM_FOCO, leerFoco } from "@/lib/foco";

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

// ---------------------------------------------------------------
// DE QUIÉN HABLA LA PANTALLA
//
// El resto del producto —curso, lección, "Para ti", "Mi progreso"— se
// resuelve para UN alumno. Quién es sale de aquí, y no es lo mismo que
// quién está mirando: ver la cabecera de `lib/foco.ts`.
//
// EL PARÁMETRO NO ES UNA LLAVE, y esta función es donde eso se hace
// cumplir. A un alumno se le IGNORA entero: por mucho que escriba
// `?alumno=` con el id de otro en la barra de direcciones, lo que sale
// de aquí es siempre el suyo. Al equipo se le acepta porque ya podía
// abrir cualquier ficha —`exigirAccesoAFicha` lo permite desde el
// principio— así que esto no le da ningún acceso que no tuviera.
//
// Y NO AUTORIZA A ESCRIBIR. Las cuatro rutas que escriben
// —`api/progreso`, `api/progreso-leccion`, `api/intento-ejercicio` y
// `api/generar-bloque`— sacan el alumno de la cookie y rechazan al
// equipo, cada una por su cuenta. Nada de eso pasa por aquí ni cambia
// con esto.
// ---------------------------------------------------------------

export type Foco = {
  sesion: SesionAbierta;
  /**
   * El alumno del que habla la pantalla. Cadena vacía solo cuando es el
   * equipo sin ficha elegida, que es el caso de revisar el contenido de
   * un curso sin mirar a nadie en concreto.
   */
  alumnoId: string;
  /** El equipo mirando la ficha de otro. */
  revisando: boolean;
  /**
   * Lo que hay que colgar de cada enlace para no perder el contexto al
   * navegar, o null si no hay ninguno que conservar. Es exactamente el
   * argumento que espera `conFoco`.
   */
  paraEnlaces: string | null;
};

/**
 * El alumno en foco, sin exigir que haya ninguno.
 *
 * Va en `cache()` por lo mismo que `sesionActual`: dentro de una misma
 * petición lo preguntan la página y el layout de la cabecera, y sin esto
 * se leerían las cabeceras y la cookie dos veces.
 */
export const focoActual = cache(async (): Promise<Foco> => {
  const sesion = await exigirSesion();

  if (sesion.rol === "alumno") {
    // El parámetro ni se mira. Ver arriba.
    return { sesion, alumnoId: sesion.alumnoId, revisando: false, paraEnlaces: null };
  }

  const url = headers().get(CABECERA_URL);
  const pedido = url ? leerFoco(new URL(url).searchParams.get(PARAM_FOCO) ?? undefined) : null;

  if (!pedido) {
    // El equipo sin ficha elegida: sigue pudiendo abrir un curso para
    // revisar su contenido, como hasta ahora.
    return { sesion, alumnoId: "", revisando: false, paraEnlaces: null };
  }

  return { sesion, alumnoId: pedido, revisando: true, paraEnlaces: pedido };
});

/**
 * Igual, pero para las pantallas que NO existen sin un alumno detrás:
 * "Para ti" se genera de su perfil y "Mi progreso" son sus clases. Sin
 * ficha elegida, el equipo se va al buscador —que es lo que ya hacían
 * las dos, solo que ahora tiene forma de volver con contexto—.
 */
export async function exigirFoco(): Promise<Foco> {
  const foco = await focoActual();
  if (foco.alumnoId === "") redirect("/");
  return foco;
}
