// ---------------------------------------------------------------
// EL AVISO DE «PARA TI»
//
// El pop-up para quien nunca ha generado un bloque y ya puede
// (`components/aviso-para-ti/AvisoParaTi.tsx`).
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosAvisoParaTi = {
  titulo: string;
  texto: string;
  boton: string;
  cerrar: string;
  /** La chapa junto a la primera parada del dibujo. */
  empiezaAqui: string;
};

export const AVISO_PARA_TI: Record<Idioma, TextosAvisoParaTi> = {
  es: {
    titulo: "Aún no has probado la sección Para ti",
    texto:
      "Es tu práctica personalizada: ejercicios creados a partir de tus clases, a tu nivel y pensados para tu día a día. Pulsa el botón y en un momento tienes tu primer bloque.",
    boton: "Probar Para ti",
    cerrar: "Cerrar",
    empiezaAqui: "Empieza aquí",
  },
  en: {
    titulo: "You haven't tried the For you section yet",
    texto:
      "It's your personalised practice: exercises created from your classes, at your level and designed around your day-to-day life. Tap the button and your first block will be ready in a moment.",
    boton: "Try For you",
    cerrar: "Close",
    empiezaAqui: "Start here",
  },
};
