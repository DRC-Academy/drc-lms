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
import { MASCOTA_FEEDBACK, type TextosMascotaFeedback } from "@/lib/textos/mascota-feedback";

/**
 * EL BUCLE AL PROFESOR. Las burbujas del cierre que nombran al profesor
 * («esto se lo contaré a…») prometen que el resultado le llega. Hoy
 * los intentos y los textos de producir se guardan como materia prima
 * de ese bucle (lib/progreso-servidor.ts, lib/cursos-servidor.ts), pero
 * todavía no le llegan: mientras sea así, esto va en false y esas
 * burbujas no salen. Cuando el bucle exista, basta con ponerlo en true.
 */
export const BUCLE_PROFESOR = false;

/** Lo que necesita una frase del bocadillo de la clase. */
export type DatosFraseClase = {
  /** "16:00" */
  hora: string;
  /** "hoy", "mañana" o "jueves 25 de septiembre": `cuando()` de BannerClase. */
  cuando: string;
  /** `cuando` es una fecha, no hoy ni mañana: pide artículo ("el jueves…"). */
  esFecha: boolean;
  profesor: string | null;
};
type FraseClase = (d: DatosFraseClase) => string;

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
  /** El cuadro de diálogo de los ejercicios: en su propio archivo, mascota-feedback.ts. */
  feedback: TextosMascotaFeedback;
  /**
   * EL BOCADILLO DEL BANNER DE «CLASES», señalando el horario. Una al azar
   * por visita, según el botón de entrar: con la sala cerrada anticipa sin
   * pedir que se pulse nada; abierta, invita a entrar. No es una burbuja:
   * se queda puesto, dentro del banner, y no cuenta para «una por pantalla».
   */
  clase: {
    /** Más de 30 minutos antes: la sala está cerrada. */
    cerrada: FraseClase[];
    /** La sala abierta, antes de la hora. */
    abierta: FraseClase[];
    /** La clase ya ha empezado. */
    enCurso: FraseClase[];
    /** No hay un enlace utilizable: no hay botón que pulsar. */
    sinEnlace: FraseClase[];
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
    feedback: MASCOTA_FEEDBACK.es,
    clase: {
      cerrada: [
        (d) => (d.profesor ? `Aquí entrarás a tu clase con ${d.profesor}` : "Aquí entrarás a tu clase"),
        (d) => `Nos vemos aquí ${d.esFecha ? "el " : ""}${d.cuando} a las ${d.hora}`,
        () => "Media hora antes se abre la sala y podrás entrar desde aquí",
        (d) => `Te espero aquí a las ${d.hora}`,
      ],
      abierta: [
        () => "¡Ya puedes entrar! Pulsa el botón de abajo",
        () => "Tu clase está a punto de empezar, entra cuando quieras",
        () => "La sala ya está abierta. ¡Adelante!",
        (d) => (d.profesor ? `${d.profesor} te verá en un momento. Entra cuando quieras` : "Todo a punto: entra cuando quieras"),
      ],
      enCurso: [
        () => "Tu clase ya ha empezado: entra cuando quieras",
        () => "Tu clase está en marcha. ¡Entra desde aquí!",
        () => "Aún estás a tiempo: pulsa y entra",
        () => "Tu clase es ahora. ¡Adelante!",
      ],
      sinEnlace: [
        (d) => `Pídele a ${d.profesor ?? "tu profesor"} el enlace de la clase`,
        () => "El enlace de tu clase aún no está aquí; tu profesor te lo pasará",
      ],
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
    feedback: MASCOTA_FEEDBACK.en,
    clase: {
      cerrada: [
        (d) => (d.profesor ? `This is where you'll join your class with ${d.profesor}` : "This is where you'll join your class"),
        (d) => `See you here ${d.esFecha ? "on " : ""}${d.cuando} at ${d.hora}`,
        () => "The room opens half an hour before, and you'll join from here",
        (d) => `I'll be waiting here at ${d.hora}`,
      ],
      abierta: [
        () => "You can join now! Use the button below",
        () => "Your class is about to start, join whenever you like",
        () => "The room is open. Go ahead!",
        (d) => (d.profesor ? `${d.profesor} will see you in a moment. Join whenever you like` : "All set: join whenever you like"),
      ],
      enCurso: [
        () => "Your class has started: join whenever you like",
        () => "Your class is under way. Join from here!",
        () => "There's still time: tap and join",
        () => "Your class is now. Go ahead!",
      ],
      sinEnlace: [
        (d) => `Ask ${d.profesor ?? "your teacher"} for the class link`,
        () => "Your class link isn't here yet; your teacher will send it",
      ],
    },
  },
};
