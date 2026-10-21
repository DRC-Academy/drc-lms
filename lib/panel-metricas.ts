// ---------------------------------------------------------------
// LOS DATOS DEL PANEL DEL EQUIPO, POR RANGO DE FECHAS
//
// El panel responde tres preguntas, y nada más:
//   1. ¿A cuántas clases se entró con el botón «Ingresar a clase»? De
//      las clases dadas en el rango, las abiertas así.
//   2. ¿Cuántos alumnos usan el botón? De los alumnos con alguna clase
//      dada en el rango, los que abrieron al menos una con él. Con la
//      lista de alumnos.
//   3. ¿Cuántos alumnos generan práctica con IA en «Para ti»?
// Cada una con el periodo anterior de la misma duración y semana a
// semana (las 12 semanas que acaban en la del final del rango).
//
// DE DÓNDE SALE CADA COSA
//   · 1 y 2: los partes de clase de Gestión (solo vistas, cliente de solo
//     lectura) cruzados aquí con `entradas_clase` del LMS (`medirClase`),
//     porque viven en bases distintas.
//   · 3: la base del LMS, `panel_para_ti` (`supabase/panel-para-ti.sql`).
//     Los alumnos ÚNICOS se cuentan allí, nunca aquí.
//   · Desde cuándo hay datos de cada cosa: `panel_inicio_datos`.
//   · Quién no cuenta lo decide la base del LMS (`metricas_excluido`), y
//     las listas que vienen de Gestión pasan por `metricas_quitar_excluidos`.
//     No hay ninguna regla de exclusión en este archivo.
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

/** Una fila de la lista de alumnos con clase. */
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

/** IA en «Para ti»: alumnos únicos y bloques. */
export type ParaTi = { alumnos: number; bloques: number };

export type Fuente = "entradasClase" | "paraTi";

export type MetricasPanel = {
  rango: Rango;
  anterior: Rango;
  calculadoEn: string;
  /** El primer día con datos de cada fuente, o null si aún no hay. Null entero si no se pudo leer. */
  inicioDatos: Record<Fuente, string | null> | null;
  disponibilidad: Record<Fuente, Comparado<Disponibilidad>> | null;
  /** 1 y 2. Null dentro: ese periodo cae entero antes del primer clic (13 oct). */
  clase: Comparado<ResumenClase | null> | null;
  /** La lista de 2: una fila por alumno con clase dada en el rango. */
  listaClase: FilaClase[] | null;
  /** 3. */
  paraTi: Comparado<ParaTi> | null;
  /** Las semanas de los gráficos (`rangoGrafico`). */
  semanas: Periodo[];
  /** Por semana. Null dentro: esa semana no tiene datos. */
  grafico: { clase: (ResumenClase | null)[]; paraTi: (ParaTi | null)[] } | null;
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

type FilaParaTi = { periodo: string; alumnos: number; bloques: number };

async function paraTi(rango: Rango, granularidad: "semana" | "total"): Promise<FilaParaTi[] | null> {
  const filas = await rpc<FilaParaTi>("panel_para_ti", { p_desde: rango.desde, p_hasta: rango.hasta, p_granularidad: granularidad });
  return filas ? filas.map((f) => ({ periodo: f.periodo, alumnos: Number(f.alumnos), bloques: Number(f.bloques) })) : null;
}

/** Fuente → primer día con datos (Madrid), o null si aún no hay. */
async function inicioDeDatos(): Promise<Record<Fuente, string | null> | null> {
  const filas = await rpc<{ fuente: string; desde: string | null }>("panel_inicio_datos", {});
  if (!filas) return null;
  const dia = (fuente: string) => {
    const desde = filas.find((f) => f.fuente === fuente)?.desde;
    return desde ? diaLocal(new Date(desde)) : null;
  };
  return { entradasClase: dia("entradas_clase"), paraTi: dia("para_ti") };
}

async function quitarExcluidos(ids: string[]): Promise<Set<string> | null> {
  const filas = await rpc<string>("metricas_quitar_excluidos", { p_alumnos: ids });
  return filas ? new Set(filas) : null;
}

async function cuantasExcluidas(): Promise<number | null> {
  const { count, error } = await baseLms().from("metricas_excluidos").select("alumno_id", { count: "exact", head: true });
  if (error) {
    console.error("[panel] metricas_excluidos:", error.message);
    return null;
  }
  // Sin recuento no se sabe: nunca un cero en su lugar.
  return count ?? null;
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

  const [inicio, lecturaClases, fichas, ptAct, ptAnt, ptSemanas, delT1, excluidas] = await Promise.all([
    inicioP,
    clasesP,
    alumnosParaMetricas(),
    paraTi(rango, "total"),
    paraTi(anterior, "total"),
    paraTi(grafico, "semana"),
    alumnosDeProfesor(PROFESOR_DE_PRUEBA),
    cuantasExcluidas(),
  ]);

  // --- Quién cuenta, de lo que viene de Gestión: una sola pregunta a la base ---
  const idsDeFuera = new Set<string>();
  for (const p of lecturaClases?.partes ?? []) idsDeFuera.add(p.alumnoId);
  for (const e of lecturaClases?.entradas ?? []) idsDeFuera.add(e.alumno_id);
  for (const a of delT1 ?? []) idsDeFuera.add(a.alumnoId);
  const cuentan = idsDeFuera.size > 0 ? await quitarExcluidos(Array.from(idsDeFuera)) : new Set<string>();

  // --- 1 y 2: las clases con entrada por el botón ---
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

  // --- 3, semana a semana: la base da una fila por semana, también las
  // vacías. Si falta alguna, el gráfico cuenta como no leído: no se
  // rellena con ceros. Antes del primer bloque con pantalla, null. ---
  const porSemana = ptSemanas ? new Map(ptSemanas.map((f) => [f.periodo, f])) : null;
  const paraTiGrafico =
    porSemana && inicio && semanas.every((s) => porSemana.has(s.periodo))
      ? semanas.map((s) => {
          if (inicio.paraTi === null || inicio.paraTi > s.hasta) return null;
          const f = porSemana.get(s.periodo) as FilaParaTi;
          return { alumnos: f.alumnos, bloques: f.bloques };
        })
      : null;

  const una = (filas: FilaParaTi[] | null): ParaTi | null => (filas && filas[0] ? { alumnos: filas[0].alumnos, bloques: filas[0].bloques } : null);
  const ptA = una(ptAct);
  const ptB = una(ptAnt);

  return {
    rango,
    anterior,
    calculadoEn: new Date().toISOString(),
    inicioDatos: anotar("inicio de los datos", inicio),
    disponibilidad: inicio
      ? {
          entradasClase: { actual: disponibilidad(inicio.entradasClase, rango), anterior: disponibilidad(inicio.entradasClase, anterior) },
          paraTi: { actual: disponibilidad(inicio.paraTi, rango), anterior: disponibilidad(inicio.paraTi, anterior) },
        }
      : null,
    clase: anotar("clases con entrada", clase),
    listaClase: anotar("lista de alumnos con clase", listaClase),
    paraTi: anotar("IA en «Para ti»", ptA && ptB ? { actual: ptA, anterior: ptB } : null),
    semanas,
    grafico: anotar("gráficos", claseGrafico && paraTiGrafico ? { clase: claseGrafico, paraTi: paraTiGrafico } : null),
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
