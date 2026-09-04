// ---------------------------------------------------------------
// LA PUERTA DE LA CALLE
//
// Antes de esto, cualquiera con la URL veía el buscador con los 174
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
// LO QUE AQUÍ NO SE MIRA: si la sesión ha sido revocada. Eso exige
// consultar la tabla `sesiones`, y esto corre en Edge, donde no llega
// el cliente de Supabase —es server-only— y donde una consulta sería un
// viaje de red antes de CADA navegación, porque el matcher cubre casi
// todo. La revocación se comprueba en los guards, que corren en Node y
// una vez por página. Ver la cabecera de `lib/sesiones-lms.ts`.
//
// Corre en el runtime Edge, así que la verificación de la firma usa
// Web Crypto (ver `lib/sesion.ts`).
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE, abrirSesion } from "@/lib/sesion";
import { CABECERA_URL } from "@/lib/foco";

/**
 * Lo único a lo que se llega sin haber entrado.
 *
 * LAS TRES DE LOS AVISOS NO SON UN AGUJERO: ninguna se sirve sin
 * autorización, lo que pasa es que la suya no es la cookie.
 *
 *   · `/avisos` — la pantalla de baja. El alumno llega desde el correo,
 *     casi siempre en el móvil y sin haber entrado nunca. Lo que la
 *     autoriza es el token firmado del enlace, que no abre nada más.
 *     Detrás de la cookie, el enlace de baja llevaría a la pantalla de
 *     acceso, que es la forma más rápida de que marque el correo como
 *     spam.
 *
 *   · `/api/avisos` — el mismo token, para el botón de baja que enseñan
 *     Gmail y Outlook, que hace un POST sin abrir el navegador.
 *
 *   · `/api/avisos-apertura` — el cron. Vercel lo llama sin cookie y
 *     con `Authorization: Bearer CRON_SECRET`, que es lo que comprueba
 *     la propia ruta antes de hacer nada.
 */
const PUBLICAS = ["/acceso", "/entrar", "/avisos", "/api/avisos", "/api/avisos-apertura"];

function esPublica(ruta: string): boolean {
  return PUBLICAS.some((publica) => ruta === publica || ruta.startsWith(`${publica}/`));
}

/**
 * La URL de la petición, reenviada a los componentes de servidor.
 *
 * HACE FALTA POR LOS LAYOUTS. Una página recibe `searchParams`, pero un
 * layout no: es la limitación del App Router que impide que
 * `app/curso/[slug]/layout.tsx` —donde vive la cabecera con la
 * navegación— sepa a qué alumno apunta el contexto de revisión.
 *
 * Sacar la cabecera del layout para que fuera una página la que lea el
 * parámetro deshace el arreglo que la puso ahí: volvería a
 * re-renderizarse en cada salto de lección. Así que lo que viaja es la
 * URL, y `focoActual()` la lee desde los dos sitios por igual.
 *
 * Va en la petición y no en la respuesta: es un dato de entrada para el
 * servidor, no algo que el navegador deba ver.
 *
 * `set` Y NO `append`, QUE ES LA PARTE QUE IMPORTA: si el visitante manda
 * su propia cabecera con este nombre, aquí se PISA con la URL de verdad.
 * Sin eso, lo que llegaría al servidor sería una URL elegida por quien
 * pregunta. Hoy no habría con qué aprovecharlo —a un alumno se le ignora
 * el foco entero, ver `focoActual`— pero el que lea esta cabecera dentro
 * de un año no tiene por qué volver a comprobarlo.
 *
 * Por lo mismo pasan por aquí TAMBIÉN las rutas públicas, que no leen
 * nada de esto: así no queda ni un camino por el que la cabecera llegue
 * al servidor con un valor que no haya puesto el middleware.
 */
function conUrl(peticion: NextRequest) {
  const cabeceras = new Headers(peticion.headers);
  cabeceras.set(CABECERA_URL, peticion.nextUrl.toString());
  return NextResponse.next({ request: { headers: cabeceras } });
}

/**
 * ¿Esto lo ha pedido el navegador NAVEGANDO, o un `fetch`?
 *
 * Solo decide CÓMO se dice que no hay sesión, nunca si se deja pasar. Si
 * esta función se equivoca en cualquiera de los dos sentidos, la ruta de
 * destino vuelve a leer la cookie por su cuenta y responde lo que le
 * toque: no hay ninguna puerta colgando de que acierte.
 *
 * `Sec-Fetch-Mode` es la señal buena. La pone el navegador, no se puede
 * escribir desde el JavaScript de la página, y vale `navigate` para una
 * navegación de nivel superior —escribir la URL, pulsar un enlace,
 * ENVIAR UN FORMULARIO— frente a `cors`, `same-origin` o `no-cors` para
 * un `fetch`.
 *
 * El `accept` es la reserva para quien no la mande (Safari por debajo de
 * 16.4): una navegación pide `text/html` y ningún `fetch` de esta
 * aplicación lo hace.
 */
function esNavegacion(peticion: NextRequest): boolean {
  const modo = peticion.headers.get("sec-fetch-mode");
  if (modo !== null) return modo === "navigate";
  return (peticion.headers.get("accept") ?? "").includes("text/html");
}

export async function middleware(peticion: NextRequest) {
  const { pathname } = peticion.nextUrl;

  // El `matcher` ya las deja fuera. Se repite aquí porque un matcher es
  // una expresión regular larga y fácil de romper sin darse cuenta:
  // esta comprobación es la que se lee.
  if (esPublica(pathname)) return conUrl(peticion);

  const sesion = await abrirSesion(peticion.cookies.get(NOMBRE_COOKIE)?.value);
  if (sesion) return conUrl(peticion);

  // A la API se le contesta con un 401, no con una redirección: quien
  // la llama es `fetch`, y una redirección a HTML le llegaría como una
  // respuesta correcta que no sabe leer.
  //
  // PERO NO TODA LA API LA LLAMA UN `fetch`. `/api/progreso-leccion` es
  // el destino de un formulario de HTML, y eso es deliberado: es lo que
  // hace que "Completar y continuar" —la acción principal de la
  // lección— funcione aunque no haya cargado el JavaScript. A un
  // formulario el navegador le PINTA la respuesta, así que el alumno
  // cuya cookie de 30 días había caducado se encontraba el objeto JSON
  // en crudo en mitad de la pantalla: sin cabecera, sin logotipo y sin
  // más salida que el botón de atrás.
  //
  // Así que una navegación se deja pasar y contesta la ruta, que sabe
  // responderle a su propio llamador: `app/api/progreso-leccion` hace un
  // 303 a `/acceso`, que es lo que el navegador entiende. Ese redirect
  // estaba escrito desde el principio y no llegaba a ejecutarse nunca.
  //
  // DEJARLA PASAR NO ABRE NADA. Todas las rutas de `/api` vuelven a leer
  // la cookie con `sesionActual()` antes de tocar nada, que es la regla
  // de la cabecera de `lib/sesion-servidor.ts`: esto es la puerta de la
  // calle y allí está la cerradura de cada habitación.
  if (pathname.startsWith("/api/")) {
    if (!esNavegacion(peticion)) {
      return NextResponse.json(
        { error: "Tu sesión ha caducado. Vuelve a entrar desde el enlace de tu email." },
        { status: 401 }
      );
    }

    // La cookie se retira igual que en la redirección de abajo: ya
    // sabemos que no vale, y la ruta no puede hacerlo por su cuenta
    // porque su respuesta es un redirect que no la toca.
    const respuesta = conUrl(peticion);
    respuesta.cookies.delete(NOMBRE_COOKIE);
    return respuesta;
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
    //
    // `logo-drc.png` ESTÁ AQUÍ POR DOS RAZONES, Y LA SEGUNDA NO SE VE.
    // La primera es que la pantalla de acceso lo pinta, y quien la abre
    // todavía no tiene sesión: protegido, el logotipo de la pantalla de
    // entrar se redirige a la pantalla de entrar.
    //
    // La segunda es que `next/image` no lee el archivo del disco: para
    // optimizarlo se lo pide al propio servidor por HTTP, y esa petición
    // vuelve a pasar por aquí. Sin sesión recibía el 307 a `/acceso`, o
    // sea HTML, y el optimizador respondía 400 "The requested resource
    // isn't a valid image". La imagen no salía en NINGUNA pantalla
    // mientras el navegador no tuviera cookie, y el hueco quedaba en
    // blanco sin un solo error en consola.
    //
    // `/lecciones/` NO se abre: esas son las imágenes de los ejercicios,
    // que son el material del curso y sí van detrás de la puerta.
    "/((?!acceso(?:/|$)|entrar(?:/|$)|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|logo-drc\\.png).*)",
  ],
};
