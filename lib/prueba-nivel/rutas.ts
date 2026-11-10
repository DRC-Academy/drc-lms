// ---------------------------------------------------------------
// LA PUERTA DE LAS RUTAS DE LA PRUEBA DE NIVEL
//
// Solo el propio alumno (el equipo revisando una ficha no responde por él) y
// solo si puede hacerla (`puedeHacerPrueba`). Lo comparten
// `app/api/prueba-nivel/empezar` y `app/api/prueba-nivel/responder`.
// ---------------------------------------------------------------

import "server-only";
import { NextResponse } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import { accesoDelAlumno } from "@/lib/acceso-alumno";
import { puedeHacerPrueba } from "@/lib/prueba-nivel/servidor";

export const SIN_CACHE = { "cache-control": "no-store" };

export function json(cuerpo: unknown, status = 200): NextResponse {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

/** El alumno que puede hacer la prueba, o la respuesta con la que se le rechaza. */
export async function alumnoDeLaPrueba(): Promise<{ alumnoId: string; email: string } | NextResponse> {
  const sesion = await sesionActual();
  if (!sesion) return json({ error: "Tienes que entrar de nuevo." }, 401);
  if (sesion.rol !== "alumno") return json({ error: "La prueba la hace el alumno desde su cuenta." }, 403);
  if (!puedeHacerPrueba(await accesoDelAlumno(sesion))) return json({ error: "La prueba de nivel no está disponible." }, 403);
  return { alumnoId: sesion.alumnoId, email: sesion.email };
}
