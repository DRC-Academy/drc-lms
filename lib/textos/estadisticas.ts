// ---------------------------------------------------------------
// LAS ESTADÍSTICAS: BARRA LATERAL Y FILA DEL INICIO
//
// EL CERO NO SE ESCRIBE. 136 de 204 alumnos están al 0 % de su curso y
// casi ninguno ha respondido un ejercicio todavía: para ellos esto es lo
// primero que ven. Un «0» en grande se lee como una nota, así que cada
// cifra tiene su estado de bienvenida, que dice qué va a aparecer ahí y
// no cuánto falta.
//
// El nivel y las clases reutilizan las etiquetas de «Mi progreso»
// (`progreso.nivelActual`, `progreso.nivelEstimado`,
// `progreso.clasesHechas`): es el mismo dato y se llama igual.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosEstadisticas = {
  /** El nombre del bloque, para lectores de pantalla y el rótulo de escritorio. */
  titulo: string;

  // --- el curso ---
  /** La etiqueta corta de debajo del anillo, en la barra plegada. */
  cursoCorto: string;
  /** "12 de 187 lecciones" */
  lecciones: (hechas: number, total: number) => string;
  /** Lo que lee un lector de pantalla en el anillo: "6 % de Inglés B1". */
  porcentajeDe: (porcentaje: number, curso: string) => string;
  /** Con 0 lecciones: en vez del 0 %. */
  cursoVacioTitulo: string;
  cursoVacioTexto: string;
  cursoCompleto: string;

  // --- las clases y los ejercicios ---
  clasesVacio: string;
  ejercicios: (n: number) => string;
  ejerciciosVacio: string;
};

const ES: TextosEstadisticas = {
  titulo: "Cómo vas",

  cursoCorto: "Curso",
  lecciones: (hechas, total) => `${hechas} de ${total} ${total === 1 ? "lección" : "lecciones"}`,
  porcentajeDe: (porcentaje, curso) => `${porcentaje} % de ${curso}`,
  cursoVacioTitulo: "Tu curso te espera",
  cursoVacioTexto: "Empieza por la primera lección cuando quieras.",
  cursoCompleto: "Curso completado",

  clasesVacio: "Aquí irán sumando tus clases.",
  ejercicios: (n) => (n === 1 ? "Ejercicio hecho" : "Ejercicios hechos"),
  ejerciciosVacio: "Los ejercicios de cada lección se irán contando aquí.",
};

const EN: TextosEstadisticas = {
  titulo: "How you're doing",

  cursoCorto: "Course",
  lecciones: (hechas, total) => `${hechas} of ${total} ${total === 1 ? "lesson" : "lessons"}`,
  porcentajeDe: (porcentaje, curso) => `${porcentaje}% of ${curso}`,
  cursoVacioTitulo: "Ready when you are",
  cursoVacioTexto: "Start with the first lesson whenever you like.",
  cursoCompleto: "Course complete",

  clasesVacio: "Your classes will add up here.",
  ejercicios: (n) => (n === 1 ? "Exercise done" : "Exercises done"),
  ejerciciosVacio: "The exercises in each lesson will be counted here.",
};

export const ESTADISTICAS: Record<Idioma, TextosEstadisticas> = { en: EN, es: ES };
