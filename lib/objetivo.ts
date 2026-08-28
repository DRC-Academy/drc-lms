// ---------------------------------------------------------------
// «TU OBJETIVO»: LAS REGLAS, SIN BASE DE DATOS
//
// Lo que comparten la pantalla y el script de reescritura: cómo se
// calcula la huella del original y qué tiene que cumplir una
// reescritura para poder enseñarse.
//
// MÓDULO PURO Y SIN `server-only` A PROPÓSITO. Lo importan dos mundos
// distintos: `lib/objetivo-servidor.ts`, que corre dentro de Next, y
// `scripts/reescribir-objetivos.ts`, que corre con `node` a pelo. Si
// esto arrastrara `server-only` o el cliente de Supabase, el script no
// podría importarlo y las reglas acabarían escritas dos veces —que es
// exactamente cómo la validación del script y la de la pantalla se
// separan sin que nadie se entere.
//
// ---------------------------------------------------------------
// EL PROBLEMA QUE RESUELVE TODO ESTO
//
// `objetivo_perfil` lo escribe la IA de Gestión PARA EL PROFESOR, en
// tercera persona. Medido sobre los 174 alumnos: 52 lo tienen relleno,
// 50 pasan el cortafuegos de `lib/texto-alumno.ts` y se pintan, y de
// esos 50 ninguno —cero— le habla al alumno. No es un caso raro, es
// cómo se genera.
//
// Leído bajo el titular "Tu objetivo", justo encima del banner que le
// promete llegar al B2 en agosto de 2027, un objetivo que suena a
// informe interno se lleva por delante la credibilidad del banner.
// ---------------------------------------------------------------

import { createHash } from "node:crypto";
// Relativo y con extensión, no `@/lib/…`: este módulo lo importa también
// `scripts/reescribir-objetivos.ts`, que corre con `node` a pelo y no
// sabe nada de los alias del tsconfig. Es la misma forma en la que los
// otros scripts importan de `lib/`.
import { esParaElAlumno } from "./texto-alumno.ts";

/** Ni una frase suelta de tres palabras ni un párrafo de informe. */
export const LARGO_MINIMO = 10;
export const LARGO_MAXIMO = 400;

/**
 * La huella del original del que salió una reescritura.
 *
 * Se normaliza antes —espacios colapsados y sin mayúsculas— para que un
 * retoque de formato en Gestión no invalide una reescritura que sigue
 * diciendo lo mismo. Un cambio de contenido sí la invalida, que es justo
 * lo que se quiere detectar.
 *
 * SHA-256 y no algo más corto porque está en las dos puntas —el script
 * al escribir, el servidor al leer— y una colisión aquí significa
 * enseñarle a un alumno el objetivo reescrito de otra versión de su
 * ficha sin que nada lo delate.
 */
export function huellaObjetivo(original: string): string {
  const normalizado = original.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(normalizado, "utf8").digest("hex");
}

/**
 * Marcas de que el texto le habla AL alumno.
 *
 * Es lo contrario del cortafuegos de `lib/texto-alumno.ts`: aquel busca
 * señales de que el texto habla DEL alumno y las esconde; esto exige que
 * haya al menos una señal de que le habla a él.
 *
 * Se pide la marca explícita y no basta con que no haya tercera persona:
 * "Mejorar el inglés para reuniones internacionales" no es tercera
 * persona, pero tampoco le habla a nadie, y una tarjeta titulada "Tu
 * objetivo" con un infinitivo dentro sigue sonando a formulario.
 */
const SEGUNDA_PERSONA =
  // Pronombres y posesivos.
  /\b(tu|tus|te|ti|tuyo|tuya|tuyos|tuyas|contigo)\b/;

/**
 * Formas verbales de segunda persona del singular.
 *
 * Aparte de los pronombres porque son otra cosa: una reescritura puede
 * dirigirse al alumno solo con el verbo —"para que sientas que el inglés
 * es tuyo"— y sin ningún "tu" delante.
 *
 * Todas las de la lista son EXCLUSIVAMENTE de segunda persona, así que
 * no hace falta acotarlas más. Las de subjuntivo entran porque el modelo
 * las usa mucho al reformular una finalidad.
 */
const VERBO_SEGUNDA =
  /\b(tienes|quieres|necesitas|puedes|trabajas|buscas|usas|manejas|llevas|hablas|preparas|sientas|puedas|tengas|quieras|necesites|consigas|logres|entiendas|manejes|hables)\b/;

/**
 * El pronombre PEGADO AL VERBO: «abrirte», «moverte», «relacionarte»,
 * «sentirte», «comunicándote».
 *
 * Hace falta su propio patrón porque el de arriba busca palabras
 * sueltas y aquí el «te» va dentro de la palabra. Sin esto, la primera
 * pasada tiró cinco reescrituras perfectamente en segunda persona
 * —«Ganar fluidez para abrirte puertas laborales»— por no encontrar un
 * «tu» suelto, y el script las contaba como fichas sin objetivo.
 *
 * LA CONSONANTE ANTES DE LA TERMINACIÓN NO ES ADORNO: sin ella entran
 * «fuerte», «suerte», «divierte» y «convierte», que no son segunda
 * persona de nada. Con ella, «mov-erte» pasa y «div-i-erte» no.
 */
const ENCLITICO = /\b\w{2,}[^aeiou](?:ar|er|ir)te\b|\b\w{3,}ndote\b/;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** True si el texto le habla al alumno y no sobre él. */
export function esSegundaPersona(texto: string | null | undefined): boolean {
  const limpio = normalizar(texto ?? "");
  return SEGUNDA_PERSONA.test(limpio) || VERBO_SEGUNDA.test(limpio) || ENCLITICO.test(limpio);
}

/**
 * Una reescritura en limpio, o null si no vale para enseñarse.
 *
 * LAS TRES CONDICIONES SON LA MISMA EN EL SCRIPT Y EN LA PANTALLA, y por
 * eso viven aquí: el script la usa para decidir si guarda, y el servidor
 * para decidir si enseña. Una reescritura guardada hace tres meses, con
 * una versión anterior del prompt, se vuelve a comprobar al leerla.
 *
 * Se comprueba también el cortafuegos de Gestión: si el modelo arrastró
 * al reescribir una nota interna del original —"conviene preguntarle"—,
 * la reescritura hereda el problema que veníamos a arreglar.
 */
export function objetivoPublicable(texto: string | null | undefined): string | null {
  const limpio = (texto ?? "").trim().replace(/\s+/g, " ");

  if (limpio.length < LARGO_MINIMO || limpio.length > LARGO_MAXIMO) return null;
  if (!esParaElAlumno(limpio)) return null;
  if (!esSegundaPersona(limpio)) return null;

  return limpio;
}
