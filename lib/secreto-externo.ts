// ---------------------------------------------------------------
// EL SECRETO DE LAS RUTAS EXTERNAS (/api/externo/*)
//
// Un secreto fijo en una cabecera, comparado contra `SECRETO_GESTION`.
// Es el mismo patrón que `/api/external/payouts` en DRC Gestión
// (`lib/externalAuth.ts` allí), y es a propósito lo más simple que
// sirve: un único consumidor de confianza —Gestión— llamando de
// servidor a servidor.
//
// DE SERVIDOR A SERVIDOR, no desde el navegador. No se emiten cabeceras
// CORS justamente para que no se pueda: si Gestión llamara desde el
// cliente, el secreto viajaría en su bundle y sería público. La llamada
// tiene que salir de una route handler o un componente de servidor del
// otro proyecto.
//
// NO ES LA COOKIE. Todas las demás rutas de `/api` vuelven a leer la
// sesión del alumno antes de tocar nada —la regla de la cabecera de
// `lib/sesion-servidor.ts`—. Estas no tienen alumno delante: las llama
// otra aplicación, y lo que las autoriza es esto. Por eso el middleware
// las deja pasar como públicas y la cerradura está aquí.
// ---------------------------------------------------------------

import "server-only";
import { timingSafeEqual } from "node:crypto";

export const CABECERA_SECRETO = "x-gestion-secret";

/**
 * Comparación en tiempo constante: un `===` filtra el secreto carácter
 * a carácter. `timingSafeEqual` exige la misma longitud; comparar las
 * longitudes antes no filtra nada útil —la longitud del secreto no es
 * el secreto—.
 */
function coinciden(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Null si la petición está autorizada, o la respuesta con la que hay
 * que contestar.
 *
 * SIN LA VARIABLE, 503 Y NO DEJA PASAR. Un endpoint que se abre solo
 * porque falta una variable de entorno es la forma habitual de publicar
 * datos sin enterarse. El mínimo de 32 caracteres es el mismo que pide
 * `SECRETO_SESION`.
 *
 * SI NO COINCIDE, 401 Y NADA MÁS: sin cuerpo, sin pista de qué cabecera
 * falta. Quien tiene que llamar ya sabe cómo; a quien no, no se le
 * explica.
 */
export function exigirSecretoExterno(peticion: Request): Response | null {
  const esperado = process.env.SECRETO_GESTION;
  if (!esperado || esperado.length < 32) {
    console.error("[externo] Falta SECRETO_GESTION en el entorno, o es demasiado corto: la ruta queda cerrada.");
    return Response.json(
      { error: "endpoint_no_configurado" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  const recibido = peticion.headers.get(CABECERA_SECRETO);
  if (!recibido || !coinciden(recibido, esperado)) {
    return new Response(null, { status: 401, headers: { "cache-control": "no-store" } });
  }

  return null;
}
