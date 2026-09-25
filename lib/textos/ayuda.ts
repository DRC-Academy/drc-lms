// ---------------------------------------------------------------
// LA AYUDA FLOTANTE: lo que dice el widget, no lo que contesta.
//
// Las preguntas y sus respuestas —el contenido— siguen en `lib/faq.ts`,
// que es donde se editan. Aquí va solo la interfaz de la conversación:
// el saludo, los botones, lo que dice el bot cuando encuentra o cuando
// no. Es la única pieza de la aplicación que hablaba fuera del
// diccionario, y por eso era la única que seguía en español con el
// idioma en inglés.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosAyuda = {
  /** El botón flotante, cerrado y abierto. */
  ayuda: string;
  cerrar: string;
  /** `aria-label` del diálogo. */
  dialogo: string;
  cerrarLaAyuda: string;
  titulo: string;
  subtitulo: string;
  escribeTuDuda: string;
  escribeTuDudaPlaceholder: string;
  buscarEnLaAyuda: string;

  saludo: string;
  /** "Preguntas frecuentes sobre <categoría>:". */
  preguntasSobre: (categoria: string) => string;
  siGracias: string;
  /** Tras «Sí, gracias»: le ha servido. */
  teHaServidoAlgoMas: string;
  noDelTodo: string;
  // LAS TRES DERIVACIONES A SOPORTE. Cada una dice primero qué hacer
  // —pulsar el botón— y después quién contesta. Nada de cómo va el
  // mensaje por dentro: eso no le sirve al alumno para nada.
  /** Tras «No del todo». */
  soporteNoResuelto: string;
  quieroHablarConSoporte: string;
  /** Tras «Quiero hablar con soporte». */
  soportePedido: string;
  /** Tras una búsqueda sin resultados. Es nuestro fallo, no suyo. */
  soporteSinRespuesta: string;
  unaRespuesta: string;
  variasRespuestas: string;
  escribirPorWhatsApp: string;
  /** El enlace del pie. No sale mientras la conversación ya está en soporte. */
  hablarConSoporte: string;
  /** El botón del pie que lanza el recorrido guiado. */
  verRecorrido: string;
  /** El menú del botón de ayuda: `aria-label` y sus dos opciones. */
  menuAyuda: string;
  opcionTutorial: string;
  opcionTutorialDetalle: string;
  opcionChat: string;
  opcionChatDetalle: string;
  respuestaNoDisponible: string;

  teHaServido: string;
  si: string;
  no: string;
  marcasteQueSirvio: string;
  marcasteQueNoSirvio: string;
};

const ES: TextosAyuda = {
  ayuda: "Ayuda",
  cerrar: "Cerrar",
  dialogo: "Ayuda de DRC Academy",
  cerrarLaAyuda: "Cerrar la ayuda",
  titulo: "Ayuda",
  subtitulo: "Respuestas a lo que más se pregunta",
  escribeTuDuda: "Escribe tu duda",
  escribeTuDudaPlaceholder: "Escribe tu duda…",
  buscarEnLaAyuda: "Buscar en la ayuda",

  saludo: "Hola, ¿en qué podemos ayudarte? Elige un tema o escribe tu pregunta.",
  preguntasSobre: (categoria) => `Preguntas frecuentes sobre ${categoria.toLowerCase()}:`,
  siGracias: "Sí, gracias",
  teHaServidoAlgoMas: "Nos alegra que te haya servido. ¿Necesitas algo más?",
  noDelTodo: "No del todo",
  soporteNoResuelto: "Pulsa el botón para escribirnos por WhatsApp. Una persona del equipo te ayudará con tu caso.",
  quieroHablarConSoporte: "Quiero hablar con soporte",
  soportePedido: "Pulsa el botón para escribirnos por WhatsApp. Te responderá una persona del equipo.",
  // Es nuestro fallo, no suyo: no encontramos, no "no existe".
  soporteSinRespuesta: "No hemos encontrado una respuesta a esto. Pulsa el botón para escribirnos por WhatsApp y te ayudamos.",
  unaRespuesta: "Esta respuesta puede servirte:",
  variasRespuestas: "Estas respuestas pueden servirte:",
  escribirPorWhatsApp: "Escribir por WhatsApp",
  hablarConSoporte: "Hablar con el equipo de soporte",
  verRecorrido: "Ver el recorrido guiado",
  menuAyuda: "Ayuda",
  opcionTutorial: "Tutorial",
  opcionTutorialDetalle: "Te enseño dónde está cada cosa",
  opcionChat: "Chat",
  opcionChatDetalle: "Pregúntanos lo que necesites",
  respuestaNoDisponible: "Esta respuesta ya no está disponible.",

  teHaServido: "¿Te ha servido?",
  si: "Sí",
  no: "No",
  marcasteQueSirvio: "Has indicado que te ha servido.",
  marcasteQueNoSirvio: "Has indicado que no te ha servido.",
};

const EN: TextosAyuda = {
  ayuda: "Help",
  cerrar: "Close",
  dialogo: "DRC Academy help",
  cerrarLaAyuda: "Close help",
  titulo: "Help",
  subtitulo: "Answers to common questions",
  escribeTuDuda: "Type your question",
  escribeTuDudaPlaceholder: "Type your question…",
  buscarEnLaAyuda: "Search the help",

  saludo: "Hi, how can we help? Choose a topic or type your question.",
  preguntasSobre: (categoria) => `Common questions about ${categoria.toLowerCase()}:`,
  siGracias: "Yes, thanks",
  teHaServidoAlgoMas: "Glad that helped. Is there anything else you need?",
  noDelTodo: "Not quite",
  soporteNoResuelto: "Tap the button to message us on WhatsApp. Someone from our team will help you with it.",
  quieroHablarConSoporte: "I'd like to talk to support",
  soportePedido: "Tap the button to message us on WhatsApp. A member of our team will reply.",
  soporteSinRespuesta: "We couldn't find an answer to that. Tap the button to message us on WhatsApp and we'll help.",
  unaRespuesta: "This answer may help:",
  variasRespuestas: "These answers may help:",
  escribirPorWhatsApp: "Message us on WhatsApp",
  hablarConSoporte: "Talk to our support team",
  verRecorrido: "Take the guided tour",
  menuAyuda: "Help",
  opcionTutorial: "Tutorial",
  opcionTutorialDetalle: "I'll show you around",
  opcionChat: "Chat",
  opcionChatDetalle: "Ask us anything",
  respuestaNoDisponible: "This answer is no longer available.",

  teHaServido: "Did that help?",
  si: "Yes",
  no: "No",
  marcasteQueSirvio: "You said this helped.",
  marcasteQueNoSirvio: "You said this didn't help.",
};

export const AYUDA: Record<Idioma, TextosAyuda> = { es: ES, en: EN };
