// ---------------------------------------------------------------
// CORRECCIONES PUNTUALES DE EJERCICIOS IMPORTADOS
//
// Tres ejercicios que venían mal de LearnDash y que hay que arreglar a
// mano. Este archivo es el ÚNICO sitio donde están escritos, y lo leen
// los dos que los necesitan:
//
//   · `importar-learndash.ts`  → los aplica al montar las filas, así
//     una reimportación las escribe ya corregidas.
//   · `corregir-ejercicios.ts` → los aplica a la base de hoy, sin
//     esperar a la próxima importación.
//
// POR QUÉ NO BASTABA UN SCRIPT SUELTO. `escribir()` del importador hace
// `upsert(..., { onConflict: "learndash_id" })` con la fila entera
// —enunciado, opciones y correcta incluidos—, así que una reimportación
// pisa cualquier arreglo hecho por fuera. Un script que hay que acordarse
// de volver a ejecutar después de importar no es un arreglo: es un
// recordatorio, y la importación se hace tres veces en la vida, justo
// cuando ya nadie se acuerda de esto.
//
// ---------------------------------------------------------------
// LAS CORRECCIONES SON IDEMPOTENTES POR CÓMO ESTÁN ESCRITAS, NO PORQUE
// ALGUIEN SE ACUERDE DE COMPROBAR ANTES
//
// Ninguna dice "quita la opción 3". Dicen "no dejes opciones repetidas"
// y "cambia ESTE texto por ESTE otro". Aplicadas dos veces dan lo mismo
// que aplicadas una, y no hay un índice escrito a mano que se quede
// obsoleto el día que LearnDash reordene las respuestas.
//
// Eso también es lo que las hace sobrevivir a que el material cambie:
// mientras la opción siga estando duplicada, se sigue arreglando. Y si
// deja de estarlo, no pasa nada.
//
// SI UN PARCHE DEJA DE ENCONTRAR LO SUYO, SE AVISA. Un parche que no
// encaja y calla es peor que no tenerlo: da por arreglado algo que ya no
// lo está. `corregir()` devuelve los avisos y los dos scripts los
// imprimen.
// ---------------------------------------------------------------

/** Lo que hay que tocar de un ejercicio. Vale igual para una fila recién
 *  montada por el importador que para una leída de la base. */
export type EjercicioCorregible = {
  enunciado: string;
  opciones: string[];
  correcta: unknown;
};

type Correccion =
  | {
      que: "opciones_repetidas";
      porque: string;
    }
  | {
      que: "texto";
      de: string;
      a: string;
      porque: string;
    };

// ---------------------------------------------------------------
// LAS TRES
// ---------------------------------------------------------------

export const CORRECCIONES: Record<number, Correccion[]> = {
  // ---------------------------------------------------------------
  // 1 · B1 Preliminary (PET) — "What are the 4 main parts of the PET exam?"
  //
  // Las opciones 3 y 4 son la misma: "Reading, Speaking, Writing,
  // Punctuation". Las dos son incorrectas, así que el alumno no pierde
  // nada por marcarlas, pero lee dos veces lo mismo en una pregunta de
  // cuatro y parece un error de imprenta, que es lo que es.
  // ---------------------------------------------------------------
  1: [
    {
      que: "opciones_repetidas",
      porque: "las dos últimas opciones son idénticas; las dos son distractores",
    },
  ],

  // ---------------------------------------------------------------
  // 1310 · CAE (C1) — "The phrase 'human error-related accidents'…"
  //
  // ESTA ES LA URGENTE. Las opciones 3 y 4 son la misma —"Many road
  // accidents result from driver mistakes"— y la correcta es la 3. Quien
  // marca la 4 está marcando, palabra por palabra, la respuesta correcta,
  // y el LMS le contesta "incorrecto".
  //
  // Es el peor fallo posible de un ejercicio: no es que no se pueda
  // responder, es que castiga a quien acierta. Y en un simulacro de
  // examen del C1, donde el alumno está midiéndose.
  // ---------------------------------------------------------------
  1310: [
    {
      que: "opciones_repetidas",
      porque: "la opción correcta está duplicada: quien marca la copia recibe 'incorrecto'",
    },
  ],

  // ---------------------------------------------------------------
  // 614 · A2 — "Complete the dialogue asking for directions"
  //
  // La instrucción es de LearnDash: allí el alumno escribía la respuesta
  // DENTRO de unas llaves que se veían en el texto. Aquí no hay llaves;
  // hay campos de texto, uno por hueco (ver `Huecos` en
  // FlujoEjercicios). La frase manda hacer algo que no se puede hacer.
  //
  // Se cambia solo esa frase y no el enunciado entero: el resto —el
  // diálogo con sus {{1}}…{{5}} y el Word Box— está bien y es lo que el
  // alumno completa. Reescribir el enunciado completo obligaría a copiar
  // aquí los huecos, y un {{n}} mal copiado deja el ejercicio sin
  // corregir.
  // ---------------------------------------------------------------
  614: [
    {
      que: "texto",
      de: "Write your answers inside the { } using the words in parentheses.",
      a: "Type your answer in each gap.",
      porque: "aquí no hay llaves donde escribir: hay un campo de texto por hueco",
    },
  ],
};

// ---------------------------------------------------------------
// APLICARLAS
// ---------------------------------------------------------------

export type Resultado = {
  cambiado: boolean;
  enunciado: string;
  opciones: string[];
  correcta: unknown;
  /** Qué se hizo, para el informe. */
  hechas: string[];
  /** Parches que ya no encuentran lo suyo. Hay que mirarlos. */
  avisos: string[];
};

/** Dos opciones son la misma si el alumno lee lo mismo. */
const normalizar = (t: string): string => t.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Quita las opciones repetidas dejando la primera, y REMAPEA `correcta`.
 *
 * Lo segundo es la mitad que se olvida. `correcta` guarda índices sobre
 * `opciones`; quitar un elemento de en medio mueve todos los de detrás,
 * y una correcta sin remapear pasaría a señalar la opción siguiente. Es
 * exactamente el fallo que este archivo viene a arreglar, así que
 * cometerlo aquí sería de chiste.
 *
 * Si la que se quita ERA la correcta —porque la correcta estaba
 * duplicada—, su índice cae sobre la gemela que se queda, que dice lo
 * mismo. Nadie pierde su respuesta.
 */
function quitarRepetidas(opciones: string[], correcta: unknown): { opciones: string[]; correcta: unknown } {
  const nuevas: string[] = [];
  const destino: number[] = [];
  const vistas = new Map<string, number>();

  opciones.forEach((opcion, i) => {
    const clave = normalizar(opcion);
    const ya = vistas.get(clave);
    if (ya !== undefined) {
      destino[i] = ya;
      return;
    }
    vistas.set(clave, nuevas.length);
    destino[i] = nuevas.length;
    nuevas.push(opcion);
  });

  if (nuevas.length === opciones.length) return { opciones, correcta };

  const nuevaCorrecta = Array.isArray(correcta)
    ? Array.from(
        new Set(
          correcta.map((v) => (typeof v === "number" && destino[v] !== undefined ? destino[v] : v))
        )
      )
    : correcta;

  return { opciones: nuevas, correcta: nuevaCorrecta };
}

/**
 * Aplica al ejercicio lo que le toque, si es que le toca algo.
 *
 * Devuelve siempre un objeto completo, cambiado o no, para que el
 * llamante no tenga que decidir si usar el original o el corregido.
 */
export function corregir(learndashId: number | null, e: EjercicioCorregible): Resultado {
  const salida: Resultado = {
    cambiado: false,
    enunciado: e.enunciado,
    opciones: e.opciones,
    correcta: e.correcta,
    hechas: [],
    avisos: [],
  };

  if (learndashId === null) return salida;

  const suyas = CORRECCIONES[learndashId];
  if (suyas === undefined) return salida;

  for (const c of suyas) {
    if (c.que === "opciones_repetidas") {
      const r = quitarRepetidas(salida.opciones, salida.correcta);
      if (r.opciones.length !== salida.opciones.length) {
        salida.opciones = r.opciones;
        salida.correcta = r.correcta;
        salida.cambiado = true;
        salida.hechas.push(`${learndashId}: opciones repetidas fuera (${c.porque})`);
      }
      continue;
    }

    if (salida.enunciado.includes(c.de)) {
      salida.enunciado = salida.enunciado.split(c.de).join(c.a);
      salida.cambiado = true;
      salida.hechas.push(`${learndashId}: texto reescrito (${c.porque})`);
      continue;
    }

    // Ya estaba puesto: es lo normal la segunda vez que se ejecuta esto.
    if (salida.enunciado.includes(c.a)) continue;

    // Ni lo viejo ni lo nuevo. El material cambió por debajo y este
    // parche ya no sabe dónde morder.
    salida.avisos.push(
      `${learndashId}: no se encontró el texto a reemplazar ni el de reemplazo. ` +
        `El enunciado ha cambiado y este parche hay que revisarlo.`
    );
  }

  return salida;
}
