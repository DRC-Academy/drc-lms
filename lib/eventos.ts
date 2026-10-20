// ---------------------------------------------------------------
// EVENTOS SUELTOS DE USO
//
// Lo que no tiene tabla propia: los clics en «Amplía tu plan» y el uso
// del chat de ayuda. Una fila en `eventos` por cada uno. Ver la tabla en
// `supabase/lms-instrumentacion.sql`, donde `tipo` es un CHECK: un tipo
// que no esté allí falla al insertar.
//
// Solo alumnos. Al equipo no se le apunta nada —no es uso—, y las
// cuentas demo y de pruebas se apuntan y las quita la base
// (`metricas_excluido()`), que es la única lista.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";

export type TipoEvento =
  | "banner_ampliar_clic"
  | "chat_abierto"
  | "chat_pregunta_vista"
  | "chat_a_whatsapp";

/** Apunta el evento. Nunca lanza: es telemetría y quien llama ya respondió o va a responder igual. */
export async function apuntarEvento(
  alumnoId: string,
  tipo: TipoEvento,
  datos: Record<string, string> = {}
): Promise<boolean> {
  const { error } = await baseLms().from("eventos").insert({ alumno_id: alumnoId, tipo, datos });
  if (error) {
    console.error(`[eventos] No se pudo apuntar ${tipo}:`, error.message);
    return false;
  }
  return true;
}
