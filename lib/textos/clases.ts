// ---------------------------------------------------------------
// «MIS CLASES»
//
// La sección que dice cuándo es la próxima clase y abre la sala.
//
// LOS DÍAS SE TRADUCEN AQUÍ, y no con `Intl`, porque el nombre no sale
// de una fecha: sale del texto que Gestión guarda en `slots` —"Miércoles",
// con tilde y en español— y hay que convertirlo. Pedirle a `Intl` el día
// de una fecha inventada para traducir una cadena sería dar un rodeo
// para acabar en el mismo diccionario.
//
// NO SE PROMETE NADA QUE NO SEPAMOS. El horario que viaja de Gestión es
// el ACORDADO, no la agenda: una de cada cuatro clases se mueve
// —recuperaciones, reprogramaciones— y eso no llega aquí. Por eso los
// textos hablan de "tu horario" y la próxima clase se presenta como lo
// que toca según ese horario, sin decir en ningún sitio "confirmada".
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import type { DiaSemana } from "@/lib/clases";

export type TextosClases = {
  /** Título de la pantalla y de la pestaña. */
  misClases: string;
  /** Bajada del título. */
  tuHorarioSemanal: string;

  // --- el banner de la próxima ---
  proximaClase: string;
  /** Cuando está ocurriendo ahora mismo. */
  claseEnCurso: string;
  /** "hoy" y "mañana" sustituyen a la fecha cuando toca. */
  hoy: string;
  manana: string;
  /** "jueves 25 de septiembre" */
  fechaLarga: (dia: DiaSemana, numero: number, mes: number) => string;
  /** "16:00 – 18:00" */
  franja: (desde: string, hasta: string) => string;
  /** "con Jimena" */
  conProfesor: (nombre: string) => string;

  // --- el botón ---
  unirse: string;
  /** Lo que se lee en vez del botón cuando no hay enlace utilizable. */
  sinEnlace: string;
  sinEnlaceAyuda: string;

  // --- la lista del horario ---
  tuHorario: string;
  nombreDia: (dia: DiaSemana) => string;
  /** "1 hora" / "2 horas" */
  duracion: (horas: number) => string;

  // --- estados vacíos ---
  sinHorario: string;
  sinHorarioAyuda: string;

  /** Aviso de la zona horaria, al pie. */
  horaDeEspana: string;
};

const DIAS_ES: Record<DiaSemana, string> = {
  Domingo: "domingo",
  Lunes: "lunes",
  Martes: "martes",
  Miércoles: "miércoles",
  Jueves: "jueves",
  Viernes: "viernes",
  Sábado: "sábado",
};

const DIAS_EN: Record<DiaSemana, string> = {
  Domingo: "Sunday",
  Lunes: "Monday",
  Martes: "Tuesday",
  Miércoles: "Wednesday",
  Jueves: "Thursday",
  Viernes: "Friday",
  Sábado: "Saturday",
};

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const CLASES: Record<Idioma, TextosClases> = {
  es: {
    misClases: "Mis clases",
    tuHorarioSemanal: "Cuándo es tu próxima clase y dónde entrar.",

    proximaClase: "Tu próxima clase",
    claseEnCurso: "Tu clase es ahora",
    hoy: "hoy",
    manana: "mañana",
    fechaLarga: (dia, numero, mes) => `${DIAS_ES[dia]} ${numero} de ${MESES_ES[mes]}`,
    franja: (desde, hasta) => `${desde} – ${hasta}`,
    conProfesor: (nombre) => `con ${nombre}`,

    unirse: "Unirse a la clase",
    sinEnlace: "Sin enlace todavía",
    sinEnlaceAyuda: "Habla con tu profesor para que te pase el enlace de la clase.",

    tuHorario: "Tu horario",
    nombreDia: (dia) => DIAS_ES[dia],
    duracion: (horas) => (horas === 1 ? "1 hora" : `${horas} horas`),

    sinHorario: "Todavía no tienes horario",
    sinHorarioAyuda:
      "En cuanto se fije con tu profesor, tus clases aparecerán aquí.",

    horaDeEspana: "Todas las horas son de España peninsular.",
  },

  en: {
    misClases: "My classes",
    tuHorarioSemanal: "When your next class is, and where to join.",

    proximaClase: "Your next class",
    claseEnCurso: "Your class is now",
    hoy: "today",
    manana: "tomorrow",
    fechaLarga: (dia, numero, mes) => `${DIAS_EN[dia]} ${numero} ${MESES_EN[mes]}`,
    franja: (desde, hasta) => `${desde} – ${hasta}`,
    conProfesor: (nombre) => `with ${nombre}`,

    unirse: "Join the class",
    sinEnlace: "No link yet",
    sinEnlaceAyuda: "Ask your teacher to send you the link for the class.",

    tuHorario: "Your schedule",
    nombreDia: (dia) => DIAS_EN[dia],
    duracion: (horas) => (horas === 1 ? "1 hour" : `${horas} hours`),

    sinHorario: "You don't have a schedule yet",
    sinHorarioAyuda:
      "As soon as it's agreed with your teacher, your classes will show up here.",

    horaDeEspana: "All times are mainland Spain time.",
  },
};
