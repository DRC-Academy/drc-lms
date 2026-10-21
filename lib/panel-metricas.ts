// ---------------------------------------------------------------
// LOS DATOS DEL PANEL DEL EQUIPO, POR RANGO DE FECHAS
//
// El panel responde, por orden de importancia:
//   1. ¿Quién entra a clase con el botón? Alumnos con alguna clase dada
//      en el rango que abrieron al menos una con «Ingresar a clase», y
//      clases dadas abiertas así. Con la lista de alumnos.
//   2. Accesos a la plataforma.
//   3. Quién, con plan activo hoy, no ha accedido nunca.
//   4. Dos indicadores pequeños: practicaron, y práctica con IA o banco.
// Y un gráfico semana a semana de 1 y de 2. Todo comparado con el periodo
// anterior de la misma duración, salvo 3, que no depende de fechas.
//
// DE DÓNDE SALE CADA COSA
//   · LMS, con las funciones de `supabase/panel-metricas.sql`: accesos,
//     practicaron y bloques (`panel_cifras`), quién nunca accedió
//     (`panel_nunca_accedieron`) y desde cuándo hay datos. Los alumnos
//     ÚNICOS se cuentan allí, nunca aquí.
//   · Gestión, solo vistas y con el cliente de solo lectura: las fichas
//     (nombre, profesor, alta, plan activo hoy) y los partes de clase.
//   · Las entradas a clase se cruzan con los partes aquí (`medirClase`),
//     porque viven en bases distintas.
//   · Quién no cuenta lo decide la base del LMS (`metricas_excluido`), y
//     las listas que vienen de Gestión pasan por `metricas_quitar_excluidos`.
//     No hay ninguna regla de exclusión en este archivo.
//
// Ninguna cifra depende del plan que tenía cada alumno en el periodo:
// Gestión no guarda cuándo terminó cada plan. Solo «nunca accedieron»
// usa el plan, y es el de HOY.
//
// LO QUE NO SE PUDO LEER va a null y su nombre a `fallos`. Un null se
// pinta como «no se ha podido leer», nunca como un cero.
//
// Se cachea cinco minutos por rango. Lo que sale con fallos no se guarda.
// ---------------------------------------------------------------

import "server-only";
import { unstable_cache } from "next/cache";
import { baseLms } from "@/lib/supabase-lms";
import { alumnosDeProfesor, alumnosParaMetricas, partesDeClase } from "@/lib/gestion";
import { entradasConClaseEntre } from "@/lib/entradas-clase-servidor";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { rangoAnterior, rangoGrafico, type Rango } from "@/lib/panel-rango";
import { disponibilidad, medirClase, recortar, semanasDelRango, type Disponibilidad, type Periodo, type ResumenClase } from "@/lib/panel-calculos";

/** El profesor de prueba de Gestión: sus alumnos son cuentas del equipo. */
export const PROFESOR_DE_PRUEBA = "t1";

// ---------------------------------------------------------------
// LO QUE DEVUELVE
// ---------------------------------------------------------------

/** El periodo actual y el anterior de la misma duración. */
export type Comparado<T> = { actual: T; anterior: T };

/** Una fila de `panel_cifras`, en camelCase. */
export type Cifras = {
  periodo: string;
  periodoDesde: string;
  periodoHasta: string;
  /** Visitas totales y alumnos únicos con alguna. Desde el 20 oct 2026. */
  accesos: number;
  accesosAlumnos: number;
  /** Alumnos únicos con lección, intento de ejercicio de lección o bloque generado. */
  practicaron: number;
  bloques: number;
  bloquesIa: number;
  bloquesBanco: number;
};

/** Una fila de la lista del bloque «Entrar a clase». */
export type FilaClase = {
  alumnoId: string;
  /** Vacío si el alumno no tiene ficha en Gestión. */
  nombre: string;
  profesor: string;
  clases: number;
  conEntrada: number;
  /** La última clase abierta con el botón en el rango, "AAAA-MM-DDTHH:MM". */
  ultima: string | null;
};

export type FilaNunca = { alumnoId: string; nombre: string; profesor: string; fechaInicio: string | null };

export type Fuente = "entradasClase" | "accesos";

export type MetricasPanel = {
  rango: Rango;
  anterior: Rango;
  calculadoEn: string;
  /** El primer día con datos de cada fuente, o null si aún no hay. Null entero si no se pudo leer. */
  inicioDatos: Record<Fuente, string | null> | null;
  disponibilidad: Record<Fuente, Comparado<Disponibilidad>> | null;
  /** Entrar a clase. Null dentro: ese periodo cae entero antes del 13 oct. */
  clase: Comparado<ResumenClase | null> | null;
  /** La lista del bloque 1: una fila por alumno con clase dada en el rango. */
  listaClase: FilaClase[] | null;
  cifras: Comparado<Cifras> | null;
  /** Las semanas del gráfico (`rangoGrafico`). */
  semanas: Periodo[];
  /** Por semana del gráfico. Null dentro: esa semana no tiene datos. */
  grafico: { clase: (ResumenClase | null)[]; accesos: (number | null)[] } | null;
  /** Con plan activo hoy y sin ningún inicio de sesión ni acceso, nunca. */
  nunca: { conPlan: number; alumnos: FilaNunca[] } | null;
  /** Para el pie: cuántas cuentas se excluyen y cuáles del profesor de prueba no. */
  exclusiones: { cuentas: number; sinExcluir: { alumnoId: string; nombre: string }[] | null } | null;
  /** Lo que no se pudo leer. Vacío = todo bien. */
  fallos: string[];
};

// ---------------------------------------------------------------
// LECTURAS
// ---------------------------------------------------------------

/** Llama a una función del LMS. Null si falla. */
async function rpc<T>(nombre: string, parametros: Record<string, unknown>): Promise<T[] | null> {
  const { data, error } = await baseLms().rpc(nombre, parametros);
  if (error) {
    console.error(`[panel] ${nombre}:`, error.message);
    return null;
  }
  return (data ?? []) as T[];
}

const aCamel = (clave: string) => clave.replace(/_([a-z])/g, (_, letra: string) => letra.toUpperCase());

/** Una fila de la base con las claves en camelCase y los números como números. */
function aCifras(fila: Record<string, unknown>): Cifras {
  const salida: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(fila)) {
    salida[aCamel(clave)] = clave.startsWith("periodo") ? valor : Number(valor);
  }
  return salida as Cifras;
}

async function cifras(rango: Rango, granularidad: "semana" | "total"): Promise<Cifras[] | null> {
  const filas = await rpc<Record<string, unknown>>("panel_cifras", { p_desde: rango.desde, p_hasta: rango.hasta, p_granularidad: granularidad });
  return filas ? filas.map(aCifras) : null;
}

/** Fuente → primer día con datos (Madrid), o null si aún no hay. */
async function inicioDeDatos(): Promise<Record<Fuente, string | null> | null> {
  const filas = await rpc<{ fuente: string; desde: string | null }>("panel_inicio_datos", {});
  if (!filas) return null;
  const dia = (fuente: string) => {
    const desde = filas.find((f) => f.fuente === fuente)?.desde;
    return desde ? diaLocal(new Date(desde)) : null;
  };
  return { entradasClase: dia("entradas_clase"), accesos: dia("accesos") };
}

async function quitarExcluidos(ids: string[]): Promise<Set<string> | null> {
  const filas = await rpc<string>("metricas_quitar_excluidos", { p_alumnos: ids });
  return filas ? new Set(filas) : null;
}

/** La función devuelve un `text[]`: PostgREST lo da como un array. */
async function nuncaAccedieron(ids: string[]): Promise<Set<string> | null> {
  const filas = await rpc<string>("panel_nunca_accedieron", { p_alumnos: ids });
  return filas ? new Set(filas) : null;
}

async function cuantasExcluidas(): Promise<number | null> {
  const { count, error } = await baseLms().from("metricas_excluidos").select("alumno_id", { count: "exact", head: true });
  if (error) {
    console.error("[panel] metricas_excluidos:", error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * Partes de Gestión y clics del LMS de los días con datos de todos los
 * trozos, en una lectura. Sin recortar exclusiones todavía.
 */
async function leerClases(trozos: Rango[]) {
  if (trozos.length === 0) return { partes: [], entradas: [] };
  const desde = trozos.reduce((m, t) => (t.desde < m ? t.desde : m), trozos[0].desde);
  const hasta = sumarDias(trozos.reduce((m, t) => (t.hasta > m ? t.hasta : m), trozos[0].hasta), 1);
  const [partes, entradas] = await Promise.all([partesDeClase(undefined, { desde, hasta }), entradasConClaseEntre(desde, hasta)]);
  return partes && entradas ? { partes, entradas } : null;
}

// ---------------------------------------------------------------
// EL CÁLCULO
// ---------------------------------------------------------------

async function calcular(rango: Rango): Promise<MetricasPanel> {
  const anterior = rangoAnterior(rango);
  const grafico = rangoGrafico(rango);
  const semanas = semanasDelRango(grafico);
  const fallos: string[] = [];
  const anotar = <T>(nombre: string, valor: T | null): T | null => {
    if (valor === null) fallos.push(nombre);
    return valor;
  };

  // --- Primera tanda: todo lo que no depende de nada ---
  const inicioP = inicioDeDatos();
  // Los partes, solo desde el primer clic: antes no hay nada que cruzar.
  const clasesP = inicioP.then((inicio) =>
    inicio
      ? leerClases([anterior, rango, grafico].map((r) => recortar(r, inicio.entradasClase)).filter((t): t is Rango => t !== null))
      : null
  );

  const [inicio, lecturaClases, fichas, totAct, totAnt, serie, delT1, excluidas] = await Promise.all([
    inicioP,
    clasesP,
    alumnosParaMetricas(),
    cifras(rango, "total"),
    cifras(anterior, "total"),
    cifras(grafico, "semana"),
    alumnosDeProfesor(PROFESOR_DE_PRUEBA),
    cuantasExcluidas(),
  ]);

  // --- Quién cuenta, de lo que viene de Gestión: una sola pregunta a la base ---
  const idsDeFuera = new Set<string>();
  for (const f of fichas ?? []) idsDeFuera.add(f.alumnoId);
  for (const p of lecturaClases?.partes ?? []) idsDeFuera.add(p.alumnoId);
  for (const e of lecturaClases?.entradas ?? []) idsDeFuera.add(e.alumno_id);
  for (const a of delT1 ?? []) idsDeFuera.add(a.alumnoId);
  const cuentan = idsDeFuera.size > 0 ? await quitarExcluidos(Array.from(idsDeFuera)) : new Set<string>();

  const fichasQueCuentan = fichas && cuentan ? fichas.filter((f) => cuentan.has(f.alumnoId)) : null;
  const conPlan = fichasQueCuentan ? fichasQueCuentan.filter((f) => f.activo) : null;
  const sinAcceso = conPlan ? await nuncaAccedieron(conPlan.map((f) => f.alumnoId)) : null;

  // --- Entrar a clase ---
  let clase: Comparado<ResumenClase | null> | null = null;
  let claseGrafico: (ResumenClase | null)[] | null = null;
  if (inicio && lecturaClases && cuentan) {
    const partes = lecturaClases.partes.filter((p) => cuentan.has(p.alumnoId));
    const entradas = lecturaClases.entradas.filter((e) => cuentan.has(e.alumno_id));
    const medir = (r: Rango) => {
      const trozo = recortar(r, inicio.entradasClase);
      return trozo ? medirClase(partes, entradas, trozo) : null;
    };
    clase = { actual: medir(rango), anterior: medir(anterior) };
    claseGrafico = semanas.map((s) => medir({ desde: s.desde, hasta: s.hasta }));
  }

  const ficha = new Map((fichas ?? []).map((f) => [f.alumnoId, f]));
  const listaClase: FilaClase[] | null =
    clase && fichas
      ? Object.entries(clase.actual?.porAlumno ?? {}).map(([alumnoId, c]) => ({
          alumnoId,
          nombre: ficha.get(alumnoId)?.nombre ?? "",
          profesor: ficha.get(alumnoId)?.profesor ?? "",
          clases: c.clases,
          conEntrada: c.conEntrada,
          ultima: c.ultima,
        }))
      : null;

  // --- Accesos en el gráfico: null en las semanas sin datos ---
  const accesosGrafico =
    serie && inicio
      ? semanas.map((s) => {
          if (inicio.accesos === null || inicio.accesos > s.hasta) return null;
          return serie.find((f) => f.periodo === s.periodo)?.accesos ?? 0;
        })
      : null;

  const ambos = <T>(nombre: string, actual: T | null, previo: T | null): Comparado<T> | null =>
    anotar(nombre, actual !== null && previo !== null ? { actual, anterior: previo } : null);

  return {
    rango,
    anterior,
    calculadoEn: new Date().toISOString(),
    inicioDatos: anotar("inicio de los datos", inicio),
    disponibilidad: inicio
      ? {
          entradasClase: { actual: disponibilidad(inicio.entradasClase, rango), anterior: disponibilidad(inicio.entradasClase, anterior) },
          accesos: { actual: disponibilidad(inicio.accesos, rango), anterior: disponibilidad(inicio.accesos, anterior) },
        }
      : null,
    clase: anotar("clases con entrada", clase),
    listaClase: anotar("lista de alumnos con clase", listaClase),
    cifras: ambos("accesos y práctica", totAct?.[0] ?? null, totAnt?.[0] ?? null),
    semanas,
    grafico: anotar("gráfico", claseGrafico && accesosGrafico ? { clase: claseGrafico, accesos: accesosGrafico } : null),
    nunca: anotar(
      "nunca accedieron",
      conPlan && sinAcceso
        ? {
            conPlan: conPlan.length,
            alumnos: conPlan
              .filter((f) => sinAcceso.has(f.alumnoId))
              .map((f) => ({ alumnoId: f.alumnoId, nombre: f.nombre, profesor: f.profesor, fechaInicio: f.fechaInicio })),
          }
        : null
    ),
    // Sin `profesor_id` en Gestión no se sabe quién es de t1: se dice,
    // pero no cuenta como fallo del panel.
    exclusiones: anotar(
      "cuentas excluidas",
      excluidas !== null ? { cuentas: excluidas, sinExcluir: delT1 && cuentan ? delT1.filter((a) => cuentan.has(a.alumnoId)) : null } : null
    ),
    fallos,
  };
}

/** Lo que salió con fallos: se devuelve, pero no se guarda en la caché. */
class Incompleto extends Error {
  constructor(readonly datos: MetricasPanel) {
    super("panel incompleto");
  }
}

/**
 * Las métricas de un rango, cacheadas cinco minutos. La clave lleva el
 * rango: cada uno se guarda por separado y cambiar de fechas no tira el
 * anterior.
 */
export async function cargarMetricas(rango: Rango): Promise<MetricasPanel> {
  try {
    return await unstable_cache(
      async () => {
        const datos = await calcular(rango);
        if (datos.fallos.length > 0) throw new Incompleto(datos);
        return datos;
      },
      ["panel-metricas", rango.desde, rango.hasta],
      { revalidate: 300, tags: ["panel-admin"] }
    )();
  } catch (error) {
    if (error instanceof Incompleto) return error.datos;
    throw error;
  }
}

/** Sin caché: para scripts y pruebas. */
export const calcularMetricas = calcular;

// ---------------------------------------------------------------
// LA LISTA DE EXCLUSIONES (/exclusiones)
// ---------------------------------------------------------------

export type CuentaExcluida = { alumnoId: string; nombre: string | null; motivo: string; desde: string | null };

export type Exclusiones = {
  cuentas: CuentaExcluida[] | null;
  /** Del profesor de prueba y sin excluir. Null: no se pudo comprobar. */
  sinExcluir: { alumnoId: string; nombre: string }[] | null;
};

/** Sin caché: la página se mira poco y tiene que reflejar un alta recién hecha. */
export async function cargarExclusiones(): Promise<Exclusiones> {
  const [lista, fichas, delT1] = await Promise.all([
    baseLms()
      .from("metricas_excluidos")
      .select("alumno_id, motivo, creado_en")
      .order("creado_en", { ascending: true })
      .returns<{ alumno_id: string; motivo: string; creado_en: string | null }[]>(),
    alumnosParaMetricas(),
    alumnosDeProfesor(PROFESOR_DE_PRUEBA),
  ]);
  if (lista.error) console.error("[panel] metricas_excluidos:", lista.error.message);
  const nombre = new Map((fichas ?? []).map((f) => [f.alumnoId, f.nombre]));
  const cuentas = lista.error
    ? null
    : (lista.data ?? []).map((f) => ({ alumnoId: f.alumno_id, nombre: nombre.get(f.alumno_id) ?? null, motivo: f.motivo, desde: f.creado_en }));
  const cuentan = delT1 && delT1.length > 0 ? await quitarExcluidos(delT1.map((a) => a.alumnoId)) : new Set<string>();
  return { cuentas, sinExcluir: delT1 && cuentan ? delT1.filter((a) => cuentan.has(a.alumnoId)) : null };
}
