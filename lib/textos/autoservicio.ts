// ---------------------------------------------------------------
// EL AUTOSERVICIO DE HORARIOS EN «MIS CLASES»
//
// «Cambiar de horario» y «Cambiar de profesor» (ver `lib/autoservicio/`).
//
// LOS DÍAS LLEGAN COMO LOS ESCRIBE GESTIÓN («Miércoles») y las fechas
// como texto («2026-10-14»); se escriben aquí en cada idioma. Las horas
// van tal cual («18:00»), en hora peninsular, y la pantalla lo dice.
//
// CADA CÓDIGO DE ERROR TIENE SU TEXTO (`motivo`), y ninguno suena a
// error: explica qué pasa y, cuando desde aquí no se puede, ofrece el
// WhatsApp. Lo que diga Gestión en `mensaje` no se enseña: viene solo en
// español y con su propio tono.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import { DIAS, type DiaSemana } from "@/lib/clases";
import { partesFecha } from "@/lib/recuperaciones-fechas";
import type { CodigoAutoservicio } from "@/lib/autoservicio/tipos";
import type { Franja } from "@/lib/autoservicio/franjas";

export type TextosAutoservicio = {
  titulo: string;
  cambiarHorario: string;
  cambiarProfesor: string;
  noEncuentras: string;
  escribenos: string;
  /** El equipo mirando la ficha: sin botones. */
  soloLectura: string;
  cerrar: string;
  volver: string;

  // --- cambiar de horario ---
  queClase: string;
  /** «Los martes, 18:00–19:00» */
  sesion: (dia: DiaSemana, desde: string, hasta: string) => string;
  queCambio: string;
  soloEsta: string;
  soloEstaDetalle: string;
  todas: string;
  todasDetalle: string;
  queFecha: string;
  /** «martes 13 de octubre, 18:00–19:00» */
  clase: (fecha: string, desde: string, hasta: string) => string;
  huecosDe: (profesor: string) => string;
  horaPeninsular: string;
  cargando: string;
  sinHuecos: string;
  franja: Record<Franja, string>;
  /** Cabecera de un día de huecos semanales: «Lunes». */
  diaSemanal: (dia: DiaSemana) => string;
  /** Cabecera de un día con fecha: «Lunes 12 de octubre». */
  diaConFecha: (fecha: string) => string;
  confirmaTitulo: string;
  antes: string;
  despues: string;
  /** «Los martes, 18:00–19:00» o «martes 13 de octubre, 18:00–19:00», con «desde ahora» si es fijo. */
  desdeAhora: string;
  conProfesor: (profesor: string) => string;
  confirmar: string;
  enviando: string;
  hechoTitulo: string;
  hechoFijo: (cuando: string) => string;
  hechoPuntual: (cuando: string) => string;
  hechoAviso: string;
  ocupado: string;

  // --- cambiar de profesor (fase 2: esqueleto) ---
  buscaTitulo: string;
  buscaDetalle: string;
  cualquierDia: string;
  cualquierHora: string;
  sinResultados: string;
  simulacion: string;

  /** Lo que se le explica al alumno, por código. */
  motivo: (codigo: CodigoAutoservicio) => string;
  /**
   * Lo mismo al LEER (el estado, los huecos): con `GENERICO`, que no ha
   * cargado, no «que no se ha podido hacer el cambio», que aún no se ha
   * pedido. El resto de códigos, como `motivo`.
   */
  motivoAlLeer: (codigo: CodigoAutoservicio) => string;
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

/** «martes 13 de octubre» */
function fechaEs(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DIAS[p.diaSemana].toLowerCase()} ${p.numero} de ${MESES_ES[p.mes]}`;
}
/** «Tuesday 13 October» */
function fechaEn(fecha: string): string {
  const p = partesFecha(fecha);
  return `${DIAS_EN[DIAS[p.diaSemana]]} ${p.numero} ${MESES_EN[p.mes]}`;
}
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const AUTOSERVICIO: Record<Idioma, TextosAutoservicio> = {
  es: {
    titulo: "Tu horario",
    cambiarHorario: "Cambiar de horario",
    cambiarProfesor: "Cambiar de profesor",
    noEncuentras: "¿No encuentras el horario que buscas?",
    escribenos: "Escríbenos por WhatsApp",
    soloLectura: "Vista del equipo: el alumno cambia su horario desde su cuenta.",
    cerrar: "Cerrar",
    volver: "Volver",

    queClase: "¿Qué clase quieres cambiar?",
    sesion: (dia, desde, hasta) => `Los ${dia.toLowerCase()}${dia === "Sábado" || dia === "Domingo" ? "s" : ""}, ${desde}–${hasta}`,
    queCambio: "¿Qué quieres cambiar?",
    soloEsta: "Solo una clase",
    soloEstaDetalle: "Mueves una fecha concreta y el resto sigue igual.",
    todas: "Desde ahora, todas mis clases",
    todasDetalle: "Tu horario semanal pasa a ser el nuevo.",
    queFecha: "¿Qué clase quieres mover?",
    clase: (fecha, desde, hasta) => `${mayuscula(fechaEs(fecha))}, ${desde}–${hasta}`,
    huecosDe: (profesor) => (profesor ? `Huecos libres de ${profesor}` : "Huecos libres"),
    horaPeninsular: "Horas en hora peninsular española.",
    cargando: "Buscando huecos libres…",
    sinHuecos: "Ahora mismo no quedan huecos libres para esta clase.",
    franja: { manana: "Mañana", mediodia: "Mediodía", tarde: "Tarde", noche: "Noche" },
    diaSemanal: (dia) => dia,
    diaConFecha: (fecha) => mayuscula(fechaEs(fecha)),
    confirmaTitulo: "Revisa el cambio",
    antes: "Antes",
    despues: "Después",
    desdeAhora: "Desde ahora, cada semana",
    conProfesor: (profesor) => `Con ${profesor}`,
    confirmar: "Confirmar el cambio",
    enviando: "Guardando el cambio…",
    hechoTitulo: "¡Hecho!",
    hechoFijo: (cuando) => `Desde ahora tus clases son ${cuando.charAt(0).toLowerCase() + cuando.slice(1)}.`,
    hechoPuntual: (cuando) => `Tu clase pasa al ${cuando.charAt(0).toLowerCase() + cuando.slice(1)}.`,
    hechoAviso: "Tu profesor ya está avisado y te llega un correo con el cambio.",
    ocupado: "Ese hueco se acaba de ocupar, aquí tienes los que siguen libres.",

    buscaTitulo: "Busca un horario con otro profesor",
    buscaDetalle: "Elige el día y la franja que mejor te vengan.",
    cualquierDia: "Cualquier día",
    cualquierHora: "Cualquier hora",
    sinResultados: "Con estos filtros no hay huecos. Prueba con otro día u otra franja.",
    simulacion: "Datos de prueba: este cambio todavía no se guarda.",

    motivo: (codigo) => {
      switch (codigo) {
        case "NO_ELEGIBLE":
          return "Tu horario lo cambiamos contigo por WhatsApp. Escríbenos y buscamos juntos el que mejor te encaje.";
        case "RECUPERACION_PENDIENTE":
          return "Tienes una clase por recuperar. Cuando la tengas resuelta podrás cambiar tu horario desde aquí; si te corre prisa, escríbenos por WhatsApp.";
        case "CALENDARIO_SIN_ACTUALIZAR":
          return "Estamos poniendo al día el calendario de tu profesor. Mientras tanto, escríbenos por WhatsApp y te ayudamos con el cambio.";
        case "ANTELACION_INSUFICIENTE":
          return "Esta clase está muy cerca para moverla desde aquí. Si necesitas cambiarla, escríbenos por WhatsApp.";
        case "MARCA_PUNTUAL_EXISTENTE":
          return "Esta clase ya la cambiaste una vez. Para moverla de nuevo, escríbenos por WhatsApp y lo vemos contigo.";
        case "HUECO_YA_OCUPADO":
          return "Ese hueco se acaba de ocupar, aquí tienes los que siguen libres.";
        default:
          return "Ahora mismo no hemos podido completar el cambio. Prueba otra vez en un rato o escríbenos por WhatsApp y lo hacemos contigo.";
      }
    },
    motivoAlLeer: (codigo) =>
      codigo === "GENERICO"
        ? "Ahora mismo no podemos enseñarte los horarios libres. Prueba otra vez en un rato o escríbenos por WhatsApp y lo vemos contigo."
        : AUTOSERVICIO.es.motivo(codigo),
  },
  en: {
    titulo: "Your schedule",
    cambiarHorario: "Change my schedule",
    cambiarProfesor: "Change teacher",
    noEncuentras: "Can't find the time you're looking for?",
    escribenos: "Message us on WhatsApp",
    soloLectura: "Team view: the student changes their schedule from their account.",
    cerrar: "Close",
    volver: "Back",

    queClase: "Which class do you want to change?",
    sesion: (dia, desde, hasta) => `${DIAS_EN[dia]}s, ${desde}–${hasta}`,
    queCambio: "What would you like to change?",
    soloEsta: "Just one class",
    soloEstaDetalle: "You move one date and everything else stays the same.",
    todas: "All my classes from now on",
    todasDetalle: "Your weekly schedule becomes the new one.",
    queFecha: "Which class do you want to move?",
    clase: (fecha, desde, hasta) => `${fechaEn(fecha)}, ${desde}–${hasta}`,
    huecosDe: (profesor) => (profesor ? `${profesor}'s free slots` : "Free slots"),
    horaPeninsular: "Times are in mainland Spain time.",
    cargando: "Looking for free slots…",
    sinHuecos: "There are no free slots for this class right now.",
    franja: { manana: "Morning", mediodia: "Midday", tarde: "Afternoon", noche: "Evening" },
    diaSemanal: (dia) => DIAS_EN[dia],
    diaConFecha: (fecha) => fechaEn(fecha),
    confirmaTitulo: "Check the change",
    antes: "Before",
    despues: "After",
    desdeAhora: "From now on, every week",
    conProfesor: (profesor) => `With ${profesor}`,
    confirmar: "Confirm the change",
    enviando: "Saving the change…",
    hechoTitulo: "Done!",
    hechoFijo: (cuando) => `From now on your classes are on ${cuando}.`,
    hechoPuntual: (cuando) => `Your class moves to ${cuando}.`,
    hechoAviso: "Your teacher already knows, and you'll get an email with the change.",
    ocupado: "That slot has just been taken, here are the ones still free.",

    buscaTitulo: "Find a time with another teacher",
    buscaDetalle: "Pick the day and time of day that suit you best.",
    cualquierDia: "Any day",
    cualquierHora: "Any time",
    sinResultados: "No slots match these filters. Try another day or time of day.",
    simulacion: "Test data: this change isn't saved yet.",

    motivo: (codigo) => {
      switch (codigo) {
        case "NO_ELEGIBLE":
          return "We change your schedule with you on WhatsApp. Message us and we'll find the time that suits you best.";
        case "RECUPERACION_PENDIENTE":
          return "You have a class to make up. Once it's sorted you'll be able to change your schedule here; if it's urgent, message us on WhatsApp.";
        case "CALENDARIO_SIN_ACTUALIZAR":
          return "We're bringing your teacher's calendar up to date. In the meantime, message us on WhatsApp and we'll help you with the change.";
        case "ANTELACION_INSUFICIENTE":
          return "This class is too close to move from here. If you need to change it, message us on WhatsApp.";
        case "MARCA_PUNTUAL_EXISTENTE":
          return "You've already moved this class once. To move it again, message us on WhatsApp and we'll sort it out with you.";
        case "HUECO_YA_OCUPADO":
          return "That slot has just been taken, here are the ones still free.";
        default:
          return "We couldn't complete the change just now. Try again in a while, or message us on WhatsApp and we'll do it with you.";
      }
    },
    motivoAlLeer: (codigo) =>
      codigo === "GENERICO"
        ? "We can't show you the free times just now. Try again in a while, or message us on WhatsApp and we'll sort it out with you."
        : AUTOSERVICIO.en.motivo(codigo),
  },
};
