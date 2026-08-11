// ---------------------------------------------------------------
// GUARDAR LO QUE PASA EN LA PRÁCTICA
//
// `components/Practica.tsx` es un componente cliente, así que no puede
// escribir en la base. Manda aquí lo que ocurre y esta ruta lo guarda.
//
// DE DÓNDE SALE EL ALUMNO
//
// De la cookie. NUNCA del cuerpo de la petición, aunque la práctica
// tenga el `alumnoId` a mano y le resultara cómodo enviarlo: si se
// aceptara de fuera, cualquiera con sesión podría escribir progreso,
// respuestas de producción o avance en la ficha de otro con un `fetch`
// desde la consola. El identificador que se usa es el de quien tiene la
// cookie, y punto.
//
// Los administradores no guardan nada. Entran en cualquier ficha para
// revisar el producto, y lo que practiquen mientras miran no es
// progreso de ese alumno. Antes se escribía en su localStorage y era un
// dato falso que nadie veía; ahora sería un dato falso en la base.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import {
  borrarAvance,
  guardarAvance,
  guardarProgreso,
  guardarRespuestaProduccion,
} from "@/lib/progreso-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function objeto(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function entero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isSafeInteger(valor) ? valor : null;
}

function cadena(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export async function POST(peticion: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }

  // Ver la cabecera: el equipo revisa, no practica.
  if (sesion.rol !== "alumno") {
    return NextResponse.json({ guardado: false, motivo: "administrador" });
  }

  const alumnoId = sesion.alumnoId;

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });
  }

  const datos = objeto(cuerpo);
  if (!datos) return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });

  const bloqueId = cadena(datos.bloqueId);
  if (bloqueId === "") {
    return NextResponse.json({ error: "Falta bloqueId" }, { status: 400 });
  }

  switch (datos.tipo) {
    case "progreso": {
      const aciertos = entero(datos.aciertos);
      const total = entero(datos.total);
      if (aciertos === null || total === null) {
        return NextResponse.json({ error: "Recuento no válido" }, { status: 400 });
      }

      // El intento cierra el bloque, así que el avance parcial sobra.
      // En paralelo: son dos tablas distintas y ninguna espera a la otra.
      const [guardado] = await Promise.all([
        guardarProgreso(alumnoId, bloqueId, aciertos, total),
        borrarAvance(alumnoId, bloqueId),
      ]);

      return NextResponse.json({ guardado });
    }

    case "avance": {
      const indice = entero(datos.indice);
      const total = entero(datos.total);
      if (indice === null || total === null) {
        return NextResponse.json({ error: "Avance no válido" }, { status: 400 });
      }

      return NextResponse.json({ guardado: await guardarAvance(alumnoId, bloqueId, indice, total) });
    }

    case "produccion": {
      const ejercicioId = cadena(datos.ejercicioId);
      const texto = cadena(datos.texto);
      if (ejercicioId === "" || texto === "") {
        return NextResponse.json({ error: "Respuesta vacía" }, { status: 400 });
      }

      return NextResponse.json({
        guardado: await guardarRespuestaProduccion(alumnoId, bloqueId, ejercicioId, texto),
      });
    }

    default:
      return NextResponse.json({ error: "Tipo desconocido" }, { status: 400 });
  }
}
