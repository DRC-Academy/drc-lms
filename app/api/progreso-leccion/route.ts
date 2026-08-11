// ---------------------------------------------------------------
// MARCAR UNA LECCIÓN COMO COMPLETADA
//
// Lo llama un formulario de HTML normal, no un `fetch`: así el botón
// funciona aunque no cargue el JavaScript, y la navegación a la lección
// siguiente la hace el propio navegador siguiendo la redirección.
//
// El alumno sale de la cookie, nunca del formulario. Si viniera de
// fuera, cualquiera podría marcar lecciones en la ficha de otro.
//
// La tabla tiene UNIQUE (alumno_id, leccion_id), así que volver a
// marcar la misma lección no duplica: se ignora el conflicto y se
// sigue. Que alguien pulse dos veces no es un error que contarle.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import { completarLeccion } from "@/lib/cursos-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(peticion: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.redirect(new URL("/acceso", peticion.url), { status: 303 });
  }

  const datos = await peticion.formData();
  const leccionId = String(datos.get("leccionId") ?? "");
  const slug = String(datos.get("slug") ?? "");
  const siguiente = String(datos.get("siguiente") ?? "");

  if (!UUID.test(leccionId) || slug === "") {
    return NextResponse.redirect(new URL("/", peticion.url), { status: 303 });
  }

  // El equipo revisa cursos, no los cursa: lo que marque no es progreso
  // de nadie. Mismo criterio que en `app/api/progreso`.
  if (sesion.rol === "alumno") {
    await completarLeccion(sesion.alumnoId, leccionId);
  }

  const destino = UUID.test(siguiente) ? `/curso/${slug}/${siguiente}` : `/curso/${slug}`;

  // 303 y no 307: el 307 conservaría el método y el navegador repetiría
  // el POST contra la lección siguiente.
  return NextResponse.redirect(new URL(destino, peticion.url), { status: 303 });
}
