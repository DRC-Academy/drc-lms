"use server";

// ---------------------------------------------------------------
// PEDIR UN ENLACE
//
// La regla que manda en todo este fichero: la respuesta es SIEMPRE la
// misma, exista el email o no. Si dijéramos "ese email no está
// registrado", cualquiera podría averiguar quién estudia en la
// academia probando direcciones una a una. Eso incluye el texto, el
// tipo de respuesta y —en la medida en que se pueda— el tiempo que
// tarda en llegar.
// ---------------------------------------------------------------

import { buscarAlumnoPorEmail } from "@/lib/gestion";
import { crearTokenEnlace, esAdministrador, esEmailPlausible, normalizarEmail } from "@/lib/sesion";
import { enviarEnlaceAcceso } from "@/lib/correo";
import type { EstadoAcceso } from "@/app/acceso/estado";
// ⚠ TEMPORAL — ver lib/diagnostico.ts
import { diag, ofuscarEmail, radiografiaEmailsAdmin } from "@/lib/diagnostico";

const MENSAJE_NEUTRO = "Si ese email está registrado, te hemos enviado un enlace para entrar.";

/**
 * Suelo de respuesta. Sin él, un email desconocido contestaría en lo
 * que tarda una consulta y uno registrado en lo que tarda además el
 * envío del correo: la diferencia de tiempo delataría cuál es cuál sin
 * necesidad de leer el mensaje.
 *
 * LIMITACIÓN: esto iguala el suelo, no el techo. Si Resend tarda más de
 * medio segundo, el email registrado sigue respondiendo algo más tarde.
 * Para cerrarlo del todo habría que sacar el envío de la petición y
 * encolarlo, y para eso hace falta base propia. Con base propia toca
 * además limitar los intentos por email y por IP, que hoy tampoco se
 * puede hacer sin dónde contarlos.
 */
const SUELO_MS = 500;

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Mira si ese email puede entrar y, si puede, le manda el enlace.
 * No devuelve nada: lo que pasa aquí dentro no sale al visitante.
 */
async function atender(email: string): Promise<void> {
  // ⚠ TEMPORAL — ver lib/diagnostico.ts
  // Se lee del entorno aquí, y no dentro de `esAdministrador`, para ver
  // exactamente lo mismo que ve esa función en esta misma invocación.
  diag("2/6 EMAILS_ADMIN", radiografiaEmailsAdmin(process.env.EMAILS_ADMIN, normalizarEmail));

  // La búsqueda del alumno se hace SIEMPRE, también para los del
  // equipo. Comprobar primero si es administrador y ahorrarse la
  // consulta haría que esos emails respondieran antes, y eso también
  // es información que se filtra.
  const alumno = await buscarAlumnoPorEmail(email);

  // ⚠ TEMPORAL — ver lib/diagnostico.ts
  // `buscarAlumnoPorEmail` devuelve null tanto si el email no está en
  // Gestión como si la consulta falló; en el segundo caso deja además
  // un `[gestion]` en el log. Los dos casos se ven aquí como "no".
  diag("3/6 Gestión", { encontrado: alumno === null ? "no" : "sí" });

  const esAdmin = esAdministrador(email);
  const puedeEntrar = alumno !== null || esAdmin;

  // ⚠ TEMPORAL — ver lib/diagnostico.ts
  diag("4/6 decisión", {
    esAdministrador: esAdmin ? "sí" : "NO",
    puedeEntrar: puedeEntrar ? "sí" : "NO",
    corta_aqui: puedeEntrar ? "no" : "SÍ (no se llama a Resend)",
  });

  if (!puedeEntrar) return;

  // ⚠ TEMPORAL — ver lib/diagnostico.ts
  diag("5/6 llamando a enviarEnlaceAcceso", { destinatario: ofuscarEmail(email) });

  const enviado = await enviarEnlaceAcceso(email, await crearTokenEnlace(email));

  // ⚠ TEMPORAL — ver lib/diagnostico.ts
  diag("6/6 resultado del envío", { enviado: enviado ? "sí" : "NO" });

  if (!enviado) {
    // El visitante ve el mensaje de siempre; el aviso se queda en el
    // log, que es donde alguien puede hacer algo al respecto.
    console.error("[acceso] Un enlace válido no llegó a enviarse. Revisa RESEND_API_KEY y el remitente.");
  }
}

export async function solicitarEnlace(datos: FormData): Promise<EstadoAcceso> {
  const email = normalizarEmail(datos.get("email"));

  // ⚠ TEMPORAL — ver lib/diagnostico.ts
  // Si esta línea no aparece en los logs, la Server Action ni siquiera
  // se está ejecutando y el problema está antes: en el formulario o en
  // el despliegue, no en este flujo.
  diag("1/6 solicitud recibida", {
    email: ofuscarEmail(email),
    plausible: esEmailPlausible(email) ? "sí" : "NO",
    entorno: process.env.VERCEL_ENV ?? "(fuera de Vercel)",
  });

  // Esto sí se puede contar: que un email esté mal escrito se ve sin
  // preguntarle a nadie, así que decirlo no revela quién está dado de
  // alta y ahorra al alumno esperar un correo que nunca iba a llegar.
  if (!esEmailPlausible(email)) {
    return {
      estado: "invalido",
      mensaje: "Ese email no parece completo. Revísalo y vuelve a probar.",
    };
  }

  try {
    await Promise.all([atender(email), esperar(SUELO_MS)]);
  } catch (error) {
    // Ni una excepción cambia la respuesta: si Gestión no contesta, el
    // visitante no tiene por qué enterarse de que ese email existía.
    console.error("[acceso] Falló la petición de enlace:", error);
  }

  return { estado: "enviado", mensaje: MENSAJE_NEUTRO };
}
