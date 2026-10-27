// ---------------------------------------------------------------
// EL PAGO PENDIENTE
//
// El aviso que tapa la plataforma cuando la suscripción está en espera
// (`components/impago/AvisoImpago.tsx`). Nada de lenguaje de error ni de
// vigilancia, tampoco en lo que devuelve la API: el alumno no ha hecho
// nada mal, falta un cobro y en cuanto entre todo sigue como estaba.
//
// "Puede tardar unos minutos" es literal: Gestión cierra el episodio al
// llegar el webhook de WooCommerce (segundos) y, si no llega, en el
// barrido de cada 5 minutos. El LMS no guarda el estado.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosImpago = {
  titulo: string;
  texto: string;
  boton: string;
  secundario: string;
  /** Mientras se vuelve a comprobar. */
  comprobando: string;
  /** Si sigue en espera después de comprobar. Sin tono de error. */
  avisoTrasComprobar: string;
  pieAyuda: string;
  pieWhatsapp: string;
  /** Lo que devuelve la API a un alumno en espera. */
  api: string;
};

export const IMPAGO: Record<Idioma, TextosImpago> = {
  es: {
    titulo: "Tenemos un pago pendiente",
    texto:
      "Tu suscripción está en espera porque no hemos podido completar el último cobro. En cuanto lo actualices, vuelves a tener todo tal y como lo dejaste.",
    boton: "Actualizar mi pago",
    secundario: "Ya lo he hecho",
    comprobando: "Comprobando…",
    avisoTrasComprobar: "Puede tardar unos minutos en actualizarse. Vuelve a intentarlo en un momento.",
    pieAyuda: "¿Necesitas ayuda?",
    pieWhatsapp: "Escríbenos por WhatsApp",
    api: "Tu suscripción está en espera. En cuanto se actualice el pago, todo vuelve a estar disponible.",
  },
  en: {
    titulo: "There's a pending payment",
    texto:
      "Your subscription is on hold because we couldn't complete the last payment. As soon as you update it, everything will be just as you left it.",
    boton: "Update my payment",
    secundario: "I've already done it",
    comprobando: "Checking…",
    avisoTrasComprobar: "It may take a few minutes to update. Please try again in a moment.",
    pieAyuda: "Need help?",
    pieWhatsapp: "Message us on WhatsApp",
    api: "Your subscription is on hold. As soon as the payment is updated, everything will be available again.",
  },
};
