// ---------------------------------------------------------------
// EL IDIOMA, DESDE EL SERVIDOR
//
// Lo que usan los componentes de servidor y las páginas para saber en
// qué idioma tienen que pintar. El cliente no pasa por aquí: allí el
// idioma llega por contexto, desde `components/ProveedorIdioma.tsx`.
//
// Va en `cache()` por lo mismo que `sesionActual`: una sola página lo
// pregunta desde la cabecera, desde el contenido y desde dos o tres
// componentes más, y sin esto se abriría el sobre de cookies una vez por
// llamada.
//
// LEER LA COOKIE HACE DINÁMICA LA RUTA. Aquí no cambia nada: todas las
// páginas del LMS ya lo son —dependen de la sesión del alumno— y por eso
// llevan `force-dynamic` desde antes de que esto existiera.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { COOKIE_IDIOMA, IDIOMA_POR_DEFECTO, esIdioma, type Idioma } from "@/lib/idioma";
import { TEXTOS, type Textos } from "@/lib/textos";

/** En qué idioma quiere leer quien está pidiendo esta página. */
export const idiomaActual = cache((): Idioma => {
  const guardado = cookies().get(COOKIE_IDIOMA)?.value;
  return esIdioma(guardado) ? guardado : IDIOMA_POR_DEFECTO;
});

/** Los textos ya resueltos. Es lo que usan las páginas. */
export function textosActuales(): Textos {
  return TEXTOS[idiomaActual()];
}
