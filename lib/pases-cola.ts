// ---------------------------------------------------------------
// LA COLA DE CORREO DEL BLACK PASS
//
// Desacoplada del webhook: conceder el pase no espera a Resend. Cada vuelta
// reclama lo que toca (`reclamar_correos`, con `skip locked`), respeta el
// ritmo compartido con el magic link (`reservar_envio_resend`) y confirma o
// devuelve a la cola.
//
// LA CLAVE DE LA COLA ES TAMBIÉN LA DE IDEMPOTENCIA EN RESEND: si un proceso
// muere entre enviar y confirmar, la fila vuelve a la cola al vencer su
// reserva y el reintento no llega duplicado.
// ---------------------------------------------------------------

import "server-only";
import { Resend } from "resend";
import { baseLms } from "@/lib/supabase-lms";
import { correoAccesoBlackPass } from "@/lib/correo-black-pass";
import { esperarTurnoResend } from "@/lib/resend-ritmo";

/** Lo que tarda en reintentarse un fallo que no trae plazo. */
const ESPERA_POR_DEFECTO_S = 60;

/** Lo que no se arregla reintentando: la dirección o la cuenta están mal. */
const FALLOS_DEFINITIVOS = new Set(["validation_error", "invalid_parameter", "missing_required_field"]);

type FilaCola = { id: string; clave: string; pase_id: string | null; destinatario: string };
type DatosPase = { nombre: string | null; acceso_hasta: string; estado: string };

async function devolver(id: string, error: string, esperaS: number, definitivo: boolean) {
  const { error: alDevolver } = await baseLms().rpc("correo_fallido", {
    p_id: id,
    p_error: error,
    p_espera_segundos: esperaS,
    p_definitivo: definitivo,
  });
  if (alDevolver) console.error("[pases-cola] No se pudo devolver a la cola:", alDevolver.message);
}

async function enviarUno(fila: FilaCola): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    await devolver(fila.id, "Falta RESEND_API_KEY", ESPERA_POR_DEFECTO_S, false);
    return false;
  }

  const { data: pase, error: alLeer } = await baseLms()
    .from("pases_curso")
    .select("nombre, acceso_hasta, estado")
    .eq("id", fila.pase_id ?? "")
    .limit(1)
    .returns<DatosPase[]>();

  if (alLeer || !pase?.[0]) {
    await devolver(fila.id, alLeer?.message ?? "El pase ya no existe", ESPERA_POR_DEFECTO_S, !alLeer);
    return false;
  }
  // Reembolsado mientras esperaba: nada que anunciar.
  if (pase[0].estado !== "activo") {
    await devolver(fila.id, "El pase ya no está activo", ESPERA_POR_DEFECTO_S, true);
    return false;
  }

  let correo;
  try {
    correo = correoAccesoBlackPass({ nombre: pase[0].nombre, hasta: new Date(pase[0].acceso_hasta) });
  } catch (error) {
    await devolver(fila.id, (error as Error).message, ESPERA_POR_DEFECTO_S, false);
    return false;
  }

  await esperarTurnoResend();

  try {
    const { data, error, headers } = await new Resend(clave).emails.send(
      { to: fila.destinatario, ...correo },
      { idempotencyKey: fila.clave }
    );

    if (error) {
      const plazo = Number(headers?.["retry-after"]);
      const espera = error.name === "rate_limit_exceeded" && plazo > 0 ? Math.ceil(plazo) : ESPERA_POR_DEFECTO_S;
      await devolver(fila.id, `${error.name}: ${error.message}`, espera, FALLOS_DEFINITIVOS.has(error.name));
      return false;
    }

    const { error: alConfirmar } = await baseLms().rpc("correo_enviado", { p_id: fila.id, p_resend_id: data?.id ?? null });
    // Ya salió: si no se puede apuntar, la reserva vence y la idempotencia de
    // Resend evita el duplicado.
    if (alConfirmar) console.error("[pases-cola] No se pudo confirmar el envío:", alConfirmar.message);
    return true;
  } catch (error) {
    await devolver(fila.id, (error as Error).message, ESPERA_POR_DEFECTO_S, false);
    return false;
  }
}

/**
 * Una vuelta de la cola. Se para al llegar al plazo: lo que no salga ahora
 * sale en la siguiente. Devuelve cuántos han salido.
 */
export async function procesarCola({ limite, plazoMs }: { limite: number; plazoMs: number }): Promise<{ enviados: number; fallidos: number }> {
  const inicio = Date.now();
  let enviados = 0;
  let fallidos = 0;

  // De pocos en pocos: lo reclamado y no enviado no puede quedarse reservado
  // solo porque se acabara el plazo.
  while (enviados + fallidos < limite && Date.now() - inicio < plazoMs) {
    const { data, error } = await baseLms().rpc("reclamar_correos", { p_limite: 1, p_reserva_segundos: 120 });
    if (error) {
      console.error("[pases-cola] No se pudo leer la cola:", error.message);
      break;
    }
    const fila = (data as FilaCola[] | null)?.[0];
    if (!fila) break;

    if (await enviarUno(fila)) enviados++;
    else fallidos++;
  }

  return { enviados, fallidos };
}
