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
import type { CambioProfesorPosible, CodigoAutoservicio, Momento, Movilidad } from "@/lib/autoservicio/tipos";
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

  // --- las páginas de los flujos (/clases/cambiar-horario y /clases/cambiar-profesor) ---
  volverAMisClases: string;
  /** «Paso 2 de 4» */
  pasoDe: (paso: number, total: number) => string;
  /** El de la barra en escritorio: «Paso 3 de 4 · Elegir hueco». */
  pasoNombre: (paso: number, total: number, nombre: string) => string;
  probarOtraVez: string;
  /** Título del aviso cuando no se pudo leer (Gestión no contesta). */
  sinConexionTitulo: string;
  sinConexionTexto: string;
  /** Debajo del aviso: lo elegido sigue en la página. */
  sigueGuardado: string;
  /** Debajo de «Guardando el cambio…». */
  guardandoNota: string;
  aMediasTitulo: string;
  aMediasTexto: string;
  /** Filtros de los huecos. */
  etiquetaDia: string;
  etiquetaFranja: string;
  /** El chip de cada día: «L», «X»… en móvil; el nombre entero va de etiqueta. */
  diaCorto: (dia: DiaSemana) => string;
  /** «1 hora», «2 horas» */
  horas: (n: number) => string;
  /** En la tarjeta «Tu horario»: «Martes · 18:00–19:00». */
  sesionCorta: (dia: DiaSemana, desde: string, hasta: string) => string;

  // --- cambiar de horario ---
  queClase: string;
  /** Debajo de cada clase en «¿Qué clase quieres cambiar?»: «1 hora, cada semana». */
  cadaSemana: (horas: number) => string;
  /** «Tu clase de los martes, 18:00–19:00», encima de la pregunta. */
  tuClaseDeLos: (dia: DiaSemana, desde: string, hasta: string) => string;
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
  /** El paso de los huecos. */
  eligeNuevoHorario: string;
  /** Debajo: para qué clase y con quién, en fijo y en puntual. */
  contextoFijo: (dia: DiaSemana, desde: string, hasta: string, profesor: string) => string;
  contextoPuntual: (fecha: string, desde: string, hasta: string, profesor: string) => string;
  horaPeninsular: string;
  cargando: string;
  sinHuecos: string;
  franja: Record<Franja, string>;
  /** Cabecera de un día de huecos semanales: «Lunes». */
  diaSemanal: (dia: DiaSemana) => string;
  /** Cabecera de un día con fecha: «Lunes 12 de octubre». */
  diaConFecha: (fecha: string) => string;
  /** Abajo, con un hueco elegido: «Has elegido lunes, 10:00–11:00». */
  hasElegido: (que: string) => string;
  eligeUnHueco: string;
  /** El panel de escritorio con el resumen de lo elegido. */
  tuCambio: string;
  confirmaTitulo: string;
  antes: string;
  despues: string;
  /** «Desde ahora, cada semana» */
  desdeAhora: string;
  /** «Cada semana, con Laura», en el «Antes». */
  cadaSemanaCon: (profesor: string) => string;
  /** «Desde ahora, cada semana, con Laura», en el «Después» de un cambio fijo. */
  desdeAhoraCon: (profesor: string) => string;
  /** En el «Después» de una clase suelta. */
  soloEsaClase: string;
  conProfesor: (profesor: string) => string;
  /** En fijo, cuándo es la primera clase con el horario nuevo. */
  primeraClase: (fecha: string) => string;
  /** Debajo de «Revisa el cambio». */
  avisoAlConfirmar: (profesor: string) => string;
  confirmar: string;
  enviando: string;
  hechoTitulo: string;
  hechoAviso: string;
  hechoFijo: (cuando: string) => string;
  hechoPuntual: (cuando: string) => string;
  ocupado: string;

  // --- cambiar de profesor (v3: elige horarios; el profesor lo asigna Gestión) ---
  // NINGÚN TEXTO DE ANTES DE CONFIRMAR LLEVA NOMBRE DE PROFESOR.
  profesorIntro: string;
  loQueNoCambia: string;
  nivelEHistorial: string;
  /** «Sigues con tus 3 horas a la semana, en 2 clases.» */
  mismasHoras: (horas: number, clases: number) => string;
  comoFunciona: string;
  comoFunciona1: string;
  comoFunciona2: string;
  comoFunciona3: string;
  prefieresHablarlo: string;
  elegirMisHorarios: string;
  cualquierDia: string;
  cualquierHora: string;
  sinResultados: string;
  /** Solo con la simulación: lo que se elija no se guarda. */
  simulacion: string;
  cargandoHorarios: string;
  /** Ni un horario para su primera clase. */
  sinHorarios: string;
  /** Con lo elegido, ningún profesor puede con la siguiente; `quedan`, las clases sin elegir. */
  sinHorariosParaOtra: (quedan: number) => string;
  /** Vuelve a empezar la elección. */
  cambiarElegidos: string;
  /** Lo elegido se ocupó mientras elegía (o al confirmar): a elegir de nuevo. */
  elegidosOcupados: string;
  /** Debajo de un horario: «1.ª clase: lunes 12 de octubre». */
  primeraClaseCorta: (fecha: string) => string;
  /** «Tus clases», la lista de arriba en el paso de los horarios. */
  tusClases: string;
  /** El mismo resumen, en el panel de escritorio. */
  tusNuevosHorarios: string;
  /** Cabecera de cada clase: «Tu clase de 1 hora». */
  tuClaseDe: (horas: number) => string;
  /** El horario de ahora: «Ahora: los martes, 18:00–19:00». */
  ahora: (dia: DiaSemana, desde: string, hasta: string) => string;
  sinElegir: string;
  /** La marca de la clase a la que le toca elegir. */
  ahoraToca: string;
  /** «Horario para tu clase de 2 horas» */
  horarioParaTuClase: (horas: number) => string;
  /** Debajo, a partir de la segunda: solo salen los que encajan con lo elegido. */
  soloCompatibles: string;
  /** El botón de una clase ya elegida, para cambiar su horario (y los de después). */
  cambiarEste: string;
  /** Lo mismo, para lectores de pantalla: «Cambiar el horario de tu clase de 1 hora». */
  cambiarEsteEtiqueta: (horas: number) => string;
  /** «Has elegido 2 de 3 clases» */
  contadorClases: (elegidas: number, total: number) => string;
  continuar: string;
  /** El «Antes» del cambio de profesor. */
  ahoraRotulo: string;
  /** Debajo del «Después»: el profesor se asigna al confirmar. */
  asignamosAlConfirmar: string;
  /** Debajo del «Después» del cambio de profesor. */
  enlaceCambia: string;
  /** «Tu nuevo profesor es Daniela.» El nombre sale aquí y solo aquí. */
  hechoProfesor: (profesor: string) => string;
  /** Avisado, con su ficha, correo de bienvenida y el enlace. */
  hechoProfesorAviso: string;
  /** Encima de sus horarios nuevos. */
  tusClasesDesdeAhora: string;
  /**
   * Por qué no puede cambiar de profesor ahora (`puede_cambiar_profesor`)
   * y, si Gestión lo sabe, desde cuándo podrá.
   */
  profesorNoDisponible: (c: Extract<CambioProfesorPosible, { puede: false }>) => string;
  /**
   * Los códigos dentro del cambio de profesor: los que hablan de SU
   * profesor o de SU horario se dicen de otra manera; el resto, `motivo`.
   */
  motivoProfesor: (codigo: CodigoAutoservicio) => string;

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
/** Los chips de día: una letra, como en los calendarios de España (X es miércoles). */
const DIA_CORTO_ES: Record<DiaSemana, string> = {
  Domingo: "D",
  Lunes: "L",
  Martes: "M",
  Miércoles: "X",
  Jueves: "J",
  Viernes: "V",
  Sábado: "S",
};
const DIA_CORTO_EN: Record<DiaSemana, string> = {
  Domingo: "Sun",
  Lunes: "Mon",
  Martes: "Tue",
  Miércoles: "Wed",
  Jueves: "Thu",
  Viernes: "Fri",
  Sábado: "Sat",
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

/** «martes», «sábados»: el día en plural, como en «los martes». */
const diaPluralEs = (dia: DiaSemana) => `${dia.toLowerCase()}${dia === "Sábado" || dia === "Domingo" ? "s" : ""}`;
const horasEs = (n: number) => `${n} ${n === 1 ? "hora" : "horas"}`;
const horasEn = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;

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

    volverAMisClases: "Volver a mis clases",
    pasoDe: (paso, total) => `Paso ${paso} de ${total}`,
    pasoNombre: (paso, total, nombre) => `Paso ${paso} de ${total} · ${nombre}`,
    probarOtraVez: "Probar otra vez",
    sinConexionTitulo: "Ahora mismo no podemos enseñarte los horarios libres",
    sinConexionTexto: "Prueba otra vez en un rato. Si te corre prisa, escríbenos y lo hacemos contigo.",
    sigueGuardado: "Lo que ya habías elegido sigue guardado en esta página.",
    guardandoNota: "Tarda unos segundos. No hace falta pulsar otra vez.",
    aMediasTitulo: "Tu cambio no ha terminado de guardarse",
    aMediasTexto:
      "El equipo ya está avisado y lo está revisando. No hace falta que lo repitas: te escribimos nosotros en cuanto esté resuelto.",
    etiquetaDia: "Día",
    etiquetaFranja: "Momento del día",
    diaCorto: (dia) => DIA_CORTO_ES[dia],
    horas: (n) => horasEs(n),
    sesionCorta: (dia, desde, hasta) => `${dia} · ${desde}–${hasta}`,

    queClase: "¿Qué clase quieres cambiar?",
    cadaSemana: (horas) => `${horasEs(horas)}, cada semana`,
    tuClaseDeLos: (dia, desde, hasta) => `Tu clase de los ${diaPluralEs(dia)}, ${desde}–${hasta}`,
    sesion: (dia, desde, hasta) => `Los ${diaPluralEs(dia)}, ${desde}–${hasta}`,
    queCambio: "¿Qué quieres cambiar?",
    soloEsta: "Solo una clase",
    soloEstaDetalle: "Mueves una fecha concreta y el resto de semanas sigue igual.",
    todas: "Desde ahora, todas mis clases",
    todasDetalle: "Tu horario de cada semana pasa a ser el nuevo.",
    queFecha: "¿Qué fecha quieres mover?",
    sinProximas: "No tienes clases de este horario en las próximas semanas.",
    clase: (fecha, desde, hasta) => `${mayuscula(fechaEs(fecha))}, ${desde}–${hasta}`,
    eligeNuevoHorario: "Elige tu nuevo horario",
    contextoFijo: (dia, desde, hasta, profesor) =>
      `Para tu clase de los ${diaPluralEs(dia)}, ${desde}–${hasta}. Desde ahora, cada semana${profesor ? `, con ${profesor}` : ""}.`,
    contextoPuntual: (fecha, desde, hasta, profesor) =>
      `Para tu clase del ${fechaEs(fecha)}, ${desde}–${hasta}${profesor ? `, con ${profesor}` : ""}. El resto de semanas sigue igual.`,
    horaPeninsular: "Horas de España peninsular",
    cargando: "Buscando huecos libres…",
    sinHuecos: "Ahora mismo no quedan huecos libres para esta clase. Escríbenos por WhatsApp y lo buscamos contigo.",
    franja: { manana: "Mañana", mediodia: "Mediodía", tarde: "Tarde", noche: "Noche" },
    diaSemanal: (dia) => dia,
    diaConFecha: (fecha) => mayuscula(fechaEs(fecha)),
    hasElegido: (que) => `Has elegido ${que.charAt(0).toLowerCase()}${que.slice(1)}`,
    eligeUnHueco: "Elige un hueco para continuar",
    tuCambio: "Tu cambio",
    confirmaTitulo: "Revisa el cambio",
    antes: "Antes",
    despues: "Después",
    desdeAhora: "Desde ahora, cada semana",
    cadaSemanaCon: (profesor) => (profesor ? `Cada semana, con ${profesor}` : "Cada semana"),
    desdeAhoraCon: (profesor) => (profesor ? `Desde ahora, cada semana, con ${profesor}` : "Desde ahora, cada semana"),
    soloEsaClase: "Solo esa clase: el resto de semanas sigue igual.",
    conProfesor: (profesor) => `Con ${profesor}`,
    primeraClase: (fecha) => `Primera clase: ${fechaEs(fecha)}`,
    avisoAlConfirmar: (profesor) =>
      `${profesor || "Tu profesor"} recibe un aviso al momento y a ti te llega un correo con el cambio.`,
    confirmar: "Confirmar el cambio",
    enviando: "Guardando el cambio…",
    hechoTitulo: "Listo",
    hechoAviso: "Tu profesor ya está avisado y te hemos enviado un correo de confirmación.",
    hechoFijo: (cuando) => `Desde ahora tus clases son ${cuando.charAt(0).toLowerCase() + cuando.slice(1)}.`,
    hechoPuntual: (cuando) => `Tu clase pasa al ${cuando.charAt(0).toLowerCase() + cuando.slice(1)}.`,
    ocupado: "Ese hueco se acaba de ocupar, aquí tienes los que siguen libres.",

    profesorIntro: "Elige los horarios que te vienen bien y te asignamos el profesor que mejor encaje.",
    loQueNoCambia: "Lo que no cambia",
    nivelEHistorial: "Tu nivel y tu historial de clases se mantienen.",
    mismasHoras: (horas, clases) =>
      clases === 1
        ? `Sigues con tu clase de ${horasEs(horas)} a la semana.`
        : `Sigues con tus ${horasEs(horas)} a la semana, en ${clases} clases.`,
    comoFunciona: "Cómo funciona",
    comoFunciona1: "Eliges un horario para cada clase.",
    comoFunciona2: "Revisas el cambio y lo confirmas.",
    comoFunciona3: "Te decimos al momento quién es tu profesor.",
    prefieresHablarlo: "¿Prefieres hablarlo con nosotros?",
    elegirMisHorarios: "Elegir mis horarios",
    cualquierDia: "Todos",
    cualquierHora: "Todo el día",
    sinResultados: "Con estos filtros no hay horarios. Prueba con otro día u otro momento del día.",
    simulacion: "Datos de prueba: este cambio no se guarda.",
    cargandoHorarios: "Buscando horarios libres…",
    sinHorarios: "Ahora mismo no hay ningún profesor con horarios libres para tu clase. Escríbenos por WhatsApp y lo buscamos contigo.",
    sinHorariosParaOtra: (quedan) =>
      `Con estos horarios no hay ningún profesor libre para ${quedan === 1 ? "tu otra clase" : "el resto de tus clases"}. Puedes cambiar los que has elegido o escribirnos por WhatsApp y lo buscamos contigo.`,
    cambiarElegidos: "Cambiar lo que elegí",
    elegidosOcupados: "Alguno de los horarios que habías elegido se acaba de ocupar. Vuelve a elegir: aquí tienes los que siguen libres.",
    primeraClaseCorta: (fecha) => `Primera clase: ${fechaEs(fecha)}`,
    tusClases: "Tus clases",
    tusNuevosHorarios: "Tus nuevos horarios",
    tuClaseDe: (horas) => `Tu clase de ${horasEs(horas)}`,
    ahora: (dia, desde, hasta) => `Ahora: los ${diaPluralEs(dia)}, ${desde}–${hasta}`,
    sinElegir: "Sin elegir",
    ahoraToca: "Ahora",
    horarioParaTuClase: (horas) => `Horario para tu clase de ${horasEs(horas)}`,
    soloCompatibles: "Solo te enseñamos horarios que encajan con lo que ya has elegido.",
    cambiarEste: "Cambiar",
    cambiarEsteEtiqueta: (horas) => `Cambiar el horario de tu clase de ${horasEs(horas)}`,
    contadorClases: (n, total) => `Has elegido ${n} de ${total} ${total === 1 ? "clase" : "clases"}`,
    continuar: "Continuar",
    ahoraRotulo: "Ahora",
    asignamosAlConfirmar: "Te asignaremos un profesor con estos horarios y te diremos quién es al momento.",
    enlaceCambia: "El enlace de la clase cambia: te lo pasará tu nuevo profesor.",
    hechoProfesor: (profesor) => (profesor ? `Tu nuevo profesor es ${profesor}.` : "Ya tienes nuevo profesor."),
    hechoProfesorAviso:
      "Ya está avisado y tiene tu ficha para preparar vuestra primera clase. Te llegará un correo de bienvenida y te pasará el enlace de la clase.",
    tusClasesDesdeAhora: "Tus clases desde ahora",
    profesorNoDisponible: (c) =>
      c.motivo === "ANTELACION_INSUFICIENTE" && c.disponibleDesde
        ? `Tu próxima clase está muy cerca. Podrás cambiar de profesor a partir del ${momentoEs(c.disponibleDesde)}.`
        : AUTOSERVICIO.es.motivoProfesor(c.motivo),
    motivoProfesor: (codigo) => {
      switch (codigo) {
        case "NO_ELEGIBLE":
          return "El cambio de profesor lo hacemos contigo por WhatsApp. Escríbenos y buscamos juntos el que mejor te encaje.";
        case "RECUPERACION_PENDIENTE":
          return "Tienes una clase por recuperar. Cuando la tengas resuelta podrás cambiar de profesor desde aquí; si te corre prisa, escríbenos por WhatsApp.";
        case "CALENDARIO_SIN_ACTUALIZAR":
          // El de SU profesor no frena el cambio de profesor: si llega, es
          // de Gestión, no del alumno.
          return AUTOSERVICIO.es.motivo("GENERICO");
        case "ANTELACION_INSUFICIENTE":
          return "Tu próxima clase está muy cerca para cambiar de profesor ahora. Prueba cuando haya pasado, o escríbenos por WhatsApp.";
        default:
          return AUTOSERVICIO.es.motivo(codigo);
      }
    },

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
        case "HORAS_NO_COINCIDEN":
          return "Tu plan tiene otras horas a la semana que las que estás eligiendo. Escríbenos por WhatsApp y lo ajustamos contigo.";
        case "ASIGNACION_CAMBIADA":
          return "Tus clases han cambiado mientras elegías y no hemos tocado nada. Cierra esta ventana y vuelve a probar; si te lía, escríbenos por WhatsApp.";
        case "ASIGNACION_INACTIVA":
        case "ASIGNACION_NO_EXISTE":
          return "Ahora mismo no tienes un profesor asignado desde el que hacer el cambio. Escríbenos por WhatsApp y lo vemos contigo.";
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

    volverAMisClases: "Back to my classes",
    pasoDe: (paso, total) => `Step ${paso} of ${total}`,
    pasoNombre: (paso, total, nombre) => `Step ${paso} of ${total} · ${nombre}`,
    probarOtraVez: "Try again",
    sinConexionTitulo: "We can't show you the free times just now",
    sinConexionTexto: "Try again in a while. If it's urgent, message us and we'll do it with you.",
    sigueGuardado: "What you'd already chosen is still saved on this page.",
    guardandoNota: "It takes a few seconds. No need to tap again.",
    aMediasTitulo: "Your change hasn't finished saving",
    aMediasTexto:
      "The team already knows and is looking into it. No need to repeat it: we'll write to you as soon as it's sorted.",
    etiquetaDia: "Day",
    etiquetaFranja: "Time of day",
    diaCorto: (dia) => DIA_CORTO_EN[dia],
    horas: (n) => horasEn(n),
    sesionCorta: (dia, desde, hasta) => `${DIAS_EN[dia]} · ${desde}–${hasta}`,

    queClase: "Which class do you want to change?",
    cadaSemana: (horas) => `${horasEn(horas)}, every week`,
    tuClaseDeLos: (dia, desde, hasta) => `Your ${DIAS_EN[dia]} class, ${desde}–${hasta}`,
    sesion: (dia, desde, hasta) => `${DIAS_EN[dia]}s, ${desde}–${hasta}`,
    queCambio: "What would you like to change?",
    soloEsta: "Just one class",
    soloEstaDetalle: "You move one date and the other weeks stay the same.",
    todas: "All my classes from now on",
    todasDetalle: "Your weekly time becomes the new one.",
    queFecha: "Which date do you want to move?",
    sinProximas: "You have no classes at this time in the coming weeks.",
    clase: (fecha, desde, hasta) => `${fechaEn(fecha)}, ${desde}–${hasta}`,
    eligeNuevoHorario: "Choose your new time",
    contextoFijo: (dia, desde, hasta, profesor) =>
      `For your ${DIAS_EN[dia]} class, ${desde}–${hasta}. From now on, every week${profesor ? `, with ${profesor}` : ""}.`,
    contextoPuntual: (fecha, desde, hasta, profesor) =>
      `For your class on ${fechaEn(fecha)}, ${desde}–${hasta}${profesor ? `, with ${profesor}` : ""}. The other weeks stay the same.`,
    horaPeninsular: "Times in mainland Spain",
    cargando: "Looking for free slots…",
    sinHuecos: "There are no free slots for this class right now. Message us on WhatsApp and we'll find one with you.",
    franja: { manana: "Morning", mediodia: "Midday", tarde: "Afternoon", noche: "Evening" },
    diaSemanal: (dia) => DIAS_EN[dia],
    diaConFecha: (fecha) => fechaEn(fecha),
    hasElegido: (que) => `You've chosen ${que}`,
    eligeUnHueco: "Choose a slot to continue",
    tuCambio: "Your change",
    confirmaTitulo: "Check the change",
    antes: "Before",
    despues: "After",
    desdeAhora: "From now on, every week",
    cadaSemanaCon: (profesor) => (profesor ? `Every week, with ${profesor}` : "Every week"),
    desdeAhoraCon: (profesor) => (profesor ? `From now on, every week, with ${profesor}` : "From now on, every week"),
    soloEsaClase: "Just that class: the other weeks stay the same.",
    conProfesor: (profesor) => `With ${profesor}`,
    primeraClase: (fecha) => `First class: ${fechaEn(fecha)}`,
    avisoAlConfirmar: (profesor) =>
      `${profesor || "Your teacher"} gets a notice straight away, and you'll get an email with the change.`,
    confirmar: "Confirm the change",
    enviando: "Saving the change…",
    hechoTitulo: "All set",
    hechoAviso: "Your teacher already knows, and we've sent you a confirmation email.",
    hechoFijo: (cuando) => `From now on your classes are on ${cuando}.`,
    hechoPuntual: (cuando) => `Your class moves to ${cuando}.`,
    ocupado: "That slot has just been taken, here are the ones still free.",

    profesorIntro: "Choose the times that suit you and we'll assign the teacher who fits best.",
    loQueNoCambia: "What stays the same",
    nivelEHistorial: "Your level and your class history are kept.",
    mismasHoras: (horas, clases) =>
      clases === 1 ? `You keep your ${horas}-hour class each week.` : `You keep your ${horasEn(horas)} a week, in ${clases} classes.`,
    comoFunciona: "How it works",
    comoFunciona1: "You choose a time for each class.",
    comoFunciona2: "You check the change and confirm it.",
    comoFunciona3: "We tell you straight away who your teacher is.",
    prefieresHablarlo: "Would you rather talk it through with us?",
    elegirMisHorarios: "Choose my times",
    cualquierDia: "All",
    cualquierHora: "All day",
    sinResultados: "No times match these filters. Try another day or time of day.",
    simulacion: "Test data: this change isn't saved.",
    cargandoHorarios: "Looking for free times…",
    sinHorarios: "There's no teacher with free times for your class right now. Message us on WhatsApp and we'll find one with you.",
    sinHorariosParaOtra: (quedan) =>
      `With these times there's no teacher free for ${quedan === 1 ? "your other class" : "the rest of your classes"}. You can change the ones you chose, or message us on WhatsApp and we'll find one with you.`,
    cambiarElegidos: "Change what I chose",
    elegidosOcupados: "One of the times you'd chosen has just been taken. Choose again: here are the ones still free.",
    primeraClaseCorta: (fecha) => `First class: ${fechaEn(fecha)}`,
    tusClases: "Your classes",
    tusNuevosHorarios: "Your new times",
    tuClaseDe: (horas) => `Your ${horas}-hour class`,
    ahora: (dia, desde, hasta) => `Now: ${DIAS_EN[dia]}s, ${desde}–${hasta}`,
    sinElegir: "Not chosen yet",
    ahoraToca: "Now",
    horarioParaTuClase: (horas) => `Time for your ${horas}-hour class`,
    soloCompatibles: "We only show times that fit with what you've already chosen.",
    cambiarEste: "Change",
    cambiarEsteEtiqueta: (horas) => `Change the time of your ${horas}-hour class`,
    contadorClases: (n, total) => `You've chosen ${n} of ${total} ${total === 1 ? "class" : "classes"}`,
    continuar: "Continue",
    ahoraRotulo: "Now",
    asignamosAlConfirmar: "We'll assign you a teacher with these times and tell you who it is straight away.",
    enlaceCambia: "Your class link changes: your new teacher will send it to you.",
    hechoProfesor: (profesor) => (profesor ? `Your new teacher is ${profesor}.` : "You have a new teacher."),
    hechoProfesorAviso:
      "They already know and have your file to prepare your first class. You'll get a welcome email, and they'll send you the class link.",
    tusClasesDesdeAhora: "Your classes from now on",
    profesorNoDisponible: (c) =>
      c.motivo === "ANTELACION_INSUFICIENTE" && c.disponibleDesde
        ? `Your next class is very close. You'll be able to change teacher from ${momentoEn(c.disponibleDesde)}.`
        : AUTOSERVICIO.en.motivoProfesor(c.motivo),
    motivoProfesor: (codigo) => {
      switch (codigo) {
        case "NO_ELEGIBLE":
          return "We change your teacher with you on WhatsApp. Message us and we'll find the one that suits you best.";
        case "RECUPERACION_PENDIENTE":
          return "You have a class to make up. Once it's sorted you'll be able to change teacher here; if it's urgent, message us on WhatsApp.";
        case "CALENDARIO_SIN_ACTUALIZAR":
          return AUTOSERVICIO.en.motivo("GENERICO");
        case "ANTELACION_INSUFICIENTE":
          return "Your next class is too close to change teacher now. Try again once it's over, or message us on WhatsApp.";
        default:
          return AUTOSERVICIO.en.motivo(codigo);
      }
    },

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
        case "HORAS_NO_COINCIDEN":
          return "Your plan has a different number of hours a week than the ones you're choosing. Message us on WhatsApp and we'll sort it out with you.";
        case "ASIGNACION_CAMBIADA":
          return "Your classes changed while you were choosing, and nothing has been touched. Close this window and try again; if it's confusing, message us on WhatsApp.";
        case "ASIGNACION_INACTIVA":
        case "ASIGNACION_NO_EXISTE":
          return "You don't have an assigned teacher to change from right now. Message us on WhatsApp and we'll sort it out with you.";
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
