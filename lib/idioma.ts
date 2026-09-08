// ---------------------------------------------------------------
// EL IDIOMA DE LA APLICACIÓN
//
// Módulo puro y diminuto a propósito: lo importan el servidor, el
// cliente y el proveedor de contexto, y si trajera algo de cualquiera de
// los tres no podría importarlo otro.
//
// ---------------------------------------------------------------
// POR QUÉ UNA COOKIE Y NO `localStorage`
//
// Empezó en `localStorage`, cuando lo único bilingüe era la pantalla de
// ejercicios y esa pantalla es un componente de cliente. Dejó de valer
// en cuanto la aplicación entera pasó a tener dos idiomas: la cabecera,
// el curso, la ruta y el inicio se renderizan EN EL SERVIDOR, y allí
// `localStorage` no existe.
//
// Con `localStorage` el servidor tendría que pintar siempre el idioma
// por defecto y el navegador corregirlo al hidratar. Para sesenta
// cadenas dentro de un componente de cliente eso era un parpadeo de un
// frame; para la aplicación entera es cada página cambiando de idioma
// delante del alumno, en cada navegación, para siempre.
//
// Una cookie la lee el servidor ANTES de pintar, así que el HTML sale ya
// en su idioma. Y la lee también el cliente, que es lo que permite que
// el botón responda al instante sin esperar al servidor.
//
// NO ES `httpOnly`, y tiene que no serlo: el botón la escribe desde el
// navegador. No protege nada —es una preferencia de lectura, no una
// credencial— así que no hay nada que un `httpOnly` pudiera guardar.
// ---------------------------------------------------------------

export type Idioma = "en" | "es";

/**
 * El idioma con el que se abre la aplicación.
 *
 * Inglés. La academia enseña inglés y la práctica es en inglés; el
 * español está a un botón para quien lo necesite, y a partir de ahí se
 * le recuerda.
 */
export const IDIOMA_POR_DEFECTO: Idioma = "en";

export const COOKIE_IDIOMA = "drc_idioma";

/** Un año. Es una preferencia, no una sesión: no tiene por qué caducar. */
export const MAX_EDAD_COOKIE = 60 * 60 * 24 * 365;

export function esIdioma(valor: unknown): valor is Idioma {
  return valor === "en" || valor === "es";
}

/** El otro. El botón solo alterna entre dos. */
export function elOtro(idioma: Idioma): Idioma {
  return idioma === "en" ? "es" : "en";
}

/** Lo que se escribe en `document.cookie` para dejarlo guardado. */
export function cookieDeIdioma(idioma: Idioma): string {
  return `${COOKIE_IDIOMA}=${idioma}; path=/; max-age=${MAX_EDAD_COOKIE}; SameSite=Lax`;
}
