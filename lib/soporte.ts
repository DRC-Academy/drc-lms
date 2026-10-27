// ---------------------------------------------------------------
// EL WHATSAPP DE DRC
//
// El único sitio donde está el número. Lo usan la ayuda (`lib/faq.ts`,
// que monta su propio mensaje) y «Mis clases», cuando el alumno no
// encuentra un horario que le encaje, y la pantalla de cuando pulsa
// «Unirse a la clase» y no hay sala (`/clase/sin-enlace`).
//
// Sin `server-only`: el chat de ayuda es un componente de cliente.
// ---------------------------------------------------------------

export const WHATSAPP_DRC = "353899409220";

/** El chat sin mensaje preparado. Lo usa el aviso de pago pendiente. */
export const ENLACE_WHATSAPP = `https://wa.me/${WHATSAPP_DRC}`;

const MENSAJES = {
  es: "Hola! Estoy en la plataforma y no encuentro un horario que me encaje para mis clases. [Ref: plataforma / mis-clases]",
  en: "Hi! I'm on the platform and I can't find a time that works for my classes. [Ref: plataforma / mis-clases]",
} as const;

export function enlaceWhatsAppHorarios(idioma: "es" | "en"): string {
  return `https://wa.me/${WHATSAPP_DRC}?text=${encodeURIComponent(MENSAJES[idioma])}`;
}

const MENSAJES_SALA = {
  es: "Hola! Quiero entrar a mi clase y no tengo el enlace de la sala. [Ref: plataforma / clase-sin-enlace]",
  en: "Hi! I want to join my class and I don't have the link. [Ref: plataforma / clase-sin-enlace]",
} as const;

/** Desde `/clase/sin-enlace`: se pulsó «Unirse a la clase» y no había sala. */
export function enlaceWhatsAppSala(idioma: "es" | "en"): string {
  return `https://wa.me/${WHATSAPP_DRC}?text=${encodeURIComponent(MENSAJES_SALA[idioma])}`;
}
