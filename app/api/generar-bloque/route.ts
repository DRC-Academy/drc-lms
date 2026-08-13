// ---------------------------------------------------------------
// GENERACIÓN DE UN BLOQUE NUEVO
//
// Recibe el id del alumno y el modo, lee sus datos de DRC Gestión en
// el servidor y le pide a Claude un bloque con la forma del tipo
// `Bloque`.
//
// Se llama a la API con `fetch` en vez del SDK oficial a propósito:
// el proyecto no debe crecer en dependencias.
//
// Si no hay clave, o si el modelo devuelve algo que no valida, se
// sirve un bloque del banco de reserva. Nunca se devuelve un bloque
// a medio formar.
// ---------------------------------------------------------------

import { NextResponse } from "next/server";
import { NOMBRE_EXAMEN, type Bloque, type TipoExamen } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { sesionActual } from "@/lib/sesion-servidor";
import { detectarExamen, nivelDeBloque } from "@/lib/perfil";
import { primeraFrase, type ModoGeneracion } from "@/lib/modos";
import { bloqueDeBanco } from "@/lib/banco";
import { validarBloque } from "@/lib/validarBloque";
import { extraerJson } from "@/lib/json";
import { avisosParaRegenerar, revisarBloque, type Revision } from "@/lib/revisor";
import { guardarBloqueGenerado } from "@/lib/progreso-servidor";
import { abrirPlazo, conLimite, conLimiteOAlternativa, describir, type Plazo } from "@/lib/tiempo";
import { TIPO_FLUJO, type EventoGeneracion } from "@/lib/generacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sin esto la plataforma corta por su cuenta y el alumno recibe un 504
// del gateway en vez de un bloque del banco. Es el techo duro; el
// presupuesto de abajo está calculado para caber dentro con holgura.
export const maxDuration = 60;

const MODELO = "claude-sonnet-4-6";
const URL_API = "https://api.anthropic.com/v1/messages";
const ESPERA_BANCO_MS = 1600; // el banco responde al instante: sin esto la demo se siente falsa

// ---------------------------------------------------------------
// PRESUPUESTO DE TIEMPO
//
// Cada llamada tenía su propio máximo y nadie sumaba: dos generaciones
// y dos revisiones daban 210 segundos en el peor caso, con el alumno
// mirando un spinner. Ahora hay un único presupuesto para toda la fase
// de IA y cada llamada solo puede gastar lo que quede.
//
// La cuenta del peor caso: 45s de generación agotan el presupuesto, no
// hay reintento ni revisión, y se sirve el banco. Total por debajo de
// `maxDuration`, siempre.
// ---------------------------------------------------------------

const TIEMPO_MAXIMO_MS = 45_000; // tope de UNA llamada al modelo
const PRESUPUESTO_IA_MS = 45_000; // tope de TODA la fase de generación
const TIEMPO_REVISOR_MS = 15_000; // tope de una revisión
const TIEMPO_BASE_MS = 8_000; // tope de una consulta a Supabase
const INTENTOS = 2;

// `Origen` y la forma de la respuesta viven ahora en `lib/generacion.ts`,
// que es el contrato que comparten esta ruta y el cliente que la lee.

const AREAS = ["Gramática", "Léxico", "Discurso"];
const MODOS: ModoGeneracion[] = ["repaso", "examen", "contexto"];

function esperar(ms: number) {
  return new Promise<void>((resolver) => setTimeout(resolver, ms));
}

// ---------------------------------------------------------------
// TRAZA TEMPORAL
//
// Instrumentación puesta para localizar en qué punto se quedaba colgada
// la generación. Cada petición lleva un identificador corto y cada
// etapa deja su marca con los milisegundos transcurridos, de modo que
// en el log se lee la secuencia completa y dónde se detuvo.
//
// QUITAR cuando el incidente esté cerrado. Nada de esto imprime datos
// del alumno ni, por supuesto, la clave.
// ---------------------------------------------------------------

type Traza = (etapa: string, detalle?: string) => void;

function abrirTraza(): { traza: Traza; plazo: Plazo } {
  const id = Math.random().toString(36).slice(2, 8);
  const plazo = abrirPlazo(maxDuration * 1000);

  const traza: Traza = (etapa, detalle) => {
    const marca = `[generar-bloque:${id}] +${plazo.transcurrido()}ms ${etapa}`;
    console.info(detalle ? `${marca} · ${detalle}` : marca);
  };

  return { traza, plazo };
}

/**
 * Qué se sabe de la clave sin decir cuál es.
 *
 * `sk-ant-` es el prefijo público de todas las claves de Anthropic, así
 * que mostrarlo no revela nada, y la longitud confirma que llegó entera.
 * Lo que de verdad importa aquí es el aviso de espacios o saltos de
 * línea: una clave recién rotada y pegada con un `\n` al final hace que
 * `fetch` lance `Invalid header value` antes de salir de la instancia,
 * y el fallo se parecía mucho a un problema de red.
 */
/**
 * Envuelve la generación en un flujo NDJSON: una línea JSON por evento,
 * emitida en el momento en que ocurre.
 *
 * Se responde en directo y no de una vez al final porque la pantalla
 * necesita saber en qué punto va, y la única fuente honesta de eso es
 * esta función según avanza. Un temporizador en el cliente adivinando
 * etapas diría "revisando" cuando el revisor ni siquiera ha arrancado.
 *
 * Todo lo que pueda fallar antes de aquí —sesión, ficha, modo— ya ha
 * respondido con su código HTTP. A partir de este punto la respuesta es
 * siempre 200: el estado viaja dentro del flujo, porque las cabeceras ya
 * salieron cuando se emitió la primera etapa.
 */
function flujoDeGeneracion(
  traza: Traza,
  ejecutar: (emitir: (evento: EventoGeneracion) => void) => Promise<void>
): Response {
  const codificador = new TextEncoder();

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      let abierto = true;

      const emitir = (evento: EventoGeneracion) => {
        if (!abierto) return;
        controlador.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`));
      };

      try {
        await ejecutar(emitir);
      } catch (error) {
        // Que no se escape nada: un flujo que se corta sin decir por qué
        // deja al alumno con la barra a medias y sin mensaje.
        traza("flujo:error", describir(error));
        console.error("[generar-bloque] La generación se rompió:", describir(error));
        emitir({
          tipo: "error",
          mensaje: "No hemos podido preparar el bloque. Inténtalo otra vez.",
        });
      } finally {
        abierto = false;
        controlador.close();
      }
    },
  });

  return new Response(cuerpo, {
    headers: {
      "content-type": `${TIPO_FLUJO}; charset=utf-8`,
      // `no-transform` y `x-accel-buffering` para que ningún proxy por el
      // camino acumule las líneas y las entregue juntas al final: eso
      // devolvería exactamente el spinner mudo que estamos quitando.
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function huellaClave(clave: string | undefined): string {
  if (clave === undefined) return "AUSENTE";
  if (clave.trim() === "") return "VACÍA";

  const limpia = clave.trim();
  const notas = [`len=${limpia.length}`, `prefijo=${limpia.slice(0, 7)}`];

  if (limpia !== clave) notas.push("¡CON ESPACIOS ALREDEDOR!");
  if (/[\r\n]/.test(clave)) notas.push("¡CON SALTO DE LÍNEA!");

  return notas.join(" ");
}

/**
 * Los bloques generados conviven en localStorage con los estáticos:
 * les damos un id propio para que nunca choquen entre sí.
 */
function conIdPropio(bloque: Bloque): Bloque {
  const sufijo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const id = `gen-${sufijo}`;
  return {
    ...bloque,
    id,
    ejercicios: bloque.ejercicios.map((ejercicio, i) => ({ ...ejercicio, id: `${id}-${i + 1}` })),
  };
}

// ---------------------------------------------------------------
// CALIBRACIÓN POR NIVEL
// A1 y A2 no son "B1 más fácil": cambian la longitud de la frase y el
// vocabulario admisible. Sin esto el modelo escribe B1 para todos.
// ---------------------------------------------------------------

const CALIBRACION: Record<Bloque["nivel"], string> = {
  A1: "Nivel A1: frases de 6 a 9 palabras, presente simple, vocabulario de las 500 palabras más frecuentes. Sin subordinadas y sin phrasal verbs.",
  A2: "Nivel A2: frases de 8 a 12 palabras, presentes y pasado simple, vocabulario de alta frecuencia y de la vida diaria. Nada de léxico abstracto ni de subordinadas largas.",
  B1: "Nivel B1: frases claras de longitud media, tiempos básicos y perfectos, vocabulario cotidiano y de trabajo corriente.",
  B2: "Nivel B2: frases de complejidad natural, gama completa de tiempos, phrasal verbs y collocations de registro profesional.",
  C1: "Nivel C1: registro formal y matizado, estructuras enfáticas, collocations precisas y diferencias de matiz entre opciones cercanas.",
};

// ---------------------------------------------------------------
// FORMATO AUTÉNTICO DE CADA EXAMEN
// ---------------------------------------------------------------

const FORMATO_EXAMEN: Record<TipoExamen, string> = {
  b2_first: [
    "Reproduce el formato real del Use of English de B2 First:",
    "- Los dos 'reconocer' son Part 1 (multiple-choice cloze): una frase con un hueco y cuatro opciones de léxico cercano entre sí (collocation, phrasal verb, matiz de significado). No sirve que la diferencia sea gramatical y evidente.",
    "- El primer 'transformar' es Part 2 (open cloze): la frase lleva un hueco que se completa con UNA sola palabra gramatical (preposición, auxiliar, relativo, artículo o cuantificador).",
    "- El segundo 'transformar' es Part 4 (key word transformation): da la frase original, indica en la instrucción la palabra clave OBLIGATORIA en mayúsculas, y la respuesta debe usar entre DOS y CINCO palabras incluyendo esa palabra sin modificarla. Dos y cinco es la especificación de B2 First; el rango de tres a seis es el de C1 Advanced y aquí sería un error.",
    "- El 'producir' es una tarea breve de Writing del examen (un email o el párrafo central de un essay).",
  ].join("\n"),
  c1_advanced: [
    "Reproduce el formato real del Use of English de C1 Advanced:",
    "- Los dos 'reconocer' son Part 1 (multiple-choice cloze) con cuatro opciones de significado muy próximo, donde lo que decide es la collocation.",
    "- El primer 'transformar' es Part 3 (word formation): da la frase con el hueco y, entre paréntesis, la palabra raíz en mayúsculas que hay que transformar (prefijo, sufijo o cambio de categoría).",
    "- El segundo 'transformar' es Part 4 (key word transformation): palabra clave OBLIGATORIA en mayúsculas en la instrucción y respuesta de entre TRES y SEIS palabras que la incluya sin cambiarla. Tres y seis es la especificación de C1 Advanced, distinta de la de B2 First.",
    "- El 'producir' es un párrafo de Writing de C1, con registro formal.",
  ].join("\n"),
  b1_preliminary: [
    "Reproduce el formato real de B1 Preliminary:",
    "- Los dos 'reconocer' son Reading Part 5 (multiple-choice cloze): vocabulario de alta frecuencia, cuatro opciones cercanas y una sola correcta por significado o por collocation.",
    "- El primer 'transformar' es Reading Part 6 (open cloze): un hueco que se rellena con UNA sola palabra gramatical.",
    "- El segundo 'transformar' reescribe una frase manteniendo el significado, indicando en la instrucción con qué palabra o estructura debe empezar.",
    "- El 'producir' es un email corto o una nota, del tipo de Writing Part 2.",
  ].join("\n"),
  ielts: [
    "Reproduce el estilo de IELTS. OJO: IELTS no es Cambridge, así que NO uses key word transformation ni open cloze.",
    "- Los dos 'reconocer' trabajan vocabulario académico en contexto y paráfrasis: qué opción reformula mejor la idea de la frase.",
    "- Los dos 'transformar' piden reescribir una frase con registro académico, usando nominalización o voz pasiva, como exige Writing Task 2.",
    "- El 'producir' es un párrafo de Writing Task 2 con criterios de coherencia, cohesión y rango léxico.",
  ].join("\n"),
};

// ---------------------------------------------------------------
// PROMPTS
// ---------------------------------------------------------------

function construirSistema(nivel: Bloque["nivel"]): string {
  return [
    "Eres el diseñador de materiales de DRC Academy, una academia de inglés online para adultos hispanohablantes.",
    "Escribes bloques de práctica de cinco minutos.",
    "",
    "REGLAS DE CONTENIDO",
    "- Los enunciados, frases y respuestas de los ejercicios van en inglés.",
    "- Las instrucciones, pistas y explicaciones van en español de España, tuteando, en tono cálido y directo.",
    "- Nunca uses lenguaje de error o de vigilancia: nada de 'tus fallos', 'tus errores' o 'áreas deficientes'.",
    "- Las explicaciones dicen POR QUÉ, no repiten la regla en abstracto. Una o dos frases, sin jerga gramatical innecesaria.",
    "- El contexto es adulto. Nada de ejemplos escolares.",
    "",
    "CALIBRACIÓN",
    CALIBRACION[nivel],
    "",
    "DISTRACTORES (lo más importante)",
    "Cada opción incorrecta tiene que ser el error concreto que comete un hispanohablante de este nivel:",
    "calco literal del español, tiempo verbal equivocado por interferencia, preposición traducida, colocación inventada,",
    "participio mal formado, orden de palabras del español. Nunca opciones absurdas, ni fáciles de descartar a ojo,",
    "ni tres opciones evidentemente malas alrededor de una buena. Si un distractor no lo elegiría un alumno real, cámbialo.",
    "",
    "FORMATO",
    "Devuelves SOLO el objeto JSON. Sin markdown, sin vallados, sin una sola palabra antes ni después.",
  ].join("\n");
}

function plantillaJson(nivel: Bloque["nivel"]): string {
  return JSON.stringify(
    {
      id: "identificador-en-minusculas-con-guiones",
      titulo: "Título corto en español, máximo 40 caracteres",
      area: `Una de: ${AREAS.join(" | ")}`,
      nivel,
      minutos: 5,
      intro: "Una o dos frases en español que expliquen la idea clave del bloque.",
      ejercicios: [
        {
          tipo: "reconocer",
          id: "r1",
          enunciado: "Frase en inglés con ____ donde va el hueco.",
          opciones: ["correcta", "distractor 1", "distractor 2", "distractor 3"],
          correcta: 0,
          explicacion: "Por qué es esa y qué error refleja la que suele elegirse.",
        },
        { tipo: "reconocer", id: "r2", enunciado: "…", opciones: ["…"], correcta: 0, explicacion: "…" },
        {
          tipo: "transformar",
          id: "t1",
          instruccion: "Qué tiene que hacer, en español.",
          frase: "Frase de partida en inglés.",
          respuestas: ["Todas las formas correctas, incluidas contracciones y orden alternativo."],
          pista: "Una pista corta que acote la respuesta.",
          explicacion: "Qué cambia y por qué.",
        },
        { tipo: "transformar", id: "t2", instruccion: "…", frase: "…", respuestas: ["…"], pista: "…", explicacion: "…" },
        {
          tipo: "producir",
          id: "p1",
          instruccion: "Qué tiene que escribir, en español.",
          contexto: "Situación concreta y extensión esperada.",
          criterios: ["Criterio comprobable 1", "Criterio comprobable 2", "Criterio comprobable 3"],
          modelo: "Una respuesta modelo en inglés, natural, de dos a cuatro frases.",
        },
      ],
    },
    null,
    2
  );
}

const REQUISITOS = [
  "Requisitos que se comprueban antes de publicar el bloque:",
  "- Exactamente 5 ejercicios, en este orden: reconocer, reconocer, transformar, transformar, producir.",
  "- Cada 'reconocer' tiene exactamente 4 opciones distintas y 'correcta' es el índice (0-3) de la buena.",
  "- Cada 'transformar' lista TODAS las respuestas aceptables: la respuesta del alumno se compara literalmente",
  "  (ignorando mayúsculas y puntuación), así que incluye contracciones ('I would' y \"I'd\") y variantes de orden.",
  "  Que la pista sea lo bastante concreta como para que solo quepan las respuestas que has listado.",
  "- El 'producir' tiene entre 2 y 5 criterios comprobables y un modelo real.",
].join("\n");

type Contexto = {
  nivel: Bloque["nivel"];
  nombre: string;
  titulosExcluidos: string[];
};

/**
 * Modo repaso. NO se le manda el transcript de la clase: el análisis ya
 * se hizo en Gestión y volver a mandarlo sería pagar dos veces por el
 * mismo texto. Se trabaja sobre lo ya destilado.
 */
function usuarioRepaso(
  ctx: Contexto,
  clase: { titulo: string; temas: string; errores: string; priority: string; mainFocus: string }
): string {
  const temas = clase.temas.trim();
  const errores = clase.errores.trim();

  const material = [`- Título de la clase: ${clase.titulo}`];
  if (temas) material.push(`- Temas que se trabajaron: ${temas}`);
  if (errores) material.push(`- Cosas concretas que se le resistieron: ${errores}`);
  material.push(`- Prioridad marcada para la próxima clase: ${clase.priority}`);
  material.push(`- Foco principal de la próxima clase: ${clase.mainFocus}`);

  // Hay una fila con `temas` vacío y otra con `errores` vacío. La guía
  // está rellena en las 68, así que siempre queda de dónde tirar.
  const instruccionDistractores = errores
    ? "Los distractores de las opciones múltiples tienen que reproducir EXACTAMENTE los errores concretos descritos arriba. Ese es el punto del bloque: que el alumno se reencuentre con su propio error y esta vez lo vea venir."
    : "No tenemos anotados errores concretos de esta clase, así que apóyate en la prioridad y el foco: los distractores deben ser los errores típicos de un hispanohablante de este nivel en ese punto exacto.";

  return [
    `Ficha del alumno:`,
    `- Nombre: ${ctx.nombre}`,
    `- Nivel: ${ctx.nivel}`,
    "",
    "Lo que dejó su última clase (ya analizada, no hace falta más contexto):",
    material.join("\n"),
    "",
    `Prepara UN bloque de nivel ${ctx.nivel} que continúe ese trabajo: profundiza en el foco principal`,
    `o ataca el punto donde ese tema se confunde con otro.`,
    "",
    instruccionDistractores,
    ctx.titulosExcluidos.length
      ? `\nNo repitas estos temas, que el alumno ya tiene delante: ${ctx.titulosExcluidos.join("; ")}.`
      : "",
    "",
    "Devuelve exactamente esta estructura:",
    plantillaJson(ctx.nivel),
    "",
    REQUISITOS,
  ].join("\n");
}

function usuarioExamen(ctx: Contexto, examen: TipoExamen): string {
  return [
    `Ficha del alumno:`,
    `- Nombre: ${ctx.nombre}`,
    `- Nivel: ${ctx.nivel}`,
    `- Se está preparando el examen: ${NOMBRE_EXAMEN[examen]}`,
    "",
    FORMATO_EXAMEN[examen],
    "",
    `Prepara UN bloque de nivel ${ctx.nivel} con ese formato. El alumno tiene que reconocer el examen`,
    `en cuanto lo vea: si el ejercicio no podría aparecer tal cual en una prueba real, no sirve.`,
    ctx.titulosExcluidos.length
      ? `\nNo repitas estos temas, que el alumno ya tiene delante: ${ctx.titulosExcluidos.join("; ")}.`
      : "",
    "",
    "Devuelve exactamente esta estructura:",
    plantillaJson(ctx.nivel),
    "",
    REQUISITOS,
  ].join("\n");
}

function usuarioContexto(ctx: Contexto, ocupacion: string | null, objetivo: string | null): string {
  // Solo la primera frase de cada campo: son párrafos de varias oraciones
  // y mandarlos enteros diluye la señal concreta que nos interesa.
  const perfil: string[] = [];
  if (ocupacion) perfil.push(`- A qué se dedica: ${primeraFrase(ocupacion)}`);
  if (objetivo) perfil.push(`- Qué quiere conseguir: ${primeraFrase(objetivo)}`);

  return [
    `Ficha del alumno:`,
    `- Nombre: ${ctx.nombre}`,
    `- Nivel: ${ctx.nivel}`,
    perfil.join("\n"),
    "",
    `Prepara UN bloque de nivel ${ctx.nivel} ambientado en las situaciones reales de esta persona:`,
    `las conversaciones, los correos y los documentos que se encuentra de verdad en su trabajo.`,
    "",
    "Nada de frases genéricas de libro de texto. Si un ejercicio podría aparecer igual en el bloque de",
    "cualquier otro alumno, reescríbelo hasta que solo tenga sentido para esta persona.",
    ctx.titulosExcluidos.length
      ? `\nNo repitas estos temas, que el alumno ya tiene delante: ${ctx.titulosExcluidos.join("; ")}.`
      : "",
    "",
    "Devuelve exactamente esta estructura:",
    plantillaJson(ctx.nivel),
    "",
    REQUISITOS,
  ].join("\n");
}

// ---------------------------------------------------------------
// LLAMADA AL MODELO
// ---------------------------------------------------------------

/**
 * El resultado de pedir un bloque, distinguiendo si vale la pena
 * insistir. Antes todo fallo devolvía `null` y se reintentaba siempre:
 * con una clave revocada eso son dos esperas completas para obtener el
 * mismo 401 dos veces.
 */
type ResultadoModelo =
  | { estado: "ok"; bloque: Bloque }
  | { estado: "reintentable"; motivo: string }
  | { estado: "definitivo"; motivo: string };

/** Un 429 o un 5xx pueden ir bien al segundo intento; un 401 no. */
function esReintentable(codigo: number): boolean {
  return codigo === 408 || codigo === 409 || codigo === 429 || codigo >= 500;
}

async function pedirBloqueAlModelo(
  clave: string,
  sistema: string,
  usuario: string,
  limiteMs: number,
  traza: Traza
): Promise<ResultadoModelo> {
  const plazo = Math.min(limiteMs, TIEMPO_MAXIMO_MS);
  if (plazo < 1_000) {
    return { estado: "definitivo", motivo: `sin margen (${plazo}ms)` };
  }

  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), plazo);
  const arranque = Date.now();

  try {
    traza("modelo:petición", `${MODELO} · plazo ${plazo}ms`);

    const respuesta = await fetch(URL_API, {
      method: "POST",
      signal: control.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": clave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 8000,
        system: sistema,
        messages: [{ role: "user", content: usuario }],
      }),
    });

    traza("modelo:cabeceras", `HTTP ${respuesta.status} en ${Date.now() - arranque}ms`);

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      const motivo = `HTTP ${respuesta.status}: ${detalle.slice(0, 300)}`;
      console.error(`[generar-bloque] La API respondió ${motivo}`);
      return esReintentable(respuesta.status)
        ? { estado: "reintentable", motivo }
        : { estado: "definitivo", motivo };
    }

    const cuerpo: unknown = await respuesta.json();
    traza("modelo:cuerpo", `leído en ${Date.now() - arranque}ms`);

    if (typeof cuerpo !== "object" || cuerpo === null) {
      return { estado: "reintentable", motivo: "respuesta que no es un objeto" };
    }

    const contenido = (cuerpo as { content?: unknown }).content;
    if (!Array.isArray(contenido)) {
      return { estado: "reintentable", motivo: "respuesta sin content" };
    }

    const texto = contenido
      .filter(
        (bloque): bloque is { type: "text"; text: string } =>
          typeof bloque === "object" &&
          bloque !== null &&
          (bloque as { type?: unknown }).type === "text" &&
          typeof (bloque as { text?: unknown }).text === "string"
      )
      .map((bloque) => bloque.text)
      .join("\n");

    if (!texto.trim()) {
      return { estado: "reintentable", motivo: "respuesta sin texto" };
    }

    const bloque = validarBloque(extraerJson(texto));
    return bloque
      ? { estado: "ok", bloque }
      : { estado: "reintentable", motivo: "no pasó la validación estructural" };
  } catch (error) {
    // Distinguir el corte por plazo del resto: un `AbortError` genérico
    // en el log no dejaba claro si era la red o nuestro propio timeout.
    const motivo = control.signal.aborted
      ? `timeout de ${plazo / 1000}s`
      : `fallo de red: ${describir(error)}`;
    console.error(`[generar-bloque] Falló la llamada a la API — ${motivo}`);
    traza("modelo:error", motivo);
    return { estado: "reintentable", motivo };
  } finally {
    clearTimeout(corte);
  }
}

// ---------------------------------------------------------------
// GENERACIÓN CON REVISIÓN
// ---------------------------------------------------------------

/**
 * Pide bloques hasta que uno pase la validación estructural, sin salirse
 * del presupuesto y sin insistir cuando el fallo no va a cambiar.
 */
async function generarEstructural(
  clave: string,
  sistema: string,
  usuario: string,
  plazo: Plazo,
  traza: Traza
): Promise<Bloque | null> {
  for (let intento = 1; intento <= INTENTOS; intento++) {
    if (plazo.agotado()) {
      traza("generación:presupuesto agotado", `antes del intento ${intento}/${INTENTOS}`);
      return null;
    }

    const resultado = await pedirBloqueAlModelo(
      clave,
      sistema,
      usuario,
      plazo.hasta(TIEMPO_MAXIMO_MS),
      traza
    );

    if (resultado.estado === "ok") {
      traza("generación:bloque válido", `intento ${intento}/${INTENTOS}`);
      return resultado.bloque;
    }

    console.warn(
      `[generar-bloque] Intento ${intento}/${INTENTOS} descartado — ${resultado.motivo}`
    );

    if (resultado.estado === "definitivo") {
      traza("generación:fallo definitivo", "no se reintenta");
      return null;
    }
  }

  return null;
}

/** Deja en el log lo necesario para medir después cuánto y por qué falla. */
function registrarRevision(etiqueta: string, revision: Revision) {
  if (revision.estado === "apto") {
    console.info(`[revisor] ${etiqueta}: APTO en ${revision.ms}ms`);
    return;
  }

  if (revision.estado === "no-disponible") {
    console.warn(
      `[revisor] ${etiqueta}: NO DISPONIBLE en ${revision.ms}ms (${revision.motivo}). Se devuelve el bloque sin revisar.`
    );
    return;
  }

  const tipos = revision.problemas.map((p) => p.tipo).join(", ");
  console.warn(
    `[revisor] ${etiqueta}: NO APTO en ${revision.ms}ms — ${revision.problemas.length} problema(s): ${tipos}`
  );
  for (const problema of revision.problemas) {
    console.warn(`[revisor]    ej${problema.ejercicio} · ${problema.tipo} · ${problema.detalle}`);
  }
}

/**
 * Genera, revisa y, si el revisor lo tumba, regenera UNA vez avisando de
 * lo que falló. Devuelve null cuando no hay nada publicable, que es la
 * señal para servir el banco.
 *
 * La revisión solo bloquea cuando dice explícitamente que hay problemas:
 * si falla o expira, el bloque sale igual. Nunca puede dejar al alumno
 * sin ejercicios.
 *
 * Devuelve también el veredicto del revisor, que ya no se tira: se
 * guarda en `bloques_generados.revision`. Es lo que permitirá mirar
 * después qué proporción de bloques salió "apto" a la primera y con qué
 * problemas, sin tener que instrumentar nada más.
 */
async function generarConRevision(
  clave: string,
  sistema: string,
  usuario: string,
  examen: TipoExamen | null,
  plazo: Plazo,
  traza: Traza,
  emitir: (evento: EventoGeneracion) => void
): Promise<{ bloque: Bloque; revision: Revision } | null> {
  traza("generación:inicio", `presupuesto ${plazo.restante()}ms`);

  // Cada `emitir` va justo antes de la espera que describe, nunca
  // después: es lo que hace que el texto de la pantalla y lo que está
  // ocurriendo aquí dentro sean la misma cosa.
  emitir({ tipo: "etapa", etapa: "escribiendo", ms: plazo.transcurrido() });
  const primero = await generarEstructural(clave, sistema, usuario, plazo, traza);
  if (!primero) return null;

  traza("revisión 1:inicio", `restante ${plazo.restante()}ms`);
  emitir({ tipo: "etapa", etapa: "revisando", ms: plazo.transcurrido() });
  const revision = await revisarBloque(clave, primero, examen, plazo.hasta(TIEMPO_REVISOR_MS));
  registrarRevision("revisión 1", revision);
  if (revision.estado !== "con-problemas") return { bloque: primero, revision };

  // La regeneración es un lujo: si no queda presupuesto se entrega el
  // bloque que ya tenemos con su veredicto. Un bloque con un defecto
  // señalado en `bloques_generados` es mejor que un banco genérico, y
  // muchísimo mejor que seguir haciendo esperar al alumno.
  if (plazo.restante() < 5_000) {
    traza("revisión 1:sin margen para regenerar", `restante ${plazo.restante()}ms`);
    console.warn("[revisor] No queda presupuesto para regenerar. Se entrega el bloque revisado.");
    return { bloque: primero, revision };
  }

  emitir({ tipo: "etapa", etapa: "reescribiendo", ms: plazo.transcurrido() });
  const segundo = await generarEstructural(
    clave,
    sistema,
    usuario + avisosParaRegenerar(revision.problemas),
    plazo,
    traza
  );
  if (!segundo) return null;

  traza("revisión 2:inicio", `restante ${plazo.restante()}ms`);
  emitir({ tipo: "etapa", etapa: "revisando", ms: plazo.transcurrido() });
  const segundaRevision = await revisarBloque(clave, segundo, examen, plazo.hasta(TIEMPO_REVISOR_MS));
  registrarRevision("revisión 2", segundaRevision);
  if (segundaRevision.estado !== "con-problemas") {
    return { bloque: segundo, revision: segundaRevision };
  }

  console.warn("[revisor] Dos intentos rechazados por revisión. Se sirve un bloque del banco.");
  return null;
}

// ---------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------

function esModo(valor: unknown): valor is ModoGeneracion {
  return typeof valor === "string" && MODOS.includes(valor as ModoGeneracion);
}

export async function POST(peticion: Request) {
  const { traza, plazo: plazoPeticion } = abrirTraza();
  traza("entrada");

  // El `alumnoId` llega en el cuerpo, o sea del cliente, así que no se
  // acepta sin comprobar: sin esto un alumno pediría bloques hechos con
  // la última clase y el perfil de otro. La sesión se lee de la cookie
  // firmada, igual que en las páginas.
  //
  // Con plazo, porque debajo hay una consulta a Supabase: `sesionViva`
  // ya falla abierto ante un error, pero un socket que no responde no
  // es un error, es una espera sin fin.
  let sesion;
  try {
    sesion = await conLimite(sesionActual(), TIEMPO_BASE_MS, "sesionActual");
  } catch (error) {
    traza("sesión:fallo", describir(error));
    console.error("[generar-bloque] No se pudo comprobar la sesión:", describir(error));
    return NextResponse.json(
      { error: "No hemos podido comprobar tu sesión. Vuelve a intentarlo en un momento." },
      { status: 503 }
    );
  }

  if (!sesion) {
    traza("sesión:ausente");
    return NextResponse.json(
      { error: "Tu sesión ha caducado. Vuelve a entrar desde el enlace de tu email." },
      { status: 401 }
    );
  }
  traza("sesión:ok", `rol=${sesion.rol}`);

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON." }, { status: 400 });
  }

  const datos = (cuerpo ?? {}) as { alumnoId?: unknown; modo?: unknown; excluir?: unknown };
  const pedido = typeof datos.alumnoId === "string" ? datos.alumnoId : "";

  // Al alumno se le impone el suyo y no se discute. El equipo sí puede
  // generar para cualquiera: es lo que le deja revisar el producto.
  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : pedido;
  if (sesion.rol === "alumno" && pedido !== "" && pedido !== sesion.alumnoId) {
    return NextResponse.json({ error: "Esa ficha no es la tuya." }, { status: 403 });
  }

  /**
   * Un bloque generado por el equipo NO se guarda.
   *
   * El administrador abre la ficha de un alumno y genera un bloque para
   * ver cómo queda. Si eso se persistiera, el alumno entraría después y
   * se encontraría en su práctica un bloque que no pidió, quizá sobre un
   * tema que no le toca. Se genera, se devuelve, se mira y no queda
   * rastro.
   *
   * Es el mismo criterio que en `app/api/progreso`: lo que hace el
   * equipo mientras revisa no es actividad del alumno. La diferencia es
   * que aquello solo ensuciaba datos y esto lo vería el alumno.
   */
  const persistir = sesion.rol === "alumno";

  if (!esModo(datos.modo)) {
    return NextResponse.json(
      { error: `El modo tiene que ser uno de: ${MODOS.join(", ")}.` },
      { status: 400 }
    );
  }
  const modo = datos.modo;

  // Dos lecturas contra Gestión, también con plazo. Este era el punto
  // más probable de cuelgue: pasa antes de tocar el modelo, así que un
  // Supabase que no responde dejaba la petición parada sin llegar
  // siquiera al try/catch que sirve el banco.
  let alumno;
  try {
    traza("gestión:lectura");
    alumno = alumnoId
      ? await conLimite(obtenerAlumno(alumnoId), TIEMPO_BASE_MS, "obtenerAlumno")
      : null;
  } catch (error) {
    traza("gestión:fallo", describir(error));
    console.error("[generar-bloque] No se pudo leer la ficha del alumno:", describir(error));
    return NextResponse.json(
      { error: "No hemos podido leer tu ficha ahora mismo. Vuelve a intentarlo en un momento." },
      { status: 503 }
    );
  }

  if (!alumno) {
    traza("gestión:sin ficha");
    return NextResponse.json({ error: "No encontramos a ese alumno." }, { status: 404 });
  }
  traza("gestión:ok");

  const { perfil, ultimaClase } = alumno;

  const titulosExcluidos = Array.isArray(datos.excluir)
    ? datos.excluir.filter((t): t is string => typeof t === "string").slice(0, 20)
    : [];

  // Sin perfil (alumno con clase pero sin ficha) tiramos de B1, que es
  // el nivel con más alumnos y más material.
  const nivel = perfil ? nivelDeBloque(perfil.nivel) : "B1";
  const ctx: Contexto = {
    nivel,
    nombre: perfil?.nombre.trim() || "el alumno",
    titulosExcluidos,
  };

  // Se calcula fuera del reparto por modos porque el revisor también lo
  // necesita: es lo que le dice contra qué especificaciones comprobar.
  const examen = perfil ? detectarExamen(perfil.plan) : null;

  // Cada modo necesita su materia prima. Si no está, el modo no se
  // ofrece en la interfaz, así que llegar aquí sin ella es un error
  // de la petición, no del alumno.
  let usuario: string;

  if (modo === "repaso") {
    if (!ultimaClase) {
      return NextResponse.json(
        { error: "Este alumno todavía no tiene una clase analizada." },
        { status: 409 }
      );
    }
    const guia = ultimaClase.guiaProxima;
    usuario = usuarioRepaso(ctx, {
      titulo: ultimaClase.titulo,
      temas: ultimaClase.temas,
      errores: ultimaClase.errores,
      priority: guia?.priority ?? "",
      mainFocus: guia?.mainFocus ?? "",
    });
  } else if (modo === "examen") {
    if (!examen) {
      return NextResponse.json(
        { error: "Este alumno no está preparando ningún examen que sepamos preparar." },
        { status: 409 }
      );
    }
    usuario = usuarioExamen(ctx, examen);
  } else {
    if (!perfil || (!perfil.ocupacion && !perfil.objetivoPerfil)) {
      return NextResponse.json(
        { error: "Todavía no sabemos lo suficiente de este alumno." },
        { status: 409 }
      );
    }
    usuario = usuarioContexto(ctx, perfil.ocupacion, perfil.objetivoPerfil);
  }

  // La clave se recorta: recién rotada y pegada con un salto de línea,
  // `fetch` lanzaría `Invalid header value` en cada intento y el alumno
  // acabaría en el banco sin que el log dijera por qué.
  const claveCruda = process.env.ANTHROPIC_API_KEY;
  const clave = claveCruda?.trim();
  traza("clave", huellaClave(claveCruda));

  return flujoDeGeneracion(traza, async (emitir) => {
    if (clave) {
      const sistema = construirSistema(nivel);
      // Las especificaciones de examen solo se revisan en el modo examen:
      // un bloque de repaso de un alumno que prepara First no tiene por qué
      // seguir el formato del examen.
      const examenARevisar = modo === "examen" ? examen : null;

      // El presupuesto de IA es el menor entre su propio tope y lo que
      // queda de la petición: lo gastado en sesión y ficha ya no está.
      const plazoIa = abrirPlazo(Math.min(PRESUPUESTO_IA_MS, plazoPeticion.restante() - 5_000));

      const generado = await generarConRevision(
        clave,
        sistema,
        usuario,
        examenARevisar,
        plazoIa,
        traza,
        emitir
      );

      if (generado) {
        const bloque = conIdPropio(generado.bloque);
        // Se guarda antes de responder, no en segundo plano: si la
        // escritura se quedara a medias, el alumno vería el bloque, lo
        // practicaría y al volver no estaría. El coste es una inserción,
        // que al lado de una llamada a la API de Anthropic no se nota.
        //
        // Con plazo, eso sí, y sin cortar la respuesta si falla: llegados
        // aquí el bloque ya está generado y pagado. Perder la escritura
        // es perder el historial de un bloque; perder la respuesta es
        // dejar al alumno con el spinner después de esperarlo todo.
        if (persistir) {
          traza("guardado:ia");
          emitir({ tipo: "etapa", etapa: "guardando", ms: plazoPeticion.transcurrido() });
          await conLimiteOAlternativa(
            guardarBloqueGenerado(alumnoId, bloque, modo, "ia", generado.revision),
            TIEMPO_BASE_MS,
            "guardarBloqueGenerado(ia)",
            false
          );
        }
        traza("salida:ia");
        emitir({ tipo: "listo", bloque, origen: "ia" });
        return;
      }
    }

    // Sin clave, o con la generación descartada: banco de reserva.
    traza("banco:inicio");
    emitir({ tipo: "etapa", etapa: "banco", ms: plazoPeticion.transcurrido() });

    // El retardo hace que la experiencia se sienta igual en la demo, pero
    // solo cuando el banco respondió al instante. Si venimos de agotar el
    // presupuesto de IA, el alumno ya ha esperado de sobra.
    if (plazoPeticion.transcurrido() < ESPERA_BANCO_MS) {
      await esperar(ESPERA_BANCO_MS - plazoPeticion.transcurrido());
    }

    const bloque = conIdPropio(bloqueDeBanco(nivel, titulosExcluidos));
    if (persistir) {
      await conLimiteOAlternativa(
        guardarBloqueGenerado(alumnoId, bloque, modo, "banco", null),
        TIEMPO_BASE_MS,
        "guardarBloqueGenerado(banco)",
        false
      );
    }
    traza("salida:banco");
    emitir({ tipo: "listo", bloque, origen: "banco" });
  });
}
