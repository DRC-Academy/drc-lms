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
  paraTiBoton: string;
  /** Tiene plan, pero la suscripción está en espera. */
  paraTiEnEspera: string;
  // --- el inicio ---
  activoHasta: (fecha: string) => string;
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
    paraTiTitulo: "Para ti",
    paraTiTexto: "Para ti está disponible en los planes con clases 1:1 con profesor.",
    paraTiBoton: "Ver los planes con clases",
    paraTiEnEspera: "Para ti y tus clases vuelven en cuanto actualices tu pago. Mientras tanto, tienes abiertos todos tus cursos.",
    activoHasta: (fecha) => `Tu Black Pass está activo hasta el ${fecha}.`,
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
    paraTiTitulo: "For you",
    paraTiTexto: "For you is available on the plans with 1:1 classes with a teacher.",
    paraTiBoton: "See the plans with classes",
    paraTiEnEspera: "For you and your classes come back as soon as you update your payment. In the meantime, all your courses stay open.",
    activoHasta: (fecha) => `Your Black Pass is active until ${fecha}.`,
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
