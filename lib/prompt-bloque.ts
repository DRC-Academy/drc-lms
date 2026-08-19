// ---------------------------------------------------------------
// EL PROMPT DEL BLOQUE
//
// UNO SOLO. Hasta ahora había tres —`usuarioRepaso`, `usuarioExamen`,
// `usuarioContexto`— y el alumno elegía cuál. Elegir era el problema:
// las tres fuentes son suyas y se explican entre ellas, así que
// partirlas obligaba a que en cada bloque sobraran dos.
//
// Ahora se le pasa TODO lo que sabemos de él en un único mensaje y se
// le dice cómo pesa cada cosa:
//
//   · Su última clase MANDA. Es lo que acaba de ver y lo que espera
//     reconocer.
//   · Los errores que se repiten en las clases anteriores dan los
//     distractores. Un error en tres clases seguidas no es un despiste,
//     es lo que hay que atacar.
//   · Su perfil profesional ambienta, cuando lo hay.
//   · El formato de su examen manda en la forma de las tareas, cuando
//     prepara uno.
//
// Vive fuera de la ruta a propósito: es la pieza que más se va a
// retocar, y en un archivo de mil líneas con el flujo NDJSON y el
// presupuesto de tiempo alrededor no se lee.
//
// Módulo puro: solo compone cadenas. No lee la base ni el entorno.
// ---------------------------------------------------------------

import { NOMBRE_EXAMEN, type Bloque, type TipoExamen } from "@/lib/data";
import { primeraFrase } from "@/lib/modos";

const AREAS = ["Gramática", "Léxico", "Discurso"];

// ---------------------------------------------------------------
// LA FORMA DEL BLOQUE
//
// Diez ejercicios: 4 reconocer, 4 transformar, 2 producir.
//
// Por qué 2 y no 4 de producir: los de producción son texto libre y no
// se corrigen solos —el alumno escribe, compara con un modelo y sigue—,
// así que cuatro seguidos son cuatro folios en blanco al final del
// bloque. Dos cierran; cuatro cansan.
//
// Y los dos NO son el mismo ejercicio dos veces. Uno sale de su última
// clase y otro de su contexto profesional, que es la única forma de que
// se vea que las dos fuentes están dentro del mismo bloque.
// ---------------------------------------------------------------

export const REPARTO = { reconocer: 4, transformar: 4, producir: 2 } as const;
export const TOTAL_EJERCICIOS = REPARTO.reconocer + REPARTO.transformar + REPARTO.producir;

// ---------------------------------------------------------------
// CALIBRACIÓN POR NIVEL
// A1 y A2 no son "B1 más fácil": cambian la longitud de la frase y el
// vocabulario admisible. Sin esto el modelo escribe B1 para todos.
// ---------------------------------------------------------------

const CALIBRACION: Record<Bloque["nivel"], string> = {
  A1: "Nivel A1: frases de 6 a 9 palabras, presente simple, vocabulario de las 500 palabras más frecuentes. Sin subordinadas y sin phrasal verbs.",
  A2: "Nivel A2: frases de 8 a 12 palabras, presentes y pasado simple, vocabulario de alta frecuencia y de la vida diaria. Nada de léxico abstracto ni de subordinadas largas.",
  B1: "Nivel B1: frases claras de longitud media, tiempos básicos y perfectos, vocabulario cotidiano y de trabajo corriente.",
  B2: "Nivel B2: frases de complejidad natural, gama completa de tiempos, phrasal verbs y collocations de registro profesional.",
  C1: "Nivel C1: registro formal y matizado, estructuras enfáticas, collocations precisas y diferencias de matiz entre opciones cercanas.",
};

// ---------------------------------------------------------------
// FORMATO AUTÉNTICO DE CADA EXAMEN
//
// Se describe por TAREA y no por posición del ejercicio, que es lo que
// cambia respecto del prompt de antes. Antes el bloque entero era el
// examen —"los dos reconocer son Part 1"— porque existía un modo
// dedicado. Ahora el examen es una de las cuatro fuentes y ocupa parte
// del bloque, no todo: se le dice qué tareas son las suyas y cuántas
// tiene que haber, y el resto del bloque sigue saliendo de su clase.
// ---------------------------------------------------------------

const FORMATO_EXAMEN: Record<TipoExamen, string> = {
  b2_first: [
    "Tareas reales del Use of English de B2 First:",
    "- Part 1 (multiple-choice cloze): una frase con un hueco y cuatro opciones de léxico cercano entre sí (collocation, phrasal verb, matiz de significado). Sirve para los 'reconocer'. No vale que la diferencia sea gramatical y evidente.",
    "- Part 2 (open cloze): la frase lleva un hueco que se completa con UNA sola palabra gramatical (preposición, auxiliar, relativo, artículo o cuantificador). Sirve para un 'transformar'.",
    "- Part 4 (key word transformation): da la frase original, indica en la instrucción la palabra clave OBLIGATORIA en mayúsculas, y la respuesta debe usar entre DOS y CINCO palabras incluyendo esa palabra sin modificarla. Sirve para un 'transformar'. Dos y cinco es la especificación de B2 First; el rango de tres a seis es el de C1 Advanced y aquí sería un error.",
  ].join("\n"),
  c1_advanced: [
    "Tareas reales del Use of English de C1 Advanced:",
    "- Part 1 (multiple-choice cloze) con cuatro opciones de significado muy próximo, donde lo que decide es la collocation. Sirve para los 'reconocer'.",
    "- Part 3 (word formation): da la frase con el hueco y, entre paréntesis, la palabra raíz en mayúsculas que hay que transformar (prefijo, sufijo o cambio de categoría). Sirve para un 'transformar'.",
    "- Part 4 (key word transformation): palabra clave OBLIGATORIA en mayúsculas en la instrucción y respuesta de entre TRES y SEIS palabras que la incluya sin cambiarla. Sirve para un 'transformar'. Tres y seis es la especificación de C1 Advanced, distinta de la de B2 First.",
  ].join("\n"),
  b1_preliminary: [
    "Tareas reales de B1 Preliminary:",
    "- Reading Part 5 (multiple-choice cloze): vocabulario de alta frecuencia, cuatro opciones cercanas y una sola correcta por significado o por collocation. Sirve para los 'reconocer'.",
    "- Reading Part 6 (open cloze): un hueco que se rellena con UNA sola palabra gramatical. Sirve para un 'transformar'.",
    "- Reescritura de una frase manteniendo el significado, indicando en la instrucción con qué palabra o estructura debe empezar. Sirve para un 'transformar'. Este examen NO impone palabra clave obligatoria ni recuento de palabras.",
  ].join("\n"),
  ielts: [
    "Estilo de IELTS. OJO: IELTS no es Cambridge, así que NO uses key word transformation ni open cloze.",
    "- Para los 'reconocer': vocabulario académico en contexto y paráfrasis, qué opción reformula mejor la idea de la frase.",
    "- Para los 'transformar': reescribir una frase con registro académico, usando nominalización o voz pasiva, como exige Writing Task 2.",
  ].join("\n"),
};

// ---------------------------------------------------------------
// EL SISTEMA
// ---------------------------------------------------------------

export function construirSistema(nivel: Bloque["nivel"]): string {
  return [
    "Eres el diseñador de materiales de DRC Academy, una academia de inglés online para adultos hispanohablantes.",
    `Escribes bloques de práctica de ${TOTAL_EJERCICIOS} ejercicios hechos para UN alumno concreto, a partir de lo que sabemos de él.`,
    "",
    "REGLAS DE CONTENIDO",
    "- Los enunciados, frases y respuestas de los ejercicios van en inglés.",
    "- Las instrucciones, pistas y explicaciones van en español de España, tuteando, en tono cálido y directo.",
    "- Nunca uses lenguaje de error o de vigilancia: nada de 'tus fallos', 'tus errores' o 'áreas deficientes'.",
    "- Las explicaciones dicen POR QUÉ, no repiten la regla en abstracto. Una o dos frases, sin jerga gramatical innecesaria.",
    "- El contexto es adulto. Nada de ejemplos escolares.",
    "",
    "CALIBRACIÓN",
    CALIBRACION[nivel],
    "",
    "DISTRACTORES (lo más importante)",
    "Cada opción incorrecta tiene que ser el error concreto que comete un hispanohablante de este nivel:",
    "calco literal del español, tiempo verbal equivocado por interferencia, preposición traducida, colocación inventada,",
    "participio mal formado, orden de palabras del español. Nunca opciones absurdas, ni fáciles de descartar a ojo,",
    "ni tres opciones evidentemente malas alrededor de una buena. Si un distractor no lo elegiría un alumno real, cámbialo.",
    "",
    "Y un distractor tiene que estar MAL DE VERDAD. Dos casos concretos que no lo están:",
    "",
    "1. CONCORDANCIA DE NOMBRES COLECTIVOS, nunca. 'The team has finished' y 'the team have finished' son las DOS",
    "   correctas: en inglés británico e irlandés los nombres colectivos ('the team', 'the board', 'the company',",
    "   'the government', 'the staff') admiten verbo en singular y en plural. La academia es irlandesa, así que",
    "   marcar una de las dos como fallo es enseñar mal. Si necesitas un distractor en una frase con nombre",
    "   colectivo, que sea de otra cosa: el tiempo verbal, la preposición, el participio.",
    "",
    "2. VARIEDADES Y REGISTROS DEL INGLÉS. Si una opción es normal en inglés americano, en registro formal o en",
    "   habla corriente, no es un fallo aunque no sea la que tú elegirías. 'Take a shower' junto a 'have a shower',",
    "   'in which' junto a 'where': las dos valen.",
    "",
    "LAS CUATRO OPCIONES SE TIENEN QUE PODER DISTINGUIR DE UN VISTAZO.",
    "Tres opciones que solo cambian en una letra o en el verbo auxiliar ('nor his colleague is' / 'nor his colleague are'",
    "/ 'nor his colleague') no son cuatro caminos que el alumno pueda razonar: son ruido, y el ejercicio se convierte en",
    "un juego de detectar erratas. Cada opción tiene que representar UNA idea equivocada distinta y reconocible.",
    "Esto importa el doble en A1 y A2, donde el alumno todavía lee palabra por palabra.",
    "",
    "VARIEDAD DENTRO DEL BLOQUE",
    `Son ${REPARTO.reconocer} 'reconocer' y ${REPARTO.transformar} 'transformar', no dos de cada uno repetidos. Cada uno ataca un punto distinto:`,
    "si dos ejercicios se resuelven con la misma regla y el mismo razonamiento, el segundo sobra. Reescríbelo apuntando a otra cosa.",
    "",
    "FORMATO",
    "Devuelves SOLO el objeto JSON. Sin markdown, sin vallados, sin una sola palabra antes ni después.",
  ].join("\n");
}

// ---------------------------------------------------------------
// LA PLANTILLA
// ---------------------------------------------------------------

function plantillaJson(nivel: Bloque["nivel"]): string {
  const reconocer = (n: number) => ({
    tipo: "reconocer",
    id: `r${n}`,
    enunciado: "Frase en inglés con ____ donde va el hueco.",
    opciones: ["correcta", "distractor 1", "distractor 2", "distractor 3"],
    correcta: 0,
    explicacion: "Por qué es esa y qué error refleja la que suele elegirse.",
  });

  const transformar = (n: number) => ({
    tipo: "transformar",
    id: `t${n}`,
    instruccion: "Qué tiene que hacer, en español.",
    frase: "Frase de partida en inglés.",
    respuestas: ["Todas las formas correctas, incluidas contracciones y orden alternativo."],
    pista: "Una pista corta que acote la respuesta.",
    explicacion: "Qué cambia y por qué.",
  });

  const producir = (n: number, de: string) => ({
    tipo: "producir",
    id: `p${n}`,
    instruccion: "Qué tiene que escribir, en español.",
    contexto: `Situación concreta y extensión esperada. Este sale de ${de}.`,
    criterios: ["Criterio comprobable 1", "Criterio comprobable 2", "Criterio comprobable 3"],
    modelo: "Una respuesta modelo en inglés, natural, de dos a cuatro frases.",
  });

  return JSON.stringify(
    {
      id: "identificador-en-minusculas-con-guiones",
      titulo: "Título corto en español, máximo 40 caracteres",
      area: `Una de: ${AREAS.join(" | ")}`,
      nivel,
      minutos: 10,
      intro: "Una o dos frases en español que expliquen la idea clave del bloque.",
      ejercicios: [
        reconocer(1),
        reconocer(2),
        reconocer(3),
        reconocer(4),
        transformar(1),
        transformar(2),
        transformar(3),
        transformar(4),
        producir(1, "SU ÚLTIMA CLASE"),
        producir(2, "SU CONTEXTO"),
      ],
    },
    null,
    2
  );
}

const REQUISITOS = [
  "Requisitos que se comprueban antes de publicar el bloque:",
  `- Exactamente ${TOTAL_EJERCICIOS} ejercicios y en este orden: ${REPARTO.reconocer} 'reconocer', luego ${REPARTO.transformar} 'transformar', luego ${REPARTO.producir} 'producir'. Ni uno más ni uno menos, y sin mezclar el orden.`,
  "- Cada 'reconocer' tiene exactamente 4 opciones distintas y 'correcta' es el índice (0-3) de la buena.",
  "- Cada 'transformar' lista TODAS las respuestas aceptables: la respuesta del alumno se compara literalmente",
  "  (ignorando mayúsculas y puntuación), así que incluye contracciones ('I would' y \"I'd\") y variantes de orden.",
  "  Que la pista sea lo bastante concreta como para que solo quepan las respuestas que has listado.",
  "- Y que las respuestas estén escritas EN LA MISMA FORMA que la instrucción y la pista le piden teclear.",
  "  Si le dices que escriba cuatro palabras, la lista tiene que incluir esas cuatro palabras sueltas; si le pides",
  "  la frase entera, la frase entera. Cuando quepan las dos lecturas, incluye AMBAS versiones en la lista.",
  "  Este es el fallo más caro del bloque: el alumno hace exactamente lo que le pides y se lo damos por fallado.",
  "- Cada 'producir' tiene entre 2 y 5 criterios comprobables y un modelo real.",
  "- Los dos 'producir' son tareas DISTINTAS: distinta situación, distinto destinatario y distinto registro. Si los dos podrían intercambiarse, están mal.",
].join("\n");

// ---------------------------------------------------------------
// LO QUE SABEMOS DEL ALUMNO
// ---------------------------------------------------------------

/** Su última clase analizada, ya destilada por el análisis de Gestión. */
export type UltimaClaseParaPrompt = {
  titulo: string;
  fecha: string;
  temas: string;
  errores: string;
  priority: string;
  mainFocus: string;
};

/** Una clase anterior. Solo interesa de dónde viene y qué se le resistió. */
export type ClaseAnteriorParaPrompt = {
  fecha: string;
  titulo: string;
  errores: string;
};

export type MateriaPrima = {
  nombre: string;
  nivel: Bloque["nivel"];
  /** Null en el alumno que aún no tiene ninguna clase analizada. */
  ultimaClase: UltimaClaseParaPrompt | null;
  /** De la más reciente a la más antigua. Vacío si no hay historial. */
  anteriores: ClaseAnteriorParaPrompt[];
  ocupacion: string | null;
  objetivo: string | null;
  examen: TipoExamen | null;
  /** Títulos que el alumno ya tiene delante y no conviene repetir. */
  titulosExcluidos: string[];
};

/** ¿Sabemos algo de su vida profesional? Decide el segundo 'producir'. */
export function hayContexto(materia: MateriaPrima): boolean {
  return materia.ocupacion !== null || materia.objetivo !== null;
}

/**
 * ¿Hay con qué construir un bloque hecho para él?
 *
 * Con ninguna de las cuatro fuentes lo que saldría sería material
 * genérico de nivel, y para eso ya está el banco. La ruta lo comprueba
 * antes de gastar una llamada al modelo.
 */
export function hayMateriaPrima(materia: MateriaPrima): boolean {
  return materia.ultimaClase !== null || hayContexto(materia) || materia.examen !== null;
}

// ---------------------------------------------------------------
// LOS PATRONES QUE SE REPITEN
//
// Esta es la parte nueva de verdad. La última clase ya se usaba; lo que
// no se usaba nunca era el historial, y ahí está lo que de verdad se le
// atraganta a un alumno.
//
// No se le pide al modelo que "tenga en cuenta el historial" y ya: se le
// dice explícitamente que cuente en cuántas clases aparece cada cosa,
// porque esa es la señal. Un error suelto es un despiste de un martes;
// el mismo error en tres clases seguidas es lo que hay que atacar, y es
// justo lo que ni el alumno ni el profesor ven, porque cada clase se
// analiza sola.
// ---------------------------------------------------------------

function bloquePatrones(anteriores: ClaseAnteriorParaPrompt[]): string[] {
  if (anteriores.length === 0) return [];

  const clases = anteriores.map(
    (clase) => `- ${clase.fecha} · ${clase.titulo}\n  ${clase.errores.trim()}`
  );

  return [
    "",
    `LO QUE ARRASTRA DE SUS ${anteriores.length === 1 ? "CLASES ANTERIORES" : `${anteriores.length} CLASES ANTERIORES`} (de la más reciente a la más antigua)`,
    ...clases,
    "",
    "Léelas buscando REPETICIONES. Lo que aparece en varias de estas clases no es un despiste: es el punto",
    "que se le resiste de verdad, y probablemente ni él ni su profesor lo han visto, porque cada clase se",
    "analiza por separado. Un error que sale en tres clases pesa más que tres errores que salen en una.",
    "Esos patrones repetidos son los distractores que quieres: haz que la opción incorrecta sea exactamente",
    "el error que él comete una y otra vez, para que esta vez lo vea venir.",
  ];
}

// ---------------------------------------------------------------
// EL MENSAJE
// ---------------------------------------------------------------

export function construirUsuario(materia: MateriaPrima): string {
  const { ultimaClase, anteriores, examen } = materia;
  const partes: string[] = [
    "Ficha del alumno:",
    `- Nombre: ${materia.nombre}`,
    `- Nivel: ${materia.nivel}`,
  ];

  // --- 1. La última clase. Manda. ---
  if (ultimaClase) {
    const material = [`- Título: ${ultimaClase.titulo}`, `- Fecha: ${ultimaClase.fecha}`];
    if (ultimaClase.temas.trim()) material.push(`- Temas que se trabajaron: ${ultimaClase.temas.trim()}`);
    if (ultimaClase.errores.trim())
      material.push(`- Cosas concretas que se le resistieron: ${ultimaClase.errores.trim()}`);
    if (ultimaClase.priority.trim())
      material.push(`- Prioridad marcada para la próxima clase: ${ultimaClase.priority.trim()}`);
    if (ultimaClase.mainFocus.trim())
      material.push(`- Foco principal de la próxima clase: ${ultimaClase.mainFocus.trim()}`);

    partes.push(
      "",
      "SU ÚLTIMA CLASE (ya analizada; no hace falta más contexto)",
      material.join("\n"),
      "",
      "Esta clase MANDA: es lo que acaba de ver y lo que espera reconocer al abrir el bloque.",
      "La mayor parte de los ejercicios continúa ese trabajo, profundizando en el foco principal o",
      "atacando el punto donde ese tema se confunde con otro."
    );
  } else {
    partes.push(
      "",
      "SIN CLASE ANALIZADA TODAVÍA",
      "Este alumno aún no tiene ninguna clase analizada, así que el bloque se construye con el resto",
      "de lo que sabemos de él. No menciones la ausencia de clases en ninguna parte del bloque."
    );
  }

  // --- 2. Los patrones del historial. ---
  partes.push(...bloquePatrones(anteriores));

  // --- 3. Su vida profesional. ---
  if (hayContexto(materia)) {
    const perfil: string[] = [];
    // Solo la primera frase de cada campo: son párrafos de varias
    // oraciones escritos por la IA de Gestión y mandarlos enteros diluye
    // la señal concreta que nos interesa.
    if (materia.ocupacion) perfil.push(`- A qué se dedica: ${primeraFrase(materia.ocupacion)}`);
    if (materia.objetivo) perfil.push(`- Qué quiere conseguir: ${primeraFrase(materia.objetivo)}`);

    partes.push(
      "",
      "SU VIDA PROFESIONAL",
      perfil.join("\n"),
      "",
      "Ambienta los ejercicios en las situaciones reales de esta persona: las conversaciones, los correos",
      "y los documentos que se encuentra de verdad en su trabajo. Nada de frases genéricas de libro de texto."
    );
  }

  // --- 4. Su examen. ---
  if (examen) {
    partes.push(
      "",
      `SE ESTÁ PREPARANDO EL ${NOMBRE_EXAMEN[examen].toUpperCase()}`,
      FORMATO_EXAMEN[examen],
      "",
      "Al menos dos 'reconocer' y dos 'transformar' tienen que reproducir esas tareas tal cual: el alumno",
      "debe reconocer el examen en cuanto los vea. El contenido de esos ejercicios sigue saliendo de su",
      "clase y de sus patrones; lo que aporta el examen es la FORMA de la tarea, no el tema."
    );
  }

  // --- 5. Cómo se combina todo. ---
  partes.push("", "CÓMO SE REPARTE EL BLOQUE", ...repartoDelBloque(materia));

  if (materia.titulosExcluidos.length) {
    partes.push(
      "",
      `No repitas estos temas, que el alumno ya tiene delante: ${materia.titulosExcluidos.join("; ")}.`
    );
  }

  partes.push("", "Devuelve exactamente esta estructura:", plantillaJson(materia.nivel), "", REQUISITOS);

  return partes.join("\n");
}

/**
 * El reparto de los diez, escrito con lo que este alumno tiene de verdad.
 *
 * Se redacta en función de las fuentes disponibles y no con un texto
 * fijo porque el segundo 'producir' cambia de sitio: con perfil sale de
 * su trabajo, y sin perfil no puede salir de la nada. Un texto fijo que
 * hablara de "su contexto profesional" a un alumno sin perfil es
 * exactamente cómo se inventa el modelo una ocupación.
 */
function repartoDelBloque(materia: MateriaPrima): string[] {
  const lineas: string[] = [];
  const conClase = materia.ultimaClase !== null;
  const conPatrones = materia.anteriores.length > 0;

  lineas.push(
    `- Los ${REPARTO.reconocer} 'reconocer' y los ${REPARTO.transformar} 'transformar' salen ${
      conClase ? "sobre todo de su última clase" : "de lo que sabemos de él"
    }${conPatrones ? ", y sus distractores de los patrones que arrastra" : ""}${
      materia.examen ? ", con la forma de las tareas de su examen donde toque" : ""
    }.`
  );

  if (hayContexto(materia)) {
    lineas.push(
      "- Al menos tres de esos ocho están ambientados en su vida profesional: mismo punto de lengua, su situación."
    );
  }

  // Los dos de producción son el sitio donde se ve que el bloque mira a
  // dos sitios a la vez. Por eso se nombran uno a uno.
  lineas.push(
    `- El primer 'producir' sale de su última clase: le pide usar por escrito ${
      conClase ? "justo lo que trabajó en ella" : "el punto principal del bloque"
    }.`
  );

  if (conClase) {
    // El material de la clase trae de todo: el tema gramatical, pero
    // también el texto o el vídeo con el que se practicó. Sin decir nada,
    // el modelo se agarra a lo segundo —es lo más vistoso— y sale una
    // tarea sobre el cantante del listening en la que se puede responder
    // sin tocar el punto de lengua que la clase trabajó.
    lineas.push(
      "  Y que trabaje el CONTENIDO de la clase, no la anécdota con la que se practicó. Si en clase se vio el pasado",
      "  simple con un texto sobre un músico, la tarea pide usar el pasado simple, no contar cosas del músico: ese",
      "  texto era el vehículo, no la materia. Bien está usarlo de ambientación; mal está que sea el tema."
    );
  }

  if (hayContexto(materia)) {
    lineas.push(
      "- El segundo 'producir' sale de su vida profesional: una situación real de su trabajo, con otro",
      "  destinatario y otro registro que el primero. Los dos juntos tienen que dejar claro que este bloque",
      "  mira a la vez a su clase y a su día a día."
    );
  } else {
    lineas.push(
      "- El segundo 'producir' trabaja el mismo material pero en otro formato de comunicación y otro registro",
      "  que el primero (por ejemplo, uno hablado y uno escrito, o uno personal y uno formal). NO te inventes",
      "  una profesión ni un puesto de trabajo para este alumno: no sabemos a qué se dedica."
    );
  }

  return lineas;
}
