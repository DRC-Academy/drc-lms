// ---------------------------------------------------------------
// EL HORARIO DE CLASES DEL ALUMNO
//
// De dónde sale: `assignments.slots` en DRC Gestión, expuesto por
// `vista_perfil_alumno` (ver `supabase/gestion-vista-perfil-clases.sql`).
// Llega como un array JSON:
//
//     [{"day":"Miércoles","hour":"11:00"}, {"day":"Viernes","hour":"11:00"}]
//
// CADA SLOT ES UNA HORA DE CLASE, y no es una interpretación: en los 205
// alumnos `assignments.weekly_hours` coincide exactamente con el número
// de slots. Un alumno de 2h semanales tiene dos slots, y si los dos caen
// el mismo día son dos horas seguidas de la misma clase.
//
// POR ESO SE AGRUPA POR DÍA. Un alumno con {Miércoles 16:00} y
// {Miércoles 17:00} no tiene dos clases el miércoles: tiene una de
// 16:00 a 18:00. Y uno con {Miércoles 09:00} y {Viernes 09:00} tiene dos
// clases distintas, una cada día. Medido: de los 205, 16 tienen más de
// un slot el mismo día, y los 21 bloques que forman son SIEMPRE horas
// seguidas —ni un solo caso de horas sueltas—.
//
// Aun así, `agruparPorDia` parte los tramos no consecutivos en filas
// distintas en vez de estirar uno solo de la primera hora a la última.
// Hoy no pasa nunca; el día que pase, un alumno con clase a las 10 y a
// las 18 leería "10:00–19:00" y se perdería la de la tarde.
//
// TODO ESTO ES HORA DE ESPAÑA. Comprobado contra los datos: cruzando 968
// entradas puntuales de `class_join_logs`, la hora guardada va 2h por
// delante del `clicked_at` en UTC en 814 de ellas, que es CEST. Las
// horas viajan como texto "HH:MM" sin zona, así que quien las pinte
// tiene que anclarlas a `Europe/Madrid` —lo hace este módulo, que es el
// único sitio donde se convierte—. Un `new Date()` a secas las leería en
// la zona del servidor, que en Vercel es UTC, y saldrían dos horas
// corridas media parte del año y una la otra.
//
// Módulo puro: sin `server-only`, lo importan componentes de cliente.
// ---------------------------------------------------------------

import { diaLocal, sumarDias } from "@/lib/fechas";
import { clasesDelAlumno, type ClaseDeGestion, type FilaCalendario } from "@/lib/calendario-gestion";

/**
 * Los días tal y como los escribe Gestión, en el orden de
 * `Date.getUTCDay()` para poder restar sin tabla de conversión.
 *
 * Con tilde y con mayúscula inicial porque así están guardados y así se
 * comparan. `Domingo` no aparece hoy en ninguna fila —nadie da clase en
 * domingo— pero está por el mismo motivo que `Sábado`, que solo lo usan
 * nueve slots: el día que alguien lo ponga, esto no puede ignorarlo.
 */
export const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export type DiaSemana = (typeof DIAS)[number];

/** Una celda del horario: un día y una hora en punto. Una hora de clase. */
export type Slot = { dia: DiaSemana; hora: string };

/** Un tramo seguido de clase en un día: de `desde` a `hasta`. */
export type DiaDeClase = {
  dia: DiaSemana;
  /** Su posición en `DIAS`, que es la de `Date.getUTCDay()`. */
  indice: number;
  /** "16:00" */
  desde: string;
  /** "18:00" — la hora a la que termina, no la de la última celda. */
  hasta: string;
  /** Cuántas horas dura. */
  horas: number;
};

/** La clase que viene, ya con su fecha y sus instantes. */
export type ProximaClase = DiaDeClase & {
  /** Día natural español, "2026-09-25". */
  fecha: string;
  /** Es hoy. */
  esHoy: boolean;
  /** Está ocurriendo ahora mismo. */
  enCurso: boolean;
  /**
   * LOS TRES INSTANTES, EN ABSOLUTO.
   *
   * `dia`, `desde` y `hasta` son hora española escrita; estos son el
   * momento exacto, sin zona y sin ambigüedad. Existen porque la
   * ventana del botón no se puede decidir comparando cadenas: hay que
   * poder restar, y hay que poder mandárselos al navegador para que se
   * encienda solo sin volver a preguntar qué hora es en Madrid.
   */
  empiezaEn: Date;
  terminaEn: Date;
  /** Cuándo se puede pulsar el botón: `MINUTOS_ANTES` antes de empezar. */
  abreEn: Date;
  /** Quien da ESTA clase, que en una recuperación puede no ser el habitual. */
  profesor: string | null;
  /**
   * El `meet_link` CRUDO de la assignment de ese profesor: lo mismo que
   * abre su botón en Gestión. NO VIAJA AL NAVEGADOR tal cual: lo valida
   * `enlaceDeClase` y solo se pinta con la ventana abierta.
   */
  meetLink: string | null;
  esRecuperacion: boolean;
};

/**
 * Cuánto antes se abre la sala.
 *
 * TREINTA MINUTOS FIJOS, también si la clase dura dos horas: media hora
 * es lo que tarda alguien en prepararse para entrar, y eso no depende de
 * lo que dure la clase. Y no se cierra tarde por si se alarga —cuando
 * eso pasa el alumno ya está dentro, y quien está dentro no necesita el
 * botón—.
 */
export const MINUTOS_ANTES = 30;

// ---------------------------------------------------------------
// LEER LO QUE LLEGA DE LA BASE
// ---------------------------------------------------------------

const ES_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function esDia(valor: unknown): valor is DiaSemana {
  return typeof valor === "string" && (DIAS as readonly string[]).includes(valor);
}

/**
 * Los slots de un alumno, validados uno a uno.
 *
 * Lo que no tenga la forma exacta se descarta en silencio y el resto
 * sigue: un alumno con tres clases y una celda torcida ve sus tres
 * clases menos una, no una pantalla vacía. Hoy no hay ni una fila mal
 * en los 205, pero esto lo rellena una persona en Gestión.
 *
 * Se ordenan por día y hora para que el horario salga siempre igual:
 * el array de la base viene en el orden en que se fueron pulsando las
 * celdas, que no es ninguno.
 */
export function normalizarSlots(valor: unknown): Slot[] {
  if (!Array.isArray(valor)) return [];

  const salida: Slot[] = [];
  for (const crudo of valor) {
    if (typeof crudo !== "object" || crudo === null) continue;
    const { day, hour } = crudo as { day?: unknown; hour?: unknown };
    if (!esDia(day)) continue;
    if (typeof hour !== "string" || !ES_HORA.test(hour.trim())) continue;
    salida.push({ dia: day, hora: hour.trim() });
  }

  return ordenar(salida);
}

/**
 * Sin duplicados y en orden estable.
 *
 * Lo de los duplicados no es cosmético: dos celdas iguales se pegarían
 * en `agruparPorDia` como si fueran dos horas seguidas y la clase
 * duraría el doble.
 *
 * El orden es el de `DIAS` —de domingo a sábado— porque aquí solo hace
 * falta que sea SIEMPRE EL MISMO; el orden de lectura, de lunes a
 * domingo, lo pone `agruparPorDia` al final.
 */
function ordenar(slots: Slot[]): Slot[] {
  const vistos = new Set<string>();
  return slots
    .filter((s) => {
      const clave = `${s.dia}|${s.hora}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.hora.localeCompare(b.hora));
}

const enMinutos = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

const comoHora = (minutos: number): string =>
  `${String(Math.floor(minutos / 60) % 24).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

/**
 * Los slots convertidos en filas de horario: una por tramo seguido.
 *
 * LA SEMANA EMPIEZA EN LUNES para pintarla, aunque `DIAS` esté en el
 * orden de `getUTCDay()` —que empieza en domingo— porque ese orden es
 * para restar días, no para leerlo. Un horario que empiece en domingo
 * no es el horario de nadie en España.
 */
export function agruparPorDia(slots: Slot[]): DiaDeClase[] {
  const porDia = new Map<DiaSemana, number[]>();
  for (const s of ordenar(slots)) {
    const lista = porDia.get(s.dia) ?? [];
    lista.push(enMinutos(s.hora));
    porDia.set(s.dia, lista);
  }

  const filas: DiaDeClase[] = [];
  for (const [dia, crudas] of Array.from(porDia)) {
    const horas = [...crudas].sort((a, b) => a - b);
    let inicio = horas[0];
    let fin = horas[0] + 60;

    for (const hora of horas.slice(1)) {
      if (hora === fin) {
        // Pegada a la anterior: el tramo crece.
        fin = hora + 60;
        continue;
      }
      filas.push({ dia, indice: DIAS.indexOf(dia), desde: comoHora(inicio), hasta: comoHora(fin), horas: (fin - inicio) / 60 });
      inicio = hora;
      fin = hora + 60;
    }
    filas.push({ dia, indice: DIAS.indexOf(dia), desde: comoHora(inicio), hasta: comoHora(fin), horas: (fin - inicio) / 60 });
  }

  // De lunes a domingo, y dentro del día por hora.
  const orden = (d: DiaDeClase) => (d.indice === 0 ? 7 : d.indice);
  return filas.sort((a, b) => orden(a) - orden(b) || a.desde.localeCompare(b.desde));
}

// ---------------------------------------------------------------
// CUÁL ES LA PRÓXIMA
// ---------------------------------------------------------------

/** El día de la semana de un día natural "2026-09-25". */
function diaDeLaSemana(dia: string): number {
  return new Date(`${dia}T00:00:00Z`).getUTCDay();
}

// ---------------------------------------------------------------
// DE HORA ESPAÑOLA A INSTANTE
//
// Esto es lo único de este módulo que no es aritmética de días, y hace
// falta para la ventana del botón: "el jueves a las 17:00 en Madrid"
// tiene que convertirse en un instante para poder compararlo con
// `Date.now()` y para poder mandárselo al navegador.
//
// SIN LIBRERÍA Y SIN OFFSET ESCRITO A MANO. Se le pregunta a `Intl` cuál
// es el desfase de Madrid EN ESE MOMENTO, que es lo que cambia el 25 de
// octubre. Un `-2` fijo funcionaría hasta ese día y luego mandaría a
// todo el mundo a la sala una hora tarde.
// ---------------------------------------------------------------

const PARTES_MADRID = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Milisegundos que Madrid va por delante de UTC en ese instante. */
function desfaseMadrid(momento: Date): number {
  const p: Record<string, number> = {};
  for (const parte of PARTES_MADRID.formatToParts(momento)) {
    if (parte.type !== "literal") p[parte.type] = Number(parte.value);
  }
  const comoSiFueraUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return comoSiFueraUtc - momento.getTime();
}

/**
 * El instante en que, en Madrid, es `dia` a las `hora`.
 *
 * DOS PASADAS, y la segunda no es paranoia: el desfase se pide para un
 * instante que todavía no se conoce, así que la primera estimación puede
 * caer al otro lado del cambio de hora y devolver el desfase que no era.
 * Con la segunda, la única hora que sigue siendo ambigua es la que se
 * repite la madrugada del cambio, a las 02:00 de un domingo de octubre,
 * y ahí no hay clases.
 */
export function instanteEnMadrid(dia: string, hora: string): Date {
  const [anio, mes, diaMes] = dia.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const comoUtc = Date.UTC(anio, mes - 1, diaMes, hh, mm, 0);

  let instante = comoUtc - desfaseMadrid(new Date(comoUtc));
  instante = comoUtc - desfaseMadrid(new Date(instante));
  return new Date(instante);
}

/**
 * Un 'quita' de `vista_excepciones_clase`: la clase de ese día —a esa
 * hora, o todas si no trae hora— no ocurre. Sale de una cancelación, una
 * falta o el origen de una reprogramación anotados en `class_records`.
 */
export type Quita = {
  fecha: string;
  hora: string | null;
  /**
   * El `class_type` del parte. Solo lo mira el calendario: el origen de
   * una reprogramación (`reprogramada`) no se enseña como cancelada, porque
   * la clase sale en su destino.
   */
  tipo?: string | null;
};

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Los 'quita' de `vista_excepciones_clase`, validados. Las filas 'añade'
 * se ignoran: las clases que se añaden ya salen del calendario de Gestión
 * como celdas de recuperación.
 */
export function normalizarQuitas(valor: unknown): Quita[] {
  if (!Array.isArray(valor)) return [];
  const salida: Quita[] = [];
  for (const crudo of valor) {
    if (typeof crudo !== "object" || crudo === null) continue;
    const { tipo, fecha, hora, class_type } = crudo as Record<string, unknown>;
    if (tipo !== "quita" || typeof fecha !== "string" || !ES_FECHA.test(fecha)) continue;
    const tipoParte = typeof class_type === "string" ? class_type : null;
    if (hora === null || hora === undefined) {
      salida.push({ fecha, hora: null, tipo: tipoParte });
    } else if (typeof hora === "string" && ES_HORA.test(hora.trim())) {
      salida.push({ fecha, hora: hora.trim(), tipo: tipoParte });
    }
    // Una hora que viene y no se entiende no se convierte en "todo el
    // día": quitaría clases que nadie ha cancelado.
  }
  return salida;
}

/**
 * Si un 'quita' se lleva esta clase: mismo día y, si trae hora, que caiga
 * dentro de la clase. Dentro y no solo al empezar: en una clase de dos
 * horas el parte puede ir a nombre de la segunda, y Gestión lo cruza
 * igual (`recordInSpan`).
 *
 * UNA RECUPERACIÓN NO SE QUITA NUNCA, como en Gestión: allí una clase de
 * recuperación no sale cancelada ni reprogramada aunque haya un parte
 * para ese hueco. Pasa de verdad: un alumno con una cancelación a las
 * 16:00 y su recuperación a las 16:00 del mismo día tiene clase.
 */
function laQuita(q: Quita, c: ClaseDeGestion): boolean {
  if (c.esRecuperacion || q.fecha !== c.fecha) return false;
  if (q.hora === null) return true;
  const h = enMinutos(q.hora);
  const inicio = enMinutos(c.desde);
  return h >= inicio && h < inicio + c.horas * 60;
}

/**
 * Cuántos días hacia delante se miran. Nueve semanas: cubre a un alumno
 * con varias semanas seguidas canceladas y a uno sin horario fijo con una
 * recuperación pactada a un mes vista. Más allá, una celda puntual del
 * grid de Gestión ya no es fiable —cada celda guarda una sola semana—.
 */
export const DIAS_HACIA_DELANTE = 63;

/**
 * La clase que viene, o null si el alumno no tiene ninguna.
 *
 * LAS CLASES SON LAS DE GESTIÓN: `clases` sale de `clasesDelAlumno`
 * (`lib/calendario-gestion.ts`), que es la lógica del «Mis clases» del
 * profesor copiada tal cual. Aquí solo se decide cuál es la próxima, y
 * esta es la única función del LMS que lo decide.
 *
 * LA QUE ESTÁ OCURRIENDO AHORA ES LA PRÓXIMA, y llega marcada con
 * `enCurso`: es el momento en el que el botón de entrar importa más que
 * en ningún otro. Una clase deja de ser la próxima cuando TERMINA, no
 * cuando empieza: el alumno que llega diez minutos tarde sigue teniendo
 * su botón. Por eso se elige la de fin más temprano entre las que no han
 * terminado.
 *
 * Las que tienen un 'quita' se saltan y la próxima pasa a ser la
 * siguiente.
 */
export function proximaClase(
  clases: ClaseDeGestion[],
  ahora: Date = new Date(),
  quitas: Quita[] = []
): ProximaClase | null {
  let mejor: ProximaClase | null = null;

  for (const c of clases) {
    if (quitas.some((q) => laQuita(q, c))) continue;

    const clase = aClase(c, ahora);
    if (clase.terminaEn.getTime() <= ahora.getTime()) continue;
    if (mejor && clase.terminaEn.getTime() >= mejor.terminaEn.getTime()) continue;
    mejor = clase;
  }

  return mejor;
}

/**
 * Una clase de Gestión con su día, sus horas escritas y sus tres
 * instantes. La usan la próxima clase y el calendario, así que las dos
 * cuentan el tiempo igual.
 */
function aClase(c: ClaseDeGestion, ahora: Date): ProximaClase {
  const empiezaEn = instanteEnMadrid(c.fecha, c.desde);
  // El final se suma al inicio, no se lee de una hora escrita: una clase
  // de 23:00 termina a las "00:00" del día siguiente, y esa cadena leída
  // sobre la misma fecha daría una clase que acaba antes de empezar.
  const terminaEn = new Date(empiezaEn.getTime() + c.horas * 3_600_000);
  const indice = diaDeLaSemana(c.fecha);
  return {
    dia: DIAS[indice],
    indice,
    desde: c.desde,
    hasta: comoHora(enMinutos(c.desde) + c.horas * 60),
    horas: c.horas,
    fecha: c.fecha,
    esHoy: c.fecha === diaLocal(ahora),
    enCurso: ahora.getTime() >= empiezaEn.getTime() && ahora.getTime() < terminaEn.getTime(),
    empiezaEn,
    terminaEn,
    abreEn: new Date(empiezaEn.getTime() - MINUTOS_ANTES * 60_000),
    profesor: c.profesor?.trim() || null,
    meetLink: c.meetLink,
    esRecuperacion: c.esRecuperacion,
  };
}

/**
 * Lo que necesita cualquier pantalla: las filas del calendario y las
 * excepciones de Gestión, crudas, y la hora. La usan «Mis clases» y el
 * inicio, así que las dos dicen siempre la misma clase.
 */
export function proximaDelAlumno(
  filas: FilaCalendario[],
  excepciones: unknown,
  ahora: Date = new Date()
): ProximaClase | null {
  const clases = clasesDelAlumno(filas, diaLocal(ahora), DIAS_HACIA_DELANTE);
  return proximaClase(clases, ahora, normalizarQuitas(excepciones));
}

// ---------------------------------------------------------------
// EL CALENDARIO: ESTA SEMANA Y LAS TRES SIGUIENTES
//
// Las mismas clases que dan la próxima (`clasesDelAlumno`, la lógica de
// Gestión) y los mismos 'quita'. Lo único que añade es el estado de cada
// una, para pintarla:
//
//   normal         una clase del horario.
//   recuperacion   una celda de recuperación del grid.
//   reprogramada   una celda de recuperación que es el DESTINO de una
//                  reprogramación: hay un 'añade' de tipo reprogramada en
//                  ese día cuyo `original_date` es el `recoveryFor` de la
//                  celda. Lleva la fecha original, la del parte.
//   cancelada      una clase del horario con un 'quita'. Se ve, apagada y
//                  sin botón. Una recuperación no se cancela nunca, como
//                  en Gestión.
//
// El origen de una reprogramación no sale: su 'quita' es de tipo
// reprogramada, y la clase ya aparece en su destino con el aviso.
//
// NADA DEL PASADO: una clase que ya ha terminado no sale, aunque sea de
// esta semana. El pasado es el historial.
// ---------------------------------------------------------------

export type EstadoCalendario = "normal" | "recuperacion" | "reprogramada" | "cancelada";

export type ClaseCalendario = ProximaClase & {
  estado: EstadoCalendario;
  /** Reprogramada: el día que tenía antes, "2026-09-28". */
  original: string | null;
};

export type DiaCalendario = { fecha: string; esHoy: boolean; clases: ClaseCalendario[] };

export type SemanaCalendario = {
  /** El lunes y el domingo de la semana, días naturales españoles. */
  lunes: string;
  domingo: string;
  dias: DiaCalendario[];
};

/** Cuántas semanas enseña el calendario: esta y las tres siguientes. */
export const SEMANAS_CALENDARIO = 4;

/**
 * Los destinos de reprogramación de `vista_excepciones_clase`: sus
 * 'añade' de tipo reprogramada, con el día al que se movió la clase y el
 * día que tenía.
 */
export function normalizarReprogramaciones(valor: unknown): { fecha: string; original: string }[] {
  if (!Array.isArray(valor)) return [];
  const salida: { fecha: string; original: string }[] = [];
  for (const crudo of valor) {
    if (typeof crudo !== "object" || crudo === null) continue;
    const { tipo, class_type, fecha, original_date } = crudo as Record<string, unknown>;
    if (tipo !== "añade" || class_type !== "reprogramada") continue;
    if (typeof fecha !== "string" || !ES_FECHA.test(fecha)) continue;
    if (typeof original_date !== "string" || !ES_FECHA.test(original_date)) continue;
    salida.push({ fecha, original: original_date });
  }
  return salida;
}

/** El lunes de la semana de un día natural. */
export function lunesDe(dia: string): string {
  return sumarDias(dia, -((diaDeLaSemana(dia) + 6) % 7));
}

/**
 * Las semanas del calendario, de la actual en adelante. Función pura: la
 * hora entra como argumento.
 */
export function semanasDelAlumno(
  filas: FilaCalendario[],
  excepciones: unknown,
  ahora: Date = new Date(),
  semanas: number = SEMANAS_CALENDARIO
): SemanaCalendario[] {
  const hoy = diaLocal(ahora);
  const primerLunes = lunesDe(hoy);
  const clases = clasesDelAlumno(filas, primerLunes, semanas * 7 - 1);
  const quitas = normalizarQuitas(excepciones);
  const reprogramaciones = normalizarReprogramaciones(excepciones);

  const porDia = new Map<string, ClaseCalendario[]>();
  for (const c of clases) {
    const clase = aClase(c, ahora);
    if (clase.terminaEn.getTime() <= ahora.getTime()) continue;

    let estado: EstadoCalendario = "normal";
    let original: string | null = null;

    const quita = quitas.find((q) => laQuita(q, c));
    if (quita) {
      if (quita.tipo === "reprogramada") continue;
      estado = "cancelada";
    } else if (c.esRecuperacion) {
      const movida = reprogramaciones.find((r) => r.fecha === c.fecha && r.original === c.recoveryFor);
      if (movida) {
        estado = "reprogramada";
        original = movida.original;
      } else {
        estado = "recuperacion";
      }
    }

    const lista = porDia.get(c.fecha) ?? [];
    lista.push({ ...clase, estado, original });
    porDia.set(c.fecha, lista);
  }

  const salida: SemanaCalendario[] = [];
  for (let s = 0; s < semanas; s++) {
    const lunes = sumarDias(primerLunes, s * 7);
    const dias: DiaCalendario[] = [];
    for (let d = 0; d < 7; d++) {
      const fecha = sumarDias(lunes, d);
      const delDia = (porDia.get(fecha) ?? []).sort((a, b) => a.empiezaEn.getTime() - b.empiezaEn.getTime());
      dias.push({ fecha, esHoy: fecha === hoy, clases: delDia });
    }
    salida.push({ lunes, domingo: sumarDias(lunes, 6), dias });
  }
  return salida;
}

/**
 * Si la sala se puede abrir ahora.
 *
 * Esta es la única función que decide si el botón se puede pulsar, y la
 * llama el SERVIDOR. El navegador no vota: lo único que hace con
 * `abreEn` es saber cuántos segundos faltan para volver a preguntar.
 */
export function ventanaAbierta(proxima: ProximaClase | null, ahora: Date = new Date()): boolean {
  if (!proxima) return false;
  const t = ahora.getTime();
  return t >= proxima.abreEn.getTime() && t < proxima.terminaEn.getTime();
}

// ---------------------------------------------------------------
// EL ENLACE
//
// `assignments.meet_link` lo escribe una persona a mano en Gestión, y se
// nota. De los 205 alumnos: 188 tienen un enlace que abre algo, 10 lo
// tienen vacío y 7 llevan texto que no es un enlace —"aaa", "hola",
// "meet.com", una invitación de Zoom pegada entera—.
//
// UN CAMPO RELLENO NO ES UN BOTÓN. Esa es toda la razón de que esto
// exista: sin validar, siete alumnos verían "Unirse a la clase" y al
// pulsarlo no pasaría nada, o peor, el navegador resolvería "aaa" como
// ruta relativa y los mandaría a una página del LMS que no existe.
//
// Y HAY NUEVE SIN `https://` —"meet.google.com/abc-defg-hij"—. Ese sí es
// un enlace bueno con el esquema olvidado, así que se le pone y se
// aprovecha; descartarlos sería quitarle el botón a nueve alumnos que
// tienen sala.
// ---------------------------------------------------------------

/**
 * Los dominios de videollamada que se aceptan.
 *
 * Es una lista blanca a propósito. El campo es texto libre en una base
 * que el LMS no controla, y de aquí sale un `href` que se le pone
 * delante a un alumno: sin lista, una URL cualquiera pegada por error
 * en Gestión se convierte en un enlace que el LMS firma como "tu clase".
 */
const DOMINIOS = [
  "meet.google.com",
  "zoom.us",
  "teams.live.com",
  "teams.microsoft.com",
  "whereby.com",
  "meet.jit.si",
];

/**
 * El enlace de la clase, listo para un `href`, o null si no hay uno
 * utilizable.
 *
 * Null es un resultado normal y la pantalla sabe qué hacer con él: el
 * horario se enseña igual y el botón se cambia por el aviso de que se lo
 * pida a su profesor. Ver `components/clases/MisClases.tsx`.
 */
export function enlaceDeClase(valor: string | null | undefined): string | null {
  const texto = String(valor ?? "").trim();
  if (texto === "") return null;
  // Con espacios dentro no es un enlace: es un texto que contiene uno.
  // Rescatarlo a base de expresiones regulares sobre una invitación
  // pegada entera es adivinar, y lo que se adivina aquí acaba siendo un
  // botón que promete una sala.
  if (/\s/.test(texto)) return null;

  const conEsquema = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const vale = DOMINIOS.some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
  if (!vale) return null;

  // Una sala siempre tiene algo después del dominio. "meet.google.com" a
  // secas es la portada del producto, no la clase de nadie.
  if (url.pathname === "/" || url.pathname === "") return null;

  return url.toString();
}
