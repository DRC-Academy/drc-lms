// ---------------------------------------------------------------
// LA DIRECCIÓN PÚBLICA DEL LMS
//
// Única fuente de la URL base con la que se montan los enlaces que
// SALEN del servidor: el enlace de acceso, el aviso de contenido nuevo,
// sus enlaces de baja. Todo lo que manda a un alumno a este sitio desde
// fuera de una petición pasa por aquí.
//
// Sale de una sola variable, URL_BASE, y si falta o está mal escrita se
// LANZA. No hay escalera de alternativas, a propósito:
//
//   · Nada de `VERCEL_URL`. Es el host del despliegue concreto, que
//     está protegido (401) y que desaparece cuando Vercel lo limpia
//     (404 DEPLOYMENT_NOT_FOUND). Un correo vive más que un despliegue.
//   · Nada de `localhost` por defecto. Un enlace a localhost en el buzón
//     de un alumno es tan inservible como uno roto, y peor de detectar.
//   · Nada del encabezado `Host`. Se puede falsear, y entonces el token
//     del alumno viajaría en un enlace al servidor de otro.
//
// Las redirecciones DENTRO de una petición (`/entrar`, `/salir`…) no
// usan esto: van relativas a `peticion.url`, el host por el que el
// navegador acaba de entrar, que por definición funciona.
//
// Sin `server-only`: no lee nada secreto, y así lo pueden importar los
// scripts de `scripts/` sin el apaño del módulo vacío.
// ---------------------------------------------------------------

export const VARIABLE_URL_BASE = "URL_BASE";

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1"]);

/**
 * El origen público del LMS, sin barra final: `https://drc-lms.vercel.app`.
 *
 * Lanza si URL_BASE falta, no es una URL, no es https (salvo en local)
 * o trae ruta, query o fragmento. Quien la llame decide qué hace con el
 * error, pero nunca debe sustituirlo por otra dirección.
 */
export function urlPublica(): string {
  const valor = process.env[VARIABLE_URL_BASE]?.trim() ?? "";

  if (valor === "") {
    throw new Error(
      `Falta ${VARIABLE_URL_BASE}: es la dirección pública del LMS con la que se montan los enlaces de los correos ` +
        `(p. ej. https://drc-lms.vercel.app). Defínela en Vercel → Settings → Environment Variables.`
    );
  }

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new Error(`${VARIABLE_URL_BASE} no es una URL válida: «${valor}».`);
  }

  const local = HOSTS_LOCALES.has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error(`${VARIABLE_URL_BASE} tiene que ser https (salvo localhost): «${valor}».`);
  }

  if (url.pathname.replace(/\/+$/, "") !== "" || url.search !== "" || url.hash !== "" || url.username !== "") {
    throw new Error(`${VARIABLE_URL_BASE} tiene que ser solo el origen, sin ruta ni parámetros: «${valor}».`);
  }

  return url.origin;
}
