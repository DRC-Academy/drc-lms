// ---------------------------------------------------------------
// POST /api/evento — LO QUE EL CHAT DE AYUDA LE CUENTA AL SERVIDOR
//
// El cliente lo manda sin esperar respuesta (`components/apuntarEvento.ts`):
// para quien usa el chat no cambia nada que esto vaya bien, mal o no
// llegue.
//
// DE QUIÉN ES EL EVENTO LO DICE LA COOKIE, no el cuerpo: el cuerpo solo
// dice qué pasó, y pasa por `leerEventoChat`, que solo deja ids del FAQ
// y claves cerradas. Sin sesión de alumno —el equipo revisando, las
// pantallas de prueba de /acceso— se responde 204 y no se apunta nada.
// ---------------------------------------------------------------

import { NextResponse } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import { estadoDeAcceso, respuestaImpago } from "@/lib/estado-acceso";
import { leerEventoChat } from "@/lib/eventos-chat";
import { apuntarEvento } from "@/lib/eventos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NADA = () => new NextResponse(null, { status: 204 });

export async function POST(peticion: Request) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno") return NADA();
  if ((await estadoDeAcceso(sesion)) === "impago") return respuestaImpago();

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "cuerpo no JSON" }, { status: 400 });
  }

  const evento = leerEventoChat(cuerpo);
  if (!evento) return NextResponse.json({ error: "evento no válido" }, { status: 400 });

  await apuntarEvento(sesion.alumnoId, evento.tipo, evento.datos);
  return NADA();
}
