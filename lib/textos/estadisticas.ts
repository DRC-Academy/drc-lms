// ---------------------------------------------------------------
// LAS ESTADÍSTICAS: «CÓMO VAS» Y EL ANILLO DEL CURSO
//
// EL CERO NO SE ESCRIBE. 136 de 204 alumnos están al 0 % de su curso y
// casi ninguno ha respondido un ejercicio todavía: para ellos esto es lo
// primero que ven. Un «0» en grande se lee como una nota, así que cada
// cifra tiene su estado de bienvenida, que dice qué va a aparecer ahí y
// no cuánto falta.
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

  // --- «Cómo vas»: la tarjeta ---
  nivel: string;
  tarjeta: {
    /** Debajo de la cifra grande: «clases con Silvia». */
    clases: (n: number, profesor: string | null) => string;
    /** Sin clases todavía, en lugar de la cifra. */
    clasesVacio: (profesor: string | null) => string;
    estimado: string;
    /** Junto al nivel confirmado, si no hay nombre de profesor. */
    confirmado: string;
    ejercicios: (n: number) => string;
    practicas: (n: number) => string;
    semanas: (n: number) => string;
    /** El círculo de la práctica a cero, que lleva a «Para ti». */
    empiezaAqui: string;
    empiezaPractica: string;
  };
  /** Lo que oye el lector de pantalla, una frase por dato. */
  lector: {
    nivel: (valor: string, confirmado: boolean) => string;
    ejercicios: (n: number) => string;
    ejerciciosVacio: string;
    tiempo: (restantes: number, total: number) => string;
    clases: (n: number, profesor: string | null) => string;
    clasesVacio: string;
    practica: (n: number) => string;
    practicaVacio: string;
  };
};

const ES: TextosEstadisticas = {
  titulo: "Cómo vas",

  cursoCorto: "Curso",
  lecciones: (hechas, total) => `${hechas} de ${total} ${total === 1 ? "lección" : "lecciones"}`,
  porcentajeDe: (porcentaje, curso) => `${porcentaje} % de ${curso}`,
  cursoVacioTitulo: "Tu curso te espera",
  cursoVacioTexto: "Empieza por la primera lección cuando quieras.",
  cursoCompleto: "Curso completado",

  nivel: "Nivel",
  tarjeta: {
    clases: (n, profesor) => `${n === 1 ? "clase" : "clases"}${profesor ? ` con ${profesor}` : ""}`,
    clasesVacio: (profesor) =>
      profesor ? `Tu primera clase con ${profesor} sumará aquí` : "Tu primera clase sumará aquí",
    estimado: "estimado",
    confirmado: "confirmado",
    ejercicios: (n) => (n === 1 ? "ejercicio" : "ejercicios"),
    practicas: (n) => (n === 1 ? "práctica" : "prácticas"),
    semanas: (n) => (n === 1 ? "semana para acabar" : "semanas para acabar"),
    empiezaAqui: "Empieza aquí",
    empiezaPractica: "Empieza tu primera práctica en «Para ti»",
  },
  lector: {
    nivel: (valor, confirmado) =>
      confirmado
        ? `Nivel ${valor}, confirmado por tu profesor.`
        : `Nivel ${valor}, estimado: te lo confirmará tu profesor.`,
    ejercicios: (n) => `Ejercicios: ${n} ${n === 1 ? "hecho" : "hechos"}.`,
    ejerciciosVacio: "Ejercicios: tus ejercicios sumarán aquí.",
    tiempo: (restantes, total) =>
      `Tiempo de curso: ${restantes} ${restantes === 1 ? "semana" : "semanas"} para completar tu curso, de ${total}.`,
    clases: (n, profesor) => `Clases: ${n}${profesor ? ` con ${profesor}` : ""}.`,
    clasesVacio: "Clases: tu primera clase sumará aquí.",
    practica: (n) => `Práctica: ${n} ${n === 1 ? "bloque hecho" : "bloques hechos"}.`,
    practicaVacio: "Práctica: empieza aquí.",
  },
};

const EN: TextosEstadisticas = {
  titulo: "How you're doing",

  cursoCorto: "Course",
  lecciones: (hechas, total) => `${hechas} of ${total} ${total === 1 ? "lesson" : "lessons"}`,
  porcentajeDe: (porcentaje, curso) => `${porcentaje}% of ${curso}`,
  cursoVacioTitulo: "Ready when you are",
  cursoVacioTexto: "Start with the first lesson whenever you like.",
  cursoCompleto: "Course complete",

  nivel: "Level",
  tarjeta: {
    clases: (n, profesor) => `${n === 1 ? "class" : "classes"}${profesor ? ` with ${profesor}` : ""}`,
    clasesVacio: (profesor) =>
      profesor ? `Your first class with ${profesor} will count here` : "Your first class will count here",
    estimado: "estimated",
    confirmado: "confirmed",
    ejercicios: (n) => (n === 1 ? "exercise" : "exercises"),
    practicas: (n) => (n === 1 ? "practice" : "practices"),
    semanas: (n) => (n === 1 ? "week to go" : "weeks to go"),
    empiezaAqui: "Start here",
    empiezaPractica: "Start your first practice in “For you”",
  },
  lector: {
    nivel: (valor, confirmado) =>
      confirmado
        ? `Level ${valor}, confirmed by your teacher.`
        : `Level ${valor}, estimated: your teacher will confirm it.`,
    ejercicios: (n) => `Exercises: ${n} done.`,
    ejerciciosVacio: "Exercises: yours will add up here.",
    tiempo: (restantes, total) =>
      `Course time: ${restantes} ${restantes === 1 ? "week" : "weeks"} to complete your course, out of ${total}.`,
    clases: (n, profesor) => `Classes: ${n}${profesor ? ` with ${profesor}` : ""}.`,
    clasesVacio: "Classes: your first class will count here.",
    practica: (n) => `Practice: ${n} ${n === 1 ? "block done" : "blocks done"}.`,
    practicaVacio: "Practice: starts here.",
  },
};

export const ESTADISTICAS: Record<Idioma, TextosEstadisticas> = { en: EN, es: ES };
