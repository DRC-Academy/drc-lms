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
//
// LO QUE TODAVÍA NO SE PUEDE, CON FECHA. Si Gestión manda
// `disponible_desde`, el alumno no lee «no se puede» a secas, sino desde
// cuándo sí (`noMovible`).
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import { DIAS, type DiaSemana } from "@/lib/clases";
import { partesFecha } from "@/lib/recuperaciones-fechas";
import type { CodigoAutoservicio, Momento, Movilidad } from "@/lib/autoservicio/tipos";
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
  /** La sesión no tiene clases próximas que mover. */
  sinProximas: string;
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
  /** En fijo, cuándo es la primera clase con el horario nuevo. */
  primeraClase: (fecha: string) => string;
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

  /**
   * Por qué no se puede mover su horario fijo (`que: "horario"`) o una
   * clase suelta (`"clase"`) y, si Gestión lo sabe, desde cuándo sí.
   */
  noMovible: (m: Movilidad, que: "horario" | "clase") => string;
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

/** «lunes 20 de octubre», o «martes 13 de octubre a las 17:00». A las 00:00 es el día entero. */
function momentoEs(m: Momento): string {
  return m.hora === "00:00" ? fechaEs(m.fecha) : `${fechaEs(m.fecha)} a las ${m.hora}`;
}
/** «Monday 20 October», or «Tuesday 13 October at 17:00». */
function momentoEn(m: Momento): string {
  return m.hora === "00:00" ? fechaEn(m.fecha) : `${fechaEn(m.fecha)} at ${m.hora}`;
}

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
    sinProximas: "No tienes clases de este horario en las próximas semanas.",
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
    primeraClase: (fecha) => `Primera clase: ${fechaEs(fecha)}`,
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

    noMovible: (m, que) => {
      if (m.movible) return "";
      if (!m.disponibleDesde) return AUTOSERVICIO.es.motivo(m.motivo);
      const razon =
        m.motivo === "ANTELACION_INSUFICIENTE"
          ? que === "horario"
            ? "Tu próxima clase con este horario está muy cerca."
            : "Esta clase está muy cerca."
          : m.motivo === "MARCA_PUNTUAL_EXISTENTE"
            ? "Ya tienes otra clase de este horario movida."
            : "";
      const podras = que === "horario" ? "Podrás cambiarlo" : "Podrás moverla";
      return `${razon} ${podras} a partir del ${momentoEs(m.disponibleDesde)}.`.trim();
    },
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
        case "FUERA_DE_VENTANA":
          return "Desde aquí puedes mover clases de las próximas seis semanas. Para una fecha más lejana, escríbenos por WhatsApp.";
        case "MISMO_HORARIO":
          return "Ese ya es tu horario. Elige otro hueco de la lista.";
        case "HUECO_YA_OCUPADO":
        case "SLOT_NO_DISPONIBLE":
          return "Ese hueco se acaba de ocupar, aquí tienes los que siguen libres.";
        case "SESION_NO_ENCONTRADA":
          return "Tu horario ha cambiado mientras lo mirabas. Cierra esta ventana para ver el actual y vuelve a probar; si no lo encuentras, escríbenos por WhatsApp.";
        case "EN_CURSO":
          return "Tu cambio se está guardando. Espera unos segundos y vuelve a pulsar «Confirmar el cambio»: no se hará dos veces.";
        case "ERROR_LECTURA":
        case "CALENDARIO_ILEGIBLE":
          return "Ahora mismo no podemos consultar tu horario. Prueba otra vez en unos minutos o escríbenos por WhatsApp y lo vemos contigo.";
        case "A_MEDIAS":
          return "Algo no ha terminado bien al guardar tu cambio y el equipo ya está avisado. No hace falta que lo repitas: te escribimos nosotros. Si quieres, también puedes escribirnos por WhatsApp.";
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
    sinProximas: "You have no classes at this time in the coming weeks.",
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
    primeraClase: (fecha) => `First class: ${fechaEn(fecha)}`,
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

    noMovible: (m, que) => {
      if (m.movible) return "";
      if (!m.disponibleDesde) return AUTOSERVICIO.en.motivo(m.motivo);
      const razon =
        m.motivo === "ANTELACION_INSUFICIENTE"
          ? que === "horario"
            ? "Your next class at this time is very close."
            : "This class is very close."
          : m.motivo === "MARCA_PUNTUAL_EXISTENTE"
            ? "You already have another class at this time moved."
            : "";
      const podras = que === "horario" ? "You'll be able to change it" : "You'll be able to move it";
      return `${razon} ${podras} from ${momentoEn(m.disponibleDesde)}.`.trim();
    },
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
        case "FUERA_DE_VENTANA":
          return "From here you can move classes in the next six weeks. For a later date, message us on WhatsApp.";
        case "MISMO_HORARIO":
          return "That's already your schedule. Pick another slot from the list.";
        case "HUECO_YA_OCUPADO":
        case "SLOT_NO_DISPONIBLE":
          return "That slot has just been taken, here are the ones still free.";
        case "SESION_NO_ENCONTRADA":
          return "Your schedule changed while you were looking. Close this window to see the current one and try again; if you can't find it, message us on WhatsApp.";
        case "EN_CURSO":
          return "Your change is being saved. Wait a few seconds and tap «Confirm the change» again: it won't be made twice.";
        case "ERROR_LECTURA":
        case "CALENDARIO_ILEGIBLE":
          return "We can't check your schedule just now. Try again in a few minutes, or message us on WhatsApp and we'll sort it out with you.";
        case "A_MEDIAS":
          return "Something didn't finish properly while saving your change, and the team already knows. No need to repeat it: we'll write to you. You can also message us on WhatsApp if you like.";
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
