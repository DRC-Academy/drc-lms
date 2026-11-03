// ---------------------------------------------------------------
// EL AVISO DE «PARA TI», EN EL SERVIDOR
//
// Sale a quien NUNCA ha generado un bloque y PUEDE generar uno ya, y
// solo mientras no lo haya cerrado 3 veces.
//
// No hay regla propia: «nunca ha generado» es `leerUltimaGeneracion`
// en null y «puede generar» es la parada de generación abierta, con la
// misma `calcularTarjeta` que pinta «Para ti». Si la regla de generar
// cambia, el aviso cambia con ella.
//
// Los cierres van a `aviso_para_ti_cierres`, en la base del LMS
// (supabase/lms-aviso-para-ti.sql). Sin la tabla, no sale.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { obtenerAlumno } from "@/lib/gestion";
import { leerUltimaGeneracion } from "@/lib/progreso-servidor";
import { calcularTarjeta } from "@/lib/modos";
import { textosActuales } from "@/lib/idioma-servidor";

/** A partir de cuántos cierres deja de salir. */
export const MAX_CIERRES = 3;

/** Cuántas veces lo ha cerrado, o null si la tabla no se pudo leer. */
async function cierresDe(alumnoId: string): Promise<number | null> {
  const { count, error } = await baseLms()
    .from("aviso_para_ti_cierres")
    .select("id", { count: "exact", head: true })
    .eq("alumno_id", alumnoId);

  if (error) {
    console.error("[aviso-para-ti] No se pudieron leer los cierres:", error.message);
    return null;
  }
  return count ?? 0;
}

/** ¿Hay que enseñarle el aviso? */
export async function avisoParaTiPendiente(alumnoId: string): Promise<boolean> {
  if (!alumnoId) return false;

  const ultimaGeneracion = await leerUltimaGeneracion(alumnoId);
  if (ultimaGeneracion !== null) return false;

  const [datos, cierres] = await Promise.all([obtenerAlumno(alumnoId), cierresDe(alumnoId)]);
  if (cierres === null || cierres >= MAX_CIERRES) return false;

  const tarjeta = calcularTarjeta(
    datos?.perfil ?? null,
    datos?.ultimaClase ?? null,
    ultimaGeneracion,
    textosActuales().practica
  );
  return tarjeta !== null && tarjeta.espera === null;
}

/** Apunta un cierre. */
export async function apuntarCierreAvisoParaTi(alumnoId: string): Promise<boolean> {
  const { error } = await baseLms().from("aviso_para_ti_cierres").insert({ alumno_id: alumnoId });
  if (error) {
    console.error("[aviso-para-ti] No se pudo apuntar el cierre:", error.message);
    return false;
  }
  return true;
}
