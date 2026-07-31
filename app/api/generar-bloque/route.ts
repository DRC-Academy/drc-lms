// ---------------------------------------------------------------
// GENERACIÓN DE UN BLOQUE NUEVO
// Recibe el id del alumno, arma su ficha y le pide a Claude un
// bloque con exactamente la forma del tipo `Bloque`.
//
// Se llama a la API con `fetch` en vez del SDK oficial a propósito:
// el proyecto no debe crecer en dependencias.
//
// Si no hay clave, o si el modelo devuelve algo que no valida,
// se sirve un bloque del banco de reserva. Nunca se devuelve un
// bloque a medio formar.
// ---------------------------------------------------------------

import { NextResponse } from "next/server";
import { getAlumno, type Bloque } from "@/lib/data";
import { bloqueDeBanco } from "@/lib/banco";
import { validarBloque } from "@/lib/validarBloque";

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

/** Quita los vallados de markdown y se queda con el primer objeto JSON. */
function extraerJson(texto: string): unknown {
  let limpio = texto.trim();

  // ```json … ``` o ``` … ```
  const vallado = limpio.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (vallado) limpio = vallado[1].trim();

  // Cualquier cosa que el modelo haya escrito antes o después del objeto.
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin <= inicio) return null;

  try {
    return JSON.parse(limpio.slice(inicio, fin + 1)) as unknown;
  } catch {
    return null;
  }
}

function construirPrompt(
  nombre: string,
  nivel: Bloque["nivel"],
  temas: string[],
  titulosExcluidos: string[]
): { sistema: string; usuario: string } {
  const sistema = [
    "Eres el diseñador de materiales de DRC Academy, una academia de inglés online para adultos hispanohablantes.",
    "Escribes bloques de práctica de cinco minutos a partir de lo que el alumno acaba de ver en clase.",
    "",
    "REGLAS DE CONTENIDO",
    "- Los enunciados, frases y respuestas de los ejercicios van en inglés.",
    "- Las instrucciones, pistas y explicaciones van en español de España, tuteando, en tono cálido y directo.",
    "- Nunca uses lenguaje de error o de vigilancia: nada de 'tus fallos', 'tus errores' o 'áreas deficientes'.",
    "- Las explicaciones dicen POR QUÉ, no repiten la regla en abstracto. Una o dos frases, sin jerga gramatical innecesaria.",
    "- El contexto es profesional y adulto: reuniones, correos, clientes, proyectos. Nada de ejemplos escolares.",
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

  const evitar = titulosExcluidos.length
    ? `\nNo repitas estos temas, que el alumno ya tiene delante: ${titulosExcluidos.join("; ")}.`
    : "";

  const usuario = [
    `Ficha del alumno:`,
    `- Nombre: ${nombre}`,
    `- Nivel: ${nivel}`,
    `- Últimas clases (de la más reciente a la más antigua): ${temas.join("; ")}`,
    "",
    `Prepara UN bloque nuevo de nivel ${nivel} que continúe de forma natural el trabajo de la última clase`,
    `("${temas[0]}"): puede profundizar en un aspecto que se queda corto, atacar el punto donde ese tema`,
    `se confunde con otro, o llevarlo a un uso que en clase no dio tiempo a practicar.${evitar}`,
    "",
    "Devuelve exactamente esta estructura:",
    JSON.stringify(
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
    ),
    "",
    "Requisitos que se comprueban antes de publicar el bloque:",
    "- Exactamente 5 ejercicios, en este orden: reconocer, reconocer, transformar, transformar, producir.",
    "- Cada 'reconocer' tiene exactamente 4 opciones distintas y 'correcta' es el índice (0-3) de la buena.",
    "- Cada 'transformar' lista TODAS las respuestas aceptables: la respuesta del alumno se compara literalmente",
    "  (ignorando mayúsculas y puntuación), así que incluye contracciones ('I would' y \"I'd\") y variantes de orden.",
    "  Que la pista sea lo bastante concreta como para que solo quepan las respuestas que has listado.",
    "- El 'producir' tiene entre 2 y 5 criterios comprobables y un modelo real.",
  ].join("\n");

  return { sistema, usuario };
}

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

export async function POST(peticion: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON." }, { status: 400 });
  }

  const datos = (cuerpo ?? {}) as { alumnoId?: unknown; excluir?: unknown };
  const alumnoId = typeof datos.alumnoId === "string" ? datos.alumnoId : "";
  const alumno = getAlumno(alumnoId);

  if (!alumno) {
    return NextResponse.json({ error: "No encontramos a ese alumno." }, { status: 404 });
  }

  const titulosExcluidos = Array.isArray(datos.excluir)
    ? datos.excluir.filter((t): t is string => typeof t === "string").slice(0, 20)
    : [];

  const temas = alumno.clases.map((clase) => clase.tema);
  const clave = process.env.ANTHROPIC_API_KEY;

  if (clave) {
    const { sistema, usuario } = construirPrompt(alumno.nombre, alumno.nivel, temas, titulosExcluidos);

    for (let intento = 1; intento <= INTENTOS; intento++) {
      const bloque = await pedirBloqueAlModelo(clave, sistema, usuario);
      if (bloque) {
        const salida: RespuestaGeneracion = { bloque: conIdPropio(bloque), origen: "ia" };
        return NextResponse.json(salida);
      }
      console.warn(`[generar-bloque] Intento ${intento}/${INTENTOS} descartado por validación o error.`);
    }
  }

  // Sin clave, o con la generación descartada: banco de reserva.
  // El retardo hace que la experiencia se sienta igual en la demo.
  await esperar(ESPERA_BANCO_MS);
  const salida: RespuestaGeneracion = {
    bloque: conIdPropio(bloqueDeBanco(alumno.nivel, titulosExcluidos)),
    origen: "banco",
  };
  return NextResponse.json(salida);
}
