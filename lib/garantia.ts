// ---------------------------------------------------------------
// LA GARANTÍA DEL PLAN: EL VEREDICTO
//
// Un alumno mantiene la garantía si, hasta el fin de su plan:
//
//   1. Ha asistido a todas sus clases. Una clase que el alumno cancela
//      con menos de 24 h de antelación cuenta como no asistida.
//   2. Ha completado cada semana el contenido de la plataforma dentro de
//      plazo. Hacerlo tarde también la pierde. Los intensivos no tienen
//      esta cláusula.
//
// La pérdida es definitiva, pero eso no se decide aquí: aquí se calcula
// con los datos de hoy, y quien guarda (`lib/garantia-servidor.ts`) no
// deja que una «Perdida» vuelva atrás.
//
// MÓDULO PURO. Recibe las clases, el progreso y las fechas ya leídos y
// devuelve el veredicto; no lee nada. Así se prueba entero sin base.
//
// LA ASISTENCIA SALE SOLO DE GESTIÓN: los partes de los profesores
// (`vista_partes_clase`) y las clases que había en el calendario
// (`vista_clases_programadas`). Los clics de `entradas_clase` no entran
// aquí ni como desempate: un alumno puede haber ido por otro enlace.
//
// UN DATO QUE FALTA NUNCA HACE PERDER LA GARANTÍA. Se pierde con una
// prueba —una falta, una cancelación tarde, una semana sin hacer—; lo
// que no se puede saber da «Sin datos suficientes», nunca «Perdida».
//
// Todas las fechas son de España. Una fecha suelta ("2026-10-12") es un
// día de calendario de Madrid; un instante viaja como ISO.
// ---------------------------------------------------------------

import { diaLocal, sumarDias } from "@/lib/fechas";
import { instanteEnMadrid } from "@/lib/clases";

// ---------------------------------------------------------------
// LAS CONSTANTES DE LA REGLA
// ---------------------------------------------------------------

/** Menos que esto, la cancelación del alumno es tarde. */
export const ANTELACION_MINIMA_MIN = 24 * 60;

/** Lo que se espera a que el profesor suba el parte de una clase. */
export const HORAS_DE_GRACIA_PARTE = 48;

/**
 * El primer parte de clase que hay en Gestión (`class_records`). Antes
 * no hay forma de saber si el alumno fue a clase.
 */
export const DATOS_DE_CLASES_DESDE = "2026-06-08";

/**
 * Desde cuándo guarda Gestión las clases que había en el calendario
 * (`scheduled_class_snapshots`). Antes, una clase sin parte no deja
 * rastro: solo se ven las que tienen parte.
 */
export const PROGRAMADAS_DESDE = "2026-09-23";

/**
 * El primer día del LMS. Lo anterior viene migrado de LearnDash: una
 * fecha de completado de allí es buena, pero una lección SIN fecha no
 * prueba nada, porque la migración no casó a todos los alumnos.
 */
export const CONTENIDO_FIABLE_DESDE = "2026-07-03";

// ---------------------------------------------------------------
// LO QUE ENTRA
// ---------------------------------------------------------------

export type Motivo = "alumno_antelacion" | "alumno_sobre_hora" | "profesor" | "autoservicio";
export type Autor = "alumno" | "profesor" | "academia";

/** Una fila de `vista_partes_clase`. */
export type ParteClase = {
  parteId: string | null;
  /** Día de la clase. En una reprogramada, el día de ANTES de moverla. */
  fecha: string;
  /** "HH:MM", o null si el parte no la trae. */
  hora: string | null;
  /** `class_records.class_type`, tal cual. */
  tipo: string;
  profesor: string | null;
  /** Quién movió una reprogramada, leído del comentario fijo de Gestión. */
  motivo: Motivo | null;
  rescheduledTo: string | null;
  /** Cuándo se SUBIÓ el parte. Solo es una cota de la antelación. */
  registradoEn: string | null;
  /** Cuándo avisó el alumno. Solo en los partes nuevos de Gestión. */
  avisadoEn: string | null;
  canceladoPor: Autor | null;
};

/** Una fila de `vista_clases_programadas`. */
export type ClaseProgramada = {
  fecha: string;
  /** "HH:MM" */
  hora: string;
  profesor: string | null;
};

export type LeccionDrip = { id: string; titulo: string };

/** Un módulo de un curso CON drip. Los abiertos a mano no entran. */
export type ModuloDrip = {
  titulo: string;
  curso: string;
  /** Días desde la fecha de inicio hasta que se abre. */
  visibleAfter: number;
  lecciones: LeccionDrip[];
};

export type EntradaGarantia = {
  /** `vista_perfil_alumno.fecha_inicio`, el mismo día del drip. */
  inicio: string | null;
  /** Último día del plan, incluido. Null: sin fin conocido. */
  fin: string | null;
  /** Los intensivos no tienen la cláusula del contenido. */
  intensivo: boolean;
  partes: ParteClase[];
  programadas: ClaseProgramada[];
  modulos: ModuloDrip[];
  /**
   * Cursos que el equipo le abrió enteros (`sin_drip`). Sin calendario
   * semanal no hay plazo que medir.
   */
  cursosSinDrip: number;
  /** leccion_id → cuándo la completó (ISO). */
  completadas: ReadonlyMap<string, string>;
  ahora: Date;
};

// ---------------------------------------------------------------
// LO QUE SALE
// ---------------------------------------------------------------

export type Estado = "en_curso" | "perdida" | "cumplida" | "sin_datos";

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  en_curso: "En curso",
  perdida: "Perdida",
  cumplida: "Cumplida",
  sin_datos: "Sin datos suficientes",
};

export type ResultadoClase =
  | "asistida"
  | "no_asistida"
  | "cancelada_tarde"
  | "cancelada_a_tiempo"
  | "cambiada_de_dia"
  | "cancelada_profesor"
  | "sin_parte"
  | "pendiente"
  | "sin_clasificar";

export const ETIQUETA_CLASE: Record<ResultadoClase, string> = {
  asistida: "Asistida",
  no_asistida: "No asistida",
  cancelada_tarde: "Cancelada tarde",
  cancelada_a_tiempo: "Cancelada a tiempo",
  cambiada_de_dia: "Cambiada de día",
  cancelada_profesor: "Cancelada por el profesor",
  sin_parte: "Sin parte",
  pendiente: "Parte pendiente",
  sin_clasificar: "Tipo desconocido",
};

/** Lo que pierde la garantía. */
const RESULTADOS_DE_PERDIDA: ReadonlySet<ResultadoClase> = new Set<ResultadoClase>(["no_asistida", "cancelada_tarde"]);

export type ClaseEvaluada = {
  fecha: string;
  hora: string | null;
  profesor: string | null;
  resultado: ResultadoClase;
  /** Minutos entre el aviso y la clase, si se saben. */
  antelacionMin: number | null;
  /**
   * La antelación no consta y el resultado es lo que dice el profesor.
   * Solo en partes anteriores a `avisado_en`.
   */
  segunProfesor: boolean;
  /** Una frase para el detalle. */
  nota: string;
  /** El parte en crudo. Null en una clase programada sin parte. */
  parte: ParteClase | null;
};

export type ResultadoLeccion = "a_tiempo" | "tarde" | "pendiente";

export type LeccionEvaluada = LeccionDrip & {
  curso: string;
  completadaEn: string | null;
  resultado: ResultadoLeccion;
};

export type ResultadoSemana = "a_tiempo" | "tarde" | "pendiente" | "en_plazo" | "sin_datos";

export const ETIQUETA_SEMANA: Record<ResultadoSemana, string> = {
  a_tiempo: "Completada a tiempo",
  tarde: "Completada tarde",
  pendiente: "Sin completar",
  en_plazo: "En plazo",
  sin_datos: "Sin datos",
};

export type SemanaEvaluada = {
  /** 1, 2, 3… como se cuenta en voz alta. */
  numero: number;
  /** Día en que abre. */
  abre: string;
  /** Día en que vence: a las 00:00 de este día ya es tarde. */
  vence: string;
  resultado: ResultadoSemana;
  lecciones: LeccionEvaluada[];
};

/** La copia de lo que hizo perder la garantía. */
export type Evidencia =
  | { tipo: "clase"; clase: ClaseEvaluada }
  | { tipo: "semana"; semana: SemanaEvaluada };

export type Veredicto = {
  estado: Estado;
  /** La frase de la lista. */
  motivo: string;
  /** Día de la pérdida. Solo con «Perdida». */
  fechaPerdida: string | null;
  evidencia: Evidencia | null;
  /** Por qué no se puede decidir. Vacío salvo con «Sin datos». */
  huecos: string[];
  clases: ClaseEvaluada[];
  semanas: SemanaEvaluada[];
  /** Si la cláusula del contenido se aplica a este alumno. */
  conContenido: boolean;
};

// ---------------------------------------------------------------
// FORMATO
// ---------------------------------------------------------------

// A mano y no con `Intl`: según la versión de ICU, septiembre sale
// «sep» o «sept», y el motivo se guarda en la base.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-12" → "12 oct 2026". */
export function diaLegible(dia: string): string {
  const [a, m, d] = dia.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** 1500 → "25 h"; 90 → "1 h 30 min"; 45 → "45 min". */
export function duracionLegible(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

function claseLegible(fecha: string, hora: string | null): string {
  return hora ? `${diaLegible(fecha)}, ${hora}` : diaLegible(fecha);
}

// ---------------------------------------------------------------
// LAS CLASES
// ---------------------------------------------------------------

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * El instante de la clase. Sin hora se toma el último minuto del día:
 * es la lectura que más antelación le da al alumno, y una duda no puede
 * jugar en su contra.
 */
function instanteDeClase(fecha: string, hora: string | null): Date {
  return instanteEnMadrid(fecha, hora && HORA.test(hora) ? hora : "23:59");
}

function comoInstante(iso: string | null): Date | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t) : null;
}

/** Quién canceló o movió la clase. Null: el parte no es una cancelación. */
function autorDe(parte: ParteClase): Autor | null {
  if (parte.canceladoPor) return parte.canceladoPor;
  switch (parte.tipo) {
    case "cancelacion_hora":
    case "falta_con_aviso":
      return "alumno";
    // Pensados para las cancelaciones del profesor. Hay partes de estos
    // tipos que hablan de faltas del alumno, pero el tipo es lo que
    // Gestión dice: la duda se resuelve a favor del alumno.
    case "cancelada_por_profesor":
    case "cancelada_con_preaviso":
      return "profesor";
    case "reprogramada":
      return parte.motivo === "profesor" ? "profesor" : "alumno";
    default:
      return null;
  }
}

/** Un parte, traducido al lenguaje de la garantía. */
export function evaluarParte(parte: ParteClase): ClaseEvaluada {
  const base = { fecha: parte.fecha, hora: parte.hora, profesor: parte.profesor, parte };

  if (parte.tipo === "normal" || parte.tipo === "recuperacion") {
    return { ...base, resultado: "asistida", antelacionMin: null, segunProfesor: false, nota: "Clase dada." };
  }
  if (parte.tipo === "falta_sin_aviso") {
    return { ...base, resultado: "no_asistida", antelacionMin: null, segunProfesor: false, nota: "Faltó sin avisar." };
  }

  const autor = autorDe(parte);
  if (autor === null) {
    return {
      ...base,
      resultado: "sin_clasificar",
      antelacionMin: null,
      segunProfesor: false,
      nota: `Parte de tipo «${parte.tipo}», que la garantía no sabe leer.`,
    };
  }

  const movida = parte.tipo === "reprogramada";

  if (autor !== "alumno") {
    return {
      ...base,
      resultado: "cancelada_profesor",
      antelacionMin: null,
      segunProfesor: false,
      nota: movida ? "La movió el profesor." : autor === "academia" ? "La canceló la academia." : "La canceló el profesor.",
    };
  }

  // El aviso: el de Gestión si lo hay; en el autoservicio, la hora del
  // parte, que la pone el sistema en el momento del cambio.
  const aviso = comoInstante(parte.avisadoEn) ?? (parte.motivo === "autoservicio" ? comoInstante(parte.registradoEn) : null);
  const clase = instanteDeClase(parte.fecha, parte.hora);

  if (aviso) {
    const antelacionMin = Math.floor((clase.getTime() - aviso.getTime()) / 60_000);
    if (antelacionMin < ANTELACION_MINIMA_MIN) {
      return {
        ...base,
        resultado: "cancelada_tarde",
        antelacionMin,
        segunProfesor: false,
        nota: `Avisó con ${duracionLegible(antelacionMin)} de antelación (menos de 24 h).`,
      };
    }
    return {
      ...base,
      resultado: movida ? "cambiada_de_dia" : "cancelada_a_tiempo",
      antelacionMin,
      segunProfesor: false,
      nota: `Avisó con ${duracionLegible(antelacionMin)} de antelación.${movida && parte.rescheduledTo ? ` Pasó al ${diaLegible(parte.rescheduledTo)}.` : ""}`,
    };
  }

  // SIN HORA DE AVISO: partes anteriores al cambio de Gestión.
  if (parte.tipo === "cancelacion_hora" || parte.motivo === "alumno_sobre_hora") {
    return {
      ...base,
      resultado: "cancelada_tarde",
      antelacionMin: null,
      segunProfesor: true,
      nota: "El profesor la registró como cancelación sobre la hora.",
    };
  }

  // Si el parte se subió con 24 h o más por delante, el aviso fue antes
  // todavía: eso sí está probado.
  const registro = comoInstante(parte.registradoEn);
  const cota = registro ? Math.floor((clase.getTime() - registro.getTime()) / 60_000) : null;
  const probada = cota !== null && cota >= ANTELACION_MINIMA_MIN;

  return {
    ...base,
    resultado: movida ? "cambiada_de_dia" : "cancelada_a_tiempo",
    antelacionMin: probada ? cota : null,
    segunProfesor: !probada,
    nota: probada
      ? `Avisó con al menos ${duracionLegible(cota)} de antelación (el parte se subió entonces).`
      : `A tiempo según el profesor; no consta la hora del aviso.`,
  };
}

/**
 * Las clases programadas sin parte. Se casan por día: primero con un
 * parte a la misma hora, luego con cualquiera del día. Lo que sobra no
 * tiene parte.
 */
function programadasSinParte(programadas: ClaseProgramada[], partes: ParteClase[]): ClaseProgramada[] {
  const porDia = new Map<string, string[]>();
  for (const p of partes) {
    const horas = porDia.get(p.fecha) ?? [];
    horas.push((p.hora ?? "").slice(0, 2));
    porDia.set(p.fecha, horas);
  }

  const sobran: ClaseProgramada[] = [];
  const porFecha = new Map<string, ClaseProgramada[]>();
  for (const c of programadas) {
    const lista = porFecha.get(c.fecha) ?? [];
    lista.push(c);
    porFecha.set(c.fecha, lista);
  }

  porFecha.forEach((clases, fecha) => {
    const libres = [...(porDia.get(fecha) ?? [])];
    const pendientes: ClaseProgramada[] = [];
    for (const c of clases) {
      const i = libres.indexOf(c.hora.slice(0, 2));
      if (i >= 0) libres.splice(i, 1);
      else pendientes.push(c);
    }
    for (const c of pendientes) {
      if (libres.length > 0) libres.pop();
      else sobran.push(c);
    }
  });

  return sobran;
}

// ---------------------------------------------------------------
// EL CONTENIDO
// ---------------------------------------------------------------

/**
 * Las semanas del drip. La semana N reúne los módulos que abren entre
 * el día 7N y el 7N+6 desde el inicio, y vence cuando empieza la N+1: a
 * las 00:00 de España del día 7(N+1).
 */
export function semanasDelDrip(
  inicio: string,
  modulos: ModuloDrip[],
  completadas: ReadonlyMap<string, string>,
  ahora: Date
): SemanaEvaluada[] {
  const porSemana = new Map<number, { abreDia: number; lecciones: LeccionEvaluada[] }>();

  for (const modulo of modulos) {
    const dias = Math.max(0, Math.floor(modulo.visibleAfter));
    const n = Math.floor(dias / 7);
    const semana = porSemana.get(n) ?? { abreDia: dias, lecciones: [] };
    semana.abreDia = Math.min(semana.abreDia, dias);
    for (const leccion of modulo.lecciones) {
      semana.lecciones.push({ ...leccion, curso: modulo.curso, completadaEn: completadas.get(leccion.id) ?? null, resultado: "pendiente" });
    }
    porSemana.set(n, semana);
  }

  const salida: SemanaEvaluada[] = [];
  porSemana.forEach((semana, n) => {
    if (semana.lecciones.length === 0) return;

    const abre = sumarDias(inicio, semana.abreDia);
    const vence = sumarDias(inicio, 7 * (n + 1));
    const limite = instanteEnMadrid(vence, "00:00").getTime();
    const vencida = ahora.getTime() >= limite;

    const lecciones = semana.lecciones.map((l): LeccionEvaluada => {
      const hecha = comoInstante(l.completadaEn);
      if (!hecha) return { ...l, resultado: "pendiente" };
      return { ...l, resultado: hecha.getTime() < limite ? "a_tiempo" : "tarde" };
    });

    let resultado: ResultadoSemana;
    if (lecciones.some((l) => l.resultado === "tarde")) {
      // Una fecha de completado es una prueba, venga de donde venga.
      resultado = "tarde";
    } else if (lecciones.every((l) => l.resultado === "a_tiempo")) {
      resultado = "a_tiempo";
    } else if (!vencida) {
      resultado = "en_plazo";
    } else if (vence <= CONTENIDO_FIABLE_DESDE) {
      // Venció con LearnDash: una lección sin fecha no prueba nada.
      resultado = "sin_datos";
    } else {
      resultado = "pendiente";
    }

    salida.push({ numero: n + 1, abre, vence, resultado, lecciones });
  });

  return salida.sort((a, b) => a.numero - b.numero);
}

// ---------------------------------------------------------------
// EL VEREDICTO
// ---------------------------------------------------------------

/** Un incumplimiento: lo que por sí solo hace perder la garantía. */
export type Perdida = { fecha: string; motivo: string; evidencia: Evidencia };

function perdidaDeClase(c: ClaseEvaluada): Perdida {
  const cuando = claseLegible(c.fecha, c.hora);
  const quien = c.profesor ? ` (${c.profesor})` : "";
  const motivo =
    c.resultado === "no_asistida"
      ? `Faltó sin avisar a la clase del ${cuando}${quien}.`
      : c.antelacionMin !== null
        ? `Canceló la clase del ${cuando}${quien} con ${duracionLegible(c.antelacionMin)} de antelación.`
        : `Canceló sobre la hora la clase del ${cuando}${quien}, según el profesor.`;
  return { fecha: c.fecha, motivo, evidencia: { tipo: "clase", clase: c } };
}

function perdidaDeSemana(s: SemanaEvaluada): Perdida {
  const total = s.lecciones.length;
  const tarde = s.lecciones.filter((l) => l.resultado === "tarde");
  const sinHacer = s.lecciones.filter((l) => l.resultado === "pendiente").length;
  const partes: string[] = [];
  if (sinHacer > 0) partes.push(`${sinHacer} de ${total} ${total === 1 ? "lección" : "lecciones"} sin completar`);
  if (tarde.length > 0) partes.push(`${tarde.length} ${tarde.length === 1 ? "completada" : "completadas"} tarde`);
  const motivo = `Semana ${s.numero} (abrió el ${diaLegible(s.abre)}, vencía el ${diaLegible(s.vence)}): ${partes.join(" y ")}.`;
  return { fecha: s.vence, motivo, evidencia: { tipo: "semana", semana: s } };
}

/**
 * Todo lo que por sí solo la haría perder, del más antiguo al más
 * reciente. El primero es el motivo; el resto se enseña en el detalle.
 */
export function incumplimientos(clases: ClaseEvaluada[], semanas: SemanaEvaluada[]): Perdida[] {
  return [
    ...clases.filter((c) => RESULTADOS_DE_PERDIDA.has(c.resultado)).map(perdidaDeClase),
    ...semanas.filter((s) => s.resultado === "tarde" || s.resultado === "pendiente").map(perdidaDeSemana),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function calcularGarantia(e: EntradaGarantia): Veredicto {
  const hoy = diaLocal(e.ahora);
  const conContenido = !e.intensivo;
  const vacio = { clases: [], semanas: [], conContenido };

  if (!e.inicio || !/^\d{4}-\d{2}-\d{2}/.test(e.inicio)) {
    const motivo = "No tiene fecha de inicio en Gestión.";
    return { estado: "sin_datos", motivo, fechaPerdida: null, evidencia: null, huecos: [motivo], ...vacio };
  }
  const inicio = e.inicio.slice(0, 10);
  if (inicio > hoy) {
    return { estado: "en_curso", motivo: `Empieza el ${diaLegible(inicio)}.`, fechaPerdida: null, evidencia: null, huecos: [], ...vacio };
  }

  // La ventana: del inicio al fin del plan, y nunca más allá de hoy.
  const hasta = e.fin && e.fin < hoy ? e.fin : hoy;
  const dentro = (fecha: string) => fecha >= inicio && fecha <= hasta;

  // ---- Las clases ----
  const partes = e.partes.filter((p) => dentro(p.fecha));
  const clases: ClaseEvaluada[] = partes.map(evaluarParte);

  const programadas = e.programadas.filter((c) => dentro(c.fecha) && instanteDeClase(c.fecha, c.hora) <= e.ahora);
  for (const c of programadasSinParte(programadas, partes)) {
    const horas = (e.ahora.getTime() - instanteDeClase(c.fecha, c.hora).getTime()) / 3_600_000;
    const pendiente = horas < HORAS_DE_GRACIA_PARTE;
    clases.push({
      fecha: c.fecha,
      hora: c.hora,
      profesor: c.profesor,
      resultado: pendiente ? "pendiente" : "sin_parte",
      antelacionMin: null,
      segunProfesor: false,
      nota: pendiente
        ? "Estaba en el calendario; el profesor aún está a tiempo de subir el parte."
        : `Estaba en el calendario y no tiene parte después de ${HORAS_DE_GRACIA_PARTE} h.`,
      parte: null,
    });
  }
  clases.sort((a, b) => (a.fecha + (a.hora ?? "")).localeCompare(b.fecha + (b.hora ?? "")));

  // ---- El contenido ----
  let semanas: SemanaEvaluada[] = [];
  const huecos: string[] = [];

  if (conContenido) {
    // Una semana cuenta si vence dentro del plan: la que vencería después
    // del último día ya no se le puede pedir.
    const tope = e.fin ? sumarDias(e.fin, 1) : null;
    semanas = semanasDelDrip(inicio, e.modulos, e.completadas, e.ahora).filter((s) => tope === null || s.vence <= tope);
    if (e.modulos.length === 0 && e.cursosSinDrip > 0) {
      huecos.push("Sus cursos están abiertos enteros (sin drip): no hay plazo semanal que medir.");
    }
  }

  // ---- ¿Perdida? La primera prueba, por fecha. ----
  const perdidas = incumplimientos(clases, semanas);

  if (perdidas.length > 0) {
    const primera = perdidas[0];
    return {
      estado: "perdida",
      motivo: primera.motivo,
      fechaPerdida: primera.fecha,
      evidencia: primera.evidencia,
      huecos: [],
      clases,
      semanas,
      conContenido,
    };
  }

  // ---- ¿Falta algo para decidir? ----
  if (inicio < DATOS_DE_CLASES_DESDE) {
    huecos.push(`Empezó el ${diaLegible(inicio)} y no hay partes de clase anteriores al ${diaLegible(DATOS_DE_CLASES_DESDE)}.`);
  }
  const sinParte = clases.filter((c) => c.resultado === "sin_parte");
  if (sinParte.length > 0) {
    const primera = sinParte[0];
    huecos.push(
      sinParte.length === 1
        ? `La clase del ${claseLegible(primera.fecha, primera.hora)} no tiene parte.`
        : `${sinParte.length} clases sin parte; la primera, la del ${claseLegible(primera.fecha, primera.hora)}.`
    );
  }
  for (const c of clases.filter((c) => c.resultado === "sin_clasificar")) {
    huecos.push(`${claseLegible(c.fecha, c.hora)}: ${c.nota}`);
  }
  const semanasSinDatos = semanas.filter((s) => s.resultado === "sin_datos");
  if (semanasSinDatos.length > 0) {
    huecos.push(
      `${semanasSinDatos.length} ${semanasSinDatos.length === 1 ? "semana venció" : "semanas vencieron"} antes del ${diaLegible(CONTENIDO_FIABLE_DESDE)} con lecciones sin fecha de LearnDash.`
    );
  }

  if (huecos.length > 0) {
    return { estado: "sin_datos", motivo: huecos[0], fechaPerdida: null, evidencia: null, huecos, clases, semanas, conContenido };
  }

  // ---- ¿Terminó? ----
  const terminado = e.fin !== null && e.fin < hoy;
  const esperando = clases.some((c) => c.resultado === "pendiente");

  if (terminado && !esperando) {
    return {
      estado: "cumplida",
      motivo: `Plan terminado el ${diaLegible(e.fin as string)} sin incumplimientos.`,
      fechaPerdida: null,
      evidencia: null,
      huecos: [],
      clases,
      semanas,
      conContenido,
    };
  }

  const motivo = terminado
    ? "Plan terminado; falta el parte de la última clase."
    : e.fin
      ? `Va cumpliendo. Su plan termina el ${diaLegible(e.fin)}.`
      : "Va cumpliendo. Su plan no tiene fecha de fin.";
  return { estado: "en_curso", motivo, fechaPerdida: null, evidencia: null, huecos: [], clases, semanas, conContenido };
}

/** Los intensivos se reconocen por el nombre del producto o del plan. */
export function esIntensivo(...nombres: (string | null | undefined)[]): boolean {
  return nombres.some((n) => typeof n === "string" && /intensiv/i.test(n));
}

// ---------------------------------------------------------------
// LO QUE SE GUARDA
//
// El cálculo dice lo que ve hoy; esto decide qué queda escrito. Es la
// misma regla para el cron, que lo escribe, y para la pantalla, que lo
// enseña antes de que el cron pase.
// ---------------------------------------------------------------

/** Lo que hay en `garantia_estado`. */
export type Guardado = {
  estado: Estado;
  motivo: string;
  fechaPerdida: string | null;
  evidencia: Evidencia | null;
  corregido: boolean;
};

export type Vigente = {
  estado: Estado;
  motivo: string;
  fechaPerdida: string | null;
  evidencia: Evidencia | null;
  /** Si el ESTADO cambia respecto a lo guardado: es lo que va al historial. */
  cambia: boolean;
};

export function estadoVigente(previo: Guardado | null, calculado: Veredicto): Vigente {
  // Una corrección a mano manda, y una pérdida no tiene vuelta atrás.
  if (previo && (previo.corregido || previo.estado === "perdida")) {
    return {
      estado: previo.estado,
      motivo: previo.motivo,
      fechaPerdida: previo.fechaPerdida,
      evidencia: previo.evidencia,
      cambia: false,
    };
  }
  return {
    estado: calculado.estado,
    motivo: calculado.motivo,
    fechaPerdida: calculado.fechaPerdida,
    evidencia: calculado.evidencia,
    cambia: previo === null || previo.estado !== calculado.estado,
  };
}
