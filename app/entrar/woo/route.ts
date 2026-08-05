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
// administrador, se llevaría de un golpe la ficha de los 184: nivel,
// profesor, ocupación y las observaciones del profesor sobre cada uno.
// Limitado a alumno, lo peor que consigue es suplantar a uno.
//
// El equipo entra por el enlace del correo, que no depende de
// WordPress. Un administrador que pulse este botón acaba con sesión de
// alumno si tiene ficha, y en /acceso si no la tiene. Es incómodo y es
// deliberado.
// ---------------------------------------------------------------

import { type NextRequest } from "next/server";
import { buscarAlumnoPorEmail } from "@/lib/gestion";
import { entrarComo, volverAAcceso } from "@/lib/entrada";
import { abrirTokenWoo } from "@/lib/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(peticion: NextRequest) {
  const token = peticion.nextUrl.searchParams.get("token") ?? "";
  const email = await abrirTokenWoo(token);

  if (!email) return volverAAcceso(peticion.url, "caducado");

  // Que haya comprado en WooCommerce no basta: solo entra quien tiene
  // ficha en Gestión, que es de donde sale todo lo que enseña el LMS.
  // Si alguien compró con un email y está dado de alta con otro, cae
  // aquí y el aviso le dice que escriba a su profesor.
  const alumno = await buscarAlumnoPorEmail(email);
  if (!alumno) return volverAAcceso(peticion.url, "sinficha");

  return entrarComo(peticion.url, { rol: "alumno", email, alumnoId: alumno.alumnoId });
}
