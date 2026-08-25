// ---------------------------------------------------------------
// CUÁNTO LE FALTA AL ALUMNO PARA SU SIGUIENTE NIVEL
//
// ⚠ ESTE ARCHIVO ES UNA COPIA. El original es `lib/progressEstimate.ts`
// de DRC GESTIÓN, que dice de sí mismo que es la única fuente de verdad
// del cálculo, y lo sigue siendo: lo que hay aquí es un port literal
// para que el LMS pueda pintar el mismo banner sin abrirle `assignments`.
//
// SI SE TOCA UN NÚMERO ALLÍ, HAY QUE TOCARLO AQUÍ. No hay forma de que
// el compilador lo detecte: son dos repositorios sin paquete común. Lo
// único que lo sujeta es esta nota y que las constantes estén juntas y
// con el mismo nombre, para que un diff de los dos archivos se lea de
// un vistazo.
//
// Se copió, y no se expuso el resultado ya calculado en la vista de
// Gestión, porque meter la tabla de Cambridge y la detección de examen
// en SQL sería tener la fórmula en dos lenguajes en vez de en dos
// archivos del mismo. Por el contrato viajan hechos; el cálculo se
// repite. Ver la cabecera de `supabase/gestion-vista-perfil-ritmo.sql`.
//
// ---------------------------------------------------------------
// DE DÓNDE SALEN LAS HORAS (para poder defenderlo si un alumno pregunta)
//
// Son las *Guided Learning Hours* que publica Cambridge English para
// cada uno de sus exámenes, que es la referencia pública y citable
// sobre cuántas horas de estudio guiado lleva alcanzar cada nivel:
//
//     A2 Key            180 – 200 h
//     B1 Preliminary    350 – 400 h
//     B2 First          500 – 600 h
//     C1 Advanced       700 – 800 h
//     C2 Proficiency  1.000 – 1.200 h
//
// Se usa el valor medio de cada rango.
//
// EL A1 NO ES DE CAMBRIDGE y conviene saberlo antes de enseñárselo a
// nadie: no hay examen a ese nivel, así que no publican horas. Las 90
// son la cifra de consenso habitual y solo se usan como suelo de la
// escalera, nunca como objetivo.
//
// NO SON HORAS DE CLASE, SON HORAS GUIADAS. Es la distinción que
// justifica el multiplicador de práctica: quien da una hora de clase no
// avanza una hora guiada, avanza esa hora MÁS lo que practica por su
// cuenta entre clases. Contar solo el aula daría previsiones
// absurdamente pesimistas.
//
// NULL NO ES CERO. Si falta el nivel o las horas del plan, esto
// devuelve null y el banner no se pinta. Antes de decirle a un alumno
// un número inventado sobre su propio aprendizaje, no se le dice nada.
// ---------------------------------------------------------------

import { ESCALERA_MCER, nivelMcer, type NivelMcer } from "@/lib/recorrido";

// ---------------------------------------------------------------
// LAS CONSTANTES AJUSTABLES. Es el único sitio donde se tocan.
// ---------------------------------------------------------------

/** Horas guiadas ACUMULADAS para alcanzar cada nivel. */
export const HORAS_GUIADAS_HASTA: Record<NivelMcer, number> = {
  A1: 90,
  A2: 190,
  B1: 375,
  B2: 550,
  C1: 750,
  C2: 1100,
};

/**
 * Horas guiadas que produce cada hora de clase.
 *
 * 1,5 = por cada hora de clase el alumno suma media hora de práctica
 * propia. Es el valor CONSERVADOR: con 2,0 las estimaciones bajan casi
 * un tercio y seguirían siendo razonables, pero preferimos quedarnos
 * cortos en la promesa antes que pasarnos.
 */
export const MULTIPLICADOR_PRACTICA = 1.5;

/**
 * Semanas útiles en un mes. 4,0 y no 4,33 a propósito: descuenta
 * vacaciones, festivos y clases perdidas, unas 48 semanas activas al año.
 */
export const SEMANAS_POR_MES = 4.0;

/** Techo de horas semanales que tiene sentido proponer. */
export const HORAS_SEMANALES_MAXIMAS = 5;

/** Escalones de ampliación que se ofrecen sobre el plan actual. */
export const ESCALONES = [1, 2];

// ---------------------------------------------------------------
// EL NIVEL META
// ---------------------------------------------------------------

/**
 * Exámenes de Cambridge y el nivel que certifican. Es el mapeo oficial.
 *
 * IELTS no certifica un nivel fijo (es una banda de 0 a 9), así que se
 * toma B2: corresponde a la banda 5,5 – 6,5, que es la que piden la
 * inmensa mayoría de universidades y visados.
 */
const EXAMENES: Array<{ nivel: NivelMcer; re: RegExp }> = [
  { nivel: "C2", re: /\b(proficiency|cpe)\b/ },
  { nivel: "C1", re: /\b(advanced)\b/ },
  { nivel: "B2", re: /\b(first\s+certificate|first|fce|ielts|toefl)\b/ },
  { nivel: "B1", re: /\b(preliminary)\b/ },
];

/**
 * CAE y PET son a la vez códigos de examen y palabras españolas
 * corrientes ("cae bien el horario"). Se exigen en MAYÚSCULAS sobre el
 * texto SIN normalizar, que es como se escriben siempre los exámenes.
 */
const CODIGOS_EXAMEN: Array<{ nivel: NivelMcer; re: RegExp }> = [
  { nivel: "C1", re: /\bCAE\b/ },
  { nivel: "B1", re: /\bPET\b/ },
];

/**
 * Muchos planes no nombran el examen, nombran su NIVEL: "B2 Exámenes",
 * "Preparación B1". Son 32 de las 184 assignments reales, así que sin
 * esto la detección se pierde a la mitad de los alumnos de examen.
 *
 * El código MCER solo cuenta si aparece junto a una palabra de examen.
 * Sin esa condición, "Curso de inglés general - 2h semanales, B2"
 * declararía el B2 como meta cuando es el nivel al que YA da clase, y
 * todos los alumnos de inglés general saldrían con un objetivo
 * inventado.
 */
const CONTEXTO_EXAMEN = /\b(examen(?:es)?|preparacion(?:es)?|certificad[oa]s?)\b/;
const CODIGO_MCER = /\b(A1|A2|B1|B2|C1|C2)\b/g;

/**
 * Quita tildes y pasa a minúsculas, para que "Preparación" case con
 * `preparacion`.
 *
 * Gestión usa `/\p{Diacritic}/gu`, que aquí no compila: este repo no fija
 * `target`, así que TypeScript asume ES5 y ahí no hay escapes de
 * propiedad Unicode. El rango \u0300-\u036f es el bloque de marcas
 * diacríticas combinantes, que después de `normalize("NFD")` es
 * exactamente lo que aquel separa: la ñ se descompone en n + U+0303 y
 * cae igual. Mismo resultado, sin tocar la configuración del proyecto.
 */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** El nivel del examen escrito en el texto, o null si no hay uno inequívoco. */
function nivelDeExamen(crudo: string, texto: string): NivelMcer | null {
  if (CONTEXTO_EXAMEN.test(texto)) {
    // Un solo código y sin ambigüedad. Con dos ("B1 Exámenes … objetivo
    // C1") no se sabe cuál es la meta, y adivinar es peor que callarse.
    // Desduplicado a mano: `[...new Set()]` exige `downlevelIteration`
    // con el target de este repo, y aquí son tres códigos como mucho.
    const encontrados: string[] = [];
    for (const codigo of crudo.toUpperCase().match(CODIGO_MCER) ?? []) {
      if (encontrados.indexOf(codigo) === -1) encontrados.push(codigo);
    }
    if (encontrados.length === 1) return encontrados[0] as NivelMcer;
  }
  for (const { nivel, re } of EXAMENES) if (re.test(texto)) return nivel;
  for (const { nivel, re } of CODIGOS_EXAMEN) if (re.test(crudo)) return nivel;
  return null;
}

export type OrigenMeta = "examen" | "siguiente_nivel";

export type Meta = {
  nivel: NivelMcer;
  origen: OrigenMeta;
};

/**
 * El nivel al que apunta el alumno.
 *
 *   1. Si su plan es de examen, el nivel que certifica ese examen. Es el
 *      objetivo real y explícito: quien prepara el First va a por el B2,
 *      no "al siguiente".
 *   2. Si no, el siguiente peldaño. Modesto y honesto.
 *
 * NULL EN DOS CASOS, y los dos significan lo mismo para la pantalla:
 *
 *   · El alumno ya está en C2. No hay escalón por encima que prometer.
 *   · El alumno ya está EN el nivel del examen que prepara. Su meta es
 *     aprobar ese examen, no subir al siguiente, y decirle "para llegar
 *     al B2 te quedan 175 horas" contesta una pregunta que no ha hecho.
 *     No tenemos una referencia defendible de cuántas horas lleva
 *     consolidar un nivel hasta aprobar su examen, así que no se estima.
 *
 * Un examen POR DEBAJO del nivel actual (un C1 apuntado al First) es un
 * dato incoherente: se ignora y se sigue por la escalera.
 */
export function detectarMeta(
  textosDelPlan: Array<string | null | undefined>,
  nivelActual: NivelMcer
): Meta | null {
  const crudo = textosDelPlan.filter(Boolean).join(" ");
  const texto = normalizar(crudo);
  const actual = ESCALERA_MCER.indexOf(nivelActual);

  const examen = nivelDeExamen(crudo, texto);
  if (examen) {
    const suyo = ESCALERA_MCER.indexOf(examen);
    if (suyo > actual) return { nivel: examen, origen: "examen" };
    if (suyo === actual) return null;
  }

  const siguiente = ESCALERA_MCER[actual + 1];
  return siguiente ? { nivel: siguiente, origen: "siguiente_nivel" } : null;
}

// ---------------------------------------------------------------
// ARITMÉTICA
// ---------------------------------------------------------------

/** Horas guiadas que separan dos niveles. 0 si la meta no está por encima. */
export function horasEntre(desde: NivelMcer, hasta: NivelMcer): number {
  const diferencia = HORAS_GUIADAS_HASTA[hasta] - HORAS_GUIADAS_HASTA[desde];
  return diferencia > 0 ? diferencia : 0;
}

/** Meses que lleva cubrir `horas` a razón de `porSemana` horas de clase. */
export function mesesPara(horas: number, porSemana: number): number {
  if (porSemana <= 0 || horas <= 0) return 0;
  const alMes = porSemana * MULTIPLICADOR_PRACTICA * SEMANAS_POR_MES;
  return Math.max(1, Math.round(horas / alMes));
}

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * "mayo de 2028" a partir de hoy más `meses`.
 *
 * Aritmética en UTC a propósito: es una etiqueta de calendario, no un
 * instante. Calculada en la zona del navegador, el día 1 de mes saltaría
 * al mes anterior para media Europa.
 *
 * El nombre del mes sale de la tabla de arriba y no de `toLocaleDateString`,
 * que es lo que hace Gestión: esto se renderiza en el servidor, y el
 * `es-ES` del entorno de Node no está garantizado en todos los runtimes.
 * Un mes en inglés dentro de una frase en español sería peor que
 * cualquier otra cosa que pueda fallar aquí.
 */
export function mesDeLlegada(meses: number, desde: Date): string {
  const fecha = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() + meses, 1));
  return `${MESES_LARGOS[fecha.getUTCMonth()]} de ${fecha.getUTCFullYear()}`;
}

// ---------------------------------------------------------------
// EL RESULTADO
// ---------------------------------------------------------------

export type OpcionDeRitmo = {
  horasSemanales: number;
  meses: number;
  /** "abril de 2027" */
  llegada: string;
  /** Ancho relativo de la barra, de 0 a 100. El plan más lento vale 100. */
  porcentajeBarra: number;
  esSuPlan: boolean;
  /** Meses que se ahorra respecto al plan actual. 0 en el plan actual. */
  mesesAhorrados: number;
};

export type Estimacion = {
  nivelActual: NivelMcer;
  meta: Meta;
  /** Horas guiadas que separan el nivel actual de la meta. */
  horasQueFaltan: number;
  horasSemanalesActuales: number;
  /** Plan actual primero, luego las ampliaciones. Nunca vacío. */
  opciones: OpcionDeRitmo[];
  /** ¿Hay algo que ofrecer? False cuando ya está en el plan más alto. */
  hayAmpliacion: boolean;
};

export type DatosDeEstimacion = {
  /** Nivel actual en crudo: "B1", "Nivel b1", "B1 exámenes"… */
  nivelActual: string | null | undefined;
  /** Horas de clase a la semana del plan contratado. */
  horasSemanales: number | null | undefined;
  /** Textos donde puede estar escrito el examen: plan, objetivo, producto. */
  textosDelPlan: Array<string | null | undefined>;
  /** Inyectable para poder fijar la fecha en una prueba. */
  ahora?: Date;
};

/**
 * La estimación completa, o null si no hay datos suficientes.
 *
 * Devuelve null cuando no se reconoce el nivel actual, cuando no se
 * saben las horas del plan, o cuando no hay meta por encima. En los tres
 * casos la pantalla simplemente no enseña el banner.
 */
export function calcularEstimacion(datos: DatosDeEstimacion): Estimacion | null {
  const nivelActual = nivelMcer(datos.nivelActual);
  if (!nivelActual) return null;

  const semanales = Math.round(Number(datos.horasSemanales ?? 0));
  if (!Number.isFinite(semanales) || semanales < 1) return null;

  const meta = detectarMeta(datos.textosDelPlan, nivelActual);
  if (!meta) return null;

  const horasQueFaltan = horasEntre(nivelActual, meta.nivel);
  if (horasQueFaltan <= 0) return null;

  const ahora = datos.ahora ?? new Date();

  const planes = [
    semanales,
    ...ESCALONES.map((escalon) => semanales + escalon).filter(
      (horas) => horas <= HORAS_SEMANALES_MAXIMAS
    ),
  ];

  const crudas = planes.map((horas) => ({
    horasSemanales: horas,
    meses: mesesPara(horasQueFaltan, horas),
  }));

  const masLento = crudas[0].meses || 1;

  const opciones: OpcionDeRitmo[] = crudas.map((opcion) => ({
    horasSemanales: opcion.horasSemanales,
    meses: opcion.meses,
    llegada: mesDeLlegada(opcion.meses, ahora),
    // El 12 de suelo es para que la barra más corta siga siendo una
    // barra: a 4 meses contra 8, un 50% se ve; a 1 mes contra 15, un 7%
    // sería una raya que no se lee como nada.
    porcentajeBarra: Math.max(12, Math.round((opcion.meses / masLento) * 100)),
    esSuPlan: opcion.horasSemanales === semanales,
    mesesAhorrados: Math.max(0, crudas[0].meses - opcion.meses),
  }));

  return {
    nivelActual,
    meta,
    horasQueFaltan,
    horasSemanalesActuales: semanales,
    opciones,
    hayAmpliacion: opciones.length > 1,
  };
}

/** "1 mes" · "15 meses". */
export function enMeses(cantidad: number): string {
  return cantidad === 1 ? "1 mes" : `${cantidad} meses`;
}

// ---------------------------------------------------------------
// EL NIVEL EFECTIVO
//
// Port de `lib/effectiveLevel.ts` de Gestión, recortado a lo que el LMS
// puede ver. Gana el primero que contenga un código MCER de verdad, no
// el primero que esté relleno: los campos de nivel son texto libre y en
// producción `assignments.student_level` dice cosas como "Inglés
// general" o "B1 Exámenes". Un campo relleno pero sin MCER dentro no es
// un nivel, y si ganara por estar relleno taparía a uno posterior que sí
// lo tiene.
//
// FALTA `teacher_confirmed_level`, que en Gestión va primero. No existe
// en la base: `supabase-teacher-level.sql` nunca se corrió. Cuando se
// corra, se añade a la vista y se mete aquí delante del resto.
// ---------------------------------------------------------------

/**
 * El nivel del alumno, con la misma prioridad que usa Gestión.
 *
 * Los tres argumentos llegan de `vista_perfil_alumno`. Los dos primeros
 * solo existen si se corrió `gestion-vista-perfil-ritmo.sql`; sin ellos
 * esto se queda en el de siempre, que es lo que el LMS enseñaba antes.
 */
export function nivelEfectivo(
  nivelFicha: string | null,
  nivelPrueba: string | null,
  nivelDelAlta: string
): NivelMcer | null {
  return (
    nivelMcer(nivelFicha) ?? nivelMcer(nivelPrueba) ?? nivelMcer(nivelDelAlta)
  );
}
