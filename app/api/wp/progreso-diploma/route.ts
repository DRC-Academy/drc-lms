// ---------------------------------------------------------------
// POST /api/wp/progreso-diploma
//
// Cuántos meses del programa lleva un alumno, para la landing de
// drcacademy.com. Consumidor: WordPress, de servidor a servidor.
//
//   Cuerpo:    { "email": string, "u": number | null, "ts": number, "sig": string }
//   Respuesta: 200 { "meses": 0..6 }
//
// LA FIRMA. `sig` es HMAC-SHA256 en hexadecimal de
//
//     `${email normalizado}|${u, o vacío si es null}|${ts}`
//
// con DIPLOMA_HMAC_SECRET, una clave que solo comparten esta ruta y
// WordPress. `ts` son SEGUNDOS Unix (el `time()` de PHP) y vale cinco
// minutos hacia cada lado. `u` se firma tal cual llega, con `String(u)`:
// WordPress lo manda siempre como número y normalizarlo aquí sería
// firmar algo distinto de lo que firmó él.
//
// Un cuerpo que no se puede verificar —JSON roto, tipos que no son los
// del contrato, firma que no cuadra, `ts` fuera de plazo— recibe el
// mismo 401, sin decir cuál de las cosas falló. Sin la clave en el
// entorno, 500 sin detalles: es un fallo de configuración nuestro.
//
// QUIÉN ES, POR EL MISMO CAMINO QUE `app/entrar/woo`: primero el id de
// WordPress contra `alumno_vinculos`, con su perfil; si no hay vínculo o
// el perfil ya no está, el email contra Gestión. La cuenta demo la
// resuelve `buscarAlumnoPorEmail` por dentro, como en la entrada. Ni
// una consulta nueva, y nada se escribe.
//
// UN ALUMNO QUE NO EXISTE RECIBE 0, igual que uno que acaba de empezar:
// la respuesta no tiene que servir para saber qué emails estudian en la
// academia. Lo que sí queda es una línea en el log, sin el email, para
// poder contar cuántas visitas no se emparejan.
//
// El tramo lo calcula `mesesTranscurridos` (`lib/meses-landing.ts`):
// solo tiempo, nada de contenido ni de diploma.
// ---------------------------------------------------------------

import { createHmac, timingSafeEqual } from "node:crypto";
import { buscarAlumnoPorEmail, obtenerPerfil } from "@/lib/gestion";
import { resolverPorWooUserId } from "@/lib/vinculos";
import { normalizarEmail } from "@/lib/sesion";
import { mesesTranscurridos } from "@/lib/meses-landing";
import type { PerfilAlumno } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lo que puede separarse `ts` de nuestro reloj, hacia cada lado. */
const VENTANA_S = 300;

type Cuerpo = { email: string; u: number | null; ts: number; sig: string };

function json(cuerpo: unknown, status = 200): Response {
  return Response.json(cuerpo, { status, headers: { "cache-control": "no-store" } });
}

const NO_AUTORIZADO = () => json({ error: "no_autorizado" }, 401);

/** El cuerpo con la forma del contrato, o null. No mira la firma. */
function leerCuerpo(datos: unknown): Cuerpo | null {
  if (typeof datos !== "object" || datos === null) return null;
  const { email, u, ts, sig } = datos as Record<string, unknown>;
  if (typeof email !== "string") return null;
  if (u !== null && u !== undefined && typeof u !== "number") return null;
  if (typeof ts !== "number" || !Number.isSafeInteger(ts)) return null;
  if (typeof sig !== "string") return null;
  return { email, u: typeof u === "number" ? u : null, ts, sig };
}

/**
 * ¿La firma es la que toca? `timingSafeEqual` exige dos buffers de la
 * misma longitud, así que antes se comprueba que `sig` sean 64
 * caracteres hexadecimales: `Buffer.from(x, "hex")` no falla con basura,
 * la trunca en silencio.
 */
function firmaValida(secreto: string, mensaje: string, sig: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(sig)) return false;
  const esperada = createHmac("sha256", secreto).update(mensaje).digest();
  return timingSafeEqual(esperada, Buffer.from(sig, "hex"));
}

export async function POST(peticion: Request): Promise<Response> {
  const secreto = process.env.DIPLOMA_HMAC_SECRET;
  if (!secreto) {
    console.error("[wp/progreso-diploma] Falta DIPLOMA_HMAC_SECRET en el entorno.");
    return json({ error: "error_interno" }, 500);
  }

  let datos: unknown;
  try {
    datos = await peticion.json();
  } catch {
    return NO_AUTORIZADO();
  }

  const cuerpo = leerCuerpo(datos);
  if (!cuerpo) return NO_AUTORIZADO();

  const ahora = new Date();
  if (Math.abs(Math.floor(ahora.getTime() / 1000) - cuerpo.ts) > VENTANA_S) return NO_AUTORIZADO();

  const email = normalizarEmail(cuerpo.email);
  const mensaje = `${email}|${cuerpo.u === null ? "" : String(cuerpo.u)}|${cuerpo.ts}`;
  if (!firmaValida(secreto, mensaje, cuerpo.sig)) return NO_AUTORIZADO();

  try {
    let perfil: PerfilAlumno | null = null;

    // Mismo filtro que el sobre `woo` (`lib/sesion.ts`): un id que no es
    // un entero positivo no se busca.
    const { u } = cuerpo;
    if (u !== null && Number.isSafeInteger(u) && u > 0) {
      const vinculado = await resolverPorWooUserId(u);
      if (vinculado) perfil = await obtenerPerfil(vinculado);
    }

    if (!perfil) {
      const alumno = await buscarAlumnoPorEmail(email);
      if (alumno) perfil = await obtenerPerfil(alumno.alumnoId);
    }

    if (!perfil) {
      console.info(`progreso-diploma: sin coincidencia (${cuerpo.u === null ? "sin u" : "con u"})`);
      return json({ meses: 0 });
    }

    return json({ meses: mesesTranscurridos(perfil.fechaInicio, ahora) });
  } catch (error) {
    console.error("[wp/progreso-diploma] fallo al calcular:", error);
    return json({ error: "error_interno" }, 500);
  }
}
