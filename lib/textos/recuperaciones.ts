// ---------------------------------------------------------------
// LAS RECUPERACIONES DE CLASES CANCELADAS
//
// Las tarjetas de «Mis clases» y el aviso del inicio cuando el profesor
// cancela una clase y hay que buscarle otra fecha (ver
// `lib/recuperaciones.ts`).
//
// Las fechas entran como texto de Gestión ("2026-10-12") y se escriben
// aquí, en cada idioma; las horas van tal cual ("17:00"), que es como se
// leen en España.
//
// LOS MENSAJES DE ERROR, POR CÓDIGO. Gestión manda el suyo ya escrito,
// pero en español: en español se enseña el de Gestión y estos son la
// reserva; en inglés se usan estos.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import { partesFecha } from "@/lib/recuperaciones-fechas";

export type TextosRecuperaciones = {
  /** Título de la sección en «Mis clases». */
  titulo: string;
  /** Encima de las tarjetas, si alguna clase se recupera en dos partes. */
  dosPartes: string;
  parte: (numero: number, de: number) => string;

  // --- esperando al alumno ---
  claseCancelada: string;
  /** "Ignacio no puede dar tu clase del jueves 8 de octubre a las 17:00. Te propone dos fechas para recuperarla:" */
  noPuede: (profesor: string, fecha: string, hora: string, opciones: number) => string;
  /** En la segunda vuelta, después de que el alumno propusiera. */
  rondaDos: string;
  /** El botón de cada fecha: "Lunes 12 de octubre · 17:00". */
  opcion: (fecha: string, hora: string) => string;
  ninguna: string;
  confirmas: (fecha: string, hora: string) => string;
  siConfirmar: string;
  confirmando: string;
  cambiar: string;
  hecho: (fecha: string, hora: string) => string;

  // --- «ninguna me viene bien» ---
  tituloFormulario: string;
  explicacionFormulario: (profesor: string) => string;
  dia: string;
  /** La chapa de cada día: "Lun" y "5 oct". */
  diaCorto: (fecha: string) => { semana: string; fecha: string };
  hora: string;
  anadir: string;
  /** "Tus horarios (2 de 3)" */
  tusHorarios: (n: number, max: number) => string;
  quitar: string;
  /** El horario ya elegido, en la lista: "Martes 14 de octubre · 18:00". */
  horario: (fecha: string, hora: string) => string;
  yaTienesMax: (max: number) => string;
  yaEsta: string;
  eligeDia: string;
  eligeHora: string;
  faltaHorario: string;
  nota: string;
  marcadorNota: string;
  enviarA: (profesor: string) => string;
  enviando: string;
  volverAOpciones: string;
  /** Tras enviar: el profesor tiene que contestar. */
  enviado: (profesor: string) => string;

  // --- los demás estados ---
  esperando: (profesor: string) => string;
  tusPropuestas: string;
  tuNota: string;
  recuperacionConfirmada: string;
  /** "Lunes 12 de octubre a las 17:00 con Ignacio" */
  confirmadaCon: (fecha: string, hora: string, profesor: string) => string;
  sinAcuerdo: string;
  /** Debajo del título, la clase de la que viene: "Clase del jueves 8 de octubre · 17:00". */
  deLaClase: (fecha: string, hora: string) => string;

  // --- historial ---
  historial: string;
  recuperada: (fecha: string, hora: string) => string;
  anulada: (fecha: string, hora: string) => string;

  // --- el equipo ---
  soloLectura: string;

  // --- errores ---
  noSePuedeCargar: string;
  errorDe: (codigo: string) => string;

  // --- el aviso del inicio ---
  avisoInicio: (n: number) => string;
  elegirFecha: string;
};

const DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "jueves 8 de octubre" */
function largaEs(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DIAS_ES[p.diaSemana]} ${p.numero} de ${MESES_ES[p.mes]}`;
}
/** "lunes 12" */
function cortaEs(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DIAS_ES[p.diaSemana]} ${p.numero}`;
}
/** "Thursday 8 October" */
function largaEn(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DIAS_EN[p.diaSemana]} ${p.numero} ${MESES_EN[p.mes]}`;
}
/** "Monday 12" */
function cortaEn(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DIAS_EN[p.diaSemana]} ${p.numero}`;
}

const NUMEROS_ES = ["", "una fecha", "dos fechas", "tres fechas"];
const NUMEROS_EN = ["", "one date", "two dates", "three dates"];

export const RECUPERACIONES: Record<Idioma, TextosRecuperaciones> = {
  es: {
    titulo: "Clases por recuperar",
    dosPartes: "Tu clase de 2 horas se recupera en dos días: elige una fecha para cada parte.",
    parte: (numero, de) => `Parte ${numero} de ${de}`,

    claseCancelada: "Clase cancelada",
    noPuede: (profesor, fecha, hora, opciones) =>
      `${profesor || "Tu profesor"} no puede dar tu clase del ${largaEs(fecha)} a las ${hora}. ` +
      `Te propone ${NUMEROS_ES[opciones] ?? `${opciones} fechas`} para recuperarla:`,
    rondaDos: "Tu profesor te propone dos fechas nuevas",
    opcion: (fecha, hora) => `${mayuscula(largaEs(fecha))} · ${hora}`,
    ninguna: "Ninguna me viene bien",
    confirmas: (fecha, hora) => `¿Confirmas el ${cortaEs(fecha)} a las ${hora}?`,
    siConfirmar: "Sí, confirmar",
    confirmando: "Confirmando…",
    cambiar: "Cambiar",
    hecho: (fecha, hora) => `¡Hecho! Tu clase de recuperación es el ${cortaEs(fecha)} a las ${hora}`,

    tituloFormulario: "¿Cuándo te viene bien?",
    explicacionFormulario: (profesor) =>
      `Propón de 1 a 3 horarios en los próximos 7 días y se los enviaremos a ${profesor || "tu profesor"}.`,
    dia: "Día",
    diaCorto: (fecha) => {
      const p = partesFecha(fecha);
      return { semana: mayuscula(DIAS_ES[p.diaSemana].slice(0, 3)), fecha: `${p.numero} ${MESES_ES[p.mes].slice(0, 3)}` };
    },
    hora: "Hora",
    anadir: "Añadir este horario",
    tusHorarios: (n, max) => `Tus horarios (${n} de ${max})`,
    quitar: "Quitar",
    horario: (fecha, hora) => `${mayuscula(largaEs(fecha))} · ${hora}`,
    yaTienesMax: (max) => `Ya tienes ${max} horarios: quita uno para añadir otro.`,
    yaEsta: "Ese horario ya está en tu lista.",
    eligeDia: "Elige primero un día.",
    eligeHora: "Elige también la hora.",
    faltaHorario: "Añade al menos un horario.",
    nota: "Nota (opcional)",
    marcadorNota: "Por ejemplo: por las tardes a partir de las 18 me viene mejor",
    enviarA: (profesor) => (profesor ? `Enviar a ${profesor}` : "Enviar"),
    enviando: "Enviando…",
    volverAOpciones: "Volver a las fechas propuestas",
    enviado: (profesor) => `Se lo hemos enviado a ${profesor || "tu profesor"}. Te avisaremos cuando confirme.`,

    esperando: (profesor) => `Esperando a que ${profesor || "tu profesor"} responda`,
    tusPropuestas: "Tus propuestas",
    tuNota: "Tu nota",
    recuperacionConfirmada: "Recuperación confirmada",
    confirmadaCon: (fecha, hora, profesor) =>
      `${mayuscula(largaEs(fecha))} a las ${hora}${profesor ? ` con ${profesor}` : ""}`,
    sinAcuerdo: "No hemos podido cerrar una fecha. El equipo te contactará para recuperar tu clase.",
    deLaClase: (fecha, hora) => `Clase del ${largaEs(fecha)} · ${hora}`,

    historial: "Historial de los últimos 30 días",
    recuperada: (fecha, hora) => `Recuperada el ${largaEs(fecha)} a las ${hora}`,
    anulada: (fecha, hora) => `Anulada: la recuperación de la clase del ${largaEs(fecha)} a las ${hora}`,

    soloLectura: "Vista del equipo: el alumno elige desde su cuenta.",

    noSePuedeCargar: "No podemos cargar tus recuperaciones ahora mismo. Inténtalo en unos minutos.",
    errorDe: (codigo) => {
      switch (codigo) {
        case "estado_cambiado":
          return "Esta recuperación ha cambiado mientras la mirabas. Te enseñamos cómo está ahora.";
        case "hueco_no_disponible":
          return "Esa fecha ya no está libre. Elige otra.";
        case "datos_invalidos":
          return "Revisa los horarios: alguno no es válido.";
        case "no_encontrada":
          return "No encontramos esta recuperación.";
        default:
          return "No hemos podido guardarlo. Inténtalo en unos minutos.";
      }
    },

    avisoInicio: (n) => (n === 1 ? "Tienes una clase por recuperar" : `Tienes ${n} clases por recuperar`),
    elegirFecha: "Elige la fecha",
  },

  en: {
    titulo: "Classes to make up",
    dosPartes: "Your 2-hour class is made up over two days: choose a date for each part.",
    parte: (numero, de) => `Part ${numero} of ${de}`,

    claseCancelada: "Class cancelled",
    noPuede: (profesor, fecha, hora, opciones) =>
      `${profesor || "Your teacher"} can't teach your class on ${largaEn(fecha)} at ${hora}. ` +
      `Here ${opciones === 1 ? "is" : "are"} ${NUMEROS_EN[opciones] ?? `${opciones} dates`} to make it up:`,
    rondaDos: "Your teacher is suggesting two new dates",
    opcion: (fecha, hora) => `${largaEn(fecha)} · ${hora}`,
    ninguna: "None of these work for me",
    confirmas: (fecha, hora) => `Confirm ${cortaEn(fecha)} at ${hora}?`,
    siConfirmar: "Yes, confirm",
    confirmando: "Confirming…",
    cambiar: "Change",
    hecho: (fecha, hora) => `Done! Your make-up class is on ${cortaEn(fecha)} at ${hora}`,

    tituloFormulario: "When suits you?",
    explicacionFormulario: (profesor) =>
      `Suggest 1 to 3 times in the next 7 days and we'll send them to ${profesor || "your teacher"}.`,
    dia: "Day",
    diaCorto: (fecha) => {
      const p = partesFecha(fecha);
      return { semana: DIAS_EN[p.diaSemana].slice(0, 3), fecha: `${p.numero} ${MESES_EN[p.mes].slice(0, 3)}` };
    },
    hora: "Time",
    anadir: "Add this time",
    tusHorarios: (n, max) => `Your times (${n} of ${max})`,
    quitar: "Remove",
    horario: (fecha, hora) => `${largaEn(fecha)} · ${hora}`,
    yaTienesMax: (max) => `You already have ${max} times: remove one to add another.`,
    yaEsta: "That time is already on your list.",
    eligeDia: "Choose a day first.",
    eligeHora: "Choose a time too.",
    faltaHorario: "Add at least one time.",
    nota: "Note (optional)",
    marcadorNota: "For example: afternoons from 6 pm work better for me",
    enviarA: (profesor) => (profesor ? `Send to ${profesor}` : "Send"),
    enviando: "Sending…",
    volverAOpciones: "Back to the suggested dates",
    enviado: (profesor) => `We've sent it to ${profesor || "your teacher"}. We'll let you know when they confirm.`,

    esperando: (profesor) => `Waiting for ${profesor || "your teacher"} to reply`,
    tusPropuestas: "Your suggestions",
    tuNota: "Your note",
    recuperacionConfirmada: "Make-up class confirmed",
    confirmadaCon: (fecha, hora, profesor) => `${largaEn(fecha)} at ${hora}${profesor ? ` with ${profesor}` : ""}`,
    sinAcuerdo: "We couldn't settle on a date. The team will contact you to make up your class.",
    deLaClase: (fecha, hora) => `Class on ${largaEn(fecha)} · ${hora}`,

    historial: "History for the last 30 days",
    recuperada: (fecha, hora) => `Made up on ${largaEn(fecha)} at ${hora}`,
    anulada: (fecha, hora) => `Cancelled: the make-up for your class on ${largaEn(fecha)} at ${hora}`,

    soloLectura: "Team view: the student chooses from their own account.",

    noSePuedeCargar: "We can't load your make-up classes right now. Please try again in a few minutes.",
    errorDe: (codigo) => {
      switch (codigo) {
        case "estado_cambiado":
          return "This make-up class changed while you were looking at it. Here's how it stands now.";
        case "hueco_no_disponible":
          return "That date is no longer free. Please choose another.";
        case "datos_invalidos":
          return "Check your times: one of them isn't valid.";
        case "no_encontrada":
          return "We can't find this make-up class.";
        default:
          return "We couldn't save it. Please try again in a few minutes.";
      }
    },

    avisoInicio: (n) => (n === 1 ? "You have a class to make up" : `You have ${n} classes to make up`),
    elegirFecha: "Choose the date",
  },
};
