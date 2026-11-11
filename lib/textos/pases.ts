// ---------------------------------------------------------------
// EL BLACK PASS, DE CARA AL ALUMNO
//
// Sin lenguaje de error en ningún sitio: quien ve esto no ha hecho nada mal.
// El panel /black-pass es del equipo y no pasa por aquí, como el resto del
// panel.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosPases = {
  // --- «Para ti» bloqueado: la página que invita a las clases 1:1 ---
  paraTiEtiqueta: string;
  paraTiTitulo: string;
  /** También es el mensaje con el que las rutas de Para ti rechazan (403). */
  paraTiTexto: string;
  paraTiBoton: string;
  paraTiNota: string;
  paraTiSumanTitulo: string;
  paraTiSuman: { titulo: string; texto: string }[];
  paraTiEjemploTitulo: string;
  paraTiEjemploEtiqueta: string;
  paraTiEjemploContexto: string;
  paraTiEjemploNombre: string;
  paraTiEjemploFilas: string[];
  paraTiEjemploPie: string;
  paraTiCierreTitulo: string;
  paraTiCierreTexto: string;
  paraTiCierreBoton: string;
  paraTiSigue: string;
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
    paraTiEtiqueta: "Clases 1:1 con profesor bilingüe",
    paraTiTitulo: "Habla inglés cada semana con tu profesor",
    paraTiTexto:
      "Tu curso te da la base. Con las clases 1:1 la pones en práctica hablando con un profesor bilingüe, y después de cada clase Para ti te prepara ejercicios con lo que has trabajado.",
    paraTiBoton: "Quiero probar las clases",
    paraTiNota: "Te atendemos por WhatsApp.",
    paraTiSumanTitulo: "Lo que suman las clases 1:1",
    paraTiSuman: [
      { titulo: "Tu profesor bilingüe", texto: "Clases por videollamada solo para ti, para hablar inglés desde el primer día." },
      { titulo: "Para ti, después de cada clase", texto: "Ejercicios con tu vocabulario, tus temas y lo que más te cuesta." },
      { titulo: "Tu avance, a la vista", texto: "Tu profesor sigue tu nivel y en Mi progreso ves todo lo que llevas." },
    ],
    paraTiEjemploTitulo: "Así te llega Para ti después de una clase",
    paraTiEjemploEtiqueta: "Ejemplo",
    paraTiEjemploContexto: "Después de tu clase del martes",
    paraTiEjemploNombre: "Planes de viaje",
    paraTiEjemploFilas: [
      "El vocabulario que salió en tu clase",
      "Ejercicios con los temas de los que hablasteis",
      "Un repaso de lo que más te cuesta",
    ],
    paraTiEjemploPie: "Se abre con las clases 1:1",
    paraTiCierreTitulo: "¿Te contamos cómo funcionan?",
    paraTiCierreTexto: "Escríbenos por WhatsApp y te explicamos los planes con clases. Sin compromiso: decides tú.",
    paraTiCierreBoton: "Escríbenos por WhatsApp",
    paraTiSigue: "Tu Black Pass sigue igual: mantienes todos los niveles de Mi curso.",
    paraTiTituloEnEspera: "Para ti",
    paraTiEnEspera: "Para ti y tus clases vuelven en cuanto actualices tu pago. Mientras tanto, tienes abiertos todos tus cursos.",
    hola: (nombre) => (nombre ? `Hola, ${nombre}` : "Hola"),
    activoHasta: (fecha) => `Tu Black Pass está activo hasta el ${fecha}.`,
    tuCurso: "Tu curso",
    otrosNiveles: "Otros niveles",
    abrirCurso: (curso) => `Abrir ${curso}`,
    clasesTitulo: "Practica con un profesor bilingüe",
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
    paraTiEtiqueta: "1:1 classes with a bilingual teacher",
    paraTiTitulo: "Speak English every week with your teacher",
    paraTiTexto:
      "Your course gives you the foundation. With 1:1 classes you put it into practice by speaking with a bilingual teacher, and after every class For you prepares exercises from what you've worked on.",
    paraTiBoton: "I want to try the classes",
    paraTiNota: "We'll help you on WhatsApp.",
    paraTiSumanTitulo: "What 1:1 classes add",
    paraTiSuman: [
      { titulo: "Your bilingual teacher", texto: "Video classes just for you, so you speak English from day one." },
      { titulo: "For you, after every class", texto: "Exercises with your vocabulary, your topics and what you find hardest." },
      { titulo: "Your progress, in sight", texto: "Your teacher follows your level and My progress shows everything you've done." },
    ],
    paraTiEjemploTitulo: "This is how For you arrives after a class",
    paraTiEjemploEtiqueta: "Example",
    paraTiEjemploContexto: "After your Tuesday class",
    paraTiEjemploNombre: "Travel plans",
    paraTiEjemploFilas: [
      "The vocabulary that came up in your class",
      "Exercises on the topics you talked about",
      "A review of what you find hardest",
    ],
    paraTiEjemploPie: "Unlocks with 1:1 classes",
    paraTiCierreTitulo: "Shall we tell you how they work?",
    paraTiCierreTexto: "Write to us on WhatsApp and we'll explain the plans with classes. No commitment: it's your call.",
    paraTiCierreBoton: "Write to us on WhatsApp",
    paraTiSigue: "Your Black Pass stays the same: you keep every level of My course.",
    paraTiTituloEnEspera: "For you",
    paraTiEnEspera: "For you and your classes come back as soon as you update your payment. In the meantime, all your courses stay open.",
    hola: (nombre) => (nombre ? `Hi, ${nombre}` : "Hi"),
    activoHasta: (fecha) => `Your Black Pass is active until ${fecha}.`,
    tuCurso: "Your course",
    otrosNiveles: "Other levels",
    abrirCurso: (curso) => `Open ${curso}`,
    clasesTitulo: "Practise with a bilingual teacher",
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
