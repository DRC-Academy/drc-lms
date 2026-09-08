// ---------------------------------------------------------------
// EL TRADUCTOR DEL ANDAMIO
//
// Coge el andamio de un bloque —las cuarenta y pico cadenas cortas que
// rodean al ejercicio— y lo devuelve en el otro idioma. No ve el
// material y no puede tocarlo: lo que entra aquí ya viene filtrado por
// `andamioDelBloque`, y lo que sale vuelve a pasar por
// `validarTraduccion`. Ver `lib/traduccion-bloque.ts`.
//
// HAIKU Y NO SONNET, igual que el revisor. Esto no es escribir un
// ejercicio: es decir en otro idioma algo que ya está escrito y decidido.
// La parte difícil del bloque —qué distractor cae, qué error ataca— ya
// la resolvió Sonnet cuando lo generó, y aquí ni se revisa ni se
// reabre.
//
// ---------------------------------------------------------------
// POR QUÉ ESTO NO VIVE DENTRO DE LA GENERACIÓN
//
// Porque no cabe. La generación de un bloque tarda entre 43 y 52
// segundos medidos, contra un techo de 60 del plan, y ese presupuesto ya
// está tan apretado que la revisión pedagógica corre solo con lo que
// sobra. Pedirle al mismo turno cuarenta y pico cadenas más no habría
// dado "un poco más lento": habría cortado la generación a mitad y
// servido el banco, o sea cambiar la personalización del bloque por una
// traducción. Ver el presupuesto en `app/api/generar-bloque/route.ts`.
//
// Así que se traduce APARTE y CUANDO SE PIDE. Y una sola vez: lo que
// sale de aquí se guarda en `traducciones_bloque`, de modo que la
// segunda pulsación —y la de cualquier otro alumno en un bloque del
// catálogo— es una lectura de la base y no otra llamada al modelo.
// ---------------------------------------------------------------

import "server-only";
import { extraerJson } from "@/lib/json";
import {
  andamioDelBloque,
  cuantasCadenas,
  validarTanda,
  validarTraduccion,
  type AndamioEjercicio,
  type IdiomaBloque,
  type TraduccionBloque,
} from "@/lib/traduccion-bloque";
import type { Bloque } from "@/lib/data";

export const MODELO_TRADUCTOR = "claude-haiku-4-5-20251001";

const URL_API = "https://api.anthropic.com/v1/messages";

/**
 * Holgado a propósito. El andamio son cadenas cortas y Haiku las
 * devuelve de sobra en esto; el tope existe para que un cuelgue de la
 * API no deje al alumno mirando un botón que gira, no para apretar.
 */
const MAX_TOKENS = 8000;

// ---------------------------------------------------------------
// POR QUÉ VA EN TANDAS Y NO EN UNA LLAMADA
//
// Porque una llamada tardaba DIECIOCHO SEGUNDOS. Medido tres veces
// seguidas sobre el mismo bloque de diez: 18,2 · 18,4 · 18,6. No era un
// pico, era el coste.
//
// Y dieciocho segundos aquí son peores que en la generación, aunque allí
// sean cincuenta. Generar un bloque es algo que el alumno pide y espera
// mirando una pantalla que se lo cuenta. Esto es un BOTÓN, y se pulsa
// justo en el peor momento: cuando acaba de leer una explicación que no
// ha entendido. Hacerle esperar ahí es dejarle plantado en el sitio del
// que quería salir.
//
// El andamio son cadenas independientes —el veredicto del ejercicio 3 no
// necesita saber nada del 7— así que se reparte y se pide a la vez. El
// coste en tokens es el mismo; lo que baja es el reloj.
//
// TRES POR TANDA, que en un bloque de diez son cuatro llamadas. Con
// tandas más grandes se pierde la ventaja y con más pequeñas se pagan
// cuatro cabeceras de sistema para traducir una frase.
//
// Los campos de un mismo ejercicio NUNCA se parten entre tandas: la
// explicación y sus dos veredictos hablan de lo mismo y se escriben
// mejor juntos.
// ---------------------------------------------------------------

const POR_TANDA = 3;

const NOMBRE: Record<IdiomaBloque, string> = {
  en: "inglés",
  es: "español de España",
};

function sistema(destino: IdiomaBloque): string {
  const lineas = [
    "Traduces materiales de DRC Academy, una academia de inglés online para adultos hispanohablantes.",
    `Recibes un objeto JSON con los textos que ACOMPAÑAN a unos ejercicios de inglés y lo devuelves con los mismos textos en ${NOMBRE[destino]}.`,
    "",
    "QUÉ ES ESTO QUE TRADUCES",
    "No son los ejercicios. Son el título del bloque, su intro, y para cada ejercicio la instrucción, el contexto,",
    "la pista, los criterios de autoevaluación, la explicación y las dos frases que encabezan la corrección.",
    "El ejercicio en sí —la frase con el hueco, las opciones, las respuestas aceptadas— no está aquí y no lo vas a ver.",
    "",
    "REGLAS",
    "- Devuelve EXACTAMENTE la misma estructura: las mismas claves de ejercicio, y dentro de cada una los mismos",
    "  campos que recibiste. Ni uno más ni uno menos. Si un ejercicio trae solo 'explicacion', devuelves solo",
    "  'explicacion'; no inventes los campos que no estaban.",
    "- Traduce el SENTIDO, no las palabras. Es material que lee un adulto que está aprendiendo: tiene que sonar",
    "  escrito en ese idioma, no traducido a él.",
  ];

  if (destino === "es") {
    lineas.push(
      "- Español de España, tuteando, en tono cálido y directo. Nada de 'usted' ni de registro de manual.",
      "- Y en un español SENCILLO. Estos textos existen para que el alumno entienda un ejercicio que ya le cuesta:",
      "  si la explicación es más difícil que el ejercicio, no sirve para nada."
    );
  } else {
    lineas.push(
      "- Inglés británico e irlandés: 'recognise', no 'recognize'. La academia es irlandesa.",
      "- Y en un inglés CLARAMENTE MÁS SENCILLO que el del ejercicio que acompaña: frases cortas, vocabulario de",
      "  alta frecuencia y la mínima jerga gramatical posible. Escríbelo como se lo dirías a alguien un nivel por",
      "  debajo del suyo."
    );
  }

  lineas.push(
    "",
    "LO QUE NO SE TRADUCE, aunque aparezca dentro de una frase:",
    "- Las palabras y frases en inglés que son EL EJEMPLO del que habla el texto. Si una explicación dice que",
    "  'didn't' va seguido del verbo en su forma base, 'didn't' se queda como está: es la forma que se enseña,",
    "  y traducirla deja la explicación hablando de algo que el alumno no tiene delante.",
    "- Los nombres propios y los nombres de examen (B2 First, C1 Advanced, IELTS...).",
    "",
    "NUNCA lenguaje de error: ni 'wrong', ni 'incorrect', ni 'te has equivocado', ni sus equivalentes. Se nombra",
    "lo que ha pasado con la lengua, no lo que ha hecho mal el alumno. Y nunca condescendiente.",
    "",
    "FORMATO",
    "Devuelves SOLO el objeto JSON. Sin markdown, sin vallados, sin una sola palabra antes ni después."
  );

  return lineas.join("\n");
}

export type ResultadoTraduccion =
  | {
      estado: "lista";
      traduccion: TraduccionBloque;
      ms: number;
      cadenas: number;
      /** Cuántas tandas se pidieron y cuántas volvieron bien. */
      tandas: { pedidas: number; buenas: number };
    }
  | { estado: "no-disponible"; motivo: string; ms: number };

type Tanda = { titulo?: string; intro?: string; ejercicios: Record<string, AndamioEjercicio> };

/** Una tanda: una llamada al modelo. Devuelve null si no salió. */
async function pedirTanda(
  clave: string,
  trozo: Tanda,
  destino: IdiomaBloque,
  plazoMs: number
): Promise<Tanda | null> {
  const control = new AbortController();
  const alarma = setTimeout(() => control.abort(), plazoMs);

  try {
    const respuesta = await fetch(URL_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": clave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO_TRADUCTOR,
        max_tokens: MAX_TOKENS,
        system: sistema(destino),
        messages: [
          {
            role: "user",
            content: `Devuelve este objeto con los mismos campos en ${NOMBRE[destino]}:\n\n${JSON.stringify(
              trozo,
              null,
              2
            )}`,
          },
        ],
      }),
      signal: control.signal,
      cache: "no-store",
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text().catch(() => "");
      console.error(`[traduccion] tanda HTTP ${respuesta.status}: ${cuerpo.slice(0, 200)}`);
      return null;
    }

    const json = (await respuesta.json()) as { content?: { text?: string }[] };
    const texto = (json.content ?? []).map((parte) => parte.text ?? "").join("");
    return validarTanda(extraerJson(texto));
  } catch (error) {
    const motivo =
      error instanceof Error && error.name === "AbortError"
        ? `timeout de ${plazoMs / 1000}s`
        : error instanceof Error
          ? error.message
          : "fallo desconocido";
    console.error(`[traduccion] tanda perdida: ${motivo}`);
    return null;
  } finally {
    clearTimeout(alarma);
  }
}

/** Reparte los ejercicios en grupos de `POR_TANDA`, sin partir ninguno. */
function repartir(andamio: Omit<TraduccionBloque, "idioma">): Tanda[] {
  const entradas = Object.entries(andamio.ejercicios);
  const tandas: Tanda[] = [];

  for (let i = 0; i < entradas.length; i += POR_TANDA) {
    tandas.push({ ejercicios: Object.fromEntries(entradas.slice(i, i + POR_TANDA)) });
  }

  if (tandas.length === 0) tandas.push({ ejercicios: {} });

  // El título y la intro van en la primera. Son del bloque entero, no de
  // ningún ejercicio, y repetirlos en cada tanda daría cuatro versiones
  // distintas del mismo título.
  tandas[0] = { titulo: andamio.titulo, intro: andamio.intro, ...tandas[0] };

  return tandas;
}

/**
 * Traduce el andamio de un bloque al idioma pedido.
 *
 * No lanza: un fallo aquí devuelve `no-disponible` con el motivo, y
 * quien llama decide. Perder una traducción es que el botón no responda
 * esta vez; no es algo que pueda tumbar la pantalla del ejercicio.
 *
 * UNA TANDA QUE FALLA NO TIRA LAS DEMÁS. Con cuatro llamadas hay cuatro
 * ocasiones de fallar, así que las que vuelvan bien se quedan y los
 * ejercicios de la que se perdió se ven en su idioma original. Es la
 * misma tolerancia que ya tenía `validarTraduccion` con lo que el modelo
 * se dejaba, y aquí se usa de verdad: media traducción es peor que la
 * entera y muchísimo mejor que ninguna.
 *
 * Lo que sí tumba el intento es perder el título y la intro, que van en
 * la primera tanda: sin ellos no hay traducción que enseñar.
 */
export async function traducirBloque(
  clave: string,
  bloque: Bloque,
  destino: IdiomaBloque,
  plazoMs: number
): Promise<ResultadoTraduccion> {
  const arranque = Date.now();
  const andamio = andamioDelBloque(bloque);
  const cadenas = cuantasCadenas(andamio);
  const trozos = repartir(andamio);

  // A la vez, no en fila: son independientes, y encadenarlas devolvería
  // el tiempo que este reparto existe para quitar.
  const vueltas = await Promise.all(
    trozos.map((trozo) => pedirTanda(clave, trozo, destino, plazoMs))
  );

  const buenas = vueltas.filter((v): v is Tanda => v !== null);
  const ms = Date.now() - arranque;

  if (buenas.length === 0) {
    return { estado: "no-disponible", motivo: "ninguna tanda volvió", ms };
  }

  const juntas = {
    titulo: buenas.find((v) => v.titulo)?.titulo,
    intro: buenas.find((v) => v.intro)?.intro,
    ejercicios: Object.assign({}, ...buenas.map((v) => v.ejercicios)),
  };

  const traduccion = validarTraduccion(juntas, destino);
  if (!traduccion) {
    return {
      estado: "no-disponible",
      motivo: `se juntaron ${buenas.length}/${trozos.length} tandas y aun así faltaba lo esencial`,
      ms,
    };
  }

  return {
    estado: "lista",
    traduccion,
    ms,
    cadenas,
    tandas: { pedidas: trozos.length, buenas: buenas.length },
  };
}
