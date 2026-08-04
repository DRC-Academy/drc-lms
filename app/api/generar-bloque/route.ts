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
import { detectarExamen, nivelDeBloque } from "@/lib/perfil";
import { primeraFrase, type ModoGeneracion } from "@/lib/modos";
import { bloqueDeBanco } from "@/lib/banco";
import { validarBloque } from "@/lib/validarBloque";
import { extraerJson } from "@/lib/json";
import { avisosParaRegenerar, revisarBloque, type Revision } from "@/lib/revisor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELO = "claude-sonnet-4-6";
const URL_API = "https://api.anthropic.com/v1/messages";
const ESPERA_BANCO_MS = 1600; // el banco responde al instante: sin esto la demo se siente falsa
const TIEMPO_MAXIMO_MS = 45_000;
const INTENTOS = 2;

export type Origen = "ia" | "banco";
export type RespuestaGeneracion = { bloque: Bloque; origen: Origen };

const AREAS = ["Gramática", "Léxico", "Discurso"];
const MODOS: ModoGeneracion[] = ["repaso", "examen", "contexto"];

function esperar(ms: number) {
  return new Promise<void>((resolver) => setTimeout(resolver, ms));
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

async function pedirBloqueAlModelo(
  clave: string,
  sistema: string,
  usuario: string
): Promise<Bloque | null> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);

  try {
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

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error(`[generar-bloque] La API respondió ${respuesta.status}: ${detalle.slice(0, 400)}`);
      return null;
    }

    const cuerpo: unknown = await respuesta.json();
    if (typeof cuerpo !== "object" || cuerpo === null) return null;

    const contenido = (cuerpo as { content?: unknown }).content;
    if (!Array.isArray(contenido)) return null;

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

    if (!texto.trim()) return null;

    return validarBloque(extraerJson(texto));
  } catch (error) {
    console.error("[generar-bloque] Falló la llamada a la API:", error);
    return null;
  } finally {
    clearTimeout(corte);
  }
}

// ---------------------------------------------------------------
// GENERACIÓN CON REVISIÓN
// ---------------------------------------------------------------

/** Pide bloques hasta que uno pase la validación estructural. */
async function generarEstructural(
  clave: string,
  sistema: string,
  usuario: string
): Promise<Bloque | null> {
  for (let intento = 1; intento <= INTENTOS; intento++) {
    const bloque = await pedirBloqueAlModelo(clave, sistema, usuario);
    if (bloque) return bloque;
    console.warn(`[generar-bloque] Intento ${intento}/${INTENTOS} descartado por validación estructural.`);
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
 */
async function generarConRevision(
  clave: string,
  sistema: string,
  usuario: string,
  examen: TipoExamen | null
): Promise<Bloque | null> {
  const primero = await generarEstructural(clave, sistema, usuario);
  if (!primero) return null;

  const revision = await revisarBloque(clave, primero, examen);
  registrarRevision("revisión 1", revision);
  if (revision.estado !== "con-problemas") return primero;

  const segundo = await generarEstructural(
    clave,
    sistema,
    usuario + avisosParaRegenerar(revision.problemas)
  );
  if (!segundo) return null;

  const segundaRevision = await revisarBloque(clave, segundo, examen);
  registrarRevision("revisión 2", segundaRevision);
  if (segundaRevision.estado !== "con-problemas") return segundo;

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
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON." }, { status: 400 });
  }

  const datos = (cuerpo ?? {}) as { alumnoId?: unknown; modo?: unknown; excluir?: unknown };
  const alumnoId = typeof datos.alumnoId === "string" ? datos.alumnoId : "";

  if (!esModo(datos.modo)) {
    return NextResponse.json(
      { error: `El modo tiene que ser uno de: ${MODOS.join(", ")}.` },
      { status: 400 }
    );
  }
  const modo = datos.modo;

  const alumno = alumnoId ? await obtenerAlumno(alumnoId) : null;
  if (!alumno) {
    return NextResponse.json({ error: "No encontramos a ese alumno." }, { status: 404 });
  }

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

  const clave = process.env.ANTHROPIC_API_KEY;

  if (clave) {
    const sistema = construirSistema(nivel);
    // Las especificaciones de examen solo se revisan en el modo examen:
    // un bloque de repaso de un alumno que prepara First no tiene por qué
    // seguir el formato del examen.
    const examenARevisar = modo === "examen" ? examen : null;

    const bloque = await generarConRevision(clave, sistema, usuario, examenARevisar);
    if (bloque) {
      const salida: RespuestaGeneracion = { bloque: conIdPropio(bloque), origen: "ia" };
      return NextResponse.json(salida);
    }
  }

  // Sin clave, o con la generación descartada: banco de reserva.
  // El retardo hace que la experiencia se sienta igual en la demo.
  await esperar(ESPERA_BANCO_MS);
  const salida: RespuestaGeneracion = {
    bloque: conIdPropio(bloqueDeBanco(nivel, titulosExcluidos)),
    origen: "banco",
  };
  return NextResponse.json(salida);
}
