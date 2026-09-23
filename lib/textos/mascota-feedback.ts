// ---------------------------------------------------------------
// LO QUE DICE LA MASCOTA EN LOS EJERCICIOS
//
// El cuadro de diálogo de debajo de cada ejercicio
// (components/ejercicios/DialogoMascota.tsx): la mascota dice el
// veredicto en una frase corta y, debajo, en el mismo cuadro, van la
// respuesta y la explicación. Son las mismas en la práctica generada y
// en el curso.
//
// SEIS POR TIPO, y rotan sin repetir la anterior: en un bloque de diez
// ejercicios, una sola frase por tipo se leería como un sonido de
// máquina a la tercera.
//
//   correcto      acierto suelto
//   casi          casi: la mitad de los huecos o más, a una o dos letras
//                 de la respuesta, o las opciones buenas sin ninguna mala
//   incorrecto    lo demás
//   pistaIntro    al pedir la pista; la pista va debajo
//   racha         tres aciertos seguidos o más
//   recuperacion  el acierto justo después de un fallo
//
// EL TONO. Español de España y tuteo, cálido y corto. La mascota NUNCA
// dice «incorrecto», «error» ni «mal»: un fallo es algo que mirar
// juntos, no una nota. Sin género gramatical para el alumno («lanzado»,
// «atento»): no sabemos quién lee.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TipoFrase = "correcto" | "casi" | "incorrecto" | "pistaIntro" | "racha" | "recuperacion";

export type TextosMascotaFeedback = {
  frases: Record<TipoFrase, readonly string[]>;
  /** El botón que pide la pista. */
  pista: string;
  /** Debajo del veredicto, cuando la buena era una opción: «B: since». */
  laRespuestaEs: (solucion: string) => string;
  /** El nombre del cuadro para el lector de pantalla. */
  aria: string;
};

export const MASCOTA_FEEDBACK: Record<Idioma, TextosMascotaFeedback> = {
  es: {
    frases: {
      correcto: [
        "¡Eso es!",
        "Muy bien visto",
        "Exacto, así se dice",
        "¡Bien! Esa era",
        "Perfecto, sigue así",
        "Lo has clavado",
      ],
      casi: [
        "Casi, fíjate en esto",
        "Te ha faltado poquito",
        "Por un pelo. Mira",
        "Casi lo tienes",
        "Muy cerca. Un detalle",
        "Te has quedado a un paso",
      ],
      incorrecto: [
        "Vamos a verlo",
        "Esta tiene truco",
        "Mira, va así",
        "Esta cuesta, vamos a verla",
        "Te cuento cómo va",
        "Esta es de las que engañan",
      ],
      pistaIntro: [
        "A ver, te doy una pista",
        "Fíjate bien en esto",
        "Una ayudita",
        "Te echo una mano",
        "Piensa en esto",
        "Toma, una pista",
      ],
      racha: [
        "¡Qué racha llevas!",
        "Una tras otra, ¡sigue!",
        "Esto ya es una racha",
        "No hay quien te pare",
        "Se te está dando genial",
        "¡Otra más! Sigue así",
      ],
      recuperacion: [
        "¡Ahora sí!",
        "¡Ahí está! Ya lo tienes",
        "Mucho mejor, ¡bien!",
        "¿Ves? Ya te sale",
        "Esa sí, ¡genial!",
        "Lo has pillado",
      ],
    },
    pista: "Pista",
    laRespuestaEs: (solucion) => `La respuesta es la ${solucion}`,
    aria: "Corrección",
  },
  en: {
    frases: {
      correcto: [
        "That's it!",
        "Nicely spotted",
        "Exactly right",
        "Yes! That's the one",
        "Perfect, keep going",
        "Nailed it",
      ],
      casi: [
        "So close, look at this",
        "Almost there",
        "Just a tiny bit off",
        "Nearly! One detail",
        "You're one step away",
        "Very close, check this",
      ],
      incorrecto: [
        "Let's take a look",
        "This one's tricky",
        "Here's how it goes",
        "Tough one, let's see",
        "Let me walk you through it",
        "This one catches lots of people",
      ],
      pistaIntro: [
        "Here's a hint",
        "Look closely at this",
        "A little help",
        "Let me give you a hand",
        "Think about this",
        "Here's a clue",
      ],
      racha: [
        "What a streak!",
        "One after another, keep it up!",
        "You're on a roll",
        "Nothing's stopping you",
        "You're doing great",
        "Another one! Keep going",
      ],
      recuperacion: [
        "Now you've got it!",
        "There it is!",
        "Much better, well done!",
        "See? You've got it now",
        "That's the one, great!",
        "You figured it out",
      ],
    },
    pista: "Hint",
    laRespuestaEs: (solucion) => `The answer is ${solucion}`,
    aria: "Feedback",
  },
};
