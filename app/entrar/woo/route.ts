// ---------------------------------------------------------------
// ENTRADA DESDE WOOCOMMERCE
//
// El alumno ya está identificado en drcacademy.com. Este es el atajo
// que lo trae aquí sin pasar por el correo: WordPress firma su email y
// el botón lo manda a esta ruta.
//
// Los dos dominios están en registros distintos —drcacademy.com y
// vercel.app— así que no hay cookie que compartir. Lo único que cruza
// es el sobre firmado, y dura 60 segundos.
//
// ESTA PUERTA SOLO ABRE SESIONES DE ALUMNO, y es la decisión que
// sostiene todo el diseño. WordPress tiene la clave con la que se
// firman estos sobres, así que un WordPress comprometido puede pedir
// entrada como quien quiera. Si además pudiera entrar como
// administrador, se llevaría de un golpe la ficha de los 174: nivel,
// profesor, ocupación y las observaciones del profesor sobre cada uno.
// Limitado a alumno, lo peor que consigue es suplantar a uno.
//
// El equipo entra por el enlace del correo, que no depende de
// WordPress. Un administrador que pulse este botón acaba con sesión de
// alumno si tiene ficha, y en /acceso si no la tiene. Es incómodo y es
// deliberado.
//
// ---------------------------------------------------------------
// CÓMO SE RESUELVE QUIÉN ES
//
// Por orden, y el orden importa:
//
//   1. Por `woo_user_id`, si el sobre lo trae y ya está vinculado. Es
//      el camino que no depende del email.
//   2. Por email contra Gestión, que es lo que se hacía siempre. Al
//      resolverlo así se GUARDA el vínculo, de modo que la próxima vez
//      entra por el camino 1.
//
// El motivo de todo esto: el email es hoy la única llave entre los tres
// sistemas y el alumno puede cambiarlo en cualquiera de ellos. Con el
// vínculo fijado por id, cambiar de email deja de romper el botón.
//
// Resolver por vínculo NO salta la comprobación en Gestión. Se sigue
// exigiendo ficha, solo que se busca por id en vez de por email: que
// alguien tenga vínculo de hace meses no significa que siga siendo
// alumno de la academia.
// ---------------------------------------------------------------

import { type NextRequest } from "next/server";
import { buscarAlumnoPorEmail, obtenerPerfil } from "@/lib/gestion";
import { entrarComo, volverAAcceso } from "@/lib/entrada";
import { guardarVinculo, resolverPorWooUserId } from "@/lib/vinculos";
import { abrirTokenWoo } from "@/lib/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(peticion: NextRequest) {
  const token = peticion.nextUrl.searchParams.get("token") ?? "";
  const sobre = await abrirTokenWoo(token);

  if (!sobre) return volverAAcceso(peticion.url, "caducado");

  const { email, wooUserId } = sobre;

  // --- 1. por vínculo ---
  if (wooUserId !== null) {
    const vinculado = await resolverPorWooUserId(wooUserId);

    // Se confirma contra Gestión por id. Si ya no tiene ficha, no se
    // corta aquí: se cae al camino del email, que puede encontrarle si
    // el id de Gestión cambió en algún momento.
    if (vinculado && (await obtenerPerfil(vinculado))) {
      return entrarComo(
        peticion.url,
        { rol: "alumno", email, alumnoId: vinculado },
        "woocommerce"
      );
    }
  }

  // --- 2. por email ---
  // Que haya comprado en WooCommerce no basta: solo entra quien tiene
  // ficha en Gestión, que es de donde sale todo lo que enseña el LMS.
  // Si alguien compró con un email y está dado de alta con otro, cae
  // aquí y el aviso le dice que escriba a su profesor.
  const alumno = await buscarAlumnoPorEmail(email);
  if (!alumno) return volverAAcceso(peticion.url, "sinficha");

  // Y se fija el vínculo para la próxima. Si falla —un email duplicado
  // en Gestión, un woo_user_id que ya apuntaba a otro alumno— queda en
  // el log y se entra igual: el vínculo es un atajo, no un requisito.
  await guardarVinculo(alumno.alumnoId, email, wooUserId);

  return entrarComo(
    peticion.url,
    { rol: "alumno", email, alumnoId: alumno.alumnoId },
    "woocommerce"
  );
}
