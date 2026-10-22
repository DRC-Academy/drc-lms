// ---------------------------------------------------------------
// LOS DATOS DEL PANEL DEL EQUIPO, POR RANGO DE FECHAS
//
// El panel responde tres preguntas, y nada más:
//   1. ¿A cuántas clases se entró con el botón «Ingresar a clase»? De
//      las clases dadas en el rango, las abiertas así.
//   2. ¿Cuántos alumnos usan el botón? De los alumnos con alguna clase
//      dada en el rango, los que abrieron al menos una con él. Con la
//      lista de alumnos.
//   3. ¿Cuántos alumnos generan práctica con IA? Todos los bloques que
//      escribió la IA, se pidieran desde la pantalla que fuera.
// Cada una con el periodo anterior de la misma duración, semana a semana
// (las 12 semanas que acaban en la del final del rango) y mes a mes (los
// 6 meses que acaban en el de ese final).
//
// Y, aparte del selector, las dos comparaciones fijas: la semana y el mes
// en curso hasta ahora contra el mismo tramo de la semana y el mes
// anteriores, hasta la misma hora (`lib/panel-tramos.ts`).
//
// DE DÓNDE SALE CADA COSA
//   · 1 y 2: los partes de clase de Gestión (solo vistas, cliente de solo
//     lectura) cruzados aquí con `entradas_clase` del LMS (`medirClase`,
//     `medirClaseTramo`), porque viven en bases distintas. Cada semana,
//     mes o tramo se cruza entero: nada se suma.
//   · 3: la base del LMS, `panel_ia` (`supabase/panel-comparativas.sql`).
//     Los alumnos ÚNICOS de cada tramo, semana o mes se cuentan allí,
//     nunca aquí ni sumando semanas.
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
import {
  disponibilidad,
  medirClase,
  medirClaseTramo,
  recortar,
  recortarTramo,
  semanasDelRango,
  type CifrasClase,
  type Disponibilidad,
  type Periodo,
  type ResumenClase,
} from "@/lib/panel-calculos";
import {
  diasDelTramo,
  mesesDelGrafico,
  paredDe,
  tramoDeDias,
  tramosFijos,
  tramoVacio,
  type Comparacion,
  type Mes,
  type Tramo,
  type TramosFijos,
} from "@/lib/panel-tramos";

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

/** Práctica con IA: alumnos únicos y bloques. */
export type Ia = { alumnos: number; bloques: number };

export type Fuente = "entradasClase" | "ia";

/**
 * Una comparación fija. `actual` o `anterior` a null: ese tramo cae entero
 * antes de que hubiera datos (la disponibilidad dice cuál).
 */
export type Fija<T> = { actual: T | null; anterior: T | null; disponibilidad: Comparado<Disponibilidad> };

export type Fijas<T> = { semana: Fija<T>; mes: Fija<T> };

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
  ia: Comparado<Ia> | null;
  /** Hoy en Madrid cuando se calculó: qué semana o mes va «en curso». */
  hoy: string;
  /** La semana y el mes en curso contra el mismo tramo del anterior. */
  fijas: { tramos: TramosFijos; clase: Fijas<CifrasClase> | null; ia: Fijas<Ia> | null };
  /** Las semanas de los gráficos (`rangoGrafico`). */
  semanas: Periodo[];
  /** Los meses de los gráficos (`mesesDelGrafico`). */
  meses: Mes[];
  /** Por semana y por mes. Null dentro: ese periodo no tiene datos. */
  grafico: {
    clase: (ResumenClase | null)[];
    ia: (Ia | null)[];
    claseMeses: (CifrasClase | null)[];
    iaMeses: (Ia | null)[];
  } | null;
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

type FilaIa = { periodo: string; alumnos: number; bloques: number };

/**
 * Práctica con IA de un tramo, en una fila (`total`) o una por semana o
 * mes, también los vacíos. Un tramo sin ningún minuto (el lunes a las
 * 00:00) no se pregunta: la base lo rechaza, y es un cero de verdad.
 */
async function ia(tramo: Tramo, granularidad: "total" | "semana" | "mes"): Promise<FilaIa[] | null> {
  if (tramoVacio(tramo)) return granularidad === "total" ? [{ periodo: tramo.desde.slice(0, 10), alumnos: 0, bloques: 0 }] : [];
  const filas = await rpc<{ periodo: string; alumnos_ia: number; bloques_ia: number }>("panel_ia", {
    p_desde: tramo.desde,
    p_hasta: tramo.hasta,
    p_granularidad: granularidad,
  });
  return filas ? filas.map((f) => ({ periodo: f.periodo, alumnos: Number(f.alumnos_ia), bloques: Number(f.bloques_ia) })) : null;
}

/** Fuente → primer día con datos (Madrid), o null si aún no hay. */
async function inicioDeDatos(): Promise<Record<Fuente, string | null> | null> {
  const filas = await rpc<{ fuente: string; desde: string | null }>("panel_inicio_datos", {});
  if (!filas) return null;
  const dia = (fuente: string) => {
    const desde = filas.find((f) => f.fuente === fuente)?.desde;
    return desde ? diaLocal(new Date(desde)) : null;
  };
  return { entradasClase: dia("entradas_clase"), ia: dia("ia") };
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

/** La disponibilidad de los dos tramos de una comparación fija, por días. */
function dispTramos(inicio: string | null, c: Comparacion): Comparado<Disponibilidad> {
  return { actual: disponibilidad(inicio, diasDelTramo(c.actual)), anterior: disponibilidad(inicio, diasDelTramo(c.anterior)) };
}

async function calcular(rango: Rango): Promise<MetricasPanel> {
  const ahora = paredDe(new Date());
  const hoy = ahora.slice(0, 10);
  const anterior = rangoAnterior(rango);
  const grafico = rangoGrafico(rango);
  const semanas = semanasDelRango(grafico);
  const meses = mesesDelGrafico(rango.hasta, hoy);
  const deMeses: Rango = { desde: meses[0].desde, hasta: meses[meses.length - 1].hasta };
  const tramos = tramosFijos(ahora);
  const fijos: Tramo[] = [tramos.semana.actual, tramos.semana.anterior, tramos.mes.actual, tramos.mes.anterior];
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
      ? leerClases(
          [anterior, rango, grafico, deMeses, ...fijos.map(diasDelTramo)]
            .map((r) => recortar(r, inicio.entradasClase))
            .filter((t): t is Rango => t !== null)
        )
      : null
  );

  const [inicio, lecturaClases, fichas, iaAct, iaAnt, iaSemanas, iaMeses, iaFijos, delT1, excluidas] = await Promise.all([
    inicioP,
    clasesP,
    alumnosParaMetricas(),
    ia(tramoDeDias(rango), "total"),
    ia(tramoDeDias(anterior), "total"),
    ia(tramoDeDias(grafico), "semana"),
    ia(tramoDeDias(deMeses), "mes"),
    Promise.all(fijos.map((t) => ia(t, "total"))),
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
  let claseMeses: (CifrasClase | null)[] | null = null;
  let claseFijas: Fijas<CifrasClase> | null = null;
  if (inicio && lecturaClases && cuentan) {
    const partes = lecturaClases.partes.filter((p) => cuentan.has(p.alumnoId));
    const entradas = lecturaClases.entradas.filter((e) => cuentan.has(e.alumno_id));
    const medir = (r: Rango) => {
      const trozo = recortar(r, inicio.entradasClase);
      return trozo ? medirClase(partes, entradas, trozo) : null;
    };
    clase = { actual: medir(rango), anterior: medir(anterior) };
    claseGrafico = semanas.map((s) => medir({ desde: s.desde, hasta: s.hasta }));
    claseMeses = meses.map((s) => {
      const r = medir({ desde: s.desde, hasta: s.hasta });
      return r && { clases: r.clases, clasesConEntrada: r.clasesConEntrada, alumnos: r.alumnos, alumnosConEntrada: r.alumnosConEntrada };
    });
    // Un tramo vacío (el lunes a las 00:00) es un cero, no un «sin datos».
    const medirTramo = (t: Tramo): CifrasClase | null => {
      if (tramoVacio(t)) return { clases: 0, clasesConEntrada: 0, alumnos: 0, alumnosConEntrada: 0 };
      const trozo = recortarTramo(t, inicio.entradasClase);
      return trozo ? medirClaseTramo(partes, entradas, trozo) : null;
    };
    const fija = (c: Comparacion): Fija<CifrasClase> => ({
      actual: medirTramo(c.actual),
      anterior: medirTramo(c.anterior),
      disponibilidad: dispTramos(inicio.entradasClase, c),
    });
    claseFijas = { semana: fija(tramos.semana), mes: fija(tramos.mes) };
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

  // --- 3, por semana y por mes: la base da una fila por periodo, también
  // los vacíos. Si falta alguno, el gráfico cuenta como no leído: no se
  // rellena con ceros. Antes del primer bloque, null. ---
  const porPeriodo = (filas: FilaIa[] | null, periodos: { periodo: string; hasta: string }[]): (Ia | null)[] | null => {
    const mapa = filas ? new Map(filas.map((f) => [f.periodo, f])) : null;
    if (!mapa || !inicio || !periodos.every((p) => mapa.has(p.periodo))) return null;
    return periodos.map((p) => {
      if (inicio.ia === null || inicio.ia > p.hasta) return null;
      const f = mapa.get(p.periodo) as FilaIa;
      return { alumnos: f.alumnos, bloques: f.bloques };
    });
  };
  const iaGrafico = porPeriodo(iaSemanas, semanas);
  const iaGraficoMeses = porPeriodo(iaMeses, meses);

  const una = (filas: FilaIa[] | null): Ia | null => (filas && filas[0] ? { alumnos: filas[0].alumnos, bloques: filas[0].bloques } : null);
  const iaA = una(iaAct);
  const iaB = una(iaAnt);

  let iaFijas: Fijas<Ia> | null = null;
  if (inicio && iaFijos.every((f) => f !== null)) {
    const [sa, sb, ma, mb] = iaFijos.map(una);
    const fija = (c: Comparacion, a: Ia | null, b: Ia | null): Fija<Ia> => {
      const d = dispTramos(inicio.ia, c);
      return { actual: d.actual.estado === "sin_datos" ? null : a, anterior: d.anterior.estado === "sin_datos" ? null : b, disponibilidad: d };
    };
    iaFijas = { semana: fija(tramos.semana, sa, sb), mes: fija(tramos.mes, ma, mb) };
  }

  return {
    rango,
    anterior,
    calculadoEn: new Date().toISOString(),
    inicioDatos: anotar("inicio de los datos", inicio),
    disponibilidad: inicio
      ? {
          entradasClase: { actual: disponibilidad(inicio.entradasClase, rango), anterior: disponibilidad(inicio.entradasClase, anterior) },
          ia: { actual: disponibilidad(inicio.ia, rango), anterior: disponibilidad(inicio.ia, anterior) },
        }
      : null,
    clase: anotar("clases con entrada", clase),
    listaClase: anotar("lista de alumnos con clase", listaClase),
    ia: anotar("práctica con IA", iaA && iaB ? { actual: iaA, anterior: iaB } : null),
    hoy,
    fijas: {
      tramos,
      clase: anotar("semana y mes de las clases con entrada", claseFijas),
      ia: anotar("semana y mes de la práctica con IA", iaFijas),
    },
    semanas,
    meses,
    grafico: anotar(
      "gráficos",
      claseGrafico && claseMeses && iaGrafico && iaGraficoMeses ? { clase: claseGrafico, ia: iaGrafico, claseMeses, iaMeses: iaGraficoMeses } : null
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
 * anterior. Las comparaciones fijas llegan hasta la hora del cálculo, y
 * la pantalla dice cuál fue.
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
