// ---------------------------------------------------------------
// LA CACHÉ CORTA DE LO QUE SE LEE DE GESTIÓN
//
// Antes cada visita, cada flecha de semana y cada refresco iban a
// Gestión en directo: los dos clientes piden `no-store` y `cache()` de
// React solo deduplica dentro de una misma petición. Esto guarda lo
// leído unos segundos en la caché de datos de Next, compartida entre
// peticiones e instancias:
//
//   SEGUNDOS_ALUMNO      perfil, calendario, excepciones, el estado del
//                        autoservicio y las recuperaciones: 90 s.
//   SEGUNDOS_CLASES      lo que solo cambia al analizarse una clase
//                        (recorrido, clases contadas…): 120 s.
//   SEGUNDOS_PROFESORES  `vista_profesores`, igual para todos: 10 min.
//
// TODO LO DE UN ALUMNO LLEVA SU ETIQUETA (`etiquetaAlumno`), y lo que el
// LMS cambia en Gestión —un cambio de horario, una recuperación— la tira
// con `olvidarLecturasDe` antes de que la pantalla se vuelva a pedir.
//
// LO QUE FALLA NO SE GUARDA. Dentro de la caché, una lectura fallida
// lanza (`fallo`), y un resultado que vale para esta vez pero no para
// guardarlo —un error de Gestión, por ejemplo— lanza `NoSeGuarda` con su
// valor; `conCache` devuelve la reserva o ese valor, fuera. Si falla al
// renovar una entrada vieja, Next sigue sirviendo la vieja.
// ---------------------------------------------------------------

import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";

export const SEGUNDOS_ALUMNO = 90;
export const SEGUNDOS_CLASES = 120;
export const SEGUNDOS_PROFESORES = 600;

/** La etiqueta de todas las lecturas cacheadas de un alumno. */
export function etiquetaAlumno(alumnoId: string): string {
  return `gestion-alumno:${alumnoId}`;
}

/**
 * Tira la caché de un alumno: lo siguiente que se lea de él irá a
 * Gestión. Solo desde acciones de servidor y rutas, que es donde
 * `revalidateTag` existe.
 */
export function olvidarLecturasDe(alumnoId: string): void {
  try {
    revalidateTag(etiquetaAlumno(alumnoId));
  } catch (error) {
    // Fuera de Next (scripts, pruebas) no hay caché que tirar.
    console.error("[cache-gestion] No se pudo tirar la caché del alumno:", (error as Error).message);
  }
}

/** Una lectura que falló: no se guarda y se devuelve la reserva. */
export class LecturaFallida extends Error {}

/** Un resultado que se devuelve esta vez pero no se guarda. */
export class NoSeGuarda<T> extends Error {
  constructor(readonly valor: T) {
    super("no se guarda");
  }
}

/** Apunta el fallo y lanza para que la caché no lo guarde. */
export function fallo(donde: string, error: { message: string }): never {
  console.error(`[gestion] ${donde}:`, error.message);
  throw new LecturaFallida(donde);
}

/**
 * `leer` con caché entre peticiones, o `reserva` si falla.
 *
 * Fuera de Next —los scripts y las pruebas— `unstable_cache` no tiene
 * dónde guardar y lanza; ahí se lee directamente.
 */
export async function conCache<T>(
  clave: string[],
  segundos: number,
  etiquetas: string[],
  leer: () => Promise<T>,
  reserva: T
): Promise<T> {
  try {
    try {
      return await unstable_cache(leer, ["gestion", ...clave], { revalidate: segundos, tags: etiquetas })();
    } catch (error) {
      if (error instanceof Error && error.message.includes("incrementalCache missing")) return await leer();
      throw error;
    }
  } catch (error) {
    if (error instanceof NoSeGuarda) return error.valor as T;
    if (!(error instanceof LecturaFallida)) console.error(`[gestion] Falló la lectura ${clave.join(" ")}:`, error);
    return reserva;
  }
}
