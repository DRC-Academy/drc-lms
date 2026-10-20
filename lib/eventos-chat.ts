// ---------------------------------------------------------------
// LOS EVENTOS DEL CHAT DE AYUDA
//
// El chat (`components/ChatAyuda.tsx`) responde en el cliente, con el
// FAQ de `lib/faq.ts`, así que el servidor no se enteraba de nada. Ahora
// le cuenta tres cosas a `app/api/evento`, que las apunta en `eventos`:
//
//   chat_abierto         abrió la ayuda (desde el menú o desde la lección)
//   chat_pregunta_vista  leyó una respuesta: `pregunta` = id del FAQ
//   chat_a_whatsapp      pulsó «Escribir por WhatsApp»: `motivo` y, si
//                        venía de una respuesta que no le sirvió, su id
//
// NUNCA LO QUE ESCRIBE EL ALUMNO. La búsqueda sin resultados se apunta
// como `motivo: "sinRespuesta"`, sin el texto.
//
// Módulo puro y compartido: el cliente usa los tipos y la ruta valida
// con `leerEventoChat`, que es la única puerta.
// ---------------------------------------------------------------

import { preguntaPorId } from "@/lib/faq";

export type MotivoWhatsApp = "noResuelto" | "pedido" | "sinRespuesta";

export type EventoChat =
  | { tipo: "chat_abierto" }
  | { tipo: "chat_pregunta_vista"; pregunta: string }
  | { tipo: "chat_a_whatsapp"; motivo: MotivoWhatsApp; pregunta?: string };

/** Lo que se guarda: el tipo, y en `datos` solo ids y claves cerradas. */
export type EventoValidado = { tipo: EventoChat["tipo"]; datos: Record<string, string> };

const MOTIVOS: readonly MotivoWhatsApp[] = ["noResuelto", "pedido", "sinRespuesta"];

/** Un id que exista en el FAQ, o null. Un id inventado no se guarda. */
function preguntaValida(valor: unknown): string | null {
  return typeof valor === "string" && preguntaPorId(valor) ? valor : null;
}

/** El cuerpo de la petición, validado; null si no es un evento del chat. */
export function leerEventoChat(cuerpo: unknown): EventoValidado | null {
  if (typeof cuerpo !== "object" || cuerpo === null) return null;
  const c = cuerpo as Record<string, unknown>;

  switch (c.tipo) {
    case "chat_abierto":
      return { tipo: "chat_abierto", datos: {} };

    case "chat_pregunta_vista": {
      const pregunta = preguntaValida(c.pregunta);
      return pregunta ? { tipo: "chat_pregunta_vista", datos: { pregunta } } : null;
    }

    case "chat_a_whatsapp": {
      const motivo = MOTIVOS.find((m) => m === c.motivo);
      if (!motivo) return null;
      const pregunta = preguntaValida(c.pregunta);
      return { tipo: "chat_a_whatsapp", datos: pregunta ? { motivo, pregunta } : { motivo } };
    }

    default:
      return null;
  }
}
