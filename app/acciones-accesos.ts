"use server";

// ---------------------------------------------------------------
// CONCEDER Y QUITAR ACCESOS A CURSOS
//
// Las tres acciones que usa el panel de «Gestionar accesos». Se leen de
// una en una y se guardan de una en una a propósito: cada concesión
// deja su propia fila con su autor, su fecha y su motivo, y un guardado
// en bloque convertiría cinco decisiones distintas en un solo apunte
// ilegible dentro de seis meses.
//
// TRES CIERRES, Y NINGUNO SOBRA:
//
//   1. `exigirAdministrador()` abre las tres. Una acción de servidor es
//      una ruta más: sin esto, cualquiera con sesión de alumno podría
//      llamarlas desde la consola del navegador y darse cursos.
//   2. Quién concede sale de la COOKIE, nunca de los argumentos. Si
//      viniera del cliente, la auditoría la escribiría el auditado.
//   3. Se escribe con `baseLms()`. Contra Gestión no es que esté
//      prohibido: su cliente solo expone `select` y no compilaría.
// ---------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import {
  concederAcceso,
  estadoDeAccesos,
  revocarAcceso,
  type FilaAcceso,
} from "@/lib/accesos-manuales";

export type Resultado = { ok: boolean; error?: string };

/**
 * El estado de los 7 cursos de un alumno, para pintar el panel.
 *
 * Se pide al abrir el panel y no al cargar la lista: son cuatro
 * consultas por alumno y la lista enseña veinte. Cargarlas todas por si
 * acaso serían ochenta consultas para un panel que casi siempre se abre
 * en uno solo.
 */
export async function leerAccesos(alumnoId: string): Promise<FilaAcceso[]> {
  await exigirAdministrador();
  if (typeof alumnoId !== "string" || alumnoId.trim() === "") return [];

  // El plan y el nivel salen de Gestión, no de lo que mande el cliente:
  // son los que deciden qué cursos cuentan como "por plan", y dejarlos
  // elegir desde fuera permitiría disfrazar una concesión manual.
  const perfil = await obtenerPerfil(alumnoId);
  return estadoDeAccesos(alumnoId, perfil?.plan ?? "", perfil?.nivel ?? "");
}

/**
 * Concede un curso a mano, o cambia el drip de uno ya concedido.
 *
 * Sirve para las dos cosas porque en la tabla son la misma: revocar la
 * excepción viva y escribir otra con los valores nuevos. Así el
 * historial guarda también los cambios de drip, no solo las altas.
 */
export async function guardarAcceso(datos: {
  alumnoId: string;
  cursoId: string;
  sinDrip: boolean;
  motivo: string;
}): Promise<Resultado> {
  const sesion = await exigirAdministrador();

  if (!datos?.alumnoId?.trim() || !datos?.cursoId?.trim()) {
    return { ok: false, error: "Faltan el alumno o el curso." };
  }

  const ok = await concederAcceso(datos.alumnoId, datos.cursoId, {
    sinDrip: datos.sinDrip === true,
    motivo: typeof datos.motivo === "string" ? datos.motivo : null,
    // De la cookie. Ver el cierre 2 de la cabecera.
    porQuien: sesion.email,
  });

  if (!ok) return { ok: false, error: "No se pudo guardar. Vuelve a intentarlo." };

  refrescar(datos.alumnoId);
  return { ok: true };
}

/**
 * Quita una excepción manual.
 *
 * No hace falta comprobar que el curso no venga del plan: un curso del
 * plan no tiene fila en `accesos_manuales`, así que esto no encuentra
 * nada que revocar y no le quita el acceso a nadie. El panel además no
 * ofrece el botón en esas filas.
 */
export async function quitarAcceso(datos: {
  alumnoId: string;
  cursoId: string;
}): Promise<Resultado> {
  const sesion = await exigirAdministrador();

  if (!datos?.alumnoId?.trim() || !datos?.cursoId?.trim()) {
    return { ok: false, error: "Faltan el alumno o el curso." };
  }

  const ok = await revocarAcceso(datos.alumnoId, datos.cursoId, sesion.email);
  if (!ok) return { ok: false, error: "No se pudo quitar. Vuelve a intentarlo." };

  refrescar(datos.alumnoId);
  return { ok: true };
}

/**
 * Tira los datos servidos de las pantallas donde este cambio se nota.
 *
 * La ficha y el panel porque enseñan los cursos del alumno; la home
 * porque es de donde se abre el gestor. No se recarga la página: Next
 * vuelve a pedir solo el árbol de servidor y el navegador conserva el
 * scroll y el estado del panel abierto.
 */
function refrescar(alumnoId: string) {
  revalidatePath("/");
  revalidatePath(`/alumno/${alumnoId}`);
}
