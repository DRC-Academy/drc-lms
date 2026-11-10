// POST: empieza la prueba de nivel, o retoma la que esté a medias, y devuelve
// la pregunta que toca. Ver lib/prueba-nivel/servidor.ts.

import { NextResponse } from "next/server";
import { alumnoDeLaPrueba, json } from "@/lib/prueba-nivel/rutas";
import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso, respuestaImpago } from "@/lib/estado-acceso";
import { empezar } from "@/lib/prueba-nivel/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  // El bloqueo por impago, como en todas las rutas de alumno (a quien tiene
  // pase no le toca nunca, pero la regla es la misma para todas).
  if ((await estadoDeAcceso(await sesionActual())) === "impago") return respuestaImpago();

  const alumno = await alumnoDeLaPrueba();
  if (alumno instanceof NextResponse) return alumno;

  try {
    return json({ tipo: "pregunta", datos: await empezar(alumno.alumnoId, alumno.email) });
  } catch (error) {
    console.error("[prueba-nivel/empezar]", (error as Error).message);
    return json({ error: "No hemos podido abrir tu prueba. Vuelve a intentarlo en un momento." }, 500);
  }
}
