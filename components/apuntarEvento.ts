import type { EventoChat } from "@/lib/eventos-chat";

/**
 * Le cuenta al servidor algo que pasó en el chat de ayuda, sin esperar.
 *
 * `keepalive` para que llegue aunque la pestaña cambie de página justo
 * después —el botón de WhatsApp abre otra—. Y nada de lo que pase con la
 * petición sube de aquí: el chat funciona igual si falla.
 */
export function apuntarEvento(evento: EventoChat) {
  try {
    void fetch("/api/evento", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(evento),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // `fetch` lanzando en síncrono (navegadores muy viejos con keepalive): da igual.
  }
}
