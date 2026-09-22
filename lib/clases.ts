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

/** La clase que viene, ya con su fecha. */
export type ProximaClase = DiaDeClase & {
  /** Día natural español, "2026-09-25". */
  fecha: string;
  /** Es hoy. */
  esHoy: boolean;
  /** Está ocurriendo ahora mismo. */
  enCurso: boolean;
};

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

/** La hora de España de un instante, en minutos desde medianoche. */
function minutosEnEspana(momento: Date): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(momento)
    .split(":")
    .map(Number);
  return h * 60 + m;
}

/** El día de la semana de un día natural "2026-09-25". */
function diaDeLaSemana(dia: string): number {
  return new Date(`${dia}T00:00:00Z`).getUTCDay();
}

/**
 * La clase que viene, o null si el alumno no tiene horario.
 *
 * LA QUE ESTÁ OCURRIENDO AHORA ES LA PRÓXIMA, y llega marcada con
 * `enCurso`. Es el momento en el que el botón de entrar importa más que
 * en ningún otro, así que sería justo el peor momento para saltar a la
 * de la semana que viene.
 *
 * Una clase deja de ser la próxima cuando TERMINA, no cuando empieza:
 * el alumno que llega diez minutos tarde sigue teniendo su botón.
 *
 * Todo se cuenta en día natural español —`diaLocal` y `sumarDias` ya
 * están anclados a `Europe/Madrid`— así que el cambio de hora de octubre
 * no mueve nada: los días se suman como días, no como 86.400 segundos.
 */
export function proximaClase(dias: DiaDeClase[], ahora: Date = new Date()): ProximaClase | null {
  if (dias.length === 0) return null;

  const hoy = diaLocal(ahora);
  const hoyDow = diaDeLaSemana(hoy);
  const minutos = minutosEnEspana(ahora);

  let mejor: ProximaClase | null = null;
  let mejorClave = Infinity;

  for (const dia of dias) {
    const fin = enMinutos(dia.hasta);
    const inicio = enMinutos(dia.desde);

    let salto = (dia.indice - hoyDow + 7) % 7;
    // Si es hoy pero ya terminó, la próxima es la de dentro de una semana.
    if (salto === 0 && minutos >= fin) salto = 7;

    const clave = salto * 1440 + inicio;
    if (clave >= mejorClave) continue;

    mejorClave = clave;
    mejor = {
      ...dia,
      fecha: sumarDias(hoy, salto),
      esHoy: salto === 0,
      enCurso: salto === 0 && minutos >= inicio && minutos < fin,
    };
  }

  return mejor;
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
