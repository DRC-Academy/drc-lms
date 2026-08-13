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
import { registrarIntento, type ResultadoIntento, type RolIntento } from "@/lib/accesos-servidor";
import type { EstadoAcceso } from "@/app/acceso/estado";

/** Lo que hay que dejar anotado, decidido dentro pero escrito fuera. */
type Anotacion = { resultado: ResultadoIntento; rol: RolIntento; alumnoId: string | null };

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
async function atender(email: string): Promise<Anotacion> {
  // La búsqueda del alumno se hace SIEMPRE, también para los del
  // equipo. Comprobar primero si es administrador y ahorrarse la
  // consulta haría que esos emails respondieran antes, y eso también
  // es información que se filtra.
  const alumno = await buscarAlumnoPorEmail(email);
  const admin = esAdministrador(email);
  const rol: RolIntento = alumno !== null ? "alumno" : admin ? "admin" : "desconocido";

  if (alumno === null && !admin) return { resultado: "sin_cuenta", rol, alumnoId: null };

  const enviado = await enviarEnlaceAcceso(email, await crearTokenEnlace(email));
  if (!enviado) {
    // El visitante ve el mensaje de siempre; el aviso se queda en el
    // log, que es donde alguien puede hacer algo al respecto.
    console.error("[acceso] Un enlace válido no llegó a enviarse. Revisa RESEND_API_KEY y el remitente.");
  }

  return {
    resultado: enviado ? "enlace_enviado" : "envio_fallido",
    rol,
    alumnoId: alumno?.alumnoId ?? null,
  };
}

export async function solicitarEnlace(datos: FormData): Promise<EstadoAcceso> {
  const email = normalizarEmail(datos.get("email"));

  // Esto sí se puede contar: que un email esté mal escrito se ve sin
  // preguntarle a nadie, así que decirlo no revela quién está dado de
  // alta y ahorra al alumno esperar un correo que nunca iba a llegar.
  if (!esEmailPlausible(email)) {
    await registrarIntento({ resultado: "email_invalido", rol: "desconocido" });
    return {
      estado: "invalido",
      mensaje: "Ese email no parece completo. Revísalo y vuelve a probar.",
    };
  }

  // Por defecto se anota como "sin cuenta": es lo que hay que registrar
  // si `atender` se rompe a mitad, y es además el desenlace más
  // frecuente de los que no acaban en enlace.
  let anotacion: Anotacion = { resultado: "sin_cuenta", rol: "desconocido", alumnoId: null };

  try {
    const [resultado] = await Promise.all([atender(email), esperar(SUELO_MS)]);
    anotacion = resultado;
  } catch (error) {
    // Ni una excepción cambia la respuesta: si Gestión no contesta, el
    // visitante no tiene por qué enterarse de que ese email existía.
    console.error("[acceso] Falló la petición de enlace:", error);
  }

  // FUERA del `Promise.all` y en TODOS los caminos, a propósito. Dentro,
  // el email registrado pagaría una escritura que el desconocido no, y
  // esa diferencia de tiempo delata cuál es cuál — justo lo que el suelo
  // de 500 ms está ahí para tapar.
  await registrarIntento(anotacion);

  return { estado: "enviado", mensaje: MENSAJE_NEUTRO };
}
