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

/**
 * Una opción de la escalera cuando NO hay meta que estimar.
 *
 * Es la mitad de `OpcionDeRitmo` que no depende de ninguna cuenta: las
 * horas del plan y su barra. Sin meses, sin fecha de llegada y sin
 * meses ahorrados, porque esos tres salen de `horasQueFaltan` y aquí no
 * hay meta de la que restar.
 */
export type OpcionDeHoras = {
  horasSemanales: number;
  /** Cuántas horas más que su plan actual. 0 en el suyo. */
  horasExtra: number;
  /** Ancho relativo, 0-100. Aquí el plan MÁS ALTO vale 100. */
  porcentajeBarra: number;
  esSuPlan: boolean;
};

/**
 * La escalera de planes, sin estimar nada.
 *
 * Para los alumnos que preparan el examen de su propio nivel: no hay
 * meta por encima, así que no hay meses que contar —ver `detectarMeta`—
 * pero sí hay planes por encima, y cuántas horas da cada uno es un
 * HECHO, no una predicción. Eso es lo que esta función devuelve.
 *
 * OJO CON LA BARRA, QUE SIGNIFICA LO CONTRARIO. En el banner con
 * estimación la barra mide MESES y la más corta es la mejor; aquí mide
 * HORAS y la más larga es la mejor. Son el mismo dibujo con el sentido
 * invertido, así que cada barra va rotulada con sus horas y el titular
 * dice de qué va: en el de estimación se llega antes, en este se llega
 * más preparado. Si algún día las dos caben en la misma pantalla, esto
 * hay que resolverlo mejor.
 *
 * Null cuando no se saben las horas o cuando ya está en el plan más
 * alto: sin nada por encima no hay escalera, hay un peldaño.
 */
export function opcionesDeHoras(horasSemanales: number | null | undefined): OpcionDeHoras[] | null {
  const semanales = Math.round(Number(horasSemanales ?? 0));
  if (!Number.isFinite(semanales) || semanales < 1) return null;

  // La misma escalera que usa `calcularEstimacion`, para que un alumno
  // que cruce de un caso al otro vea los mismos planes.
  const planes = [
    semanales,
    ...ESCALONES.map((escalon) => semanales + escalon).filter(
      (horas) => horas <= HORAS_SEMANALES_MAXIMAS
    ),
  ];

  if (planes.length < 2) return null;

  const masAlto = planes[planes.length - 1];

  return planes.map((horas) => ({
    horasSemanales: horas,
    horasExtra: horas - semanales,
    porcentajeBarra: Math.max(12, Math.round((horas / masAlto) * 100)),
    esSuPlan: horas === semanales,
  }));
}

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
// Port de `lib/effectiveLevel.ts` de Gestión. Gana el primero que
// contenga un código MCER de verdad, no el primero que esté relleno: los
// campos de nivel son texto libre y en producción
// `assignments.student_level` dice cosas como "Inglés general" o "B1
// Exámenes". Un campo relleno pero sin MCER dentro no es un nivel, y si
// ganara por estar relleno taparía a uno posterior que sí lo tiene.
//
// LA PRIORIDAD, de más a menos:
//
//   1. nivel_profesor  lo que confirmó el profesor tras las primeras
//                      clases. Manda sobre todo lo demás.
//   2. nivel_ficha     la columna histórica de la ficha de IA.
//   3. nivel_prueba    la prueba de nivel automática.
//   4. nivel           lo que tecleó quien dio de alta al alumno.
//
// NO SE MIRA `students.level`, aunque exista y esté relleno en los 174.
// La ficha de Gestión no lo lee, y comparado con esta regla difiere en 9
// alumnos: usarlo sería la forma más rápida de que las dos pantallas le
// enseñen al mismo alumno dos niveles distintos.
// ---------------------------------------------------------------

/**
 * El nivel del alumno, con la misma prioridad que usa Gestión.
 *
 * Los cuatro argumentos llegan de `vista_perfil_alumno`. Los tres
 * primeros solo existen si se corrió `gestion-vista-perfil-ritmo.sql`;
 * sin ellos esto cae en el último, que es lo que el LMS enseñaba antes.
 */
export function nivelEfectivo(
  nivelProfesor: string | null,
  nivelFicha: string | null,
  nivelPrueba: string | null,
  nivelDelAlta: string
): NivelMcer | null {
  return (
    nivelMcer(nivelProfesor) ??
    nivelMcer(nivelFicha) ??
    nivelMcer(nivelPrueba) ??
    nivelMcer(nivelDelAlta)
  );
}

/**
 * ALUMNOS A LOS QUE NO SE LES MUEVE EL NIVEL TODAVÍA.
 *
 * Revisado el 31/08/2026 sobre los 27 alumnos cuya medición discrepaba
 * de la casilla del alta. Dos motivos, y ninguno es «por si acaso»:
 *
 *   · TIENE PROGRESO. Cambiarle el nivel le cambia el curso, y el curso
 *     viejo deja de aparecerle con todo lo que llevaba hecho. No se
 *     borra nada —las filas de `progreso_lecciones` siguen ahí y vuelven
 *     si recupera el curso— pero deja de verlo, y a uno de estos eso le
 *     esconde 277 lecciones.
 *
 *   · SALTA MÁS DE UN PELDAÑO. Una medición que mueve dos niveles de
 *     golpe es más probable que sea un dato mal grabado que un alumno
 *     que ha cambiado tanto. `cd6ee017` salta CUATRO —de A1 a C1, según
 *     la prueba de nivel— y eso no es una medición, es algo roto.
 *
 * ESTA LISTA TIENE QUE LLEGAR A CERO. No es una configuración: es una
 * cola de revisión. Cada id que sigue aquí es un alumno cuyo nivel
 * alguien tiene que mirar una vez —idealmente su profesor, con el
 * control de confirmación que todavía no existe— y borrar de aquí.
 *
 * Mientras esté, estos alumnos siguen con el nivel del alta, que es
 * exactamente lo que tenían antes de este cambio: congelar no les
 * empeora nada, solo no les mejora.
 */
const NIVEL_CONGELADO = new Set<string>([
  // Con progreso en el curso actual.
  "s_1785879819493", // A2→B1 (ficha) · 277 lecciones
  "ac3efda1-cf3c-46d3-8296-eb5e5626cda5", // B1→B2 (profesor) · 66 lecciones
  "s_1782421075994", // B2→B1 (profesor) · 3 lecciones y 3 bloques
  // Saltos de más de un peldaño.
  "a020d853-5c95-49d3-b9fa-a3cef562dccf", // B2→A2 (profesor)
  "s_1787847320673", // B1→C1 (prueba)
  "s_1785270685149", // B1→C1 (prueba)
  "s_1787614018519", // B1→C1 (prueba)
  "s_1785440736376", // B2→A2 (profesor)
  "s_1786648930172", // B1→A1 (profesor)
  "cd6ee017-9f31-4288-80f1-dccbb13a72a1", // A1→C1 (prueba) · cuatro peldaños: revisar el dato
]);

/**
 * EL NIVEL DEL ALUMNO. El único sitio del que sale, para toda la
 * aplicación.
 *
 * Antes había dos respuestas a la misma pregunta —`nivelEfectivo` en la
 * ficha de progreso y `perfil.nivel` en las otras nueve rutas— y por eso
 * había alumnos leyendo un nivel y recibiendo el curso de otro. Ver el
 * bloque de causa raíz más abajo.
 *
 * Devuelve una CADENA y no `NivelMcer` a propósito: quien la recibe
 * —`cursosAsignados`, `nivelDeBloque`— espera lo que había en la
 * columna, y un alumno sin ningún nivel reconocible tiene que seguir
 * pasando por ahí igual que antes en vez de romper.
 */
export function nivelDelAlumno(
  alumnoId: string,
  perfil: {
    nivel: string;
    nivelProfesor: string | null;
    nivelFicha: string | null;
    nivelPrueba: string | null;
  }
): string {
  if (NIVEL_CONGELADO.has(alumnoId)) return perfil.nivel;

  return (
    nivelEfectivo(perfil.nivelProfesor, perfil.nivelFicha, perfil.nivelPrueba, perfil.nivel) ??
    perfil.nivel
  );
}

/**
 * De DÓNDE ha salido el nivel que devuelve `nivelEfectivo`.
 *
 * Existe porque «cuál es su nivel» y «cuánto nos fiamos de ese nivel»
 * son dos preguntas distintas, y hasta ahora la aplicación solo sabía
 * contestar la primera. La segunda es la que decide si una cifra
 * calculada sobre ese nivel se puede enseñar a secas.
 *
 * EL REPARTO HOY, sobre los 174 alumnos:
 *
 *   nivel_profesor    26   14,9%   confirmado por una persona
 *   nivel_ficha        1    0,6%
 *   nivel_prueba      22   12,6%   prueba automática
 *   nivel (alta)     125   71,8%   lo tecleó quien dio de alta
 *
 * Esos 125 son el problema: de ellos, 70 están en B1, que es el valor
 * por defecto. Es decir, para siete de cada diez alumnos el nivel con
 * el que se elige su curso, se filtran sus ejercicios y se calcula su
 * estimación es un dato que nadie ha confirmado nunca.
 */
export type OrigenNivel = "profesor" | "ficha" | "prueba" | "alta" | "ninguno";

export function origenDelNivel(
  nivelProfesor: string | null,
  nivelFicha: string | null,
  nivelPrueba: string | null,
  nivelDelAlta: string
): OrigenNivel {
  if (nivelMcer(nivelProfesor)) return "profesor";
  if (nivelMcer(nivelFicha)) return "ficha";
  if (nivelMcer(nivelPrueba)) return "prueba";
  if (nivelMcer(nivelDelAlta)) return "alta";
  return "ninguno";
}

/**
 * Si el nivel se puede enseñar sin advertencia.
 *
 * La raya se pone entre la cuarta columna y las tres primeras, no entre
 * «humano» y «máquina»: la prueba de nivel es automática pero es una
 * MEDICIÓN, y el alta es una casilla de un formulario con un valor por
 * defecto. Medido flojo sigue siendo medido; sin medir no.
 */
export function nivelEsFiable(origen: OrigenNivel): boolean {
  return origen === "profesor" || origen === "ficha" || origen === "prueba";
}

// ===============================================================
// LA CAUSA RAÍZ: UN RESOLUTOR Y NUEVE RUTAS QUE NO LO USAN
//
// Esto es lo que produce todos los desajustes de nivel de la
// aplicación, y hay que arreglarlo de verdad o vuelve con cada alumno
// nuevo. Queda escrito aquí porque es el módulo donde vive la regla.
//
// EL SÍNTOMA. `nivelEfectivo` —la prioridad profesor > ficha > prueba >
// alta— se llamaba desde UN solo sitio: `app/progreso/page.tsx`, para
// pintar la ficha. Las otras nueve rutas leían `perfil.nivel` en crudo,
// que es la casilla del alta:
//
//   app/alumno/[id]/page.tsx        qué curso ve · qué ejercicios recibe
//   app/api/generar-bloque/route.ts con qué nivel se le genera material
//   app/practica/page.tsx           · app/curso/[slug]/page.tsx
//   app/curso/[slug]/[leccion]      · app/alumno/[id]/[bloqueId]
//   app/acciones-accesos.ts         · y la propia página de progreso,
//                                     que usaba las dos a la vez
//
// LA CONSECUENCIA, medida el 31/08/2026: 27 alumnos tenían una medición
// —profesor o prueba— que decía un nivel distinto del alta, y los 27
// recibían el curso del alta mientras su ficha les enseñaba el medido.
// Uno de ellos llevaba 277 lecciones del curso equivocado.
//
// NO ERA UN FALLO DE DATOS. La prioridad estaba bien escrita y bien
// probada; simplemente casi nadie la llamaba. Un resolutor que no se usa
// no resuelve nada.
//
// LO QUE SE HIZO: `nivelDelAlumno` de aquí abajo es ahora el único sitio
// del que sale un nivel, y las nueve rutas pasan por él.
//
// LO QUE FALTA, y es lo que impide que vuelva:
//
//   1. QUE `perfil.nivel` NO SE PUEDA LEER SUELTO. Mientras la propiedad
//      exista en `PerfilAlumno`, la próxima pantalla la va a usar: es la
//      que se llama «nivel» y la que sale primero al autocompletar. Lo
//      que cierra esto de verdad es renombrarla —`nivelDelAlta`— para
//      que quien la escriba sepa lo que está cogiendo.
//   2. UNA REGLA QUE LO IMPIDA, no solo un nombre. Un `grep` en CI que
//      falle ante `perfil.nivel` fuera de este módulo cuesta diez
//      minutos y vale más que este comentario.
//   3. QUE LA LISTA DE CONGELADOS DE ABAJO LLEGUE A CERO. Mientras haya
//      excepciones por id, hay alumnos a los que la regla no se aplica y
//      nadie se acuerda de por qué.
// ===============================================================

// ---------------------------------------------------------------
// LO QUE HAY QUE ARREGLAR DE VERDAD, Y NO ES ESTA FUNCIÓN
//
// `nivelEsFiable` es un parche honesto: dice en voz alta que un dato no
// está confirmado. No lo confirma. Mientras el origen no se arregle, la
// marca va a salir en 125 de 174 fichas, y una advertencia que aparece
// en el 72% de las pantallas deja de leerse a las dos semanas.
//
// LA CONTRADICCIÓN, DICHA ENTERA. El equipo ya decidió que si el nivel
// no es fiable es mejor no enseñarlo, y por eso NO se enseña en el
// inicio del alumno —está anotado en `app/alumno/[id]/page.tsx`: «no es
// un dato que el alumno necesite»—. Pero ese mismo dato sin confirmar
// se usa hoy para tres cosas que sí le cambian el producto:
//
//   1. QUÉ CURSO VE.        `cursosAsignados(plan, nivel, alumnoId)`
//   2. QUÉ EJERCICIOS RECIBE. `BLOQUES.filter(b => b.nivel === …)` en el
//      inicio, y el banco de generación, que reparte por nivel exacto.
//   3. QUÉ ESTIMACIÓN LEE.   todo este módulo.
//
// O sea: demasiado poco fiable para enseñarlo, suficientemente fiable
// para decidir con él. Las dos cosas no pueden ser ciertas a la vez, y
// la que hay que cambiar no es la primera.
//
// EL ALCANCE, medido sobre los 174 alumnos:
//
//   nivel_profesor rellena     26
//   nivel_ficha rellena         1
//   nivel_prueba rellena       27   (ganan 22: el resto tiene además
//                                    nivel_profesor, que manda)
//   → sin ninguna de las tres 125   de los cuales 70 en B1
//
// Setenta alumnos en el valor por defecto no es una distribución de
// niveles: es una casilla que nadie rellenó.
//
// LOS DOS CAMINOS, y no son excluyentes:
//
//   A · QUE LA PRUEBA DE NIVEL ESCRIBA DONDE CORRESPONDE. Hay 27 filas
//       con `nivel_prueba` sobre 174 alumnos. O la prueba se pasa muy
//       poco, o se pasa y el resultado no acaba en esa columna. Es lo
//       primero que hay que mirar porque no depende de nadie: si ya se
//       está midiendo, solo hay que guardar la medida.
//
//   B · QUE EL PROFESOR PUEDA CONFIRMARLO. Es la fuente de más
//       prioridad y solo la tienen 26. Hoy no hay ninguna pantalla en
//       el LMS donde un profesor confirme el nivel de su alumno: se
//       hace en Gestión o no se hace. Un control de un clic tras las
//       primeras clases —«¿es correcto este nivel?»— convertiría la
//       marca de «estimado» en el disparador de su propia desaparición.
//
// MIENTRAS TANTO, la marca se queda. Es preferible un producto que
// admite lo que no sabe a uno que presenta una casilla por defecto como
// si fuera una medición.
// ---------------------------------------------------------------

/**
 * El alumno prepara el examen del nivel que YA tiene.
 *
 * Es el único motivo por el que hoy `calcularEstimacion` devuelve null:
 * 41 de los 174 alumnos, todos en este caso —22 en B1, 13 en B2 y 6 en
 * C1—, ninguno por falta de nivel ni de horas.
 *
 * `detectarMeta` no puede distinguirlo desde fuera: devuelve null tanto
 * aquí como para un alumno en C2, y las dos situaciones piden pantallas
 * distintas. Así que se pregunta aparte.
 *
 * NO SE ESTIMA Y SIGUE SIN ESTIMARSE. La razón está intacta —no hay
 * referencia defendible de cuántas horas lleva consolidar un nivel
 * hasta aprobar su examen— y esto no la toca: solo permite que la
 * pantalla sepa por qué no hay cifra, para poder decir otra cosa en vez
 * de no decir nada.
 */
export function preparaSuPropioExamen(
  textosDelPlan: Array<string | null | undefined>,
  nivelActual: NivelMcer
): boolean {
  const crudo = textosDelPlan.filter(Boolean).join(" ");
  const examen = nivelDeExamen(crudo, normalizar(crudo));
  return examen !== null && ESCALERA_MCER.indexOf(examen) === ESCALERA_MCER.indexOf(nivelActual);
}
