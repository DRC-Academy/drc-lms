// ---------------------------------------------------------------
// LA PUERTA DE LA CALLE
//
// Antes de esto, cualquiera con la URL veía el buscador con los 184
// alumnos y podía abrir la ficha de quien quisiera: nivel, profesor,
// ocupación y las observaciones del profesor sobre sus errores. Son
// datos personales de gente que paga.
//
// Aquí solo se comprueba UNA cosa: que la petición trae una cookie de
// sesión con firma válida y sin caducar. Quién es esa persona y qué
// puede ver se decide en cada página con `lib/sesion-servidor.ts`, que
// vuelve a leer la cookie en el servidor. La autorización no vive aquí
// a propósito: si estuviera repetida en los dos sitios acabaría
// divergiendo, y de las dos capas la de la página es la que no se
// puede saltar.
//
// Corre en el runtime Edge, así que la verificación de la firma usa
// Web Crypto (ver `lib/sesion.ts`).
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE, abrirSesion } from "@/lib/sesion";

/** Lo único a lo que se llega sin haber entrado. */
const PUBLICAS = ["/acceso", "/entrar"];

function esPublica(ruta: string): boolean {
  return PUBLICAS.some((publica) => ruta === publica || ruta.startsWith(`${publica}/`));
}

export async function middleware(peticion: NextRequest) {
  const { pathname } = peticion.nextUrl;

  // El `matcher` ya las deja fuera. Se repite aquí porque un matcher es
  // una expresión regular larga y fácil de romper sin darse cuenta:
  // esta comprobación es la que se lee.
  if (esPublica(pathname)) return NextResponse.next();

  const sesion = await abrirSesion(peticion.cookies.get(NOMBRE_COOKIE)?.value);
  if (sesion) return NextResponse.next();

  // A la API se le contesta con un 401, no con una redirección: quien
  // la llama es `fetch`, y una redirección a HTML le llegaría como una
  // respuesta correcta que no sabe leer.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Tu sesión ha caducado. Vuelve a entrar desde el enlace de tu email." },
      { status: 401 }
    );
  }

  const respuesta = NextResponse.redirect(new URL("/acceso", peticion.url));
  // Si venía una cookie caducada o manipulada, se retira: si no, el
  // navegador la seguiría mandando en cada petición.
  respuesta.cookies.delete(NOMBRE_COOKIE);
  return respuesta;
}

export const config = {
  matcher: [
    // Todo menos las dos rutas públicas y lo que sirve el propio Next.
    // `_next/static` y `_next/image` son los assets del build, y los
    // ficheros sueltos de la raíz (favicon, robots) tampoco son datos
    // de nadie.
    "/((?!acceso(?:/|$)|entrar(?:/|$)|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
