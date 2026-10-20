// ---------------------------------------------------------------
// LOS DATOS DEL PANEL DEL EQUIPO, POR RANGO DE FECHAS
//
// Sustituye a `cargarPanel` (`lib/admin-servidor.ts`) para la pantalla
// nueva: cualquier rango de días, comparado con el periodo anterior de la
// misma duración. Todo se lee aquí, en el servidor, y lo que sale es un
// objeto plano que la página pasa por props.
//
// DE DÓNDE SALE CADA COSA
//   · LMS, con las funciones de `supabase/lms-panel-metricas.sql`: series,
//     totales, embudo, primer bloque, eventos, el top de cursos y las
//     cifras por alumno. Los alumnos ÚNICOS se cuentan allí, nunca aquí.
//   · Gestión, solo vistas y con el cliente de solo lectura: las fichas
//     (y quién tiene plan activo), las clases nuevas de cada semana y los
//     partes de clase.
//   · Quién no cuenta lo decide la base del LMS (`metricas_excluido`), y
//     las listas que vienen de Gestión pasan por `metricas_quitar_excluidos`.
//     No hay ninguna regla de exclusión en este archivo.
//
// LAS DOS POBLACIONES. El volumen —bloques, lecciones, entradas, visitas,
// eventos— es de todos menos los excluidos: es uso real de la plataforma
// tenga el alumno plan o no. Las proporciones sobre «alumnos con plan
// activo» y el embudo se ciñen a esos alumnos (`totalesPlan`, `embudo`),
// para que cada escalón quede dentro del anterior. El plan activo es el
// de HOY: en rangos viejos, quien tenía plan entonces y ya no, no está.
//
// LO QUE NO SE PUDO LEER va a null y su nombre a `fallos`. Un null se
// pinta como «no se ha podido leer», nunca como un cero.
//
// Se cachea cinco minutos por rango. Lo que sale con fallos no se guarda.
// ---------------------------------------------------------------

import "server-only";
import { unstable_cache } from "next/cache";
import { baseLms } from "@/lib/supabase-lms";
import { alumnosParaMetricas, clasesNuevasEntre, partesDeClase } from "@/lib/gestion";
import { entradasConClaseEntre } from "@/lib/entradas-clase-servidor";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { granularidadDe, lunesDe, rangoAnterior, type Granularidad, type Rango } from "@/lib/panel-rango";
import {
  alumnosQuePodian,
  disponibilidad,
  medirClase,
  periodosDelRango,
  recortar,
  type Disponibilidad,
  type ResumenClase,
} from "@/lib/panel-calculos";

// ---------------------------------------------------------------
// LO QUE DEVUELVE
// ---------------------------------------------------------------

/** El periodo actual y el anterior de la misma duración. */
export type Comparado<T> = { actual: T; anterior: T };

/** Una fila de `panel_serie` / `panel_totales`, en camelCase. */
export type FilaPanel = {
  periodo: string;
  periodoDesde: string;
  periodoHasta: string;
  /** Alumnos únicos con cualquier actividad, también entrar. */
  activos: number;
  /** Alumnos únicos con lección, ejercicio o bloque. */
  hicieronAlgo: number;
  /** Accesos totales (visitas). Desde la instrumentación. */
  accesos: number;
  accesosAlumnos: number;
  /** Entradas a clase totales y sus alumnos únicos. Desde el 13 oct 2026. */
  entradas: number;
  entradasAlumnos: number;
  /** Alumnos únicos que generaron un bloque. */
  generaron: number;
  bloques: number;
  bloquesIa: number;
  bloquesBanco: number;
  /** Por pantalla. Desde la instrumentación; lo anterior va a «sin pantalla». */
  bloquesInicio: number;
  bloquesParaTi: number;
  bloquesSinPantalla: number;
  /** De los generados en el periodo, los terminados alguna vez. */
  completados: number;
  completadosIa: number;
  completadosBanco: number;
  completadosInicio: number;
  completadosParaTi: number;
  completadosSinPantalla: number;
  leccionesAlumnos: number;
  lecciones: number;
  ejerciciosAlumnos: number;
  ejercicios: number;
};

export type Embudo = {
  /** Con plan activo y alguna actividad. */
  entraron: number;
  hicieronAlgo: number;
  /** Hicieron algo en al menos dos periodos (días o semanas) distintos. */
  volvieron: number;
  /** Cuántos periodos tiene el rango: con uno solo no se puede volver. */
  periodos: number;
};

export type FilaEvento = {
  tipo: string;
  /** La pregunta, la pantalla o el motivo; null en la fila del total del tipo. */
  detalle: string | null;
  esTotal: boolean;
  total: number;
  alumnos: number;
};

export type FilaTop = { id: string; titulo: string; curso: string; leccionesCompletadas: number; alumnosUnicos: number };

export type FilaAlumno = {
  alumnoId: string;
  nombre: string;
  profesor: string;
  activo: boolean;
  /** Última actividad en la plataforma, de siempre (ISO), o null si nunca. */
  ultimaActividad: string | null;
  /** En el rango. */
  entradas: number;
  bloques: number;
  lecciones: number;
};

export type PeriodoClase = {
  periodo: string;
  desde: string;
  hasta: string;
  /** Null si el periodo cae entero antes del primer clic. */
  resumen: ResumenClase | null;
};

/**
 * De qué depende cada cifra:
 *   siempre          hay datos desde que abrió la plataforma.
 *   entradasClase    `entradas`, `entradasAlumnos` y `clase`.
 *   instrumentacion  `accesos`, `accesosAlumnos`, los `*Inicio`/`*ParaTi`
 *                    de bloques y completados, y `eventos`.
 *
 * `activos` es «siempre», pero CAMBIA DE MÉTODO con la instrumentación:
 * antes salía de inicios de sesión y actividad; desde entonces cuenta
 * también a quien entra y no hace nada. Un rango que cruza esa fecha
 * sube en el tramo nuevo sin que haya más alumnos.
 */
export type Fuente = "entradasClase" | "instrumentacion";

export type MetricasPanel = {
  rango: Rango;
  anterior: Rango;
  granularidad: Granularidad;
  calculadoEn: string;
  disponibilidad: Record<Fuente, Comparado<Disponibilidad>> | null;
  /** Con plan activo hoy, y con ficha en Gestión (sin excluidos). */
  alumnos: { conPlan: number; conFicha: number } | null;
  /** Todos menos los excluidos. */
  totales: Comparado<FilaPanel> | null;
  /** Solo los que hoy tienen plan activo. */
  totalesPlan: Comparado<FilaPanel> | null;
  serie: FilaPanel[] | null;
  /** Dentro del plan activo. El primer escalón es `alumnos.conPlan`. */
  embudo: Comparado<Embudo> | null;
  /** Tenían una clase analizada nueva en el rango, y de ellos cuántos generaron. */
  podianGenerar: Comparado<{ podian: number; generaron: number }> | null;
  /** Generaron su primer bloque en el rango, y de ellos cuántos lo terminaron. */
  primerBloque: Comparado<{ primeros: number; completaron: number }> | null;
  /** Null dentro: ese periodo no tiene datos (antes del 13 oct). */
  clase: { actual: ResumenClase | null; anterior: ResumenClase | null; serie: PeriodoClase[] } | null;
  eventos: Comparado<FilaEvento[]> | null;
  top: { cursos: FilaTop[]; modulos: FilaTop[] } | null;
  tabla: FilaAlumno[] | null;
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

/** Igual, por tramos de 1000: para las que devuelven una fila por alumno. */
async function rpcPaginada<T>(nombre: string, parametros: Record<string, unknown>): Promise<T[] | null> {
  const PAGINA = 1000;
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await baseLms().rpc(nombre, parametros).range(desde, desde + PAGINA - 1);
    if (error) {
      console.error(`[panel] ${nombre}:`, error.message);
      return null;
    }
    const pagina = (data ?? []) as T[];
    filas.push(...pagina);
    if (pagina.length < PAGINA) return filas;
  }
}

const aCamel = (clave: string) => clave.replace(/_([a-z])/g, (_, letra: string) => letra.toUpperCase());

/** Una fila de la base con las claves en camelCase y los números como números. */
function aFilaPanel(fila: Record<string, unknown>): FilaPanel {
  const salida: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(fila)) {
    salida[aCamel(clave)] = typeof valor === "number" || clave.startsWith("periodo") ? valor : Number(valor);
  }
  return salida as FilaPanel;
}

const params = (rango: Rango, extra: Record<string, unknown> = {}) => ({
  p_desde: rango.desde,
  p_hasta: rango.hasta,
  ...extra,
});

async function totales(rango: Rango, alumnos?: string[]): Promise<FilaPanel | null> {
  const filas = await rpc<Record<string, unknown>>("panel_totales", params(rango, alumnos ? { p_alumnos: alumnos } : {}));
  return filas && filas[0] ? aFilaPanel(filas[0]) : null;
}

async function embudo(rango: Rango, granularidad: Granularidad, alumnos: string[]): Promise<Embudo | null> {
  const filas = await rpc<{ entraron: number; hicieron_algo: number; volvieron: number; periodos: number }>(
    "panel_embudo",
    params(rango, { p_granularidad: granularidad, p_alumnos: alumnos })
  );
  const f = filas?.[0];
  return f ? { entraron: f.entraron, hicieronAlgo: f.hicieron_algo, volvieron: f.volvieron, periodos: f.periodos } : null;
}

async function primerBloque(rango: Rango): Promise<{ primeros: number; completaron: number } | null> {
  const filas = await rpc<{ primeros: number; completaron: number }>("panel_primer_bloque", params(rango));
  return filas?.[0] ?? null;
}

async function eventos(rango: Rango): Promise<FilaEvento[] | null> {
  const filas = await rpc<{ tipo: string; detalle: string | null; es_total: boolean; total: number; alumnos: number }>(
    "panel_eventos",
    params(rango)
  );
  return filas ? filas.map((f) => ({ tipo: f.tipo, detalle: f.detalle, esTotal: f.es_total, total: f.total, alumnos: f.alumnos })) : null;
}

async function top(rango: Rango, agrupar: "curso" | "modulo"): Promise<FilaTop[] | null> {
  const filas = await rpc<{ id: string; titulo: string; curso: string; lecciones_completadas: number; alumnos_unicos: number }>(
    "panel_top",
    params(rango, { p_agrupar: agrupar, p_limite: 5 })
  );
  return filas
    ? filas.map((f) => ({ id: f.id, titulo: f.titulo, curso: f.curso, leccionesCompletadas: f.lecciones_completadas, alumnosUnicos: f.alumnos_unicos }))
    : null;
}

/** Fuente → primer día con datos (Madrid), o null si aún no hay. */
async function inicioDeDatos(): Promise<Record<Fuente, string | null> | null> {
  const filas = await rpc<{ fuente: string; desde: string | null }>("panel_inicio_datos", {});
  if (!filas) return null;
  const dia = (fuente: string) => {
    const desde = filas.find((f) => f.fuente === fuente)?.desde;
    return desde ? diaLocal(new Date(desde)) : null;
  };
  return { entradasClase: dia("entradas_clase"), instrumentacion: dia("instrumentacion") };
}

async function quitarExcluidos(ids: string[]): Promise<Set<string> | null> {
  const { data, error } = await baseLms().rpc("metricas_quitar_excluidos", { p_alumnos: ids });
  if (error) {
    console.error("[panel] metricas_quitar_excluidos:", error.message);
    return null;
  }
  return new Set((data ?? []) as string[]);
}

/**
 * Partes de Gestión y clics del LMS de los días con datos de los dos
 * rangos, en una lectura. Sin recortar exclusiones todavía.
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
  const granularidad = granularidadDe(rango);
  const fallos: string[] = [];
  const anotar = <T>(nombre: string, valor: T | null): T | null => {
    if (valor === null) fallos.push(nombre);
    return valor;
  };

  // --- Primera tanda: todo lo que no depende de nada ---
  const inicioP = inicioDeDatos();
  const clasesP = inicioP.then((inicio) =>
    inicio
      ? leerClases([recortar(anterior, inicio.entradasClase), recortar(rango, inicio.entradasClase)].filter((t): t is Rango => t !== null))
      : null
  );

  const [inicio, lecturaClases, fichas, nuevas, serie, totAct, totAnt, priAct, priAnt, evAct, evAnt, cursos, modulos, porAlumno] =
    await Promise.all([
      inicioP,
      clasesP,
      alumnosParaMetricas(),
      clasesNuevasEntre(lunesDe(anterior.desde), sumarDias(rango.hasta, 1)),
      rpc<Record<string, unknown>>("panel_serie", params(rango, { p_granularidad: granularidad })),
      totales(rango),
      totales(anterior),
      primerBloque(rango),
      primerBloque(anterior),
      eventos(rango),
      eventos(anterior),
      top(rango, "curso"),
      top(rango, "modulo"),
      rpcPaginada<{ alumno_id: string; ultima_actividad: string | null; entradas: number; bloques: number; lecciones: number }>(
        "panel_alumnos",
        params(rango)
      ),
    ]);

  // --- Quién cuenta, de lo que viene de Gestión: una sola pregunta a la base ---
  const idsDeFuera = new Set<string>();
  for (const f of fichas ?? []) idsDeFuera.add(f.alumnoId);
  for (const n of nuevas ?? []) idsDeFuera.add(n.alumnoId);
  for (const p of lecturaClases?.partes ?? []) idsDeFuera.add(p.alumnoId);
  for (const e of lecturaClases?.entradas ?? []) idsDeFuera.add(e.alumno_id);
  const cuentan = idsDeFuera.size > 0 ? await quitarExcluidos(Array.from(idsDeFuera)) : new Set<string>();

  const fichasQueCuentan = fichas && cuentan ? fichas.filter((f) => cuentan.has(f.alumnoId)) : null;
  const conPlan = fichasQueCuentan ? fichasQueCuentan.filter((f) => f.activo).map((f) => f.alumnoId) : null;

  const podian =
    nuevas && cuentan
      ? {
          actual: Array.from(alumnosQuePodian(nuevas, rango)).filter((id) => cuentan.has(id)),
          anterior: Array.from(alumnosQuePodian(nuevas, anterior)).filter((id) => cuentan.has(id)),
        }
      : null;

  // --- Segunda tanda: lo que se ciñe a una lista de alumnos ---
  const [planAct, planAnt, embAct, embAnt, genAct, genAnt] = await Promise.all([
    conPlan ? totales(rango, conPlan) : null,
    conPlan ? totales(anterior, conPlan) : null,
    conPlan ? embudo(rango, granularidad, conPlan) : null,
    conPlan ? embudo(anterior, granularidad, conPlan) : null,
    podian ? totales(rango, podian.actual) : null,
    podian ? totales(anterior, podian.anterior) : null,
  ]);

  // --- Clases con entrada por el botón ---
  let clase: MetricasPanel["clase"] = null;
  if (inicio && lecturaClases && cuentan) {
    const partes = lecturaClases.partes.filter((p) => cuentan.has(p.alumnoId));
    const entradas = lecturaClases.entradas.filter((e) => cuentan.has(e.alumno_id));
    const medir = (r: Rango) => {
      const trozo = recortar(r, inicio.entradasClase);
      return trozo ? medirClase(partes, entradas, trozo) : null;
    };
    clase = {
      actual: medir(rango),
      anterior: medir(anterior),
      serie: periodosDelRango(rango, granularidad).map((p) => ({ ...p, resumen: medir({ desde: p.desde, hasta: p.hasta }) })),
    };
  }

  // --- La tabla: una fila por alumno con ficha, tenga actividad o no ---
  const delLms = new Map((porAlumno ?? []).map((f) => [f.alumno_id, f]));
  const tabla: FilaAlumno[] | null =
    fichasQueCuentan && porAlumno
      ? fichasQueCuentan.map((f) => {
          const suyo = delLms.get(f.alumnoId);
          return {
            alumnoId: f.alumnoId,
            nombre: f.nombre,
            profesor: f.profesor,
            activo: f.activo,
            ultimaActividad: suyo?.ultima_actividad ?? null,
            entradas: suyo?.entradas ?? 0,
            bloques: suyo?.bloques ?? 0,
            lecciones: suyo?.lecciones ?? 0,
          };
        })
      : null;

  const ambos = <T>(nombre: string, actual: T | null, previo: T | null): Comparado<T> | null =>
    anotar(nombre, actual !== null && previo !== null ? { actual, anterior: previo } : null);

  return {
    rango,
    anterior,
    granularidad,
    calculadoEn: new Date().toISOString(),
    disponibilidad: anotar(
      "inicio de los datos",
      inicio
        ? {
            entradasClase: { actual: disponibilidad(inicio.entradasClase, rango), anterior: disponibilidad(inicio.entradasClase, anterior) },
            instrumentacion: { actual: disponibilidad(inicio.instrumentacion, rango), anterior: disponibilidad(inicio.instrumentacion, anterior) },
          }
        : null
    ),
    alumnos: anotar(
      "alumnos de Gestión",
      fichasQueCuentan && conPlan ? { conPlan: conPlan.length, conFicha: fichasQueCuentan.length } : null
    ),
    totales: ambos("totales", totAct, totAnt),
    totalesPlan: ambos("totales del plan activo", planAct, planAnt),
    serie: anotar("serie", serie ? serie.map(aFilaPanel) : null),
    embudo: ambos("embudo", embAct, embAnt),
    podianGenerar: ambos(
      "podían generar",
      podian && genAct ? { podian: podian.actual.length, generaron: genAct.generaron } : null,
      podian && genAnt ? { podian: podian.anterior.length, generaron: genAnt.generaron } : null
    ),
    primerBloque: ambos("primer bloque", priAct, priAnt),
    clase: anotar("clases con entrada", clase),
    eventos: ambos("eventos", evAct, evAnt),
    top: anotar("top de cursos", cursos && modulos ? { cursos, modulos } : null),
    tabla: anotar("tabla de alumnos", tabla),
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
