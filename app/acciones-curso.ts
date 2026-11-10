"use server";

import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso } from "@/lib/estado-acceso";
import { accesoDelAlumno } from "@/lib/acceso-alumno";
import { cursosActivos } from "@/lib/cursos-servidor";
import { guardarCursoElegido } from "@/lib/pases";

/**
 * Elige el curso por el que va. Solo quien tiene todos abiertos, y solo sobre
 * uno de verdad: lo que llega del formulario no se da por bueno.
 * Un formulario de HTML: funciona sin que haya cargado el JavaScript.
 */
export async function elegirCurso(datos: FormData): Promise<void> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno") redirect("/acceso");
  if ((await estadoDeAcceso(sesion)) === "impago") redirect(`/alumno/${sesion.alumnoId}`);

  const acceso = await accesoDelAlumno(sesion);
  if (acceso.cursos !== "todos") redirect(`/alumno/${sesion.alumnoId}`);

  const pedido = datos.get("curso");
  const curso = (await cursosActivos())?.find((c) => c.id === pedido);
  if (!curso) redirect("/elegir-curso");

  await guardarCursoElegido(sesion.alumnoId, curso.id);
  redirect(`/curso/${curso.slug}`);
}
