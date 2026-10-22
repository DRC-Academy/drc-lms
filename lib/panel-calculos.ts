// ---------------------------------------------------------------
// LOS CÁLCULOS DEL PANEL QUE NO TOCAN LA BASE
//
// `lib/panel-metricas.ts` lee; esto decide. Va aparte para poder
// probarlo sin base: qué dice el panel cuando un dato no existía en todo
// el rango, en qué semanas se parte el gráfico y cómo se reparten las
// clases con entrada por el botón.
//
// Nada de aquí cuenta alumnos únicos de las tablas del LMS: eso lo hace
// la base. Lo único que se cuenta aquí es el cruce de los partes de
// Gestión con los clics del LMS, que viven en bases distintas.
// ---------------------------------------------------------------

import { sumarDias } from "@/lib/fechas";
import { claveDeEntrada, claveDeParte, medirBoton, TIPOS_DADA, type FilaEntrada, type ParteParaMedir } from "@/lib/entradas-clase";
import { lunesDe, type Rango } from "@/lib/panel-rango";
import type { Tramo } from "@/lib/panel-tramos";

// ---------------------------------------------------------------
// DISPONIBILIDAD
//
// Un cero y un «no lo sé» no pueden parecerse. Lo que no se apuntaba
// antes de una fecha dice desde cuándo hay datos en vez de contar ceros.
// ---------------------------------------------------------------

export type Disponibilidad =
  /** Hay datos de todo el rango. */
  | { estado: "completo" }
  /** Solo desde `desde` ("AAAA-MM-DD"): lo anterior no se apuntaba. */
  | { estado: "parcial"; desde: string }
  /** El rango cae entero antes de que se apuntara, o aún no hay nada. */
  | { estado: "sin_datos" };

/** `inicio`: el primer día con datos ("AAAA-MM-DD"), o null si aún no hay ninguno. */
export function disponibilidad(inicio: string | null, rango: Rango): Disponibilidad {
  if (inicio === null || inicio > rango.hasta) return { estado: "sin_datos" };
  if (inicio > rango.desde) return { estado: "parcial", desde: inicio };
  return { estado: "completo" };
}

/** El trozo del rango que tiene datos, o null si no tiene ninguno. */
export function recortar(rango: Rango, inicio: string | null): Rango | null {
  if (inicio === null || inicio > rango.hasta) return null;
  return { desde: inicio > rango.desde ? inicio : rango.desde, hasta: rango.hasta };
}

// ---------------------------------------------------------------
// LAS SEMANAS DEL GRÁFICO
//
// Las mismas que genera `panel_cifras` en la base: semanas que empiezan
// en lunes y se recortan a los bordes del rango.
// ---------------------------------------------------------------

export type Periodo = {
  /** El lunes de la semana. */
  periodo: string;
  /** Los días de esa semana que entran en el rango. */
  desde: string;
  hasta: string;
};

export function semanasDelRango(rango: Rango): Periodo[] {
  const periodos: Periodo[] = [];
  for (let p = lunesDe(rango.desde); p <= rango.hasta; p = sumarDias(p, 7)) {
    const fin = sumarDias(p, 6);
    periodos.push({
      periodo: p,
      desde: p < rango.desde ? rango.desde : p,
      hasta: fin > rango.hasta ? rango.hasta : fin,
    });
  }
  return periodos;
}

// ---------------------------------------------------------------
// CLASES CON ENTRADA POR EL BOTÓN
//
// La cuenta es `medirBoton` (`lib/entradas-clase.ts`), la misma de
// /entradas: clases dadas según los partes de Gestión (normales y
// recuperaciones), y cuántas se abrieron con «Ingresar a clase». Un clic
// casa con una clase por alumno, día y hora de inicio; los clics en
// clases sin parte o con parte de falta no cuentan.
// ---------------------------------------------------------------

export type ClaseDelAlumno = {
  /** Clases dadas en el trozo. */
  clases: number;
  /** De ellas, abiertas al menos una vez con el botón. */
  conEntrada: number;
  /** La más reciente de esas, "AAAA-MM-DDTHH:MM" en Madrid; null si ninguna. */
  ultima: string | null;
};

export type ResumenClase = {
  /** Clases dadas (normales y recuperaciones). */
  clases: number;
  /** De ellas, abiertas al menos una vez con el botón. */
  clasesConEntrada: number;
  /** Alumnos con alguna clase dada en el trozo. */
  alumnos: number;
  /** De ellos, los que abrieron al menos una con el botón. */
  alumnosConEntrada: number;
  /** alumno_id → sus cifras. Solo quien tuvo alguna clase dada. */
  porAlumno: Record<string, ClaseDelAlumno>;
};

/** Partes y clics de los días de `rango`, ya sin excluidos. */
export function medirClase(partes: ParteParaMedir[], entradas: FilaEntrada[], rango: Rango): ResumenClase {
  const enRango = (dia: string) => dia >= rango.desde && dia <= rango.hasta;
  const susPartes = partes.filter((p) => enRango(p.fecha));
  const susEntradas = entradas.filter((e) => {
    const clave = claveDeEntrada(e);
    return clave !== null && enRango(clave.slice(0, 10));
  });
  const medida = medirBoton(susPartes, susEntradas);

  // La última clase dada que se abrió con el botón, con la misma clave
  // que usa `medirBoton` para casar un clic con su parte.
  const dadas = new Set(susPartes.filter((p) => TIPOS_DADA.has(p.tipo) && p.hora).map((p) => `${p.alumnoId}|${claveDeParte(p.fecha, p.hora as string)}`));
  const ultima = new Map<string, string>();
  for (const e of susEntradas) {
    const clave = claveDeEntrada(e) as string;
    if (!dadas.has(`${e.alumno_id}|${clave}`)) continue;
    const ya = ultima.get(e.alumno_id);
    if (!ya || clave > ya) ultima.set(e.alumno_id, clave);
  }

  const porAlumno: Record<string, ClaseDelAlumno> = {};
  for (const [id, c] of Object.entries(medida.porAlumno)) {
    porAlumno[id] = { clases: c.clases, conEntrada: c.conEntrada, ultima: ultima.get(id) ?? null };
  }
  return {
    clases: medida.clases,
    clasesConEntrada: medida.clasesConEntrada,
    alumnos: medida.alumnos,
    alumnosConEntrada: medida.alumnosConEntrada,
    porAlumno,
  };
}

/** Las cuatro cifras, sin la lista por alumno: lo que necesitan las comparaciones fijas. */
export type CifrasClase = Pick<ResumenClase, "clases" | "clasesConEntrada" | "alumnos" | "alumnosConEntrada">;

/**
 * Como `medirClase`, pero el tramo acaba a una hora («hasta ahora»). Una
 * clase entra si su inicio, día y hora de Madrid, cae en [desde, hasta);
 * un parte sin hora cuenta como de las 00:00 de su día. El clic va con la
 * clase que lleva en su `clase_id`, igual que en `medirBoton`.
 */
export function medirClaseTramo(partes: ParteParaMedir[], entradas: FilaEntrada[], tramo: Tramo): CifrasClase {
  const dentro = (clave: string) => clave >= tramo.desde && clave < tramo.hasta;
  const m = medirBoton(
    partes.filter((p) => dentro(claveDeParte(p.fecha, p.hora ?? "00:00"))),
    entradas.filter((e) => {
      const clave = claveDeEntrada(e);
      return clave !== null && dentro(clave);
    })
  );
  return { clases: m.clases, clasesConEntrada: m.clasesConEntrada, alumnos: m.alumnos, alumnosConEntrada: m.alumnosConEntrada };
}

/** El trozo del tramo que tiene datos (desde las 00:00 del día `inicio`), o null si ninguno. */
export function recortarTramo(tramo: Tramo, inicio: string | null): Tramo | null {
  if (inicio === null) return null;
  const desde = `${inicio}T00:00` > tramo.desde ? `${inicio}T00:00` : tramo.desde;
  return desde < tramo.hasta ? { desde, hasta: tramo.hasta } : null;
}
