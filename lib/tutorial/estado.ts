// ---------------------------------------------------------------
// SI EL ALUMNO HA VISTO YA EL RECORRIDO GUIADO
//
// En la base del LMS, no en Gestión ni en el navegador: el alumno entra
// desde el móvil y desde el ordenador, y tiene que ser la misma respuesta.
// Columna `tutorial_visto_en` de `alumno_vinculos` (supabase/lms-tutorial.sql).
//
// ANTE LA DUDA, VISTO. Si la lectura falla —la columna aún no existe, la
// base no responde, el alumno no tiene fila—, el onboarding no se lanza.
// Es mejor que alguien no vea el recorrido solo a que lo vea en cada
// visita.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";

/** Si hay que lanzarle el onboarding. */
export async function tutorialPendiente(alumnoId: string): Promise<boolean> {
  if (!alumnoId) return false;
  const { data, error } = await baseLms()
    .from("alumno_vinculos")
    .select("tutorial_visto_en")
    .eq("alumno_id", alumnoId)
    .limit(1)
    .returns<{ tutorial_visto_en: string | null }[]>();

  if (error) {
    console.error("[tutorial] No se pudo leer si ya vio el recorrido:", error.message);
    return false;
  }
  const fila = (data ?? [])[0];
  return fila !== undefined && fila.tutorial_visto_en === null;
}

/**
 * Lo marca como visto, si no lo estaba. Nunca lanza: perder la marca solo
 * significa que el recorrido volverá a salir una vez más.
 */
export async function marcarTutorialVisto(alumnoId: string): Promise<void> {
  if (!alumnoId) return;
  const { error } = await baseLms()
    .from("alumno_vinculos")
    .update({ tutorial_visto_en: new Date().toISOString() })
    .eq("alumno_id", alumnoId)
    .is("tutorial_visto_en", null);
  if (error) console.error("[tutorial] No se pudo marcar el recorrido como visto:", error.message);
}
