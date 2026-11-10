// POST: empieza la prueba de nivel, o retoma la que esté a medias, y devuelve
// la pregunta que toca. Ver lib/prueba-nivel/servidor.ts.

import { NextResponse } from "next/server";
import { alumnoDeLaPrueba, json } from "@/lib/prueba-nivel/rutas";
import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso, respuestaImpago } from "@/lib/estado-acceso";
import { EsperaParaRepetir, empezar } from "@/lib/prueba-nivel/servidor";
import { cuandoRepetir } from "@/lib/prueba-nivel/repetir";
import { textosActuales } from "@/lib/idioma-servidor";

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
    // Repetir antes de las 24 horas (una pestaña vieja: la pantalla ya no ofrece el botón).
    if (error instanceof EsperaParaRepetir) {
      const { dia, hora } = cuandoRepetir(error.desde, new Date());
      return json({ error: textosActuales().pruebaNivel.repetirDesde(dia, hora), repetirDesde: error.desde }, 429);
    }
    console.error("[prueba-nivel/empezar]", (error as Error).message);
    return json({ error: "No hemos podido abrir tu prueba. Vuelve a intentarlo en un momento." }, 500);
  }
}
