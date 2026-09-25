// ---------------------------------------------------------------
// LOS TEXTOS DE LA PANTALLA DE EJERCICIOS, EN LOS DOS IDIOMAS
//
// Todo lo que el alumno lee en el visor y que NO es el ejercicio: los
// botones, los rótulos, las frases de corrección por defecto y las dos
// pantallas de cierre. El ejercicio en sí —enunciado, opciones,
// explicación— viene del bloque y no pasa por aquí.
//
// POR QUÉ UN ARCHIVO Y NO UN DICCIONARIO DE VERDAD. No hay i18n en el
// proyecto y esto no lo trae: son unas decenas de cadenas por área
// —esta es la de ejercicios; las demás están al lado, en `lib/textos/`—
// y montar `next-intl` para ellas obligaría a mover la aplicación
// entera detrás. El día que eso cambie, esto es lo que se sustituye.
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
// Módulo puro: solo compone cadenas. El idioma en curso lo sirve
// `components/ProveedorIdioma.tsx`, que es quien lee la cookie.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import type { Fase } from "@/lib/ejercicio-unificado";
import { UMBRAL_DOMINADO } from "@/lib/progreso";

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

/** "tres" → "Tres": para empezar una frase con el número. */
function conMayuscula(palabra: string): string {
  return palabra.charAt(0).toUpperCase() + palabra.slice(1);
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

export type TextosEjercicios = {
  // --- la traducción del contenido del bloque ---
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
  /** «Hueco 2 de 4»: el nombre del campo para el lector de pantalla. */
  huecoAria: (n: number, total: number) => string;
  /** Lo que se añade al nombre del hueco una vez corregido. */
  huecoBien: string;
  huecoARevisar: string;
  ayudaHuecos: (n: number) => string;
  /**
   * Al pulsar «Comprobar» con algún hueco en blanco. No corrige nada:
   * lleva al primero y lo dice sin tono de reproche.
   */
  huecosEnBlanco: string;
  /** El nombre de los dos campos de redacción, que el placeholder no da. */
  ariaEscritura: string;
  ariaLibre: string;

  // --- el botón principal, con sus cuatro estados en espera ---
  comprobar: string;
  esperaEscritura: string;
  esperaOpciones: string;
  esperaLibre: string;
  verElResultado: string;
  siguienteEjercicio: string;

  // --- la respuesta buena, en el cuadro de la mascota ---
  // La frase del veredicto la dice la mascota (lib/textos/mascota-feedback.ts);
  // esto es lo que va debajo cuando no se acertó.
  respuestaEra: (respuestas: string[]) => string;
  unaVersionCorrecta: (respuesta: string) => string;

  // --- la fase de producir ---
  compararConElModelo: string;
  revisaTuRespuesta: string;
  unEjemploValido: string;
  avisoProfesor: string;

  // --- el panel y el paso a paso del bloque (solo la práctica generada) ---
  tuPractica: string;
  avisoProfesorLateral: (profesor: string) => string;
  /** «Fase 1 de 3»: la fila de móvil y el paso a paso plegado. */
  faseDeTotal: (n: number, total: number) => string;
  /** «10 ejercicios · 10 min»: la etiqueta sobre el título del bloque. */
  ejerciciosYMinutos: (n: number, minutos: number) => string;
  irALaFase: (nombre: string) => string;
  teFaltanEjercicios: (n: number) => string;
  verMisBloques: string;
  abrirElPanel: string;
  cerrarElPanel: string;

  // --- el cierre de la práctica generada ---
  bloqueTerminado: string;
  cierrePractica: (porcentaje: number) => string;
  volverAMisBloques: string;
  repetirElBloque: string;

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

const ES: TextosEjercicios = {
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
  huecoAria: (n, total) => `Hueco ${n} de ${total}`,
  huecoBien: "correcto",
  huecoARevisar: "revísalo y vuelve a comprobar",
  ayudaHuecos: (n) =>
    n === 1
      ? "Escribe en el hueco y pulsa «Comprobar»."
      : `${conMayuscula(enLetras("es", n))} huecos. Con Intro pasas al siguiente; cuando acabes, pulsa «Comprobar».`,
  huecosEnBlanco: "Aún te queda algún hueco en blanco. Te llevo al primero.",
  ariaEscritura: "Tu versión de la frase",
  ariaLibre: "Tu respuesta",

  comprobar: "Comprobar",
  esperaEscritura: "Escribe tu versión",
  esperaOpciones: "Elige una opción",
  esperaLibre: "Escribe tu respuesta",
  verElResultado: "Ver el resultado →",
  siguienteEjercicio: "Siguiente ejercicio →",

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
  avisoProfesorLateral: (profesor) => `${profesor} verá tu respuesta antes de la clase.`,
  faseDeTotal: (n, total) => `Fase ${n} de ${total}`,
  ejerciciosYMinutos: (n, minutos) => `${n} ${n === 1 ? "ejercicio" : "ejercicios"} · ${minutos} min`,
  irALaFase: (nombre) => `Fase: ${nombre}`,
  teFaltanEjercicios: (n) =>
    n === 1 ? "Te falta 1 ejercicio para terminar el bloque." : `Te faltan ${n} ejercicios para terminar el bloque.`,
  verMisBloques: "Ver todos mis bloques",
  abrirElPanel: "Abrir el panel de la práctica",
  cerrarElPanel: "Cerrar el panel de la práctica",

  bloqueTerminado: "Bloque terminado",
  cierrePractica: (porcentaje) =>
    porcentaje === 100
      ? "Bloque impecable. Esto ya lo tienes dominado."
      : porcentaje >= UMBRAL_DOMINADO
        ? "Muy bien. Lo tienes cogido; un repaso en unos días y queda fijado."
        : porcentaje >= 60
          ? "Buen avance. Lo que se resistió hoy vuelve la semana que viene."
          : "Bloque exigente. Repítelo en un par de días y verás el salto.",
  volverAMisBloques: "Volver a mis bloques",
  repetirElBloque: "Repetir el bloque",

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

const EN: TextosEjercicios = {
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
  huecoAria: (n, total) => `Gap ${n} of ${total}`,
  huecoBien: "correct",
  huecoARevisar: "have another look and check again",
  ayudaHuecos: (n) =>
    n === 1
      ? "Write in the gap and press “Check”."
      : `${conMayuscula(enLetras("en", n))} gaps. Enter takes you to the next one; when you're done, press “Check”.`,
  huecosEnBlanco: "There's still a blank gap. Here's the first one.",
  ariaEscritura: "Your version of the sentence",
  ariaLibre: "Your answer",

  comprobar: "Check",
  esperaEscritura: "Write your version",
  esperaOpciones: "Pick an answer",
  esperaLibre: "Write your answer",
  verElResultado: "See your result →",
  siguienteEjercicio: "Next exercise →",

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
  avisoProfesorLateral: (profesor) => `${profesor} will read your answer before your class.`,
  faseDeTotal: (n, total) => `Phase ${n} of ${total}`,
  ejerciciosYMinutos: (n, minutos) => `${n} ${n === 1 ? "exercise" : "exercises"} · ${minutos} min`,
  irALaFase: (nombre) => `Phase: ${nombre}`,
  teFaltanEjercicios: (n) =>
    n === 1 ? "1 exercise to go to finish the block." : `${n} exercises to go to finish the block.`,
  verMisBloques: "See all my blocks",
  abrirElPanel: "Open the practice panel",
  cerrarElPanel: "Close the practice panel",

  bloqueTerminado: "Block finished",
  cierrePractica: (porcentaje) =>
    porcentaje === 100
      ? "Perfect block. You have this one."
      : porcentaje >= UMBRAL_DOMINADO
        ? "Very good. You have the idea; one more look in a few days and it sticks."
        : porcentaje >= 60
          ? "Good progress. What was hard today comes back next week."
          : "A tough block. Do it again in a couple of days and you will see the jump.",
  volverAMisBloques: "Back to my blocks",
  repetirElBloque: "Do the block again",

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

export const EJERCICIOS: Record<Idioma, TextosEjercicios> = { en: EN, es: ES };
