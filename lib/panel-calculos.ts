// ---------------------------------------------------------------
// LOS CÁLCULOS DEL PANEL QUE NO TOCAN LA BASE
//
// `lib/panel-metricas.ts` lee; esto decide. Va aparte para poder
// probarlo sin base: qué dice el panel cuando un dato no existía en todo
// el rango, en qué periodos se parte la serie, quién podía generar
// práctica y cómo se reparten las clases con entrada por el botón.
//
// Nada de aquí cuenta alumnos únicos de un rango largo: eso lo hace la
// base. Lo único que se cuenta aquí son clases (el cruce de los partes
// de Gestión con los clics del LMS, que viven en bases distintas) y
// conjuntos de ids que vienen de Gestión, que solo deja leer vistas.
// ---------------------------------------------------------------

import { sumarDias } from "@/lib/fechas";
import { instanteEnMadrid } from "@/lib/clases";
import { claveDeEntrada, medirBoton, type FilaEntrada, type ParteParaMedir } from "@/lib/entradas-clase";
import { lunesDe, type Granularidad, type Rango } from "@/lib/panel-rango";

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
// LOS PERIODOS DE LA SERIE
//
// Los mismos que genera `panel_agregado` en la base: días, o semanas que
// empiezan en lunes y se recortan a los bordes del rango.
// ---------------------------------------------------------------

export type Periodo = {
  /** El día, o el lunes de la semana. */
  periodo: string;
  /** Los días de ese periodo que entran en el rango. */
  desde: string;
  hasta: string;
};

export function periodosDelRango(rango: Rango, granularidad: Granularidad): Periodo[] {
  const periodos: Periodo[] = [];
  const paso = granularidad === "dia" ? 1 : 7;
  for (let p = granularidad === "dia" ? rango.desde : lunesDe(rango.desde); p <= rango.hasta; p = sumarDias(p, paso)) {
    const fin = sumarDias(p, paso - 1);
    periodos.push({
      periodo: p,
      desde: p < rango.desde ? rango.desde : p,
      hasta: fin > rango.hasta ? rango.hasta : fin,
    });
  }
  return periodos;
}

// ---------------------------------------------------------------
// QUIÉN PODÍA GENERAR PRÁCTICA
//
// Un alumno podía en el rango si alguna clase nueva suya pasó a estar
// disponible dentro (`vista_clases_nuevas_semana`, en Gestión).
//
// LA VISTA ES SEMANAL y trae la primera y la última de cada semana. En
// rangos de semanas enteras es exacto. En un rango que corta una semana
// por los dos lados (un día suelto, por ejemplo) se mira si la primera o
// la última caen dentro: si un alumno tuvo tres o más esa semana y solo
// la del medio cae en el rango, no cuenta. Es raro —la mediana es una o
// dos por semana— y deja la cifra por abajo, nunca por arriba.
// ---------------------------------------------------------------

export type FilaClasesNuevas = {
  alumnoId: string;
  primeraDisponibleEn: string;
  ultimaDisponibleEn: string;
};

export function alumnosQuePodian(filas: FilaClasesNuevas[], rango: Rango): Set<string> {
  const ini = instanteEnMadrid(rango.desde, "00:00").getTime();
  const fin = instanteEnMadrid(sumarDias(rango.hasta, 1), "00:00").getTime();
  const dentro = (iso: string) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) && t >= ini && t < fin;
  };
  const ids = new Set<string>();
  for (const f of filas) {
    if (dentro(f.primeraDisponibleEn) || dentro(f.ultimaDisponibleEn)) ids.add(f.alumnoId);
  }
  return ids;
}

// ---------------------------------------------------------------
// CLASES CON ENTRADA POR EL BOTÓN
//
// La cuenta es `medirBoton` (`lib/entradas-clase.ts`), la misma de
// /entradas: clases dadas según los partes de Gestión, y cuántas se
// abrieron con «Ingresar a clase». Aquí solo se le pasan los partes y
// los clics de cada trozo.
// ---------------------------------------------------------------

export type ResumenClase = {
  /** Clases dadas (normales y recuperaciones). */
  clases: number;
  /** De ellas, abiertas al menos una vez con el botón. */
  clasesConEntrada: number;
  /** Alumnos con alguna clase dada en el trozo. */
  alumnos: number;
  /** De ellos, los que usaron el botón al menos una vez. */
  alumnosConEntrada: number;
};

/** Partes y clics de los días de `rango`, ya sin excluidos. */
export function medirClase(partes: ParteParaMedir[], entradas: FilaEntrada[], rango: Rango): ResumenClase {
  const enRango = (dia: string) => dia >= rango.desde && dia <= rango.hasta;
  const medida = medirBoton(
    partes.filter((p) => enRango(p.fecha)),
    entradas.filter((e) => {
      const clave = claveDeEntrada(e);
      return clave !== null && enRango(clave.slice(0, 10));
    })
  );
  return {
    clases: medida.clases,
    clasesConEntrada: medida.clasesConEntrada,
    alumnos: medida.alumnos,
    alumnosConEntrada: medida.alumnosConEntrada,
  };
}
