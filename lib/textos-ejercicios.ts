// ---------------------------------------------------------------
// LOS TEXTOS DE LA PANTALLA DE EJERCICIOS, EN LOS DOS IDIOMAS
//
// Todo lo que el alumno lee en el visor y que NO es el ejercicio: los
// botones, los rótulos, las frases de corrección por defecto y las dos
// pantallas de cierre. El ejercicio en sí —enunciado, opciones,
// explicación— viene del bloque y no pasa por aquí.
//
// POR QUÉ UN ARCHIVO Y NO UN DICCIONARIO DE VERDAD. No hay i18n en el
// proyecto y esto no lo trae: son sesenta y pico cadenas de cuatro
// archivos, y montar `next-intl` para ellas obligaría a mover el resto
// de la aplicación detrás. La aplicación se queda en español a
// propósito —es útil que lo esté—, así que el bilingüismo es de la
// pantalla de ejercicios y de nadie más. El día que eso cambie, esto es
// lo que se sustituye, y hasta entonces no arrastra a nada.
//
// POR QUÉ HAY FUNCIONES Y NO SOLO CADENAS. Porque la mitad de los
// textos llevan un número dentro y el número cambia la gramática:
// "el hueco" contra "los tres huecos", "gap" contra "gaps". Con
// plantillas sueltas y un `${n}` interpolado fuera, cada plural habría
// que resolverlo en el sitio donde se pinta, que es exactamente cómo se
// cuelan los "1 huecos".
//
// INGLÉS BRITÁNICO. DRC es una academia irlandesa, y el prompt del
// bloque ya lo tiene en cuenta —no marca 'the team have finished' como
// fallo—. Aquí se traduce en 'Recognise' y no 'Recognize'.
//
// Módulo puro: solo compone cadenas. El idioma en curso lo lleva
// `components/ejercicios/usarIdioma.ts`, que es quien toca el navegador.
// ---------------------------------------------------------------

import type { Fase } from "@/lib/ejercicio-unificado";
import { UMBRAL_DOMINADO } from "@/lib/progreso";

export type Idioma = "en" | "es";

export const IDIOMAS: Idioma[] = ["en", "es"];

/**
 * EL IDIOMA CON EL QUE SE ABRE LA PANTALLA.
 *
 * Inglés, en los cinco niveles. Y es una constante y no una regla por
 * nivel a propósito: aquí no vale el argumento que sí vale para las
 * explicaciones del bloque —ese que dice que hablar SOBRE la lengua es
 * un escalón por encima de usarla, y que está escrito largo en
 * `lib/prompt-bloque.ts`—. "Check", "Next exercise" y "Show hint" no son
 * lengua sobre la lengua: son cuatro palabras de A1 que además están
 * pegadas a un botón que el alumno ya sabe para qué sirve.
 *
 * Donde ese argumento sí manda es en el CONTENIDO del bloque, y eso se
 * decide en el prompt, no aquí.
 */
export const IDIOMA_POR_DEFECTO: Idioma = "en";

/** El otro. El botón de la pantalla solo alterna entre dos. */
export function elOtro(idioma: Idioma): Idioma {
  return idioma === "en" ? "es" : "en";
}

// ---------------------------------------------------------------
// NÚMEROS ESCRITOS
//
// Estaban duplicados en `VisorEjercicios` y en `FlujoEjercicios`, con la
// misma lista de once palabras copiada en los dos. Ahora que además hay
// que tenerlos en inglés, dejarlos duplicados serían cuatro listas.
// ---------------------------------------------------------------

const NUMEROS: Record<Idioma, string[]> = {
  es: ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"],
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
};

/** "tres" / "three". El número a secas si se sale de la lista. */
export function enLetras(idioma: Idioma, n: number): string {
  return NUMEROS[idioma][n] ?? String(n);
}

/** "a, b y c" / "a, b and c" */
function enumerar(idioma: Idioma, partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  const cola = idioma === "en" ? "and" : "y";
  return `${partes.slice(0, -1).join(", ")} ${cola} ${partes[partes.length - 1]}`;
}

// ---------------------------------------------------------------
// LA FORMA DEL PAQUETE
// ---------------------------------------------------------------

export type Textos = {
  // --- el botón que cambia de idioma ---
  /** Nombra el idioma AL QUE LLEVA, no el que se está leyendo. */
  otroIdioma: string;
  otroIdiomaAria: string;
  /** Mientras el contenido del bloque viene de camino. */
  traduciendo: string;
  traduccionFallida: string;

  // --- las tres fases del bloque generado ---
  fases: Record<Fase, { nombre: string; accion: string }>;
  faseEtiqueta: (numero: number, nombre: string) => string;

  // --- la barra de progreso y la salida ---
  progreso: (indice: number, total: number) => string;
  volverA: (seccion: string) => string;
  anterior: string;

  // --- responder ---
  variasCorrectas: string;
  placeholderEscritura: string;
  placeholderLibre: string;
  verPista: string;
  huecoAria: (n: number) => string;
  ayudaHuecos: (n: number) => string;

  // --- el botón principal, con sus cuatro estados en espera ---
  comprobar: string;
  esperaEscritura: string;
  esperaOpciones: string;
  esperaHuecos: string;
  esperaLibre: string;
  verElResultado: string;
  siguienteEjercicio: string;

  // --- la corrección por defecto ---
  // La que se pinta cuando el ejercicio no trae veredicto propio: los
  // 1.492 importados de LearnDash no lo traen NUNCA, así que para ellos
  // esto no es un respaldo, es toda la corrección que hay.
  esoEs: string;
  huecosCorrectos: (n: number) => string;
  casi: (solucion: string) => string;
  noEraEsa: (solucion: string) => string;
  respuestaEra: (respuestas: string[]) => string;
  unaVersionCorrecta: (respuesta: string) => string;

  // --- la fase de producir ---
  compararConElModelo: string;
  revisaTuRespuesta: string;
  unEjemploValido: string;
  avisoProfesor: string;

  // --- el lateral de fases (solo la práctica generada) ---
  tuPractica: string;
  hechosDeTotal: (hechos: number, total: number) => string;
  avisoProfesorLateral: (profesor: string) => string;

  // --- el cierre de la práctica generada ---
  notaClaseOrigen: (profesor: string, fecha: string) => string;
  cierrePractica: (porcentaje: number) => string;
  volverAMisBloques: string;

  // --- el cierre de la lección del curso ---
  ejerciciosTerminados: string;
  resultadoLeccion: (aciertos: number, total: number) => string;
  cierreLeccion: (aciertos: number, total: number, profesor: string) => string;
  ver: string;
  completarYSeguir: string;
  repetirLosEjercicios: string;
  volverALaTeoria: string;
};

// ---------------------------------------------------------------
// ESPAÑOL
//
// Es el texto que ya había, palabra por palabra. Esta tanda cambia el
// idioma con el que se abre la pantalla, no lo que dice: si alguna
// frase se lee mal, se leía mal ayer también, y arreglarla aquí de paso
// escondería el cambio dentro de otro.
// ---------------------------------------------------------------

const ES: Textos = {
  otroIdioma: "English",
  otroIdiomaAria: "See this screen in English",
  traduciendo: "Traduciendo…",
  // Dice qué se puede hacer, no qué ha fallado: al alumno le da igual
  // de quién fue la culpa y no puede arreglar nada más que esto.
  traduccionFallida: "Los ejercicios se han quedado en inglés. Vuelve a pulsar para intentarlo otra vez.",

  fases: {
    reconocer: { nombre: "Reconocer", accion: "Elige la forma" },
    transformar: { nombre: "Transformar", accion: "Reescribe" },
    producir: { nombre: "Producir", accion: "Escribe tú" },
  },
  faseEtiqueta: (numero, nombre) => `Fase ${numero} · ${nombre}`,

  progreso: (indice, total) => `Ejercicio ${indice} de ${total}`,
  volverA: (seccion) => `Volver a ${seccion}`,
  anterior: "← Anterior",

  variasCorrectas: "Puede haber más de una correcta.",
  placeholderEscritura: "Escribe tu versión…",
  placeholderLibre: "Escribe aquí…",
  verPista: "Ver pista",
  huecoAria: (n) => `Hueco ${n}`,
  ayudaHuecos: (n) =>
    `Escribe y sal del hueco para corregirlo. ${enLetras("es", n)} ${n === 1 ? "hueco" : "huecos"}.`,

  comprobar: "Comprobar",
  esperaEscritura: "Escribe tu versión",
  esperaOpciones: "Elige una opción",
  esperaHuecos: "Rellena los huecos",
  esperaLibre: "Escribe tu respuesta",
  verElResultado: "Ver el resultado →",
  siguienteEjercicio: "Siguiente ejercicio →",

  esoEs: "Eso es.",
  huecosCorrectos: (n) =>
    n === 1 ? "El hueco, correcto." : `Los ${enLetras("es", n)} huecos, correctos.`,
  casi: (solucion) => `Casi. ${solucion}`,
  noEraEsa: (solucion) => `No era esa. La correcta es la ${solucion}`,
  respuestaEra: (respuestas) =>
    `${respuestas.length === 1 ? "La respuesta era" : "Las respuestas eran"} ${enumerar(
      "es",
      respuestas
    )}.`,
  unaVersionCorrecta: (respuesta) => `Una versión correcta: ${respuesta}`,

  compararConElModelo: "Comparar con el modelo",
  revisaTuRespuesta: "Revisa tu respuesta",
  unEjemploValido: "Un ejemplo válido",
  avisoProfesor: "Tu profesor verá esta respuesta antes de la próxima clase.",

  tuPractica: "Tu práctica",
  hechosDeTotal: (hechos, total) => `${hechos} de ${total}`,
  avisoProfesorLateral: (profesor) => `${profesor} verá tu respuesta antes de la clase.`,

  notaClaseOrigen: (profesor, fecha) => `Lo viste con ${profesor} el ${fecha}.`,
  cierrePractica: (porcentaje) =>
    porcentaje === 100
      ? "Bloque impecable. Esto ya lo tienes dominado."
      : porcentaje >= UMBRAL_DOMINADO
        ? "Muy bien. Lo tienes cogido; un repaso en unos días y queda fijado."
        : porcentaje >= 60
          ? "Buen avance. Lo que se resistió hoy vuelve la semana que viene."
          : "Bloque exigente. Repítelo en un par de días y verás el salto.",
  volverAMisBloques: "Volver a mis bloques",

  ejerciciosTerminados: "Ejercicios terminados",
  resultadoLeccion: (aciertos, total) =>
    aciertos !== total
      ? `Acertaste ${aciertos} de ${total}.`
      : total === 1
        ? "Correcto."
        : `Los ${enLetras("es", total)}, correctos.`,
  cierreLeccion: (aciertos, total, profesor) =>
    aciertos === total
      ? "Has terminado los ejercicios de esta lección. Puedes seguir con la siguiente cuando quieras."
      : `Lo que se te ha quedado a medias vuelve a aparecer en tu práctica.${
          profesor ? ` ${profesor} lo verá antes de vuestra próxima clase.` : ""
        }`,
  ver: "Ver",
  completarYSeguir: "Completar y seguir",
  repetirLosEjercicios: "Repetir los ejercicios",
  volverALaTeoria: "← Volver a la teoría de la lección",
};

// ---------------------------------------------------------------
// INGLÉS
//
// Escrito para el alumno más bajo que va a leerlo, que es un A1: frases
// cortas, vocabulario de alta frecuencia y ni una palabra de jerga
// gramatical. Es el mismo criterio que el prompt le impone al modelo
// para las explicaciones, y por la misma razón — con la diferencia de
// que aquí no hay ejercicio que valga: si no se entiende "Check", el
// alumno no puede ni responder.
//
// Dos que no son traducción literal y es a propósito:
//
//   'Elige la forma' → 'Pick the right one'. 'Form' en un contexto de
//   gramática inglesa significa otra cosa (la forma verbal), y el rótulo
//   de la fase estaría nombrando justo lo que no es.
//
//   'Escribe tú' → 'Write it yourself'. El contraste de la fase es con
//   las dos anteriores, donde el material se lo damos hecho.
// ---------------------------------------------------------------

const EN: Textos = {
  otroIdioma: "Español",
  otroIdiomaAria: "Ver esta pantalla en español",
  traduciendo: "Translating…",
  traduccionFallida: "The exercises are still in Spanish. Tap again to try once more.",

  fases: {
    reconocer: { nombre: "Recognise", accion: "Pick the right one" },
    transformar: { nombre: "Transform", accion: "Rewrite it" },
    producir: { nombre: "Produce", accion: "Write it yourself" },
  },
  faseEtiqueta: (numero, nombre) => `Phase ${numero} · ${nombre}`,

  progreso: (indice, total) => `Exercise ${indice} of ${total}`,
  volverA: (seccion) => `Back to ${seccion}`,
  anterior: "← Previous",

  variasCorrectas: "More than one answer can be right.",
  placeholderEscritura: "Write your version…",
  placeholderLibre: "Write here…",
  verPista: "Show hint",
  huecoAria: (n) => `Gap ${n}`,
  ayudaHuecos: (n) =>
    `Write in the gap and click outside it to check. ${enLetras("en", n)} ${
      n === 1 ? "gap" : "gaps"
    }.`,

  comprobar: "Check",
  esperaEscritura: "Write your version",
  esperaOpciones: "Pick an answer",
  esperaHuecos: "Fill in the gaps",
  esperaLibre: "Write your answer",
  verElResultado: "See your result →",
  siguienteEjercicio: "Next exercise →",

  esoEs: "That's it.",
  huecosCorrectos: (n) =>
    n === 1 ? "The gap is right." : `All ${enLetras("en", n)} gaps are right.`,
  casi: (solucion) => `Close. ${solucion}`,
  noEraEsa: (solucion) => `Not that one. The right answer is ${solucion}`,
  respuestaEra: (respuestas) =>
    `${respuestas.length === 1 ? "The answer was" : "The answers were"} ${enumerar(
      "en",
      respuestas
    )}.`,
  unaVersionCorrecta: (respuesta) => `One correct version: ${respuesta}`,

  compararConElModelo: "Compare with the example",
  revisaTuRespuesta: "Check your answer",
  unEjemploValido: "One good example",
  avisoProfesor: "Your teacher will read this before your next class.",

  tuPractica: "Your practice",
  hechosDeTotal: (hechos, total) => `${hechos} of ${total}`,
  avisoProfesorLateral: (profesor) => `${profesor} will read your answer before your class.`,

  notaClaseOrigen: (profesor, fecha) => `You saw this with ${profesor} on ${fecha}.`,
  cierrePractica: (porcentaje) =>
    porcentaje === 100
      ? "Perfect block. You have this one."
      : porcentaje >= UMBRAL_DOMINADO
        ? "Very good. You have the idea; one more look in a few days and it sticks."
        : porcentaje >= 60
          ? "Good progress. What was hard today comes back next week."
          : "A tough block. Do it again in a couple of days and you will see the jump.",
  volverAMisBloques: "Back to my blocks",

  ejerciciosTerminados: "Exercises finished",
  resultadoLeccion: (aciertos, total) =>
    aciertos !== total
      ? `You got ${aciertos} of ${total}.`
      : total === 1
        ? "Correct."
        : `All ${enLetras("en", total)} correct.`,
  cierreLeccion: (aciertos, total, profesor) =>
    aciertos === total
      ? "You have finished the exercises in this lesson. Move on to the next one whenever you like."
      : `What you left half done comes back in your practice.${
          profesor ? ` ${profesor} will see it before your next class.` : ""
        }`,
  ver: "See",
  completarYSeguir: "Complete and continue",
  repetirLosEjercicios: "Do them again",
  volverALaTeoria: "← Back to the lesson text",
};

export const TEXTOS: Record<Idioma, Textos> = { en: EN, es: ES };

/** El paquete de este idioma. */
export function textos(idioma: Idioma): Textos {
  return TEXTOS[idioma];
}
