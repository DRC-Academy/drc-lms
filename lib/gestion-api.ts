// ---------------------------------------------------------------
// LA API DE DRC GESTIÓN, DE SERVIDOR A SERVIDOR
//
// Lo que Gestión publica para el LMS en `/api/lms/…`: hoy las
// recuperaciones (`lib/recuperaciones.ts`) y el autoservicio de horarios
// (`lib/autoservicio/`). Es lo único de este proyecto que ESCRIBE en
// Gestión, y lo hace por su API, nunca por la base: las reglas viven
// allí y no se escriben dos veces.
//
// EL SECRETO VA EN `x-lms-secret` (`LMS_GESTION_SECRET`). Es OTRO
// secreto que el de la dirección contraria —`SECRETO_GESTION`, con el
// que Gestión llama al LMS—: cada sentido tiene el suyo. Este módulo es
// server-only, así que el secreto no puede acabar en el bundle del
// navegador.
//
// NUNCA LANZA. Sin variables, sin respuesta a tiempo o con algo que no
// es JSON, sale como un 503 más: para el alumno es lo mismo, ahora no se
// puede. Cada módulo que llama decide qué le enseña.
// ---------------------------------------------------------------

import "server-only";

/** El tope de espera. Gestión responde en décimas; esto es para cuando no. */
const MS_ESPERA = 8000;

/** Gestión sin configurar en este entorno: no se llama y no se avisa en cada petición. */
function configuracion(): { base: string; secreto: string } | null {
  const base = process.env.GESTION_URL?.trim().replace(/\/+$/, "");
  const secreto = process.env.LMS_GESTION_SECRET?.trim();
  if (!base || !secreto) return null;
  return { base, secreto };
}

/** Lo que devuelve una llamada: el cuerpo, o por qué no lo hay. */
export type RespuestaGestion =
  | { ok: true; cuerpo: unknown }
  | { ok: false; status: number; error: string; mensaje: string | null; problemas: string[]; cuerpo?: unknown };

/**
 * Una llamada a la API de Gestión.
 *
 * `prefijo` es el del log (`[recuperaciones]`, `[autoservicio]`): quien
 * lea el log tiene que saber de qué pantalla venía la llamada que falló.
 *
 * El cuerpo de error se lee de `error`, `mensaje` y `problemas`, la
 * forma del contrato de recuperaciones. Va también entero en `cuerpo`,
 * para el contrato que nombre las cosas de otra manera.
 */
export async function llamarGestion(
  prefijo: string,
  ruta: string,
  init: { method: "GET" | "POST"; cuerpo?: unknown }
): Promise<RespuestaGestion> {
  const config = configuracion();
  if (!config) {
    console.error(`[${prefijo}] Faltan GESTION_URL o LMS_GESTION_SECRET: no se consulta Gestión.`);
    return { ok: false, status: 503, error: "no_configurado", mensaje: null, problemas: [] };
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.base}${ruta}`, {
      method: init.method,
      headers: {
        "x-lms-secret": config.secreto,
        accept: "application/json",
        ...(init.cuerpo !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.cuerpo !== undefined ? JSON.stringify(init.cuerpo) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(MS_ESPERA),
    });
  } catch (error) {
    console.error(`[${prefijo}] Gestión no responde (${init.method} ${ruta.split("?")[0]}):`, error);
    return { ok: false, status: 503, error: "sin_respuesta", mensaje: null, problemas: [] };
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    // Sin cuerpo JSON: una página de error de Vercel, o nada.
  }

  if (respuesta.ok) return { ok: true, cuerpo };

  const c = (typeof cuerpo === "object" && cuerpo !== null ? cuerpo : {}) as Record<string, unknown>;
  const error = typeof c.error === "string" ? c.error : "desconocido";
  if (respuesta.status === 401 || respuesta.status >= 500) {
    // El 401 es un secreto que no cuadra entre los dos proyectos: el
    // alumno no puede hacer nada, quien tiene que enterarse es el log.
    console.error(`[${prefijo}] Gestión respondió ${respuesta.status} (${error}) a ${init.method} ${ruta.split("?")[0]}.`);
  }
  return {
    ok: false,
    status: respuesta.status,
    error,
    mensaje: typeof c.mensaje === "string" && c.mensaje.trim() !== "" ? c.mensaje : null,
    problemas: Array.isArray(c.problemas) ? c.problemas.filter((p): p is string => typeof p === "string") : [],
    cuerpo,
  };
}
