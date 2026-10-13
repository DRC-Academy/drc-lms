// ---------------------------------------------------------------
// LAS ENTRADAS A CLASE, EN LA BASE DEL LMS
//
// Escribe el clic de `/clase/entrar` y lee el mes para el panel. La
// tabla es `entradas_clase` (`supabase/lms-entradas-clase.sql`): un clic
// por fila, en crudo. Lo que se cuenta y cómo, en `lib/entradas-clase.ts`.
//
// Nada de esto toca Gestión: el clic ocurre en el LMS y se queda aquí.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { alumnosDelPanel, type AlumnoPanel } from "@/lib/gestion";
import { esIdDemo } from "@/lib/demo/cuenta";
import { CUENTA_DE_PRUEBAS } from "@/lib/admin-servidor";
import { instanteEnMadrid } from "@/lib/clases";
import { limitesDelMes, type FilaEntrada, type Origen } from "@/lib/entradas-clase";

/**
 * Lo que espera el alumno, como mucho, a que se apunte su clic. Pasado
 * esto se le manda a la sala igual y el clic se pierde: entrar a clase
 * importa más que contarlo.
 */
const MS_REGISTRO = 1500;

export type NuevaEntrada = {
  alumno_id: string;
  clase_id: string | null;
  clase_inicio: string | null;
  profesor: string | null;
  profesor_id: string | null;
  origen: Origen;
  minutos_desde_inicio: number | null;
};

/**
 * Apunta un clic. NUNCA LANZA: un fallo se registra en el log y la ruta
 * redirige como si nada.
 */
export async function registrarEntrada(fila: NuevaEntrada): Promise<void> {
  try {
    const { error } = await baseLms()
      .from("entradas_clase")
      .insert(fila)
      .abortSignal(AbortSignal.timeout(MS_REGISTRO));
    if (error) console.error("[entradas] No se pudo apuntar la entrada:", error.message);
  } catch (error) {
    console.error("[entradas] No se pudo apuntar la entrada:", (error as Error).message);
  }
}

/** Las columnas que se leen: las de `FilaEntrada`. */
const COLUMNAS = "alumno_id, clase_id, clase_inicio, profesor, clicked_at, origen, minutos_desde_inicio";

/**
 * Todos los clics del mes, por páginas: PostgREST corta en 1000 filas sin
 * avisar. El mes se cuenta en hora de España. Null si falla una lectura:
 * mejor decir que no se pudo leer que enseñar un mes a medias.
 */
async function entradasDelMes(mes: string): Promise<FilaEntrada[] | null> {
  const { desde, hasta } = limitesDelMes(mes);
  const inicio = instanteEnMadrid(desde, "00:00").toISOString();
  const fin = instanteEnMadrid(hasta, "00:00").toISOString();
  const PAGINA = 1000;
  const filas: FilaEntrada[] = [];

  for (let n = 0; ; n += PAGINA) {
    const { data, error } = await baseLms()
      .from("entradas_clase")
      .select(COLUMNAS)
      .gte("clicked_at", inicio)
      .lt("clicked_at", fin)
      .order("id", { ascending: true })
      .range(n, n + PAGINA - 1)
      .returns<FilaEntrada[]>();

    if (error) {
      console.error("[entradas] No se pudo leer el mes:", error.message);
      return null;
    }
    filas.push(...(data ?? []));
    if ((data ?? []).length < PAGINA) return filas;
  }
}

/** El primer clic que hay guardado: desde cuándo hay datos. */
async function primeraEntrada(): Promise<string | null> {
  const { data, error } = await baseLms()
    .from("entradas_clase")
    .select("clicked_at")
    .order("clicked_at", { ascending: true })
    .limit(1)
    .returns<{ clicked_at: string }[]>();

  if (error) {
    console.error("[entradas] No se pudo leer la primera entrada:", error.message);
    return null;
  }
  return data?.[0]?.clicked_at ?? null;
}

/** La cuenta de pruebas y la demo no son alumnos: no salen en el resumen. */
export function esCuentaDeEquipo(alumnoId: string): boolean {
  return alumnoId === CUENTA_DE_PRUEBAS || esIdDemo(alumnoId);
}

export type DatosEntradas = {
  /** Los alumnos de Gestión, sin la demo ni la cuenta de pruebas. */
  alumnos: AlumnoPanel[];
  /** Los clics del mes, de todos. Null si no se pudieron leer. */
  filas: FilaEntrada[] | null;
  /** ISO del primer clic guardado, o null si todavía no hay ninguno. */
  desde: string | null;
};

export async function cargarEntradas(mes: string): Promise<DatosEntradas> {
  const [alumnos, filas, desde] = await Promise.all([alumnosDelPanel(), entradasDelMes(mes), primeraEntrada()]);
  return { alumnos: alumnos.filter((a) => !esCuentaDeEquipo(a.alumnoId)), filas, desde };
}

/**
 * Los clics de un alumno, de todos los meses. Para el detalle de la
 * garantía, donde salen APARTE y solo como dato de apoyo: no deciden
 * nada. Null si no se pudieron leer.
 */
export async function entradasDelAlumno(alumnoId: string): Promise<FilaEntrada[] | null> {
  const { data, error } = await baseLms()
    .from("entradas_clase")
    .select(COLUMNAS)
    .eq("alumno_id", alumnoId)
    .order("clicked_at", { ascending: false })
    .limit(500)
    .returns<FilaEntrada[]>();

  if (error) {
    console.error("[entradas] No se pudieron leer las entradas del alumno:", error.message);
    return null;
  }
  return data ?? [];
}
