import "server-only";
import { baseLms } from "@/lib/supabase-lms";

/**
 * El ritmo de envío, compartido entre instancias: la cola del Black Pass y el
 * magic link usan la misma clave de Resend. Reserva un hueco y espera lo que
 * falte. Si la base no contesta no se bloquea el envío: en el peor caso Resend
 * responde 429 y quien llama lo reintenta.
 */
export async function esperarTurnoResend(): Promise<void> {
  const { data, error } = await baseLms().rpc("reservar_envio_resend", { p_intervalo_ms: 550 });
  if (error) {
    console.error("[resend] No se pudo reservar turno:", error.message);
    return;
  }
  if (typeof data === "number" && data > 0) {
    await new Promise((listo) => setTimeout(listo, data));
  }
}
