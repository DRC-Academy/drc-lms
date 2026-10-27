// ---------------------------------------------------------------
// LA VALORACIÓN DE CLASES
//
// El pop-up de después de la clase y el «Valorar clase» del historial de
// «Mis clases» (`components/valoraciones/`). Cálido y corto: es una
// pregunta, no un examen. Nada de lenguaje de error ni de vigilancia, y
// nada que celebre: se da las gracias y ya. Con 5 estrellas, el botón
// lleva a dejar una reseña pública (sin nombrar la plataforma).
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
  /** El botón de enviar con 5 estrellas: envía y abre la página de reseñas. */
  enviarResena: string;
  /** Encima de ese botón: qué va a pasar al pulsarlo. */
  avisoResena: string;
  /** Tras enviar 5 estrellas, con el comentario ya en el portapapeles. */
  graciasCopiado: string;
  /** Tras enviar 5 estrellas sin comentario, o si no se pudo copiar. */
  graciasResena: string;
  /** Por si el navegador bloqueó la pestaña. */
  noSeAbrio: string;
  /** Si no se pudo guardar. Sin culpa: que lo intente otra vez. */
  noSeGuardo: string;
  /** El equipo revisando una ficha: lo ve todo, no se guarda nada. */
  vistaPrevia: string;

  // --- en el historial ---
  valorarClase: string;
  editar: string;
  /** El nombre del botón de editar para el lector: "Editar tu valoración (4 de 5)". */
  editarValoracion: (estrellas: number) => string;
  /** Las estrellas ya puestas, para el lector: "Tu valoración: 4 de 5". */
  tuValoracion: (estrellas: number) => string;
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
    avisoResena: "Te llevaremos a una página para publicar tu reseña y que otros alumnos la vean.",
    graciasCopiado: "¡Gracias! Hemos copiado tu comentario: solo tienes que pegarlo en tu reseña.",
    graciasResena: "¡Gracias! Te hemos abierto la página para dejar tu reseña.",
    noSeAbrio: "¿No se ha abierto? Ábrela aquí",
    noSeGuardo: "No hemos podido guardarla. ¿Lo intentas otra vez?",
    vistaPrevia: "Vista del equipo: así lo ve el alumno. No se guarda nada.",
    valorarClase: "Valorar clase",
    editar: "Editar",
    editarValoracion: (n) => `Editar tu valoración (${n} de 5)`,
    tuValoracion: (n) => `Tu valoración: ${n} de 5`,
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
    avisoResena: "We'll take you to a page where you can post your review so other students can see it.",
    graciasCopiado: "Thank you! We've copied your comment — just paste it into your review.",
    graciasResena: "Thank you! We've opened the page where you can leave your review.",
    noSeAbrio: "Didn't open? Open it here",
    noSeGuardo: "We couldn't save it. Would you try again?",
    vistaPrevia: "Team preview: this is what the student sees. Nothing is saved.",
    valorarClase: "Rate class",
    editar: "Edit",
    editarValoracion: (n) => `Edit your rating (${n} of 5)`,
    tuValoracion: (n) => `Your rating: ${n} of 5`,
  },
};
