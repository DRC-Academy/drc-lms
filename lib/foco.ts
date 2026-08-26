// ---------------------------------------------------------------
// EL ALUMNO EN FOCO
//
// Casi todas las pantallas del producto —el curso, la lección, "Para
// ti", "Mi progreso"— hablan de UN alumno. Para el alumno ese es él
// mismo y sale de la cookie. Para el equipo no: entra por el buscador,
// abre una ficha y a partir de ahí quiere recorrer el producto de ESA
// persona sin dejar de ser administrador.
//
// El alumno en foco es eso: de quién habla la pantalla, que no es lo
// mismo que quién la está mirando.
//
// POR QUÉ VIAJA EN LA URL Y NO EN UNA COOKIE
//
// Se probó primero con cookie —una sola escritura al abrir la ficha y
// ningún enlace que tocar— y se descartó por dos motivos que no tienen
// arreglo:
//
//   1. DOS PESTAÑAS. Un profesor abre a Marta en una pestaña y a Luis en
//      otra, que es exactamente lo que se hace cuando se comparan dos
//      fichas. Con una cookie por navegador, la segunda le cambia el
//      alumno a la primera y nadie se entera: la pantalla sigue diciendo
//      el nombre de Marta y enseñando el curso de Luis.
//   2. ESTADO PEGAJOSO. Una cookie de foco sobrevive a la visita. Al
//      volver mañana, el equipo entraría revisando a alguien sin
//      haberlo pedido.
//
// En la URL no pasa ninguna de las dos: cada pestaña lleva la suya y el
// contexto se acaba cuando se acaba el enlace.
//
// ESTO NO ES UNA LLAVE. El parámetro NO autoriza nada: solo dice de
// quién se habla. Quién puede mirar lo decide `lib/sesion-servidor.ts`
// leyendo la cookie firmada, y a un alumno se le ignora el parámetro
// entero —ver `focoActual`—. Escribir sigue saliendo siempre de la
// cookie y nunca de aquí: ver la cabecera de `app/api/progreso`.
//
// Módulo puro y sin `server-only`: lo usan las páginas (servidor) y los
// componentes que pintan enlaces (cliente).
// ---------------------------------------------------------------

/** Cómo se llama el parámetro en la barra de direcciones. */
export const PARAM_FOCO = "alumno";

/**
 * La cabecera con la que el middleware le pasa la URL al servidor.
 *
 * Existe solo porque los layouts del App Router no reciben
 * `searchParams` y la cabecera con la navegación vive en uno. Ver
 * `conUrl` en `middleware.ts`.
 */
export const CABECERA_URL = "x-drc-url";

/**
 * El enlace, con el contexto de revisión pegado si lo hay.
 *
 * `foco` es null en el caso normal —un alumno en su propio producto— y
 * entonces esto devuelve el enlace tal cual: la URL del alumno no lleva
 * nada raro por el hecho de que el equipo pueda revisar.
 *
 * Se usa `URL` con una base ficticia en vez de pegar "?alumno=" a mano
 * porque hay enlaces que ya traen su propia consulta —el buscador del
 * panel lleva `?q=` y `?periodo=`— y concatenar produciría un segundo
 * "?" que se come el resto.
 */
export function conFoco(href: string, foco: string | null): string {
  if (!foco) return href;

  // Base ficticia: solo hace falta para poder parsear una ruta
  // relativa. Nunca sale de esta función.
  const url = new URL(href, "http://l");
  url.searchParams.set(PARAM_FOCO, foco);

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * El valor del parámetro tal y como llega, ya limpio.
 *
 * Devuelve null para cualquier cosa que no sea una cadena con algo
 * dentro. No comprueba que ese alumno exista: eso lo hace la pantalla al
 * leer su ficha, y si no existe se comporta como cualquier id que no
 * corresponde a nadie.
 */
export function leerFoco(valor: string | string[] | undefined): string | null {
  if (typeof valor !== "string") return null;

  const limpio = valor.trim();
  return limpio === "" ? null : limpio;
}
