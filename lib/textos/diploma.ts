// ---------------------------------------------------------------
// «MI DIPLOMA»
//
// La landing de drcacademy.com (`/tu-diploma-de-drc-academy/`) rehecha
// dentro del LMS con los datos del alumno. El copy de las promesas y del
// camino es el de la landing, retocado lo justo para hablar en presente
// a quien ya está dentro.
//
// SIN PRESIÓN. Ningún texto cuenta lo que falta como una deuda ni mete
// prisa: el tiempo pasa solo, y el diploma llega con él. El mensaje de
// cada tramo (`lib/diploma.ts`, `TramoDiploma`) acompaña, no empuja.
//
// SIN DESCARGA TODAVÍA. El estado conseguido felicita y no promete una
// fecha para el archivo: la generación del diploma es otra tarea. El
// tercer paso del camino sí dice, como la landing, que se descargará en
// esta misma página: es donde irá el botón.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import type { TramoDiploma } from "@/lib/diploma";

export type TextosDiploma = {
  /** El titular de la página, el de la landing. */
  titulo: string;
  entradilla: string;
  altImagen: string;

  // --- el progreso ---
  /** «3 de 6 meses completados»: la cifra va aparte, en grande. */
  deMeses: (total: number) => string;
  /** Debajo de la barra: «50% completado». */
  porcentajeCompletado: (porcentaje: number) => string;
  /** Lo que lee el lector de pantalla en la barra. */
  barraLector: (meses: number, total: number) => string;
  fechaPrevista: (fecha: string) => string;
  conseguidoEl: (fecha: string) => string;
  tramo: Record<TramoDiploma, { titular: string; texto: string }>;
  /** Las lecciones, como dato secundario. */
  leccionesHechas: (n: number) => string;
  /** Sin fecha de inicio: nunca un cero. */
  sinFecha: { titular: string; texto: string };

  // --- las promesas ---
  promesasTitulo: string;
  /** Conseguido el diploma, ya no es futuro. */
  promesasTituloConseguido: string;
  promesas: { titulo: string; texto: string }[];

  // --- el vídeo ---
  fluidezTitulo: string;
  fluidezTexto: string;
  /** La píldora de encima del vídeo. Es una etiqueta, no un botón. */
  videoEtiqueta: string;
  videoSinSoporte: string;

  // --- el camino ---
  caminoTitulo: string;
  /** `destacado`, si lo hay, va en negrita detrás de `texto`. */
  pasos: { cuando: string; texto: string; destacado?: string }[];
};

const ES: TextosDiploma = {
  titulo: "Esto es lo que te espera cuando completes tu nivel",
  entradilla: "Cada clase que completas te acerca un poco más a conseguir tu Diploma DRC Academy.",
  altImagen: "El Diploma DRC Academy",

  deMeses: (total) => `de ${total} meses completados`,
  porcentajeCompletado: (porcentaje) => `${porcentaje}% completado`,
  barraLector: (meses, total) => `${meses} de ${total} meses completados`,
  fechaPrevista: (fecha) => `Tu diploma, el ${fecha}`,
  conseguidoEl: (fecha) => `Desde el ${fecha}`,
  tramo: {
    empezando: {
      titular: "Tu camino acaba de empezar",
      texto: "Lo importante ahora es venir a clase y disfrutarlo. Cada mes te acerca un poco más.",
    },
    "a-mitad": {
      titular: "Ya vas por la mitad del camino",
      texto: "Sigue a tu ritmo. Lo que has trabajado estos meses ya se nota cuando hablas.",
    },
    "recta-final": {
      titular: "Estás en la recta final",
      texto: "Queda poco. Mira hacia atrás un momento: has llegado mucho más lejos de lo que crees.",
    },
    conseguido: {
      titular: "¡Enhorabuena, has conseguido tu diploma!",
      texto:
        "Seis meses de clases, práctica y constancia. Esta vez sí lo has terminado. Estamos preparando la descarga: cuando esté lista, la encontrarás en esta página.",
    },
  },
  leccionesHechas: (n) => (n === 1 ? "1 lección hecha en tu curso" : `${n} lecciones hechas en tu curso`),
  sinFecha: {
    titular: "Tu camino hacia el diploma",
    texto: "Tu profe está preparando tu plan; aquí verás tu camino hacia el diploma.",
  },

  promesasTitulo: "En 6 meses habrás conseguido esto",
  promesasTituloConseguido: "Lo que te llevas de estos seis meses",
  promesas: [
    {
      titulo: "Hablarás inglés con una seguridad que hoy no tienes",
      texto: "Dejarás de pensar tanto qué decir y empezarás a disfrutar hablando.",
    },
    {
      titulo: "Tendrás algo que demuestre todo lo que has conseguido",
      texto: "Podrás añadir tu diploma al CV o a tu perfil profesional y hacer visible tu progreso.",
    },
    {
      titulo: "Podrás mirar atrás y decir: «esta vez sí lo terminé»",
      texto: "Después de tantos intentos, esta vez habrás llegado hasta el final sin dejarlo a medias.",
    },
  ],

  fluidezTitulo: "Podrás comprobar cómo mejora tu fluidez",
  fluidezTexto: "Guardamos tu punto de partida para que tú mismo puedas ver el cambio.",
  videoEtiqueta: "Mira el cambio de Mar después de 15 clases",
  videoSinSoporte: "Tu navegador no puede reproducir este vídeo.",

  caminoTitulo: "Tu camino hacia el diploma",
  pasos: [
    { cuando: "Hoy", texto: "Sigues trabajando con tu profe." },
    { cuando: "Durante estos meses", texto: "Hablas, practicas y corriges lo que te está frenando." },
    {
      cuando: "A los 6 meses",
      texto: "Completas el periodo necesario y",
      destacado: "podrás descargar tu diploma en esta misma página",
    },
  ],
};

const EN: TextosDiploma = {
  titulo: "This is what's waiting for you when you complete your level",
  entradilla: "Every class you complete brings you a little closer to earning your DRC Academy Diploma.",
  altImagen: "The DRC Academy Diploma",

  deMeses: (total) => `of ${total} months completed`,
  porcentajeCompletado: (porcentaje) => `${porcentaje}% completed`,
  barraLector: (meses, total) => `${meses} of ${total} months completed`,
  fechaPrevista: (fecha) => `Your diploma: ${fecha}`,
  conseguidoEl: (fecha) => `Since ${fecha}`,
  tramo: {
    empezando: {
      titular: "Your journey has just begun",
      texto: "What matters now is coming to class and enjoying it. Every month brings you a little closer.",
    },
    "a-mitad": {
      titular: "You're already halfway there",
      texto: "Keep going at your own pace. What you've worked on these months already shows when you speak.",
    },
    "recta-final": {
      titular: "You're on the home stretch",
      texto: "Not long now. Take a moment to look back: you've come much further than you think.",
    },
    conseguido: {
      titular: "Congratulations, you've earned your diploma!",
      texto:
        "Six months of classes, practice and commitment. This time you really did finish. We're getting the download ready: when it is, you'll find it on this page.",
    },
  },
  leccionesHechas: (n) => (n === 1 ? "1 lesson done in your course" : `${n} lessons done in your course`),
  sinFecha: {
    titular: "Your path to the diploma",
    texto: "Your teacher is preparing your plan; this is where you'll see your path to the diploma.",
  },

  promesasTitulo: "In 6 months, this is what you'll have",
  promesasTituloConseguido: "What you take away from these six months",
  promesas: [
    {
      titulo: "You'll speak English with a confidence you don't have today",
      texto: "You'll stop overthinking what to say and start actually enjoying speaking.",
    },
    {
      titulo: "You'll have something that shows everything you've achieved",
      texto: "You can add your diploma to your CV or professional profile and make your progress visible.",
    },
    {
      titulo: "You'll look back and say: “this time I finished it”",
      texto: "After so many attempts, this time you'll have made it to the end without leaving it halfway.",
    },
  ],

  fluidezTitulo: "You'll see your fluency improve",
  fluidezTexto: "We keep a record of your starting point so you can see the change for yourself.",
  videoEtiqueta: "Watch Mar's progress after 15 classes",
  videoSinSoporte: "Your browser can't play this video.",

  caminoTitulo: "Your path to the diploma",
  pasos: [
    { cuando: "Today", texto: "You keep working with your teacher." },
    { cuando: "Over these months", texto: "You speak, practise and fix whatever is holding you back." },
    {
      cuando: "At 6 months",
      texto: "You complete the required period and",
      destacado: "you'll be able to download your diploma right here on this page",
    },
  ],
};

export const DIPLOMA: Record<Idioma, TextosDiploma> = { en: EN, es: ES };
