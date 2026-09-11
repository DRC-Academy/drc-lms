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
  /** "Esto es lo que más se pregunta sobre <categoría>:". */
  loQueMasSePregunta: (categoria: string) => string;
  siGracias: string;
  genialAlgoMas: string;
  noDelTodo: string;
  sientoNoResolverlo: string;
  quieroHablarConSoporte: string;
  teAbrimosWhatsApp: string;
  noLoTengoEscrito: string;
  creoQueVaPorAqui: string;
  puedeQueSeaAlguna: string;
  escribirPorWhatsApp: string;
  prefieresSoporte: string;
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

  saludo: "¡Hola! Soy la ayuda de DRC Academy. ¿Sobre qué necesitas una mano?",
  loQueMasSePregunta: (categoria) =>
    `Esto es lo que más se pregunta sobre ${categoria.toLowerCase()}:`,
  siGracias: "Sí, gracias",
  genialAlgoMas: "¡Genial! ¿Te ayudo con algo más?",
  noDelTodo: "No del todo",
  sientoNoResolverlo: "Vaya, siento no haberlo resuelto. Escríbenos y te contestamos nosotros.",
  quieroHablarConSoporte: "Quiero hablar con soporte",
  teAbrimosWhatsApp: "Claro. Te abrimos WhatsApp con tu nombre y la pantalla desde la que escribes.",
  // Es nuestro fallo, no suyo: no encontramos, no "no existe".
  noLoTengoEscrito: "Esto no lo tengo escrito. Te paso con soporte, que sí sabrá.",
  creoQueVaPorAqui: "Creo que va por aquí:",
  puedeQueSeaAlguna: "Puede que sea alguna de estas:",
  escribirPorWhatsApp: "Escribir por WhatsApp",
  prefieresSoporte: "¿Prefieres hablar con soporte?",
  respuestaNoDisponible: "Esta respuesta ya no está disponible.",

  teHaServido: "¿Te ha servido?",
  si: "Sí",
  no: "No",
  marcasteQueSirvio: "Marcaste que te ha servido.",
  marcasteQueNoSirvio: "Marcaste que no te ha servido.",
};

const EN: TextosAyuda = {
  ayuda: "Help",
  cerrar: "Close",
  dialogo: "DRC Academy help",
  cerrarLaAyuda: "Close help",
  titulo: "Help",
  subtitulo: "Answers to what people ask most",
  escribeTuDuda: "Type your question",
  escribeTuDudaPlaceholder: "Type your question…",
  buscarEnLaAyuda: "Search the help",

  saludo: "Hi! I'm the DRC Academy help. What do you need a hand with?",
  loQueMasSePregunta: (categoria) =>
    `Here's what people ask most about ${categoria.toLowerCase()}:`,
  siGracias: "Yes, thanks",
  genialAlgoMas: "Great! Anything else I can help with?",
  noDelTodo: "Not quite",
  sientoNoResolverlo: "Sorry that didn't sort it. Write to us and we'll answer you ourselves.",
  quieroHablarConSoporte: "I want to talk to support",
  teAbrimosWhatsApp: "Sure. We'll open WhatsApp with your name and the screen you're writing from.",
  noLoTengoEscrito: "I don't have that written down. I'll pass you to support, who will know.",
  creoQueVaPorAqui: "I think it's this one:",
  puedeQueSeaAlguna: "It might be one of these:",
  escribirPorWhatsApp: "Message us on WhatsApp",
  prefieresSoporte: "Would you rather talk to support?",
  respuestaNoDisponible: "This answer is no longer available.",

  teHaServido: "Did that help?",
  si: "Yes",
  no: "No",
  marcasteQueSirvio: "You marked this as helpful.",
  marcasteQueNoSirvio: "You marked this as not helpful.",
};

export const AYUDA: Record<Idioma, TextosAyuda> = { es: ES, en: EN };
