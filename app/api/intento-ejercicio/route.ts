// ---------------------------------------------------------------
// UN INTENTO DE EJERCICIO DE CURSO
//
// Lo llama `components/EjerciciosLeccion.tsx` en cuanto el alumno
// comprueba una respuesta. No espera contestación: la corrección ya se
// ha pintado en el navegador y esto solo deja constancia.
//
// El alumno sale de la cookie, nunca del cuerpo. Igual que en
// `app/api/progreso` y por el mismo motivo: si viniera de fuera,
// cualquiera con sesión escribiría intentos en la ficha de otro.
//
// El equipo no registra nada: revisa el curso, no lo cursa.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import { guardarIntento } from "@/lib/cursos-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(peticion: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  if (sesion.rol !== "alumno") {
    return NextResponse.json({ guardado: false, motivo: "administrador" });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });
  }

  const datos =
    typeof cuerpo === "object" && cuerpo !== null && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : null;
  if (!datos) return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });

  const ejercicioId = typeof datos.ejercicioId === "string" ? datos.ejercicioId.trim() : "";
  if (!UUID.test(ejercicioId)) {
    return NextResponse.json({ error: "ejercicioId no válido" }, { status: 400 });
  }

  if (typeof datos.correcto !== "boolean") {
    return NextResponse.json({ error: "Falta correcto" }, { status: 400 });
  }

  return NextResponse.json({
    guardado: await guardarIntento(sesion.alumnoId, ejercicioId, datos.correcto),
  });
}
