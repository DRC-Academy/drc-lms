// ---------------------------------------------------------------
// ANOTAR LOS INTENTOS DE ACCESO
//
// `sesiones` solo guarda los finales felices. Sin esto, el día que se
// manden 172 invitaciones y entren 20, los otros 152 son silencio: no
// se sabe si el correo no llegó, si acabó en spam, si el enlace caducó
// o si simplemente nadie lo pulsó.
//
// DOS REGLAS, y las dos importan más que el dato:
//
//   1. NUNCA BLOQUEA NI ROMPE EL ACCESO. Es telemetría. Si la escritura
//      falla o tarda, el alumno entra igual: se traga el error y sigue.
//   2. NO GUARDA EMAILS. `app/acceso/acciones.ts` está construido sobre
//      no revelar quién está registrado —misma respuesta y mismo tiempo
//      exista o no la dirección—. Guardar aquí las direcciones probadas
//      montaría justo esa lista por la puerta de atrás.
//
// Sobre el TIEMPO: quien llama tiene que anotar FUERA de la parte que
// iguala la duración de la respuesta, y hacerlo en todos los caminos.
// Anotar solo cuando el email existe haría que ese caso tardara más, y
// esa diferencia es exactamente la fuga que el suelo de 500 ms tapa.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";

export type ResultadoIntento =
  | "enlace_enviado"
  | "envio_fallido"
  | "sin_cuenta"
  | "email_invalido"
  | "enlace_caducado"
  | "sin_ficha";

export type RolIntento = "alumno" | "admin" | "desconocido";

/**
 * Deja constancia de un intento de acceso. No lanza nunca.
 *
 * No se espera el resultado en el camino crítico: quien llama puede
 * lanzarlo sin `await` si el desenlace ya está decidido.
 */
export async function registrarIntento(datos: {
  resultado: ResultadoIntento;
  rol: RolIntento;
  /** Solo cuando se conoce. Nunca el email. */
  alumnoId?: string | null;
  origen?: "magic_link" | "woocommerce";
}): Promise<void> {
  try {
    const { error } = await baseLms().from("intentos_acceso").insert({
      alumno_id: datos.alumnoId ?? null,
      rol: datos.rol,
      resultado: datos.resultado,
      origen: datos.origen ?? "magic_link",
    });

    // Se registra en el log y nada más: que no se pueda contar un
    // intento no es motivo para que alguien no entre.
    if (error) console.error("[acceso] No se pudo anotar el intento:", error.message);
  } catch (error) {
    console.error("[acceso] No se pudo anotar el intento:", error);
  }
}
