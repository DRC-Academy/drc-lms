import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * `Authorization: Bearer CRON_SECRET`, sin dar pistas por el tiempo de
 * respuesta. Sin secreto configurado no se abre a nadie.
 */
export function autorizadoComoCron(peticion: { headers: { get(nombre: string): string | null } }): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || secreto.length < 16) {
    console.error("[cron] Falta CRON_SECRET en el entorno, o es demasiado corto.");
    return false;
  }

  const recibida = Buffer.from(peticion.headers.get("authorization") ?? "");
  const esperada = Buffer.from(`Bearer ${secreto}`);
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}
