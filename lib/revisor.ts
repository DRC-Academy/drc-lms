// ---------------------------------------------------------------
// REVISIÓN PEDAGÓGICA
//
// La validación estructural comprueba la FORMA del bloque: cinco
// ejercicios, cuatro opciones, un índice válido. No puede ver que un
// distractor sea, de hecho, una respuesta correcta.
//
// Ese defecto es el más caro del producto: el alumno marca la opción
// que también es válida, se la damos por fallada, se lo comenta a su
// profesor y la autoridad del material se cae. Por eso, después de la
// validación estructural y antes de devolver nada, un segundo modelo
// revisa el bloque como haría un compañero de departamento.
//
// La revisión NUNCA puede dejar al alumno sin ejercicios: si falla,
// tarda demasiado o responde algo que no se entiende, se devuelve el
// bloque tal cual y se registra la incidencia.
// ---------------------------------------------------------------

import "server-only";
import type { Bloque, TipoExamen } from "@/lib/data";
import { NOMBRE_EXAMEN } from "@/lib/data";
import { extraerJson } from "@/lib/json";

// Tarea de verificación acotada y en cada generación: prima el coste.
const MODELO_REVISOR = "claude-haiku-4-5-20251001";
const URL_API = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 1000; // la respuesta es un JSON corto
const TIEMPO_MAXIMO_MS = 15_000;

export const TIPOS_PROBLEMA = [
  "distractor_valido",
  "respuesta_incorrecta",
  "distractor_implausible",
  "instruccion_incoherente",
  "formato_examen",
] as const;

export type TipoProblema = (typeof TIPOS_PROBLEMA)[number];

export type Problema = {
  /** Posición del ejercicio dentro del bloque, de 1 a 5. */
  ejercicio: number;
  tipo: TipoProblema;
  detalle: string;
};

export type Revision =
  | { estado: "apto"; problemas: []; ms: number }
  | { estado: "con-problemas"; problemas: Problema[]; ms: number }
  | { estado: "no-disponible"; motivo: string; ms: number };

// ---------------------------------------------------------------
// ESPECIFICACIONES DE EXAMEN
// El generador ya las lleva en su prompt, pero se repiten aquí para que
// el revisor pueda comprobarlas sin depender de lo que se le pidió al
// generador: si el generador se equivoca, el revisor tiene que verlo.
// ---------------------------------------------------------------

const ESPECIFICACION_EXAMEN: Record<TipoExamen, string> = {
  b2_first:
    "B2 First: la key word transformation se resuelve con entre DOS y CINCO palabras (la palabra clave incluida, y sin modificarla). Si el ejercicio pide otro rango, es un error.",
  c1_advanced:
    "C1 Advanced: la key word transformation se resuelve con entre TRES y SEIS palabras (la palabra clave incluida, y sin modificarla). Si el ejercicio pide otro rango, es un error.",
  b1_preliminary:
    "B1 Preliminary: este examen NO tiene key word transformation. Si aparece una, con palabra clave obligatoria y recuento de palabras, es un error de formato.",
  ielts:
    "IELTS no es un examen de Cambridge: no tiene key word transformation ni open cloze. Si aparece cualquiera de los dos, es un error de formato.",
};

const SISTEMA = [
  "Eres revisor de materiales de inglés en DRC Academy, una academia irlandesa. Revisas ejercicios que ha escrito otro modelo, antes de que lleguen al alumno.",
  "",
  "Tu única tarea es DETECTAR defectos. No reescribes, no propones alternativas y no corriges: si algo está mal, se regenera entero.",
  "",
  "SÉ CONSERVADOR. Marca un problema solo si estás seguro. Un falso positivo cuesta una regeneración; un falso negativo llega al alumno y le damos por fallada una respuesta que era correcta. Ante la duda, no marques.",
  "",
  "Buscas EXACTAMENTE cuatro defectos:",
  "",
  "1. distractor_valido — una opción marcada como incorrecta que en realidad también es correcta. Es el defecto más común y el más dañino. Ejemplos reales:",
  "   · 'Every morning I ____ a shower' con 'have' como correcta y 'take' como distractor: 'take a shower' es inglés normal en registro americano.",
  "   · 'She usually ____ home at half past six' con 'gets' como correcta y 'arrives' como distractor: 'arrives home' es correcto.",
  "   · 'a restaurant ____ they make the best pizza' con 'where' como correcta e 'in which' como distractor: 'in which' es gramatical, solo más formal.",
  "   · 'The risk team ____ three new control failures' con 'has identified' como correcta y 'have identified' como distractor: en inglés británico e irlandés los nombres colectivos admiten concordancia plural, así que las DOS son correctas. Este caso importa especialmente: la academia es irlandesa.",
  "",
  "2. respuesta_incorrecta — una respuesta de la lista de aceptadas que no es inglés correcto. Menos frecuente, más grave. Ejemplo real:",
  "   · 'The project was more expensive than expected, ____ which the team still managed to deliver it' aceptaba 'despite' y también 'yet'. 'yet which' no es inglés: solo 'despite' funciona delante de un relativo.",
  "",
  "3. distractor_implausible — un distractor que rompe la frase en lugar de reproducir un error que un alumno cometería. Ejemplo real:",
  "   · en 'There's a new shop ____ sells second-hand bikes', el distractor 'which sells' produce 'shop which sells sells bikes', con el verbo duplicado.",
  "",
  "4. instruccion_incoherente — la instrucción no describe lo que de verdad hace falta para acertar. Ejemplo real:",
  "   · una instrucción decía 'corrige la frase cambiando solo la palabra relativa', pero las respuestas aceptadas exigían además eliminar un 'in it' del final.",
  "",
  "5. formato_examen — solo cuando se te indique que el bloque prepara un examen concreto: las especificaciones no coinciden con las de ese examen.",
  "",
  "FORMATO DE RESPUESTA",
  'Devuelves SOLO este objeto JSON, sin markdown y sin una palabra antes ni después: {"apto": true|false, "problemas": [{"ejercicio": 1, "tipo": "...", "detalle": "..."}]}',
  '"ejercicio" es la posición del ejercicio en el bloque, de 1 a 5. "tipo" es uno de: distractor_valido, respuesta_incorrecta, distractor_implausible, instruccion_incoherente, formato_examen.',
  '"detalle" es una frase en español que diga qué falla y por qué. Si el bloque está bien, devuelves {"apto": true, "problemas": []}.',
].join("\n");

function construirUsuario(bloque: Bloque, examen: TipoExamen | null): string {
  const partes = [
    "Revisa este bloque de práctica.",
    "",
    `Nivel declarado: ${bloque.nivel}.`,
  ];

  if (examen) {
    partes.push(
      `El bloque prepara el examen ${NOMBRE_EXAMEN[examen]}. Comprueba también sus especificaciones:`,
      ESPECIFICACION_EXAMEN[examen]
    );
  } else {
    partes.push("El bloque no prepara ningún examen: no revises especificaciones de examen.");
  }

  partes.push(
    "",
    "Los ejercicios van numerados del 1 al 5 en el mismo orden del array.",
    "",
    JSON.stringify({ titulo: bloque.titulo, intro: bloque.intro, ejercicios: bloque.ejercicios }, null, 2)
  );

  return partes.join("\n");
}

function esTipoProblema(valor: unknown): valor is TipoProblema {
  return typeof valor === "string" && TIPOS_PROBLEMA.includes(valor as TipoProblema);
}

/** Lee la respuesta del revisor sin fiarse de nada de lo que venga. */
function interpretar(crudo: unknown): { apto: boolean; problemas: Problema[] } | null {
  if (typeof crudo !== "object" || crudo === null || Array.isArray(crudo)) return null;

  const objeto = crudo as { apto?: unknown; problemas?: unknown };
  if (typeof objeto.apto !== "boolean") return null;

  const problemas: Problema[] = [];
  if (Array.isArray(objeto.problemas)) {
    for (const bruto of objeto.problemas) {
      if (typeof bruto !== "object" || bruto === null) continue;
      const p = bruto as { ejercicio?: unknown; tipo?: unknown; detalle?: unknown };
      if (!esTipoProblema(p.tipo)) continue;

      const ejercicio =
        typeof p.ejercicio === "number" && Number.isInteger(p.ejercicio) ? p.ejercicio : 0;
      const detalle = typeof p.detalle === "string" ? p.detalle.trim() : "";
      if (detalle === "") continue;

      problemas.push({ ejercicio, tipo: p.tipo, detalle });
    }
  }

  return { apto: objeto.apto, problemas };
}

/**
 * Pasa el bloque por el revisor. Nunca lanza: cualquier fallo se traduce
 * en `no-disponible`, que quien llama interpreta como "sigue adelante".
 */
export async function revisarBloque(
  clave: string,
  bloque: Bloque,
  examen: TipoExamen | null
): Promise<Revision> {
  const arranque = Date.now();
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
        model: MODELO_REVISOR,
        max_tokens: MAX_TOKENS,
        system: SISTEMA,
        messages: [{ role: "user", content: construirUsuario(bloque, examen) }],
      }),
    });

    const ms = Date.now() - arranque;

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      return {
        estado: "no-disponible",
        motivo: `HTTP ${respuesta.status}: ${detalle.slice(0, 200)}`,
        ms,
      };
    }

    const cuerpo: unknown = await respuesta.json();
    const contenido =
      typeof cuerpo === "object" && cuerpo !== null ? (cuerpo as { content?: unknown }).content : null;

    if (!Array.isArray(contenido)) {
      return { estado: "no-disponible", motivo: "respuesta sin contenido", ms: Date.now() - arranque };
    }

    const texto = contenido
      .filter(
        (parte): parte is { type: "text"; text: string } =>
          typeof parte === "object" &&
          parte !== null &&
          (parte as { type?: unknown }).type === "text" &&
          typeof (parte as { text?: unknown }).text === "string"
      )
      .map((parte) => parte.text)
      .join("\n");

    const leido = interpretar(extraerJson(texto));
    const total = Date.now() - arranque;

    if (!leido) {
      return { estado: "no-disponible", motivo: "no se pudo leer el JSON del revisor", ms: total };
    }

    // Un "apto: false" sin un solo problema legible no da nada que
    // corregir en la regeneración: se deja pasar antes que gastar una
    // llamada a ciegas.
    if (leido.apto || leido.problemas.length === 0) {
      return { estado: "apto", problemas: [], ms: total };
    }

    return { estado: "con-problemas", problemas: leido.problemas, ms: total };
  } catch (error) {
    const ms = Date.now() - arranque;
    const motivo = control.signal.aborted
      ? `timeout de ${TIEMPO_MAXIMO_MS / 1000}s`
      : error instanceof Error
      ? error.message
      : "error desconocido";
    return { estado: "no-disponible", motivo, ms };
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Convierte los problemas detectados en un aviso para el generador.
 * Se le dice qué evitar, no cómo arreglar el bloque anterior: el bloque
 * se rehace entero.
 */
export function avisosParaRegenerar(problemas: Problema[]): string {
  const lineas = problemas.map((p) => `- Ejercicio ${p.ejercicio} (${p.tipo}): ${p.detalle}`);

  return [
    "",
    "AVISO IMPORTANTE. Un revisor rechazó el intento anterior por estos motivos:",
    ...lineas,
    "",
    "Escribe un bloque NUEVO que no repita ninguno de esos fallos. En particular:",
    "- Antes de dar por buena una opción incorrecta, comprueba que no sea válida en ningún registro ni variedad del inglés. Recuerda que la academia es irlandesa: los nombres colectivos ('the team', 'the board') admiten verbo en singular y en plural, así que no sirven como distractor uno del otro.",
    "- Cada respuesta de la lista de aceptadas tiene que ser inglés correcto en esa frase concreta.",
    "- Cada distractor tiene que producir una frase completa y plausible, con el error que cometería un alumno, no una frase rota.",
    "- La instrucción debe describir TODO lo que hace falta para acertar, sin pasos implícitos.",
  ].join("\n");
}
