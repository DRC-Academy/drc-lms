// ---------------------------------------------------------------
// QUIÉN ENTRA, CON FICHA O CON PASE
//
// Lo comparten las tres puertas: pedir el enlace (`app/acceso/acciones.ts`),
// el enlace del correo (`app/entrar`) y el botón de la tienda (`app/entrar/woo`).
//
// LA FICHA GANA SIEMPRE: si existe, se entra con ella y lo que tuviera con
// un id `pase-…` se funde en ella en ese momento.
//
// EL PASE REVOCADO NO ENTRA y se trata como si no existiera; el CADUCADO sí
// recibe enlace, para que le salga por qué ya no puede pasar. Sin ficha ni
// pase, la respuesta de siempre.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { buscarAlumnoPorEmail } from "@/lib/gestion";
import { pasesActivos, pasesDePersona, type Pase } from "@/lib/pases";
import { esIdPase } from "@/lib/pase-id";
import { pedidosPagadosDeUsuario } from "@/lib/woo-api";
import { procesarPedido } from "@/lib/pases-pedidos";

export type Entrada =
  | { tipo: "ficha"; alumnoId: string }
  | { tipo: "pase"; alumnoId: string }
  /** Solo tenía pase, y se le ha acabado. */
  | { tipo: "pase_fin" }
  | null;

/** Lanza si la base del LMS falla: la puerta decide qué hacer. */
function delPase(pases: Pase[]): Entrada {
  const vivo = pases.find((p) => p.vivo);
  if (vivo) return { tipo: "pase", alumnoId: vivo.alumnoId };
  return pases.some((p) => !p.revocado) ? { tipo: "pase_fin" } : null;
}

async function porPase(email: string, wooUserId: number | null): Promise<Entrada> {
  try {
    return delPase(await pasesDePersona(email, wooUserId));
  } catch (error) {
    console.error("[pases-entrada] No se pudieron leer los pases:", (error as Error).message);
    return null;
  }
}

/** Sin ficha: ¿tiene pase? Es lo que preguntan las puertas después de Gestión. */
export async function entradaPorPase(email: string, wooUserId: number | null = null): Promise<Entrada> {
  return porPase(email, wooUserId);
}

/** Con quién entra esta persona. */
export async function resolverEntrada(email: string, wooUserId: number | null = null): Promise<Entrada> {
  const ficha = await buscarAlumnoPorEmail(email);
  if (ficha) return { tipo: "ficha", alumnoId: ficha.alumnoId };
  return porPase(email, wooUserId);
}

/**
 * Funde en la ficha lo que esta persona tuviera con un id `pase-…`: compró
 * antes de que le crearan la ficha. Una consulta por entrada, solo con el
 * interruptor encendido. Un fallo no impide entrar: se reintenta la próxima.
 */
export async function fundirPasesEnFicha(fichaId: string, email: string, wooUserId: number | null): Promise<void> {
  if (!pasesActivos()) return;

  try {
    const pases = await pasesDePersona(email, wooUserId);
    const previos = Array.from(new Set(pases.map((p) => p.alumnoId).filter(esIdPase)));
    for (const previo of previos) {
      const { error } = await baseLms().rpc("fundir_pase_en_ficha", { p_pase_alumno_id: previo, p_ficha_id: fichaId });
      if (error) console.error("[pases-entrada] No se pudo fundir el pase en la ficha:", error.message);
    }
  } catch (error) {
    console.error("[pases-entrada] No se pudo mirar si había que fundir:", (error as Error).message);
  }
}

/**
 * LA CARRERA DE DESPUÉS DE PAGAR. El botón de la página de gracias lleva al
 * puente en segundos y el webhook de la tienda va en diferido: esta persona
 * ha pagado y su pase todavía no existe. Se pregunta a la tienda en el acto.
 *
 * Solo desde `app/entrar/woo`, que trae el usuario de WordPress firmado. Si
 * la tienda no contesta se sigue como sin pase; la conciliación lo arregla
 * en minutos.
 */
export async function concederPedidosPendientes(wooUserId: number): Promise<void> {
  if (!pasesActivos()) return;

  try {
    for (const pedido of await pedidosPagadosDeUsuario(wooUserId)) {
      await procesarPedido(pedido, "entrada");
    }
  } catch (error) {
    console.error("[pases-entrada] No se pudieron mirar los pedidos pendientes:", (error as Error).message);
  }
}
