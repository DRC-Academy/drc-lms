// ---------------------------------------------------------------
// EL CURSO AGRUPADO EN MESES
//
// El temario se veía como 47 tarjetas en una rejilla plana, sin ninguna
// señal de que el curso son seis meses. Aquí se reagrupa en la forma que
// el alumno tiene en la cabeza: 6 meses · 24 semanas · 47 módulos.
//
// SOBRE EL MES, QUE ES LO DELICADO. En la base no hay columna `mes`: los
// módulos solo traen `orden`, y la semana viene dentro del título
// ("Week 1 - Lesson 1: …"). Así que el mes se deriva, pero se deriva
// AQUÍ, en el servidor y en un solo sitio, no en el componente.
//
// El corte por ocho funciona hoy porque el curso está construido así, y
// se rompe en cuanto se añada o se quite un módulo. Cuando exista una
// columna `mes` de verdad, lo único que hay que cambiar es
// `mesDelModulo`: todo lo demás ya lee de ahí.
//
// Módulo puro: sin `server-only` para poder probarlo, pero lo llama la
// página en el servidor y al cliente le llega ya resuelto.
// ---------------------------------------------------------------

import type { ArbolCurso } from "@/lib/cursos-servidor";
import { partirModulo } from "@/lib/modulo";

/** Cuántos módulos entran en un mes. La regla del curso actual. */
export const MODULOS_POR_MES = 8;

/** Cuántas semanas tiene un mes. El contador del backend reinicia en 1. */
export const SEMANAS_POR_MES = 4;

/**
 * Tope de meses. Está aquí y no suelto en una fórmula porque es la parte
 * que caduca: es una afirmación sobre ESTE curso, no sobre el modelo.
 */
export const MESES_MAXIMO = 6;

/**
 * Los temas de cada mes, que no están en la base.
 *
 * Son contenido editorial, como el banco de bloques de `lib/banco.ts`, y
 * viven en código por el mismo motivo: no hay tabla donde ponerlos y
 * cambiarlos no debería pedir un despliegue de esquema.
 *
 * La clave es el slug, que el importador genera desde el título
 * ("CAE (C1 Cambridge)" → "cae-c1-cambridge"). Un curso que no esté aquí
 * no se rompe: su cabecera cae al rótulo derivado de los módulos.
 */
const TEMAS: Record<string, string[]> = {
  "cae-c1-cambridge": [
    "Gramática, léxico y las cuatro destrezas",
    "Escritura compleja y práctica cronometrada",
    "Estrategias avanzadas y primeros simulacros",
    "Consolidación y práctica guiada",
    "Precisión y registro bajo presión",
    "Simulacros completos y repaso final",
  ],
};

export type EstadoMes = "completado" | "en-curso" | "pendiente";

export type ModuloTemario = {
  id: string;
  /** Posición en el curso, empezando en 1. */
  numero: number;
  semana: number;
  mes: number;
  titulo: string;
  totalLecciones: number;
  completadas: number;
  hecho: boolean;
  /** El primero sin terminar de todo el curso. */
  esActual: boolean;
  /** A la primera lección pendiente, o null si el módulo está vacío. */
  destino: string | null;
};

export type SemanaTemario = {
  numero: number;
  modulos: ModuloTemario[];
  totalLecciones: number;
};

export type MesTemario = {
  numero: number;
  /** Null cuando el curso no tiene temas registrados. */
  tema: string | null;
  /** El rótulo grande de la cabecera: el tema, o los módulos que abarca. */
  titulo: string;
  semanas: SemanaTemario[];
  totalModulos: number;
  totalLecciones: number;
  completadas: number;
  porcentaje: number;
  estado: EstadoMes;
  /** Una casilla por lección, en orden. `true` = hecha. */
  puntos: boolean[];
};

export type Temario = {
  meses: MesTemario[];
  totalModulos: number;
  totalLecciones: number;
  completadas: number;
  porcentaje: number;
  totalSemanas: number;
  /** Dónde va el alumno ahora, o null si el curso está terminado o vacío. */
  actual: {
    mes: number;
    semana: number;
    modulo: number;
    titulo: string;
    completadas: number;
    totalLecciones: number;
    destino: string | null;
  } | null;
};

/**
 * En qué mes cae un módulo.
 *
 * ÚNICO SITIO donde se decide. Cuando `modulos` tenga columna `mes`,
 * esta función pasa a leerla y nada más cambia.
 */
function mesDelModulo(numero: number): number {
  return Math.min(MESES_MAXIMO, Math.ceil(numero / MODULOS_POR_MES));
}

/**
 * En qué semana del mes cae un módulo, cuando el título no lo dice.
 *
 * Dos módulos por semana, que es como está montado el curso. Solo entra
 * en juego si el título no trae "Week n": lo normal es que sí.
 */
function semanaPorPosicion(numero: number): number {
  const dentroDelMes = ((numero - 1) % MODULOS_POR_MES) + 1;
  return Math.min(SEMANAS_POR_MES, Math.ceil(dentroDelMes / (MODULOS_POR_MES / SEMANAS_POR_MES)));
}

function porcentajeDe(hechas: number, total: number): number {
  return total > 0 ? Math.round((hechas / total) * 100) : 0;
}

/**
 * Agrupa el árbol del curso en meses y semanas.
 *
 * Todos los contadores salen de sumar los módulos: nada hardcodeado, de
 * modo que si el curso cambia de tamaño la pantalla se ajusta sola.
 */
export function construirTemario(arbol: ArbolCurso): Temario {
  const temas = TEMAS[arbol.curso.slug] ?? null;

  // El actual es el primero sin terminar. Un módulo vacío no cuenta: no
  // se puede "estar" en algo a lo que no se entra.
  const indiceActual = arbol.modulos.findIndex(
    (modulo) => modulo.lecciones.length > 0 && modulo.completadas < modulo.lecciones.length
  );

  const modulos: ModuloTemario[] = arbol.modulos.map((modulo, i) => {
    const partido = partirModulo(modulo.titulo, i);
    const numero = partido.numero;
    const totalLecciones = modulo.lecciones.length;
    const pendiente = modulo.lecciones.find((leccion) => !leccion.completada);

    return {
      id: modulo.id,
      numero,
      semana: partido.semana ?? semanaPorPosicion(numero),
      mes: mesDelModulo(numero),
      titulo: partido.titulo,
      totalLecciones,
      completadas: modulo.completadas,
      hecho: totalLecciones > 0 && modulo.completadas === totalLecciones,
      esActual: i === indiceActual,
      destino: (pendiente ?? modulo.lecciones[0])?.id ?? null,
    };
  });

  // Los puntos van por lección real, no por "las primeras N hechas": si
  // el alumno saltó una a mitad del módulo, el hueco se ve.
  const leccionesDeModulo = new Map(
    arbol.modulos.map((modulo) => [modulo.id, modulo.lecciones.map((l) => l.completada)])
  );

  const numerosDeMes = Array.from(new Set(modulos.map((m) => m.mes))).sort((a, b) => a - b);

  const meses: MesTemario[] = numerosDeMes.map((numero) => {
    const delMes = modulos.filter((m) => m.mes === numero);
    const totalLecciones = delMes.reduce((suma, m) => suma + m.totalLecciones, 0);
    const completadas = delMes.reduce((suma, m) => suma + m.completadas, 0);

    const semanas: SemanaTemario[] = [];
    for (const s of Array.from(new Set(delMes.map((m) => m.semana))).sort((a, b) => a - b)) {
      const deLaSemana = delMes.filter((m) => m.semana === s);
      semanas.push({
        numero: s,
        modulos: deLaSemana,
        totalLecciones: deLaSemana.reduce((suma, m) => suma + m.totalLecciones, 0),
      });
    }

    const completo = totalLecciones > 0 && completadas === totalLecciones;
    const tieneActual = delMes.some((m) => m.esActual);
    const estado: EstadoMes = completo
      ? "completado"
      : completadas > 0 || tieneActual
        ? "en-curso"
        : "pendiente";

    const tema = temas?.[numero - 1] ?? null;
    const primero = delMes[0]?.numero;
    const ultimo = delMes[delMes.length - 1]?.numero;

    return {
      numero,
      tema,
      titulo: tema ?? (primero !== undefined ? `Módulos ${primero} a ${ultimo}` : `Mes ${numero}`),
      semanas,
      totalModulos: delMes.length,
      totalLecciones,
      completadas,
      porcentaje: porcentajeDe(completadas, totalLecciones),
      puntos: delMes.flatMap((m) => leccionesDeModulo.get(m.id) ?? []),
      estado,
    };
  });

  const actual = modulos.find((m) => m.esActual) ?? null;

  return {
    meses,
    totalModulos: modulos.length,
    totalLecciones: arbol.total,
    completadas: arbol.completadas,
    porcentaje: porcentajeDe(arbol.completadas, arbol.total),
    // Semanas de verdad, contando las que existen en cada mes: un mes a
    // medio cargar no debe inflar el titular con semanas vacías.
    totalSemanas: meses.reduce((suma, mes) => suma + mes.semanas.length, 0),
    actual: actual
      ? {
          mes: actual.mes,
          semana: actual.semana,
          modulo: actual.numero,
          titulo: actual.titulo,
          completadas: actual.completadas,
          totalLecciones: actual.totalLecciones,
          destino: actual.destino,
        }
      : null,
  };
}
