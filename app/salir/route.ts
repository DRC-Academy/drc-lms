// ---------------------------------------------------------------
// CERRAR SESIÓN
//
// Dos cosas, y hacen falta las dos:
//
//   1. Se marca `revocada_en` en la fila de `sesiones`. Sin esto, el
//      valor de la cookie seguiría siendo válido durante 30 días para
//      quien lo hubiera copiado.
//   2. Se borra la cookie del navegador. Esto es lo que hace que el
//      cierre sea INMEDIATO para quien pulsa: ya no tiene nada que
//      presentar, pase lo que pase con el memo de 60 segundos.
//
// SOLO POST, y no es una manía REST. Si esto fuera un GET bastaría un
// `<Link>` para cerrarla, y Next hace prefetch de los enlaces visibles:
// la sesión se cerraría sola al pasar el ratón por encima del botón.
// Con POST hace falta un envío explícito.
//
// El formulario que lo llama está en `components/Cabecera.tsx` y es un
// form de HTML normal, así que funciona aunque no cargue el JavaScript.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE } from "@/lib/sesion";
import { sesionActual } from "@/lib/sesion-servidor";
import { revocarSesion } from "@/lib/sesiones-lms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(peticion: NextRequest) {
  const sesion = await sesionActual();

  if (sesion) {
    // Si la revocación falla queda en el log, pero se sigue: borrar la
    // cookie es lo que nota quien está delante, y dejarle dentro porque
    // la base tuvo un mal momento sería lo peor de las dos opciones.
    await revocarSesion(sesion.sesionId);
  }

  const respuesta = NextResponse.redirect(new URL("/acceso?motivo=salida", peticion.url), {
    // 303 y no 307: el 307 conserva el método, así que el navegador
    // repetiría el POST contra /acceso. Con 303 pasa a GET, que es lo
    // que se quiere después de enviar un formulario.
    status: 303,
  });

  respuesta.cookies.delete(NOMBRE_COOKIE);
  return respuesta;
}
