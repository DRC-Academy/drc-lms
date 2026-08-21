// ---------------------------------------------------------------
// LA BAJA DE UN CLIC, LA DEL BOTÓN DE GMAIL
//
// Es la URL que va en la cabecera `List-Unsubscribe` del correo. Gmail
// y Outlook enseñan por ella su propio botón de «Cancelar suscripción»
// arriba del mensaje, y ese botón hace un POST sin abrir nada. Existe
// para que el alumno tenga a mano algo más cómodo que marcar spam.
//
// SOLO POST, y por eso está aquí y no en la página. Los escáneres de
// correo —antivirus, prefetch de clientes, proxies corporativos— siguen
// los enlaces de un mensaje con GET: si esta ruta respondiera a GET
// dando de baja, daría de baja a gente que no ha pulsado nada. El
// enlace visible del pie lleva a `/avisos/baja`, que pregunta antes.
//
// La autorización es el token firmado: no hace falta sesión, y es lo
// correcto —el alumno abre el correo en el móvil, sin haber entrado—.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { abrirTokenBaja } from "@/lib/sesion";
import { guardarPreferenciaAvisos } from "@/lib/avisos-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(peticion: NextRequest) {
  const token = peticion.nextUrl.searchParams.get("t") ?? "";
  const alumnoId = await abrirTokenBaja(token);

  if (alumnoId === null) {
    return NextResponse.json({ error: "enlace no válido" }, { status: 400 });
  }

  const guardado = await guardarPreferenciaAvisos(alumnoId, false, "alumno");

  // El cliente de correo no enseña este cuerpo: lo único que mira es
  // que la respuesta sea 2xx. Un fallo se devuelve como 500 para que
  // Gmail no dé la baja por hecha.
  return NextResponse.json({ ok: guardado }, { status: guardado ? 200 : 500 });
}
