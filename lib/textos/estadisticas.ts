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

  // --- «Cómo vas»: los cuatro anillos ---
  nivel: string;
  nivelEstimado: string;
  nivelConfirmado: string;
  anillos: {
    curso: string;
    deLoDesbloqueado: string;
    todoLoDesbloqueado: string;
    cursoInvita: string;
    tiempo: string;
    paraCompletar: string;
    /** La unidad bajo el número: «sem.» / «semana». */
    semanas: (n: number) => string;
    clases: string;
    conProfesor: (profesor: string) => string;
    /** Sin nombre de profesor. */
    clasesHechas: string;
    clasesInvita: string;
    practica: string;
    ejerciciosHechos: string;
    practicaInvita: string;
  };
  /** Lo que oye el lector de pantalla en cada anillo. */
  lector: {
    curso: (porcentaje: number) => string;
    cursoVacio: string;
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

  clasesVacio: "Aquí irán sumando tus clases.",
  ejercicios: (n) => (n === 1 ? "Ejercicio hecho" : "Ejercicios hechos"),
  ejerciciosVacio: "Los ejercicios de cada lección se irán contando aquí.",

  nivel: "Nivel",
  nivelEstimado: "Estimado · confírmalo con tu profesor",
  nivelConfirmado: "confirmado",
  anillos: {
    curso: "Curso",
    deLoDesbloqueado: "de lo desbloqueado",
    todoLoDesbloqueado: "todo lo desbloqueado",
    cursoInvita: "Empieza tu primera lección",
    tiempo: "Tiempo de curso",
    paraCompletar: "para completar tu curso",
    semanas: (n) => (n === 1 ? "semana" : "sem."),
    clases: "Clases",
    conProfesor: (profesor) => `con ${profesor}`,
    clasesHechas: "hechas",
    clasesInvita: "Tu primera clase sumará aquí",
    practica: "Práctica",
    ejerciciosHechos: "ejercicios hechos",
    practicaInvita: "Tu práctica empieza aquí",
  },
  lector: {
    curso: (porcentaje) => `Curso: ${porcentaje} % de lo desbloqueado.`,
    cursoVacio: "Curso: empieza tu primera lección.",
    tiempo: (restantes, total) =>
      `Tiempo de curso: ${restantes} ${restantes === 1 ? "semana" : "semanas"} para completar tu curso, de ${total}.`,
    clases: (n, profesor) => `Clases: ${n}${profesor ? ` con ${profesor}` : ""}.`,
    clasesVacio: "Clases: tu primera clase sumará aquí.",
    practica: (n) => `Práctica: ${n} ${n === 1 ? "ejercicio hecho" : "ejercicios hechos"}.`,
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

  clasesVacio: "Your classes will add up here.",
  ejercicios: (n) => (n === 1 ? "Exercise done" : "Exercises done"),
  ejerciciosVacio: "The exercises in each lesson will be counted here.",

  nivel: "Level",
  nivelEstimado: "Estimated · confirm it with your teacher",
  nivelConfirmado: "confirmed",
  anillos: {
    curso: "Course",
    deLoDesbloqueado: "of what's unlocked",
    todoLoDesbloqueado: "all that's unlocked",
    cursoInvita: "Start your first lesson",
    tiempo: "Course time",
    paraCompletar: "to complete your course",
    semanas: (n) => (n === 1 ? "week" : "wks"),
    clases: "Classes",
    conProfesor: (profesor) => `with ${profesor}`,
    clasesHechas: "done",
    clasesInvita: "Your first class will count here",
    practica: "Practice",
    ejerciciosHechos: "exercises done",
    practicaInvita: "Your practice starts here",
  },
  lector: {
    curso: (porcentaje) => `Course: ${porcentaje}% of what's unlocked.`,
    cursoVacio: "Course: start your first lesson.",
    tiempo: (restantes, total) =>
      `Course time: ${restantes} ${restantes === 1 ? "week" : "weeks"} to complete your course, out of ${total}.`,
    clases: (n, profesor) => `Classes: ${n}${profesor ? ` with ${profesor}` : ""}.`,
    clasesVacio: "Classes: your first class will count here.",
    practica: (n) => `Practice: ${n} ${n === 1 ? "exercise done" : "exercises done"}.`,
    practicaVacio: "Practice: starts here.",
  },
};

export const ESTADISTICAS: Record<Idioma, TextosEstadisticas> = { en: EN, es: ES };
