// ---------------------------------------------------------------
// EL WHATSAPP DE DRC
//
// El único sitio donde está el número. Lo usan la ayuda (`lib/faq.ts`,
// que monta su propio mensaje) y «Mis clases», cuando el alumno no
// encuentra un horario que le encaje.
//
// Sin `server-only`: el chat de ayuda es un componente de cliente.
// ---------------------------------------------------------------

export const WHATSAPP_DRC = "353899409220";

const MENSAJES = {
  es: "Hola! Estoy en la plataforma y no encuentro un horario que me encaje para mis clases. [Ref: plataforma / mis-clases]",
  en: "Hi! I'm on the platform and I can't find a time that works for my classes. [Ref: plataforma / mis-clases]",
} as const;

export function enlaceWhatsAppHorarios(idioma: "es" | "en"): string {
  return `https://wa.me/${WHATSAPP_DRC}?text=${encodeURIComponent(MENSAJES[idioma])}`;
}
