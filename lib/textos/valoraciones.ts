// ---------------------------------------------------------------
// LA VALORACIÓN DE CLASES
//
// El pop-up de después de la clase (`components/valoraciones/`). Cálido
// y corto: es una pregunta, no un examen. Nada de lenguaje de error ni de
// vigilancia, y nada que celebre: se da las gracias y ya. Con 5 estrellas,
// el botón lleva a dejar una reseña pública (sin nombrar la plataforma).
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosValoraciones = {
  /** "¿Qué tal fue tu clase con Mauricio?" */
  titulo: (profesor: string) => string;
  /** Sin el nombre del profesor. */
  tituloSinProfesor: string;
  subtitulo: string;
  /** El nombre del grupo de estrellas, para el lector de pantalla. */
  grupoEstrellas: string;
  /** La etiqueta de cada estrella: "3 estrellas: Bien". */
  estrella: (n: number, etiqueta: string) => string;
  /** Debajo de las estrellas, según la elegida. De la 1 a la 5. */
  etiquetas: readonly [string, string, string, string, string];
  /** Antes de elegir: la frase que ocupa el sitio de la etiqueta. */
  eligeEstrellas: string;
  comentarioEtiqueta: string;
  comentarioPlaceholder: string;
  /** "940 / 1000" */
  contador: (usados: number, maximo: number) => string;
  enviar: string;
  enviando: string;
  ahoraNo: string;
  cerrar: string;
  gracias: string;
  /** El botón de enviar con 5 estrellas: guarda y lleva a la página de reseñas. */
  enviarResena: string;
  /** Ese botón mientras guarda y hasta que se va a la página. */
  unMomento: string;
  /** Encima de ese botón: qué va a pasar al pulsarlo. */
  avisoResena: string;
  /** Si no se pudo guardar. Sin culpa: que lo intente otra vez. */
  noSeGuardo: string;
  /** El equipo revisando una ficha: lo ve todo, no se guarda nada. */
  vistaPrevia: string;
};

export const VALORACIONES: Record<Idioma, TextosValoraciones> = {
  es: {
    titulo: (profesor) => `¿Qué tal fue tu clase con ${profesor}?`,
    tituloSinProfesor: "¿Qué tal fue tu última clase?",
    subtitulo: "Tu opinión la lee el equipo de DRC y nos ayuda a cuidar tus clases.",
    grupoEstrellas: "Tu valoración, de 1 a 5 estrellas",
    estrella: (n, etiqueta) => `${n} ${n === 1 ? "estrella" : "estrellas"}: ${etiqueta}`,
    etiquetas: ["Mejorable", "Regular", "Bien", "Muy bien", "Genial"],
    eligeEstrellas: "Toca una estrella",
    comentarioEtiqueta: "Comentario (opcional)",
    comentarioPlaceholder: "¿Algo que quieras contarnos? (opcional)",
    contador: (usados, maximo) => `${usados} / ${maximo}`,
    enviar: "Enviar",
    enviando: "Enviando…",
    ahoraNo: "Ahora no",
    cerrar: "Cerrar",
    gracias: "¡Gracias! Nos ayuda mucho.",
    enviarResena: "Enviar reseña para ayudar a mi profe",
    unMomento: "Un momento…",
    avisoResena: "Te llevaremos a una página para publicar tu reseña y que otros alumnos la vean.",
    noSeGuardo: "No hemos podido guardarla. ¿Lo intentas otra vez?",
    vistaPrevia: "Vista del equipo: así lo ve el alumno. No se guarda nada.",
  },
  en: {
    titulo: (profesor) => `How was your class with ${profesor}?`,
    tituloSinProfesor: "How was your last class?",
    subtitulo: "The DRC team reads your feedback — it helps us look after your classes.",
    grupoEstrellas: "Your rating, from 1 to 5 stars",
    estrella: (n, etiqueta) => `${n} ${n === 1 ? "star" : "stars"}: ${etiqueta}`,
    etiquetas: ["Could be better", "Okay", "Good", "Very good", "Great"],
    eligeEstrellas: "Tap a star",
    comentarioEtiqueta: "Comment (optional)",
    comentarioPlaceholder: "Anything you'd like to tell us? (optional)",
    contador: (usados, maximo) => `${usados} / ${maximo}`,
    enviar: "Send",
    enviando: "Sending…",
    ahoraNo: "Not now",
    cerrar: "Close",
    gracias: "Thank you! This really helps.",
    enviarResena: "Send review to help my teacher",
    unMomento: "One moment…",
    avisoResena: "We'll take you to a page where you can post your review so other students can see it.",
    noSeGuardo: "We couldn't save it. Would you try again?",
    vistaPrevia: "Team preview: this is what the student sees. Nothing is saved.",
  },
};
