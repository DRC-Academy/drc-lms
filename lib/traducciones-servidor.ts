// ---------------------------------------------------------------
// TRADUCCIONES DE BLOQUE, CONTRA LA BASE PROPIA DEL LMS
//
// La caché de lo que escribe `lib/traductor.ts`. Una fila por bloque e
// idioma, compartida entre alumnos: el primero que pulsa el botón en un
// bloque del catálogo lo paga, y el resto se lo encuentra hecho.
//
// Ver `supabase/lms-traducciones.sql` para la tabla y para por qué no
// vive dentro de `bloques_generados.contenido`.
//
// Como el resto del módulo vecino, nada de aquí lanza: una lectura que
// falla devuelve null y una escritura que falla devuelve false. Perder
// una traducción es que el botón tarde otra vez la próxima; no es algo
// que pueda tumbar la pantalla del ejercicio.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { validarTraduccion, type IdiomaBloque, type TraduccionBloque } from "@/lib/traduccion-bloque";

type FilaTraduccion = {
  bloque_clave: string;
  idioma: string;
  contenido: unknown;
};

function registrar(donde: string, error: { message: string } | null): boolean {
  if (!error) return true;
  console.error(`[traduccion] ${donde}:`, error.message);
  return false;
}

/**
 * La traducción guardada de un bloque, si la hay.
 *
 * Vuelve a pasar por `validarTraduccion` y no se devuelve el jsonb tal
 * cual: lo que hay en la base lo escribió un modelo, y una fila vieja
 * de cuando la forma era otra tiene que caerse aquí y no en el visor.
 */
export async function leerTraduccion(
  bloqueClave: string,
  idioma: IdiomaBloque
): Promise<TraduccionBloque | null> {
  const { data, error } = await baseLms()
    .from("traducciones_bloque")
    .select("bloque_clave, idioma, contenido")
    .eq("bloque_clave", bloqueClave)
    .eq("idioma", idioma)
    .limit(1)
    .returns<FilaTraduccion[]>();

  if (!registrar("No se pudo leer la traducción", error)) return null;

  const fila = (data ?? [])[0];
  return fila ? validarTraduccion(fila.contenido, idioma) : null;
}

/**
 * Guarda una traducción recién hecha.
 *
 * `ignoreDuplicates` y no un upsert que pisa: si dos alumnos pulsan el
 * botón del mismo bloque del catálogo a la vez, las dos traducciones son
 * igual de buenas y la primera que llegue se queda. Pisarla sería
 * reescribir una fila para dejarla equivalente.
 */
export async function guardarTraduccion(
  bloqueClave: string,
  traduccion: TraduccionBloque,
  modelo: string
): Promise<boolean> {
  const { error } = await baseLms()
    .from("traducciones_bloque")
    .upsert(
      {
        bloque_clave: bloqueClave,
        idioma: traduccion.idioma,
        contenido: traduccion,
        modelo,
      },
      { onConflict: "bloque_clave,idioma", ignoreDuplicates: true }
    );

  return registrar("No se pudo guardar la traducción", error);
}
