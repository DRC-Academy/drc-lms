// ---------------------------------------------------------------
// A DÓNDE VOLVER DESPUÉS DE ENTRAR
//
// El alumno que pulsa un enlace de un correo —el de una recuperación,
// `/mis-clases?recuperacion=…`— sin sesión acaba en `/acceso`. Antes de
// esto, al entrar con el enlace mágico se le dejaba en el inicio y tenía
// que encontrar por su cuenta lo que había ido a hacer.
//
// El destino viaja en `?volver=` de `/acceso` a la acción que pide el
// enlace, dentro del enlace del correo y de ahí a `/entrar`, que es quien
// redirige. No va firmado porque no hace falta: solo se acepta una RUTA
// DE ESTE MISMO SITIO, así que lo peor que consigue quien lo manipule es
// abrir otra pantalla del LMS, que ya podía abrir escribiéndola.
//
// LA REGLA QUE IMPORTA: NUNCA FUERA DEL LMS. Un `?volver=` que admitiera
// dominios sería una redirección abierta: un correo falso con un enlace
// de verdad a drcacademy que acaba en una copia de la pantalla de entrar.
// Por eso no se mira si "empieza por /" y ya está —`//google.com` y
// `/\google.com` empiezan por barra y el navegador los lee como otro
// dominio—: se resuelve contra un origen inventado y se exige que siga
// siendo ese origen.
//
// Módulo puro: lo usa también el middleware, que corre en Edge.
// ---------------------------------------------------------------

const ORIGEN_FICTICIO = "http://lms.invalid";

/** Más largo que esto no lo genera ninguna pantalla del LMS. */
const LARGO_MAXIMO = 300;

/**
 * Rutas a las que no tiene sentido volver: las de entrar y salir (se
 * acabaría en un bucle) y la API (devuelve JSON, no una pantalla).
 */
const PROHIBIDAS = ["/acceso", "/entrar", "/salir", "/api"];

/**
 * La ruta interna a la que volver, o null si el valor no vale.
 *
 * Devuelve la ruta REESCRITA por el parser —ruta, consulta y ancla—, no
 * el texto recibido: así no sale de aquí nada que no se haya entendido.
 * La raíz da null: volver al inicio es lo que ya pasa sin `volver`.
 */
export function destinoSeguro(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (valor.length === 0 || valor.length > LARGO_MAXIMO) return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return null;
  // Tabuladores y saltos de línea: el parser de URL los quita en
  // silencio, y `/\t/google.com` acabaría siendo `//google.com`.
  if (/[\u0000-\u001f\u007f]/.test(valor)) return null;

  let url: URL;
  try {
    url = new URL(valor, ORIGEN_FICTICIO);
  } catch {
    return null;
  }
  if (url.origin !== ORIGEN_FICTICIO) return null;
  if (url.pathname === "/") return null;
  if (PROHIBIDAS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}
