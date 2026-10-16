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
import { unstable_cache } from "next/cache";
import { baseLms } from "@/lib/supabase-lms";
import { alumnosDelPanel, partesDeClase, type AlumnoPanel } from "@/lib/gestion";
import { esIdDemo } from "@/lib/demo/cuenta";
import { CUENTA_DE_PRUEBAS, type Periodo } from "@/lib/admin-servidor";
import { instanteEnMadrid } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { limitesDelMes, medirBoton, type FilaEntrada, type MedidaBoton, type Origen } from "@/lib/entradas-clase";

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

/**
 * El primer clic que hay guardado: desde cuándo hay datos. `undefined`
 * si no se pudo leer; null si todavía no hay ninguno.
 */
async function primeraEntrada(): Promise<string | null | undefined> {
  const { data, error } = await baseLms()
    .from("entradas_clase")
    .select("clicked_at")
    .order("clicked_at", { ascending: true })
    .limit(1)
    .returns<{ clicked_at: string }[]>();

  if (error) {
    console.error("[entradas] No se pudo leer la primera entrada:", error.message);
    return undefined;
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
};

/** Desde cuándo hay datos lo dice `usoDelBoton`, que lo necesita para recortar el rango. */
export async function cargarEntradas(mes: string): Promise<DatosEntradas> {
  const [alumnos, filas] = await Promise.all([alumnosDelPanel(), entradasDelMes(mes)]);
  return { alumnos: alumnos.filter((a) => !esCuentaDeEquipo(a.alumnoId)), filas };
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

// ---------------------------------------------------------------
// EL PORCENTAJE DEL BOTÓN, PARA UN RANGO DE DÍAS
//
// La cuenta está en `medirBoton` (`lib/entradas-clase.ts`); esto lee lo
// que necesita y le pone el rango. Lo llaman el panel (7 / 30 días /
// todo) y «Entradas a clase» (un mes), cada uno con el suyo.
//
// EL RANGO NUNCA EMPIEZA ANTES DEL PRIMER CLIC: antes no se apuntaba
// nada, y contar esas clases como «sin entrada» hundiría el porcentaje
// por un hueco de la medición. Se recorta al día del primer clic y la
// pantalla lo dice («Datos desde el 13 oct»).
//
// Y NUNCA LLEGA MÁS ALLÁ DE HOY: algún parte se sube por adelantado.
// ---------------------------------------------------------------

/** Días "AAAA-MM-DD": `desde` incluido, `hasta` excluido. `desde` null: desde el principio. */
export type RangoDias = { desde: string | null; hasta: string };

export type UsoDelBoton =
  | {
      estado: "ok";
      /** Primer día contado. */
      desde: string;
      /** Último día contado, incluido. */
      hasta: string;
      /** El rango pedido empezaba antes que los datos y se ha recortado. */
      recortado: boolean;
      medida: MedidaBoton;
    }
  /** El rango cae entero antes del primer clic, o todavía no hay ninguno. */
  | { estado: "sin_datos"; primerDia: string | null }
  /** Falló alguna lectura: no son ceros. */
  | { estado: "error" };

/** Los clics cuya clase empieza en el rango, por páginas. Null si falla. */
async function entradasConClaseEntre(desde: string, hasta: string): Promise<FilaEntrada[] | null> {
  const inicio = instanteEnMadrid(desde, "00:00").toISOString();
  const fin = instanteEnMadrid(hasta, "00:00").toISOString();
  const PAGINA = 1000;
  const filas: FilaEntrada[] = [];

  for (let n = 0; ; n += PAGINA) {
    const { data, error } = await baseLms()
      .from("entradas_clase")
      .select(COLUMNAS)
      .gte("clase_inicio", inicio)
      .lt("clase_inicio", fin)
      .order("id", { ascending: true })
      .range(n, n + PAGINA - 1)
      .returns<FilaEntrada[]>();

    if (error) {
      console.error("[entradas] No se pudieron leer las entradas del rango:", error.message);
      return null;
    }
    filas.push(...(data ?? []));
    if ((data ?? []).length < PAGINA) return filas;
  }
}

/** La cuenta, sin caché. Para las pantallas, `usoDelBoton`. */
export async function medirUsoDelBoton(rango: RangoDias, ahora = new Date()): Promise<UsoDelBoton> {
  const primera = await primeraEntrada();
  if (primera === undefined) return { estado: "error" };
  if (primera === null) return { estado: "sin_datos", primerDia: null };

  const primerDia = diaLocal(new Date(primera));
  const manana = sumarDias(diaLocal(ahora), 1);
  const desde = rango.desde && rango.desde > primerDia ? rango.desde : primerDia;
  const hasta = rango.hasta < manana ? rango.hasta : manana;
  if (desde >= hasta) return { estado: "sin_datos", primerDia };

  const [partes, entradas] = await Promise.all([partesDeClase(undefined, { desde, hasta }), entradasConClaseEntre(desde, hasta)]);
  if (!partes || !entradas) return { estado: "error" };

  const medida = medirBoton(
    partes.filter((p) => !esCuentaDeEquipo(p.alumnoId)),
    entradas.filter((e) => !esCuentaDeEquipo(e.alumno_id))
  );
  return {
    estado: "ok",
    desde,
    hasta: sumarDias(hasta, -1),
    recortado: rango.desde === null || rango.desde < primerDia,
    medida,
  };
}

/**
 * La cuenta, cacheada cinco minutos como el panel: cada carga lee un mes
 * de partes de Gestión, y Gestión no está para lecturas de más. Lo que
 * falla no se guarda.
 */
export async function usoDelBoton(rango: RangoDias): Promise<UsoDelBoton> {
  try {
    return await unstable_cache(
      async () => {
        const uso = await medirUsoDelBoton(rango);
        if (uso.estado === "error") throw new Error("lectura fallida");
        return uso;
      },
      ["uso-boton-clase", rango.desde ?? "todo", rango.hasta],
      { revalidate: 300, tags: ["panel-admin"] }
    )();
  } catch {
    return { estado: "error" };
  }
}

/** El rango de un periodo del panel: los últimos N días naturales, hoy incluido. */
export function rangoDelPeriodo(periodo: Periodo, ahora = new Date()): RangoDias {
  const hoy = diaLocal(ahora);
  const hasta = sumarDias(hoy, 1);
  return periodo === "todo" ? { desde: null, hasta } : { desde: sumarDias(hoy, 1 - Number(periodo)), hasta };
}

/** El rango de un mes "2026-10". */
export function rangoDelMes(mes: string): RangoDias {
  return limitesDelMes(mes);
}
