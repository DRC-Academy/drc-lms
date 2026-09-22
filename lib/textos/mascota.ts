// ---------------------------------------------------------------
// LO QUE DICE LA MASCOTA
//
// Las burbujas de Geckonoid: una línea corta en momentos concretos.
// Todas las que hay están aquí, en los dos idiomas, para editarlas sin
// tocar el componente (components/mascota/CapaMascota.tsx).
//
// LAS REGLAS, que las aplica la capa y no hace falta repetir aquí:
//   - una burbuja por pantalla, como mucho;
//   - ninguna se repite en la misma sesión;
//   - mientras habla, la mascota señala.
//
// EL TONO. Español de España y tuteo, cálido y corto: se lee de un
// vistazo, sin detener a nadie. Nunca lenguaje de error: la mascota no
// da malas noticias (para eso están los mensajes de la pantalla). Tiene
// que caber en unas dos líneas de un globo de ~220 px.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

/**
 * EL BUCLE AL PROFESOR. Las burbujas del cierre que nombran al profesor
 * («esto se lo contaré a…») prometen que el resultado le llega. Hoy
 * los intentos y los textos de producir se guardan como materia prima
 * de ese bucle (lib/progreso-servidor.ts, lib/cursos-servidor.ts), pero
 * todavía no le llegan: mientras sea así, esto va en false y esas
 * burbujas no salen. Cuando el bucle exista, basta con ponerlo en true.
 */
export const BUCLE_PROFESOR = false;

export type TextosMascota = {
  burbujas: {
    /** Al llegar al inicio, la primera vez en la sesión. */
    llegadaInicio: string;
    /** Lo mismo, si el alumno vuelve tras 5 días o más sin entrar. */
    cuantoTiempo: string;
    /** Al acabar de generarse un bloque, ya en su parada de la ruta. */
    bloqueListo: string;
    /** Cierre de bloque con el 80 % o más. Solo con BUCLE_PROFESOR. */
    cierreBien: (profesor: string) => string;
    /** Cierre de bloque por debajo del 80 %. */
    cierreSigamos: string;
    /** Lo mismo, con BUCLE_PROFESOR. */
    cierreSigamosProfesor: (profesor: string) => string;
  };
};

export type ClaveBurbuja = keyof TextosMascota["burbujas"];

export const MASCOTA: Record<Idioma, TextosMascota> = {
  es: {
    burbujas: {
      llegadaInicio: "Aquí tienes por dónde seguir",
      cuantoTiempo: "¡Cuánto tiempo! Sigamos por aquí",
      bloqueListo: "Tu bloque está listo",
      cierreBien: (profesor) => `Buen trabajo, esto se lo contaré a ${profesor}`,
      cierreSigamos: "Buen trabajo, sigamos",
      cierreSigamosProfesor: (profesor) => `Buen trabajo, sigamos. Se lo contaré a ${profesor}`,
    },
  },
  en: {
    burbujas: {
      llegadaInicio: "Here's where to pick up",
      cuantoTiempo: "Long time no see! Let's carry on here",
      bloqueListo: "Your block is ready",
      cierreBien: (profesor) => `Great work, I'll tell ${profesor}`,
      cierreSigamos: "Good work, let's keep going",
      cierreSigamosProfesor: (profesor) => `Good work, let's keep going. I'll tell ${profesor}`,
    },
  },
};
