// ---------------------------------------------------------------
// VALIDACIÓN DEL ENLACE DEL EMAIL
//
// Es un route handler y no una página porque hay que escribir una
// cookie, y un Server Component no puede hacerlo.
//
// El flujo: se comprueba la firma y la caducidad del token, se mira si
// ese email es del equipo o de un alumno, se abre fila en `sesiones` y
// se cambia el token de 15 minutos por la cookie de 30 días. El rol se
// decide AQUÍ, en el servidor, a partir del email firmado. Nada de lo
// que traiga la URL más allá del token entra en la decisión.
//
// Esta es la única puerta por la que se puede entrar como administrador.
// La de WooCommerce (`./woo`) solo abre sesiones de alumno.
// ---------------------------------------------------------------

import { type NextRequest } from "next/server";
import { buscarAlumnoPorEmail } from "@/lib/gestion";
import { entrarComo, volverAAcceso } from "@/lib/entrada";
import { guardarVinculo } from "@/lib/vinculos";
import { abrirTokenEnlace, esAdministrador, type Sesion } from "@/lib/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(peticion: NextRequest) {
  const token = peticion.nextUrl.searchParams.get("token") ?? "";
  const email = await abrirTokenEnlace(token);

  if (!email) return volverAAcceso(peticion.url, "caducado");

  let sesion: Sesion;

  if (esAdministrador(email)) {
    sesion = { rol: "admin", email, alumnoId: null };
  } else {
    // El email estaba en la vista cuando se pidió el enlace, pero
    // podría no estarlo ya: se vuelve a comprobar antes de dar sesión.
    const alumno = await buscarAlumnoPorEmail(email);
    if (!alumno) return volverAAcceso(peticion.url, "sinficha");
    sesion = { rol: "alumno", email, alumnoId: alumno.alumnoId };

    // Deja anotada la correspondencia email ↔ alumno aunque este alumno
    // no haya pulsado nunca el botón de WooCommerce. Así, el día que lo
    // pulse, su fila ya existe y solo hay que añadirle el woo_user_id.
    // Si falla no se hace nada: es un atajo, no un requisito para
    // entrar.
    await guardarVinculo(alumno.alumnoId, email, null);
  }

  return entrarComo(peticion.url, sesion, "magic_link");
}
