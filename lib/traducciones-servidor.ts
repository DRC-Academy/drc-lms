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
import {
  conTraduccion,
  validarTraduccion,
  type IdiomaBloque,
  type TraduccionBloque,
} from "@/lib/traduccion-bloque";
import type { Bloque } from "@/lib/data";

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
 * LAS TRADUCCIONES YA HECHAS DE UN MONTÓN DE BLOQUES, DE UNA VEZ.
 *
 * Existe por una cosa que la de arriba no puede resolver: el título y la
 * intro de un bloque no se leen solo dentro del visor. Se leen en la
 * tarjeta de la ruta, en «Paradas hechas» y en la rejilla de bloques
 * generados, y esas tres son LISTAS. Pedir una traducción por fila desde
 * el cliente sería una llamada al modelo por bloque en pantalla, y
 * además cada lista tendría que aprender a hacerlo.
 *
 * Así que se resuelve donde ya se leen los bloques: la página trae de
 * paso lo que haya traducido —UNA consulta con `in`, sin modelo y sin
 * coste— y baja los bloques ya en el idioma del alumno. Las listas no se
 * enteran de que esto existe; siguen pintando `bloque.titulo`.
 *
 * LO QUE NO ESTÉ TRADUCIDO SE QUEDA EN SU IDIOMA, que es exactamente lo
 * que pasaba antes. Esto no encarga traducciones: solo reparte las que
 * hay. Encargarlas es cosa de `scripts/traducir-bloques.ts` —por
 * adelantado, una vez— y del visor, que sigue pidiendo la suya al
 * abrirse si falta.
 *
 * Devuelve un mapa vacío si la lectura falla: perder las traducciones es
 * ver los títulos en el otro idioma, no quedarse sin pantalla.
 */
export async function leerTraducciones(
  claves: string[],
  idioma: IdiomaBloque
): Promise<Map<string, TraduccionBloque>> {
  const salida = new Map<string, TraduccionBloque>();
  if (claves.length === 0) return salida;

  const { data, error } = await baseLms()
    .from("traducciones_bloque")
    .select("bloque_clave, idioma, contenido")
    .in("bloque_clave", Array.from(new Set(claves)))
    .eq("idioma", idioma)
    .returns<FilaTraduccion[]>();

  if (!registrar("No se pudieron leer las traducciones", error)) return salida;

  for (const fila of data ?? []) {
    // Se revalida cada una, por lo mismo que en `leerTraduccion`: lo que
    // hay en la base lo escribió un modelo, y una fila vieja de cuando
    // la forma era otra tiene que caerse aquí y no en la pantalla.
    const traduccion = validarTraduccion(fila.contenido, idioma);
    if (traduccion) salida.set(fila.bloque_clave, traduccion);
  }

  return salida;
}

/**
 * Los bloques listos para pintar, en el idioma en el que se está leyendo.
 *
 * Es lo que llaman las páginas. Une los dos pasos —traer lo traducido y
 * aplicarlo— porque separados invitan a hacer solo el primero, y un
 * bloque traducido que nadie aplica se ve igual que uno sin traducir.
 *
 * `conTraduccion` devuelve el MISMO objeto cuando no hay nada que
 * aplicar, así que para un alumno que lee en el idioma en el que están
 * escritos sus bloques esto no copia ni un array.
 */
export async function bloquesEnIdioma(
  bloques: Bloque[],
  idioma: IdiomaBloque
): Promise<Bloque[]> {
  if (bloques.length === 0) return bloques;

  const traducciones = await leerTraducciones(
    bloques.map((bloque) => bloque.id),
    idioma
  );
  if (traducciones.size === 0) return bloques;

  return bloques.map((bloque) =>
    conTraduccion(bloque, traducciones.get(bloque.id) ?? null, idioma)
  );
}

/**
 * COPIA LA TRADUCCIÓN DE UN BLOQUE A OTRO. Sin modelo y sin coste.
 *
 * Existe por el banco de reserva. Cuando la generación no sale, se
 * sirve uno de los seis bloques escritos a mano de `lib/banco.ts`, y
 * `conIdPropio` le pone un id nuevo para que cada alumno tenga el suyo
 * en `bloques_generados`. Ese renombrado es correcto —son filas
 * distintas de alumnos distintos— pero deja la traducción del banco sin
 * poder encontrarse: está guardada bajo `banco-c1-hedging` y el bloque
 * que se pinta se llama `gen-mtu38ybgxztb`.
 *
 * Sin esto, cada vez que el banco entra hay que volver a pedirle al
 * modelo la traducción de un texto que ya está traducido. Con esto, se
 * traduce una vez por bloque del banco —lo hace
 * `scripts/traducir-bloques.ts`— y cada copia cuesta una lectura y una
 * escritura.
 *
 * Devuelve cuántas copió. Cero no es un fallo: es que el original
 * todavía no estaba traducido, y entonces el visor la pedirá al abrirse
 * como hacía antes.
 */
export async function copiarTraducciones(desde: string, hasta: string): Promise<number> {
  const { data, error } = await baseLms()
    .from("traducciones_bloque")
    .select("bloque_clave, idioma, contenido")
    .eq("bloque_clave", desde)
    .returns<FilaTraduccion[]>();

  if (!registrar("No se pudieron leer las traducciones a copiar", error)) return 0;

  const filas = (data ?? [])
    .map((fila) => ({ idioma: fila.idioma, contenido: fila.contenido }))
    .filter((fila) => fila.idioma === "en" || fila.idioma === "es");

  if (filas.length === 0) return 0;

  const { error: fallo } = await baseLms()
    .from("traducciones_bloque")
    .upsert(
      filas.map((fila) => ({
        bloque_clave: hasta,
        idioma: fila.idioma,
        contenido: fila.contenido,
        modelo: MODELO_COPIA,
      })),
      { onConflict: "bloque_clave,idioma", ignoreDuplicates: true }
    );

  return registrar("No se pudieron copiar las traducciones", fallo) ? filas.length : 0;
}

/**
 * Lo que se apunta en `modelo` al copiar.
 *
 * No se hereda el del original a propósito: así una consulta a la tabla
 * distingue lo que se le pidió al modelo de lo que se duplicó, y el día
 * que haya que rehacer traducciones por un cambio de prompt, las copias
 * se ven y se rehacen con su origen.
 */
const MODELO_COPIA = "copia";

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
