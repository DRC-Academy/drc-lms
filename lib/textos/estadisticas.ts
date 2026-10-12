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
import type { MarcaNivel } from "@/lib/estimacion";

/**
 * Lo que la frase de las clases necesita saber del profesor
 * (`profesorDelAlumno`). Null sin profesor en la ficha.
 */
export type ClasesDelProfesor = {
  nombre: string;
  /** Las que ha dado él. Null si no se pudo contar. */
  conActual: number | null;
  /** Ninguna clase es de otro profesor. */
  soloConActual: boolean;
} | null;

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
    /**
     * Debajo de la cifra grande. Todas con el actual: «clases con Dana».
     * Con más de un profesor: «clases · 7 con Liliana», que con la cifra
     * se lee «16 clases · 7 con Liliana».
     */
    clases: (n: number, profesor: ClasesDelProfesor) => string;
    /** Sin clases todavía, en lugar de la cifra. */
    clasesVacio: (profesor: string | null) => string;
    /**
     * La marca junto al nivel. Con `profesor` va detrás de un ✓ (el icono
     * lo pone el componente): su nombre, o «confirmado» si no se sabe.
     */
    marcaNivel: (origen: MarcaNivel, profesor: string | null) => string;
    ejercicios: (n: number) => string;
    practicas: (n: number) => string;
    /**
     * Debajo del anillo del diploma: lo que falta, en semanas o, en el
     * último mes, en días (`progresoDiploma`).
     */
    paraTuDiploma: (n: number, unidad: "semanas" | "dias") => string;
    /** Cumplidos los seis meses. */
    diplomaConseguido: string;
    /** El círculo de la práctica a cero, que lleva a «Para ti». */
    empiezaAqui: string;
    empiezaPractica: string;
  };
  /** Lo que oye el lector de pantalla, una frase por dato. */
  lector: {
    nivel: (valor: string, origen: MarcaNivel, profesor: string | null) => string;
    ejercicios: (n: number) => string;
    ejerciciosVacio: string;
    diploma: (meses: number, total: number, falta: string) => string;
    diplomaConseguido: string;
    clases: (n: number, profesor: ClasesDelProfesor) => string;
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
    clases: (n, p) => {
      const clases = n === 1 ? "clase" : "clases";
      if (!p) return clases;
      if (p.soloConActual || p.conActual === null) return `${clases} con ${p.nombre}`;
      // Recién cambiado de profesor: todavía ninguna con él, y el cero no se escribe.
      if (p.conActual === 0) return `${clases} · ahora con ${p.nombre}`;
      return `${clases} · ${p.conActual} con ${p.nombre}`;
    },
    clasesVacio: (profesor) =>
      profesor ? `Tu primera clase con ${profesor} sumará aquí` : "Tu primera clase sumará aquí",
    marcaNivel: (origen, profesor) =>
      origen === "profesor" ? (profesor ?? "confirmado") : origen === "prueba" ? "prueba de nivel" : "estimado",
    ejercicios: (n) => (n === 1 ? "ejercicio" : "ejercicios"),
    practicas: (n) => (n === 1 ? "práctica" : "prácticas"),
    paraTuDiploma: (n, unidad) =>
      unidad === "dias"
        ? n === 1 ? "día para tu diploma" : "días para tu diploma"
        : n === 1 ? "semana para tu diploma" : "semanas para tu diploma",
    diplomaConseguido: "Diploma conseguido",
    empiezaAqui: "Empieza aquí",
    empiezaPractica: "Empieza tu primera práctica en «Para ti»",
  },
  lector: {
    nivel: (valor, origen, profesor) =>
      origen === "profesor"
        ? `Nivel ${valor}, confirmado por ${profesor ?? "tu profesor"}.`
        : origen === "prueba"
          ? `Nivel ${valor}, según tu prueba de nivel.`
          : `Nivel ${valor}, estimado: te lo confirmará tu profesor.`,
    ejercicios: (n) => `Ejercicios: ${n} ${n === 1 ? "hecho" : "hechos"}.`,
    ejerciciosVacio: "Ejercicios: tus ejercicios sumarán aquí.",
    diploma: (meses, total, falta) => `Tu diploma: ${meses} de ${total} meses completados; ${falta}.`,
    diplomaConseguido: "Tu diploma: conseguido.",
    clases: (n, p) =>
      !p
        ? `Clases: ${n}.`
        : p.soloConActual || p.conActual === null
          ? `Clases: ${n} con ${p.nombre}.`
          : p.conActual === 0
            ? `Clases: ${n}; ahora con ${p.nombre}.`
            : `Clases: ${n}, ${p.conActual} con ${p.nombre}.`,
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
    clases: (n, p) => {
      const clases = n === 1 ? "class" : "classes";
      if (!p) return clases;
      if (p.soloConActual || p.conActual === null) return `${clases} with ${p.nombre}`;
      if (p.conActual === 0) return `${clases} · now with ${p.nombre}`;
      return `${clases} · ${p.conActual} with ${p.nombre}`;
    },
    clasesVacio: (profesor) =>
      profesor ? `Your first class with ${profesor} will count here` : "Your first class will count here",
    marcaNivel: (origen, profesor) =>
      origen === "profesor" ? (profesor ?? "confirmed") : origen === "prueba" ? "level test" : "estimated",
    ejercicios: (n) => (n === 1 ? "exercise" : "exercises"),
    practicas: (n) => (n === 1 ? "practice" : "practices"),
    paraTuDiploma: (n, unidad) =>
      unidad === "dias"
        ? n === 1 ? "day to your diploma" : "days to your diploma"
        : n === 1 ? "week to your diploma" : "weeks to your diploma",
    diplomaConseguido: "Diploma earned",
    empiezaAqui: "Start here",
    empiezaPractica: "Start your first practice in “For you”",
  },
  lector: {
    nivel: (valor, origen, profesor) =>
      origen === "profesor"
        ? `Level ${valor}, confirmed by ${profesor ?? "your teacher"}.`
        : origen === "prueba"
          ? `Level ${valor}, from your level test.`
          : `Level ${valor}, estimated: your teacher will confirm it.`,
    ejercicios: (n) => `Exercises: ${n} done.`,
    ejerciciosVacio: "Exercises: yours will add up here.",
    diploma: (meses, total, falta) => `Your diploma: ${meses} of ${total} months completed; ${falta}.`,
    diplomaConseguido: "Your diploma: earned.",
    clases: (n, p) =>
      !p
        ? `Classes: ${n}.`
        : p.soloConActual || p.conActual === null
          ? `Classes: ${n} with ${p.nombre}.`
          : p.conActual === 0
            ? `Classes: ${n}; now with ${p.nombre}.`
            : `Classes: ${n}, ${p.conActual} with ${p.nombre}.`,
    clasesVacio: "Classes: your first class will count here.",
    practica: (n) => `Practice: ${n} ${n === 1 ? "block done" : "blocks done"}.`,
    practicaVacio: "Practice: starts here.",
  },
};

export const ESTADISTICAS: Record<Idioma, TextosEstadisticas> = { en: EN, es: ES };
