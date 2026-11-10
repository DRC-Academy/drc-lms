// POST: guarda una respuesta de la prueba de nivel y devuelve lo siguiente
// (otra pregunta, o el resultado). La redacción pasa por la IA: por eso el
// margen de 60 s. Ver lib/prueba-nivel/servidor.ts.

import { NextResponse } from "next/server";
import { alumnoDeLaPrueba, json } from "@/lib/prueba-nivel/rutas";
import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso, respuestaImpago } from "@/lib/estado-acceso";
import { responder } from "@/lib/prueba-nivel/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Cuerpo = { pruebaId?: unknown; preguntaId?: unknown; seleccion?: unknown; texto?: unknown; segundos?: unknown };

export async function POST(peticion: Request): Promise<NextResponse> {
  // El bloqueo por impago, como en todas las rutas de alumno (a quien tiene
  // pase no le toca nunca, pero la regla es la misma para todas).
  if ((await estadoDeAcceso(await sesionActual())) === "impago") return respuestaImpago();

  const alumno = await alumnoDeLaPrueba();
  if (alumno instanceof NextResponse) return alumno;

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await peticion.json()) as Cuerpo;
  } catch {
    return json({ error: "Petición no válida." }, 400);
  }

  const pruebaId = typeof cuerpo.pruebaId === "string" ? cuerpo.pruebaId : "";
  const preguntaId = typeof cuerpo.preguntaId === "string" ? cuerpo.preguntaId : "";
  if (!pruebaId || !preguntaId) return json({ error: "Faltan datos." }, 400);

  try {
    const salida = await responder(alumno.alumnoId, {
      pruebaId,
      preguntaId,
      seleccion: typeof cuerpo.seleccion === "number" ? cuerpo.seleccion : undefined,
      texto: typeof cuerpo.texto === "string" ? cuerpo.texto.slice(0, 10_000) : undefined,
      segundos: typeof cuerpo.segundos === "number" ? cuerpo.segundos : undefined,
    });
    if (salida.tipo === "error") return json({ error: salida.mensaje }, salida.status);
    return json(salida);
  } catch (error) {
    console.error("[prueba-nivel/responder]", (error as Error).message);
    return json({ error: "No hemos podido guardar tu respuesta. Vuelve a intentarlo." }, 500);
  }
}
