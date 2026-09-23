// ---------------------------------------------------------------
// LO QUE DICE LA MASCOTA EN LOS EJERCICIOS
//
// El cuadro de diálogo de debajo de cada ejercicio
// (components/ejercicios/DialogoMascota.tsx): la mascota dice el
// veredicto en una frase corta y, debajo, en el mismo cuadro, van la
// respuesta y la explicación. Son las mismas en la práctica generada y
// en el curso.
//
// DOCE POR TIPO, y rotan sin repetir ninguna de las tres últimas de ese
// tipo: en un bloque de diez ejercicios, pocas frases se leen como un
// sonido de máquina a la tercera. Es lo mismo en el curso y en la
// práctica, encadenadas y recuperación incluidas.
//
//   correcto      acierto suelto
//   casi          un solo hueco mal, o los fallos a una o dos letras de
//                 la respuesta, o las opciones buenas sin ninguna mala
//   incorrecto    lo demás
//   pistaIntro    al pedir la pista; la pista va debajo
//   encadenadas   tres aciertos seguidos o más (sin hablar de «racha»:
//                 el producto no tiene rachas)
//   recuperacion  el acierto justo después de un fallo
//
// EL TONO. Español de España y tuteo, cálido y corto. La mascota NUNCA
// dice «incorrecto», «error» ni «mal»: un fallo es algo que mirar
// juntos, no una nota. Y nunca «racha»: el producto no tiene rachas.
//
// SIN GÉNERO. No sabemos quién lee, así que ninguna frase concuerda con
// el alumno: nada de «lanzado», «atento», «listo» o «seguro»; si hace
// falta un adjetivo, que sea invariable («imparable», «impecable») o
// que hable de la respuesta, no de la persona («esta te ha salido
// redonda»). En inglés no hay problema, pero vale la misma idea.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TipoFrase = "correcto" | "casi" | "incorrecto" | "pistaIntro" | "encadenadas" | "recuperacion";

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
        "¡Justo esa!",
        "Así me gusta",
        "Impecable",
        "¡Toma ya!",
        "Eso está hecho",
        "Qué buen ojo tienes",
      ],
      casi: [
        "Casi, fíjate en esto",
        "Te ha faltado poquito",
        "Por un pelo. Mira",
        "Casi lo tienes",
        "Muy cerca. Un detalle",
        "Te has quedado a un paso",
        "Rozándolo, mira aquí",
        "Solo falta un retoque",
        "A nada de tenerlo",
        "Casi casi. Mira esto",
        "Ya casi está, un detallito",
        "Te ha faltado un pelín",
      ],
      incorrecto: [
        "Vamos a verlo",
        "Esta tiene truco",
        "Mira, va así",
        "Esta cuesta, vamos a verla",
        "Te cuento cómo va",
        "Esta es de las que engañan",
        "Sin prisa, lo vemos juntos",
        "A esta hay que darle una vuelta",
        "Esta pilla a mucha gente",
        "Buena para repasar, mira",
        "Fíjate, que tiene su gracia",
        "Así se aprende, mira",
      ],
      pistaIntro: [
        "A ver, te doy una pista",
        "Fíjate bien en esto",
        "Te doy una pista",
        "Te echo una mano",
        "Piensa en esto",
        "Mira esto, te ayudará",
        "Un empujoncito",
        "Esto te puede servir",
        "Te chivo algo",
        "Una idea para empezar",
        "Por aquí van los tiros",
        "Mira por dónde empezar",
      ],
      encadenadas: [
        "¡Qué bien vas!",
        "Una tras otra, ¡sigue!",
        "No hay quien te pare",
        "Se te está dando genial",
        "¡Otra más! Sigue así",
        "Vas a toda máquina",
        "¡Menudo ritmo!",
        "Esto fluye, ¡sigue!",
        "Acierto tras acierto, ¡bien!",
        "Así da gusto",
        "¡Imparable!",
        "Qué buena mano tienes hoy",
      ],
      recuperacion: [
        "¡Ahora sí!",
        "¡Ahí está! Ya lo tienes",
        "Mucho mejor, ¡bien!",
        "¿Ves? Ya te sale",
        "Esa sí, ¡genial!",
        "Lo has pillado",
        "Ya está, ¡así se hace!",
        "Lo de antes ya queda atrás",
        "¡Bien! Has vuelto con fuerza",
        "Esta te ha salido redonda",
        "Vuelta a la carga, ¡bien!",
        "Eso es, ya lo ves claro",
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
        "Spot on",
        "Just right",
        "Flawless",
        "Great eye",
        "You got it",
        "Well done, that's it",
      ],
      casi: [
        "So close, look at this",
        "Almost there",
        "Just a tiny bit off",
        "Nearly! One detail",
        "You're one step away",
        "Very close, check this",
        "Nearly had it",
        "Just one small tweak",
        "So nearly right",
        "A hair away, look",
        "Almost! One little thing",
        "Close, look here",
      ],
      incorrecto: [
        "Let's take a look",
        "This one's tricky",
        "Here's how it goes",
        "Tough one, let's see",
        "Let me walk you through it",
        "This one catches lots of people",
        "Let's look at it together",
        "This one needs a second look",
        "No rush, let's see",
        "Good one to review",
        "Here's the trick",
        "This is how we learn, look",
      ],
      pistaIntro: [
        "Here's a hint",
        "Look closely at this",
        "Let me give you a hint",
        "Let me give you a hand",
        "Think about this",
        "Look at this, it'll help",
        "A little nudge",
        "This might help",
        "Here's a tip",
        "Start from here",
        "Here's where to look",
        "An idea to get going",
      ],
      encadenadas: [
        "You're doing so well!",
        "One after another, keep it up!",
        "Nothing's stopping you",
        "You're doing great",
        "Another one! Keep going",
        "Full steam ahead",
        "What a pace!",
        "It's flowing, keep going",
        "Right after right!",
        "A joy to watch",
        "Unstoppable!",
        "You're in great form today",
      ],
      recuperacion: [
        "Now you've got it!",
        "There it is!",
        "Much better, well done!",
        "See? You've got it now",
        "That's the one, great!",
        "You figured it out",
        "That's how it's done",
        "Back on track, nice!",
        "Got it this time",
        "Great comeback!",
        "You worked it out",
        "Spot on this time",
      ],
    },
    pista: "Hint",
    laRespuestaEs: (solucion) => `The answer is ${solucion}`,
    aria: "Feedback",
  },
};
