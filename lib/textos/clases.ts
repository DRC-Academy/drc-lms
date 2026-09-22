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
// LA PRÓXIMA CLASE ES LA DEL CALENDARIO DE SU PROFESOR en Gestión, con
// las recuperaciones y sin las cancelaciones anotadas (ver
// `lib/calendario-gestion.ts`). Aun así los textos no dicen en ningún
// sitio "confirmada": un cambio de última hora que el profesor no anote
// no llega aquí.
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

  /** Junto a la hora, discreto: "(hora de Madrid)". */
  horaDeMadrid: string;

  // --- el botón ---
  unirse: string;
  /** Debajo del botón en gris, mientras la sala no se ha abierto. */
  seAbreAntes: string;
  /** Lo que se lee en vez del botón cuando no hay enlace utilizable. */
  sinEnlace: string;

  /** La línea que sustituye al banner cuando no hay próxima clase. */
  sinProxima: string;

  // --- el inicio ---
  /** La línea del saludo: "Tu próxima clase: jueves 24 de septiembre, 20:00". */
  lineaProxima: (cuando: string, hora: string) => string;
  /** Etiqueta de la franja cuando la sala está abierta y la clase aún no empezó. */
  empiezaPronto: string;
  /** Debajo de la hora en la franja: "Con Ignacio · hora de Madrid". */
  conQuienYZona: (profesor: string | null) => string;
  /** Dónde ha ido el «Continuar» mientras la franja es la clase. */
  cursoEnMiCurso: string;
  /** Delante del nombre del profesor, que va en negrita: "Con" / "With". */
  con: string;

  // --- el calendario ---
  calendario: string;
  /** El rango de la semana: "Del 21 al 27 de septiembre". */
  rangoSemana: (lunes: { dia: number; mes: number }, domingo: { dia: number; mes: number }) => string;
  estaSemana: string;
  semanaAnterior: string;
  semanaSiguiente: string;
  /** La línea neutra de una semana sin clases. */
  semanaSinClases: string;
  /** "lun" / "Mon", para la cabecera de las columnas. */
  diaCorto: (dia: DiaSemana) => string;
  /** El día de la agenda de móvil: "Jueves 24 de septiembre". */
  diaAgenda: (dia: DiaSemana, numero: number, mes: number) => string;
  recuperacion: string;
  /** "Clase del lunes 28 reprogramada al jueves 1, 18:00". */
  reprogramada: (original: { dia: DiaSemana; numero: number }, nueva: { dia: DiaSemana; numero: number }, hora: string) => string;
  cancelada: string;

  // --- el historial ---
  historial: string;
  historialAyuda: string;
  historialVacio: string;
  /** El rótulo de los temas de cada clase. */
  temasYVocabulario: string;

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

/** 1st, 2nd, 3rd, 4th… 11th, 12th, 13th, 21st. */
function ordinal(n: number): string {
  const decena = n % 100;
  if (decena >= 11 && decena <= 13) return `${n}th`;
  const sufijo = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${sufijo}`;
}

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
    horaDeMadrid: "(hora de Madrid)",

    unirse: "Unirse a la clase",
    seAbreAntes: "Se abre 30 minutos antes",
    sinEnlace: "Habla con tu profesor para el enlace",

    sinProxima: "Aún no tienes tu próxima clase programada",

    lineaProxima: (cuando, hora) => `Tu próxima clase: ${cuando}, ${hora}`,
    empiezaPronto: "Tu clase empieza pronto",
    conQuienYZona: (profesor) => (profesor ? `Con ${profesor} · hora de Madrid` : "Hora de Madrid"),
    cursoEnMiCurso: "Tu curso te espera cuando termines",
    con: "Con",

    calendario: "Tu calendario",
    rangoSemana: (l, d) =>
      l.mes === d.mes
        ? `Del ${l.dia} al ${d.dia} de ${MESES_ES[d.mes]}`
        : `Del ${l.dia} de ${MESES_ES[l.mes]} al ${d.dia} de ${MESES_ES[d.mes]}`,
    estaSemana: "Esta semana",
    semanaAnterior: "Semana anterior",
    semanaSiguiente: "Semana siguiente",
    semanaSinClases: "No tienes clases programadas esta semana.",
    diaCorto: (dia) => DIAS_ES[dia].slice(0, 3),
    diaAgenda: (dia, numero, mes) => `${DIAS_ES[dia]} ${numero} de ${MESES_ES[mes]}`,
    recuperacion: "Clase de recuperación",
    reprogramada: (o, n, hora) => `Clase del ${DIAS_ES[o.dia]} ${o.numero} reprogramada al ${DIAS_ES[n.dia]} ${n.numero}, ${hora}`,
    cancelada: "Clase cancelada",

    historial: "Tus clases anteriores",
    historialAyuda: "Lo que trabajaste en cada una, de la más reciente a la primera.",
    historialVacio: "Cuando hayas tenido tu primera clase, aquí verás lo que trabajaste en ella.",
    temasYVocabulario: "Temas y vocabulario",

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
    horaDeMadrid: "(Madrid time)",

    unirse: "Join the class",
    seAbreAntes: "Opens 30 minutes before",
    sinEnlace: "Ask your teacher for the link",

    sinProxima: "Your next class isn't scheduled yet",

    lineaProxima: (cuando, hora) => `Your next class: ${cuando}, ${hora}`,
    empiezaPronto: "Your class starts soon",
    conQuienYZona: (profesor) => (profesor ? `With ${profesor} · Madrid time` : "Madrid time"),
    cursoEnMiCurso: "Your course will be here when you're done",
    con: "With",

    calendario: "Your calendar",
    rangoSemana: (l, d) =>
      l.mes === d.mes
        ? `${l.dia}–${d.dia} ${MESES_EN[d.mes]}`
        : `${l.dia} ${MESES_EN[l.mes]} – ${d.dia} ${MESES_EN[d.mes]}`,
    estaSemana: "This week",
    semanaAnterior: "Previous week",
    semanaSiguiente: "Next week",
    semanaSinClases: "You have no classes scheduled this week.",
    diaCorto: (dia) => DIAS_EN[dia].slice(0, 3),
    diaAgenda: (dia, numero, mes) => `${DIAS_EN[dia]} ${numero} ${MESES_EN[mes]}`,
    recuperacion: "Make-up class",
    reprogramada: (o, n, hora) =>
      `${DIAS_EN[o.dia]} ${ordinal(o.numero)} class moved to ${DIAS_EN[n.dia]} ${ordinal(n.numero)}, ${hora}`,
    cancelada: "Class cancelled",

    historial: "Your past classes",
    historialAyuda: "What you worked on in each one, from the most recent to the first.",
    historialVacio: "Once you've had your first class, you'll see here what you worked on.",
    temasYVocabulario: "Topics and vocabulary",

    tuHorario: "Your schedule",
    nombreDia: (dia) => DIAS_EN[dia],
    duracion: (horas) => (horas === 1 ? "1 hour" : `${horas} hours`),

    sinHorario: "You don't have a schedule yet",
    sinHorarioAyuda:
      "As soon as it's agreed with your teacher, your classes will show up here.",

    horaDeEspana: "All times are mainland Spain time.",
  },
};
