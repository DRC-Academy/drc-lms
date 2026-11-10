// ---------------------------------------------------------------
// EL BLACK PASS, DE CARA AL ALUMNO
//
// Sin lenguaje de error en ningún sitio: quien ve esto no ha hecho nada mal.
// El panel /black-pass es del equipo y no pasa por aquí, como el resto del
// panel.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosPases = {
  // --- «Para ti» bloqueado ---
  paraTiTitulo: string;
  paraTiTexto: string;
  /** Debajo del texto, antes del botón: dónde está incluido y que se puede preguntar. */
  paraTiLinea: string;
  paraTiBoton: string;
  /** Tiene plan, pero la suscripción está en espera. Su título es el de siempre. */
  paraTiEnEspera: string;
  paraTiTituloEnEspera: string;
  // --- el inicio ---
  /** El saludo del inicio del Black Pass: sin género, a diferencia del de siempre. */
  hola: (nombre: string) => string;
  activoHasta: (fecha: string) => string;
  tuCurso: string;
  otrosNiveles: string;
  /** Lo que oye el lector en cada fila de «Otros niveles». */
  abrirCurso: (curso: string) => string;
  // --- la invitación a las clases (la variante del banner de ritmo) ---
  clasesTitulo: string;
  clasesTexto: string;
  clasesBoton: string;
  clasesNota: string;
  // --- elegir curso ---
  elegirTitulo: string;
  elegirBajada: string;
  elegirCambiarBajada: string;
  grupoGeneral: string;
  grupoExamen: string;
  leccionesHechas: (hechas: number, total: number) => string;
  actual: string;
  elegir: string;
  empezar: string;
  cambiarDeCurso: string;
  // --- aviso de pago, que no bloquea ---
  avisoPagoTitulo: string;
  avisoPagoTexto: string;
  avisoPagoBoton: string;
};

export const PASES: Record<Idioma, TextosPases> = {
  es: {
    paraTiTitulo: "Para ti: práctica hecha a tu medida",
    paraTiTexto:
      "Con las clases 1:1, después de cada clase Para ti te prepara ejercicios con lo que has trabajado con tu profesor nativo: tu vocabulario, tus temas y lo que más te cuesta.",
    paraTiLinea: "Está incluido en los planes con clases. Escríbenos y te contamos cómo funcionan.",
    paraTiBoton: "Escríbenos por WhatsApp",
    paraTiTituloEnEspera: "Para ti",
    paraTiEnEspera: "Para ti y tus clases vuelven en cuanto actualices tu pago. Mientras tanto, tienes abiertos todos tus cursos.",
    hola: (nombre) => (nombre ? `Hola, ${nombre}` : "Hola"),
    activoHasta: (fecha) => `Tu Black Pass está activo hasta el ${fecha}.`,
    tuCurso: "Tu curso",
    otrosNiveles: "Otros niveles",
    abrirCurso: (curso) => `Abrir ${curso}`,
    clasesTitulo: "Practica con un profesor nativo",
    clasesTexto:
      "Con las clases 1:1 hablas inglés cada semana con tu profesor y, después de cada clase, Para ti te prepara ejercicios con lo que habéis trabajado. Tu curso sigue contigo.",
    clasesBoton: "Quiero probar las clases",
    clasesNota: "Te atendemos por WhatsApp.",
    elegirTitulo: "¿Por qué curso quieres empezar?",
    elegirBajada: "Tienes todos abiertos. Elige uno para empezar: puedes cambiar cuando quieras.",
    elegirCambiarBajada: "Tienes todos abiertos. Tu progreso en cada curso se queda guardado.",
    grupoGeneral: "Inglés general",
    grupoExamen: "Preparación de exámenes",
    leccionesHechas: (hechas, total) => `${hechas} de ${total} lecciones`,
    actual: "Es tu curso ahora",
    elegir: "Elegir este curso",
    empezar: "Empezar",
    cambiarDeCurso: "Cambiar de curso",
    avisoPagoTitulo: "Tenemos un pago pendiente",
    avisoPagoTexto: "Tus cursos siguen abiertos. Para recuperar tus clases y Para ti, actualiza tu pago.",
    avisoPagoBoton: "Actualizar mi pago",
  },
  en: {
    paraTiTitulo: "For you: practice made for you",
    paraTiTexto:
      "With 1:1 classes, after every class For you prepares exercises from what you've worked on with your native teacher: your vocabulary, your topics and what you find hardest.",
    paraTiLinea: "It's included in the plans with classes. Write to us and we'll tell you how they work.",
    paraTiBoton: "Write to us on WhatsApp",
    paraTiTituloEnEspera: "For you",
    paraTiEnEspera: "For you and your classes come back as soon as you update your payment. In the meantime, all your courses stay open.",
    hola: (nombre) => (nombre ? `Hi, ${nombre}` : "Hi"),
    activoHasta: (fecha) => `Your Black Pass is active until ${fecha}.`,
    tuCurso: "Your course",
    otrosNiveles: "Other levels",
    abrirCurso: (curso) => `Open ${curso}`,
    clasesTitulo: "Practise with a native teacher",
    clasesTexto:
      "With 1:1 classes you speak English every week with your teacher and, after every class, For you prepares exercises from what you've worked on together. Your course stays with you.",
    clasesBoton: "I want to try the classes",
    clasesNota: "We'll help you on WhatsApp.",
    elegirTitulo: "Which course do you want to start with?",
    elegirBajada: "They're all open. Pick one to start: you can change whenever you like.",
    elegirCambiarBajada: "They're all open. Your progress in each course stays saved.",
    grupoGeneral: "General English",
    grupoExamen: "Exam preparation",
    leccionesHechas: (hechas, total) => `${hechas} of ${total} lessons`,
    actual: "Your course now",
    elegir: "Choose this course",
    empezar: "Start",
    cambiarDeCurso: "Change course",
    avisoPagoTitulo: "We have a pending payment",
    avisoPagoTexto: "Your courses stay open. To get your classes and For you back, update your payment.",
    avisoPagoBoton: "Update my payment",
  },
};
