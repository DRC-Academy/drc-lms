// ---------------------------------------------------------------
// REVISIÓN PEDAGÓGICA
//
// La validación estructural comprueba la FORMA del bloque: diez
// ejercicios, cuatro opciones, un índice válido. No puede ver que un
// distractor sea, de hecho, una respuesta correcta.
//
// Ese defecto es el más caro del producto: el alumno marca la opción
// que también es válida, se la damos por fallada, se lo comenta a su
// profesor y la autoridad del material se cae. Por eso, después de la
// validación estructural y antes de devolver nada, un segundo modelo
// revisa el bloque como haría un compañero de departamento.
//
// LO QUE HA CAMBIADO CON LOS DIEZ EJERCICIOS: el veredicto ya no manda
// rehacer el bloque, solo se guarda. Una generación son 48 segundos
// medidos y el techo de la plataforma son 60, así que no cabe un
// segundo intento; con lo que queda —tres segundos de revisión— se
// alcanza a dejar constancia y nada más. La revisión pasó de ser un
// filtro a ser un registro, y eso es exactamente lo que hay: sirve para
// medir con qué frecuencia sale mal y por qué, que es lo que hace falta
// para decidir si merece la pena pagar el presupuesto que la
// devolvería a filtro.
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
// Sube a 2000 con los diez ejercicios: un bloque con varios problemas
// señalados llenaba los 1000 y el JSON llegaba cortado, que aquí se lee
// como "no se pudo interpretar" y tira la revisión entera.
const MAX_TOKENS = 2000;

// Ocho segundos. No es un plazo cómodo: es el tope de lo que sobra del
// presupuesto de la ruta después de la generación, y quien llama lo
// recorta todavía más cuando la generación se pasó de lo previsto.
//
// Medido sobre bloques de diez, una revisión tarda entre 0,9 y más de 5
// segundos según lo cargada que esté la API. Con el tope en 5 se quedaba
// fuera la mitad larga de esa horquilla incluso habiendo sitio.
const TIEMPO_MAXIMO_MS = 8_000;

export const TIPOS_PROBLEMA = [
  "distractor_valido",
  "respuesta_incorrecta",
  "distractor_implausible",
  "instruccion_incoherente",
  "formato_examen",
] as const;

export type TipoProblema = (typeof TIPOS_PROBLEMA)[number];

export type Problema = {
  /** Posición del ejercicio dentro del bloque, de 1 a 10. */
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
    "B2 First: la key word transformation se resuelve con entre DOS y CINCO palabras, contando la palabra clave, que no puede modificarse. Marca formato_examen si la instrucción declara otro rango, o si alguna respuesta aceptada no completa la frase con sentido.",
  c1_advanced:
    "C1 Advanced: la key word transformation se resuelve con entre TRES y SEIS palabras, contando la palabra clave, que no puede modificarse. Marca formato_examen si la instrucción declara otro rango, o si alguna respuesta aceptada no completa la frase con sentido.",
  b1_preliminary:
    "B1 Preliminary: este examen NO tiene key word transformation al estilo Cambridge, es decir, no impone una palabra clave obligatoria en mayúsculas ni declara un recuento de palabras. Pedir que se reescriba una frase manteniendo el significado SÍ es apropiado para este examen y NO es un defecto. Marca formato_examen únicamente si un ejercicio impone palabra clave obligatoria o recuento de palabras.",
  ielts:
    "IELTS no es un examen de Cambridge: no tiene key word transformation ni open cloze. Reescribir una frase con registro académico, parafrasear o nominalizar SÍ es apropiado para IELTS y NO es un defecto. Marca formato_examen únicamente si un ejercicio impone una palabra clave obligatoria con recuento de palabras, o si presenta un open cloze de una sola palabra gramatical.",
};

const SISTEMA = [
  "Eres revisor de materiales de inglés en DRC Academy, una academia irlandesa. Revisas ejercicios que ha escrito otro modelo, antes de que lleguen al alumno.",
  "",
  "Tu única tarea es DETECTAR defectos. No reescribes, no propones alternativas y no corriges: solo señalas.",
  "",
  "SÉ CONSERVADOR. Marca un problema solo si estás seguro. Ante la duda, no marques. Lo que apuntes queda registrado como un defecto real de este bloque, así que un falso positivo ensucia la medida con la que decidimos qué arreglar; el que de verdad hace daño es el falso negativo, que llega al alumno y le da por fallada una respuesta que era correcta.",
  "",
  "ESTRUCTURA FIJA. Todos los bloques de DRC llevan siempre 10 ejercicios: 4 de tipo 'reconocer', 4 de tipo 'transformar' y 2 de tipo 'producir'. Es el formato pedagógico de la academia y no una afirmación sobre el examen. Que un bloque contenga ejercicios 'transformar', o que los 'producir' sean tareas de escritura abierta, NO es un defecto: no comentes a qué sección del examen pertenecería cada ejercicio ni propongas otra estructura.",
  "",
  "UN BLOQUE MIRA A VARIAS COSAS A LA VEZ. Se construye con la última clase del alumno, con los errores que arrastra de clases anteriores, con su trabajo y —si prepara uno— con el formato de su examen. Que unos ejercicios estén ambientados en su oficina y otros no, o que solo algunos sigan el formato del examen, es lo previsto y NO es un defecto. Tampoco lo es que los dos 'producir' pidan cosas distintas: están hechos para ser distintos.",
  "",
  "NO REPORTES LO QUE NO ESTÁS AFIRMANDO. Si al razonarlo concluyes que en realidad no hay defecto, no lo incluyas en la lista. Cada entrada de 'problemas' es una afirmación de que algo está mal.",
  "",
  "UNA COLOCACIÓN MENOS FRECUENTE NO ES UN DISTRACTOR INVÁLIDO. En los exámenes de Cambridge es normal que el distractor sea una combinación posible pero que no es la que se usa en ese contexto. Marca distractor_valido solo cuando la opción sea plenamente natural EN ESA FRASE para un hablante nativo, no cuando sea simplemente menos habitual.",
  "",
  "Buscas EXACTAMENTE estos cinco defectos, y ninguno más:",
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
  "5. formato_examen — solo cuando se te indique que el bloque prepara un examen concreto, y SOLO sobre lo que se te especifique abajo: el recuento de palabras de la key word transformation y los tipos de tarea que ese examen no tiene. Para nada más.",
  "",
  "FORMATO DE RESPUESTA",
  'Devuelves SOLO este objeto JSON, sin markdown y sin una palabra antes ni después: {"apto": true|false, "problemas": [{"ejercicio": 1, "tipo": "...", "detalle": "..."}]}',
  '"ejercicio" es la posición del ejercicio en el bloque, de 1 a 10. "tipo" es uno de: distractor_valido, respuesta_incorrecta, distractor_implausible, instruccion_incoherente, formato_examen.',
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
      `El alumno prepara el examen ${NOMBRE_EXAMEN[examen]}, así que parte del bloque —no todo— sigue su formato. Comprueba sus especificaciones SOLO en los ejercicios que claramente lo reproducen; que otros no lo hagan es lo previsto:`,
      ESPECIFICACION_EXAMEN[examen]
    );
  } else {
    partes.push("El alumno no prepara ningún examen: no revises especificaciones de examen.");
  }

  partes.push(
    "",
    `Los ejercicios van numerados del 1 al ${bloque.ejercicios.length} en el mismo orden del array.`,
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
  examen: TipoExamen | null,
  limiteMs: number = TIEMPO_MAXIMO_MS
): Promise<Revision> {
  const arranque = Date.now();

  // El plazo lo fija quien llama, que es el único que sabe cuánto queda
  // del presupuesto de la petición. Sin margen no se llama siquiera: una
  // revisión que va a expirar es una espera que el alumno paga para
  // acabar en el mismo sitio.
  const plazo = Math.min(limiteMs, TIEMPO_MAXIMO_MS);
  if (plazo < 1_000) {
    return { estado: "no-disponible", motivo: `sin margen (${plazo}ms)`, ms: 0 };
  }

  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), plazo);

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

    // Un "apto: false" sin un solo problema legible no dice nada: no
    // señala qué falla, así que guardarlo como defecto solo ensuciaría
    // el recuento. Cuenta como apto.
    if (leido.apto || leido.problemas.length === 0) {
      return { estado: "apto", problemas: [], ms: total };
    }

    return { estado: "con-problemas", problemas: leido.problemas, ms: total };
  } catch (error) {
    const ms = Date.now() - arranque;
    const motivo = control.signal.aborted
      ? `timeout de ${plazo / 1000}s`
      : error instanceof Error
      ? error.message
      : "error desconocido";
    return { estado: "no-disponible", motivo, ms };
  } finally {
    clearTimeout(corte);
  }
}
