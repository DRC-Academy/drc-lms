// ---------------------------------------------------------------
// LEER «TU OBJETIVO» DE LA BASE DEL LMS
//
// La reescritura en segunda persona que produce
// `scripts/reescribir-objetivos.ts`. Vive en la base NUESTRA porque no
// se puede escribir en la de Gestión: ver la cabecera de
// `supabase/lms-objetivos-alumno.sql`.
//
// ESTE MÓDULO NO DECIDE NADA SOBRE EL TEXTO. Decide si la fila sigue
// siendo válida —que la huella cuadre con el original de hoy— y devuelve
// el texto o null. Qué se puede enseñar lo dice `lib/objetivo.ts`, y lo
// dice igual aquí que en el script.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { huellaObjetivo, objetivoPublicable } from "@/lib/objetivo";

/**
 * El objetivo que se le enseña al alumno.
 *
 * Devuelve la reescritura en segunda persona si la hay y sigue siendo la
 * del original de hoy; si no, el original tal cual, que es lo que la
 * pantalla enseñaba antes de todo esto.
 *
 * TRES CAÍDAS, y todas acaban en el original:
 *
 *   · No hay fila para este alumno. Es el caso de los 122 que no tienen
 *     objetivo en Gestión, y el de cualquiera nuevo hasta que se pase el
 *     script.
 *   · La huella no cuadra: Gestión ha rehecho la ficha desde entonces y
 *     la reescritura habla de otra cosa. Mejor un texto tieso y cierto
 *     que uno bonito y viejo.
 *   · La reescritura ya no pasa las reglas de `objetivo.ts`. Pasa si las
 *     reglas se endurecen después de haberla guardado.
 *
 * NUNCA LANZA. Si la consulta falla —la tabla no existe todavía porque
 * nadie ha corrido el SQL, la base no responde— se cae al original y se
 * anota. Esta pantalla es de solo lectura y no se puede quedar en blanco
 * por un texto de adorno.
 */
export async function objetivoDelAlumno(
  alumnoId: string,
  original: string | null
): Promise<string | null> {
  const limpio = (original ?? "").trim();
  if (limpio === "") return null;

  try {
    const { data, error } = await baseLms()
      .from("objetivos_alumno")
      .select("texto, origen_hash")
      .eq("alumno_id", alumnoId)
      .maybeSingle();

    if (error || !data) return limpio;

    const fila = data as { texto: string; origen_hash: string };
    if (fila.origen_hash !== huellaObjetivo(limpio)) return limpio;

    return objetivoPublicable(fila.texto) ?? limpio;
  } catch (error) {
    console.error("[objetivo] No se pudo leer la reescritura:", error);
    return limpio;
  }
}
