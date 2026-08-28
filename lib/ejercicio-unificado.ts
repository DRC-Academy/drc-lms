// ---------------------------------------------------------------
// UNA SOLA FORMA DE EJERCICIO
//
// El LMS tiene dos fuentes de ejercicios que no se parecen en nada por
// dentro:
//
//   EL CURSO (`ejercicios_leccion`, importado de LearnDash)
//     single   → una opción         correcta: [2]
//     multiple → varias opciones    correcta: [0, 2, 3]
//     cloze    → huecos {{1}} {{2}} correcta: [["was"], ["were"]]
//     essay    → sin corrección     correcta: null
//     Sin explicación: los 1.492 la traen vacía.
//
//   LA PRÁCTICA GENERADA (`lib/data.ts`, escrita por la IA)
//     reconocer   → enunciado + opciones + correcta: 0 + explicación
//     transformar → instrucción + frase + respuestas[] + pista
//     producir    → instrucción + contexto + criterios[] + modelo
//
// Hasta ahora cada una tenía su visor, y esa era la razón de que se
// separaran más en cada cambio. Aquí se traducen las dos a la misma
// forma ANTES de pintar nada, y a partir de ese punto el visor no sabe
// —ni tiene por qué saber— de dónde vino el ejercicio.
//
// LA CLAVE ES `forma`, Y NO ES EL TIPO DE ORIGEN. Describe CÓMO se
// responde, que es lo único que cambia la pantalla:
//
//   opciones   pulsar una o varias   single, multiple, reconocer
//   huecos     escribir dentro       cloze
//   escritura  reescribir una frase  transformar
//   libre      texto sin corrección  producir, essay
//
// Un `single` del curso y un `reconocer` generado se pintan igual porque
// SON lo mismo; que uno venga de WordPress y el otro de un modelo es un
// detalle del origen, no del ejercicio.
// ---------------------------------------------------------------

import type { Ejercicio } from "@/lib/data";
import { huecosAceptados, indicesCorrectos, type EjercicioVista } from "@/lib/ejercicios";

/** Las tres fases de un bloque generado. El curso no tiene fases. */
export type Fase = "reconocer" | "transformar" | "producir";

export type FormaEjercicio = "opciones" | "huecos" | "escritura" | "libre";

export type EjercicioUnificado = {
  id: string;
  forma: FormaEjercicio;
  /**
   * La fase del bloque generado, para el lateral y la etiqueta. `null`
   * en el curso, y ese null es lo que apaga toda esa parte de la
   * interfaz sin necesidad de una bandera aparte.
   */
  fase: Fase | null;
  /** La pregunta. En `huecos` lleva los {{n}} dentro, en su sitio. */
  enunciado: string;
  /**
   * Texto secundario bajo el enunciado: la frase que hay que reescribir
   * en `escritura`, el contexto de la consigna en `libre`. `null` cuando
   * el enunciado se basta solo, que es todo el curso.
   */
  apoyo: string | null;
  opciones: string[];
  /** Índices correctos sobre `opciones`. Solo en `opciones`. */
  correctas: number[];
  /** Si admite marcar más de una. Cambia la insignia y pide "Comprobar". */
  variasCorrectas: boolean;
  /** Respuestas aceptadas por hueco. Solo en `huecos`. */
  huecos: string[][];
  /** Respuestas aceptadas. La primera es la que se enseña al fallar. */
  respuestas: string[];
  pista: string | null;
  /** Autoevaluación de `libre`: lo que el alumno marca sobre su texto. */
  criterios: string[];
  modelo: string | null;
  /**
   * SOLO LA PRÁCTICA GENERADA LA TIENE. En el curso es `null` siempre, y
   * el visor no reserva sitio para ella: un hueco vacío donde debería
   * haber una explicación se lee como contenido que no ha cargado.
   */
  explicacion: string | null;
  /**
   * LA FRASE QUE ENCABEZA LA CORRECCIÓN, escrita para ESTE ejercicio.
   *
   * Null en el curso, que no la trae, y null también en el bloque
   * generado al que el modelo no se la rellenó. En los dos casos el
   * visor pone el veredicto de siempre, así que esto no es un dato que
   * pueda faltar: es uno que a veces mejora el que ya había.
   */
  veredictoAcierto: string | null;
  veredictoFallo: string | null;
};

/** Los valores por defecto. Cada adaptador pisa lo suyo y nada más. */
const BASE: Omit<EjercicioUnificado, "id" | "forma" | "enunciado"> = {
  fase: null,
  apoyo: null,
  opciones: [],
  correctas: [],
  variasCorrectas: false,
  huecos: [],
  respuestas: [],
  pista: null,
  criterios: [],
  modelo: null,
  explicacion: null,
  veredictoAcierto: null,
  veredictoFallo: null,
};

/** Texto limpio, o null si no hay nada que enseñar. */
function texto(valor: string | null | undefined): string | null {
  const limpio = (valor ?? "").trim();
  return limpio === "" ? null : limpio;
}

/**
 * Un ejercicio del curso.
 *
 * `essay` cae en `libre` sin criterios ni modelo. Hoy no hay ninguno
 * —los 1.492 son single, multiple o cloze— pero el tipo existe en el
 * CHECK de la tabla y dejarlo sin rama lo pintaría en blanco el día que
 * alguien importe uno.
 */
export function desdeCurso(ejercicio: EjercicioVista): EjercicioUnificado {
  const forma: FormaEjercicio =
    ejercicio.tipo === "cloze" ? "huecos" : ejercicio.tipo === "essay" ? "libre" : "opciones";

  return {
    ...BASE,
    id: ejercicio.id,
    forma,
    enunciado: ejercicio.enunciado,
    opciones: ejercicio.opciones,
    correctas: forma === "opciones" ? indicesCorrectos(ejercicio.correcta) : [],
    variasCorrectas: ejercicio.tipo === "multiple",
    huecos: forma === "huecos" ? huecosAceptados(ejercicio.correcta) : [],
  };
}

/** Un ejercicio de un bloque generado. */
export function desdePractica(ejercicio: Ejercicio): EjercicioUnificado {
  if (ejercicio.tipo === "reconocer") {
    return {
      ...BASE,
      id: ejercicio.id,
      forma: "opciones",
      fase: "reconocer",
      enunciado: ejercicio.enunciado,
      opciones: ejercicio.opciones,
      // El generado guarda UN índice suelto; el curso, un array. Aquí se
      // quedan los dos en array, que es la forma que admite las dos.
      correctas: [ejercicio.correcta],
      explicacion: texto(ejercicio.explicacion),
      veredictoAcierto: texto(ejercicio.veredictoAcierto),
      veredictoFallo: texto(ejercicio.veredictoFallo),
    };
  }

  if (ejercicio.tipo === "transformar") {
    return {
      ...BASE,
      id: ejercicio.id,
      forma: "escritura",
      fase: "transformar",
      enunciado: ejercicio.instruccion,
      apoyo: ejercicio.frase,
      respuestas: ejercicio.respuestas,
      pista: texto(ejercicio.pista),
      explicacion: texto(ejercicio.explicacion),
      veredictoAcierto: texto(ejercicio.veredictoAcierto),
      veredictoFallo: texto(ejercicio.veredictoFallo),
    };
  }

  return {
    ...BASE,
    id: ejercicio.id,
    forma: "libre",
    fase: "producir",
    enunciado: ejercicio.instruccion,
    apoyo: texto(ejercicio.contexto),
    criterios: ejercicio.criterios,
    modelo: texto(ejercicio.modelo),
  };
}
