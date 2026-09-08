// ---------------------------------------------------------------
// LA OTRA VERSIÓN DE UN BLOQUE
//
// Un bloque se escribe en un idioma y el alumno puede pedir el otro.
// Aquí vive lo que ES esa segunda versión, cómo se saca del bloque lo
// que hay que traducir y cómo se vuelve a montar encima.
//
// LA REGLA QUE SOSTIENE TODO ESTO: se traduce el ANDAMIO y nunca el
// MATERIAL.
//
//   ANDAMIO   título, intro, instrucción, contexto, pista, criterios,
//             explicación y los dos veredictos. Es lo que rodea al
//             ejercicio para que se pueda hacer y para que se aprenda
//             algo al fallarlo.
//
//   MATERIAL  enunciado, frase de partida, opciones, respuestas
//             aceptadas y modelo. Es el ejercicio. Va en inglés en las
//             dos versiones.
//
// Y no es una regla de estilo, es lo que hace el rasgo imposible en vez
// de improbable: si el modelo pudiera tocar `opciones` o `respuestas`,
// la versión española y la inglesa podrían acabar en desacuerdo sobre
// cuál era la respuesta buena, y el alumno vería fallado un acierto por
// haber pulsado un botón de idioma. Como el material ni sale de aquí ni
// vuelve por aquí, esa clase de fallo no existe.
//
// SE INDEXA POR ID DE EJERCICIO, no por posición en el array. Los ids
// son estables —los pone `conIdPropio` en la ruta— y así una traducción
// a la que le falte un ejercicio deja ese ejercicio en su idioma
// original en vez de correr todos los demás un puesto.
//
// Módulo puro: no toca la base, ni el modelo, ni el navegador. Lo
// importan el endpoint (servidor) y el visor (cliente).
// ---------------------------------------------------------------

import type { Bloque, Ejercicio } from "@/lib/data";

export type IdiomaBloque = "en" | "es";

/** El idioma en el que está escrito un bloque. Ausente = español. */
export function idiomaDe(bloque: Bloque): IdiomaBloque {
  return bloque.idioma ?? "es";
}

/** Los campos de andamio de UN ejercicio. Solo van los que tiene. */
export type AndamioEjercicio = {
  instruccion?: string;
  contexto?: string;
  pista?: string;
  criterios?: string[];
  explicacion?: string;
  veredictoAcierto?: string;
  veredictoFallo?: string;
};

export type TraduccionBloque = {
  /** El idioma DE la traducción, no el del bloque. */
  idioma: IdiomaBloque;
  titulo: string;
  intro: string;
  /** Por id de ejercicio. Los que falten se quedan como estaban. */
  ejercicios: Record<string, AndamioEjercicio>;
};

/** Texto limpio, o undefined si no hay nada que traducir. */
function texto(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpio = valor.trim();
  return limpio === "" ? undefined : limpio;
}

function lista(valor: unknown): string[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  const limpia = valor.map(texto).filter((v): v is string => v !== undefined);
  return limpia.length > 0 ? limpia : undefined;
}

/**
 * El andamio de un ejercicio, sin el material.
 *
 * Se construye campo a campo y no con un `delete` de lo que sobra: así,
 * el día que `Ejercicio` gane un campo nuevo, ese campo NO se cuela solo
 * en lo que se manda a traducir. Que un campo nuevo se quede sin
 * traducir es un defecto visible y barato; que se cuele el material es
 * el rasgo que este archivo existe para evitar.
 */
function andamioDe(ejercicio: Ejercicio): AndamioEjercicio {
  const andamio: AndamioEjercicio = {};

  if (ejercicio.tipo === "reconocer" || ejercicio.tipo === "transformar") {
    const explicacion = texto(ejercicio.explicacion);
    const acierto = texto(ejercicio.veredictoAcierto);
    const fallo = texto(ejercicio.veredictoFallo);
    if (explicacion) andamio.explicacion = explicacion;
    if (acierto) andamio.veredictoAcierto = acierto;
    if (fallo) andamio.veredictoFallo = fallo;
  }

  if (ejercicio.tipo === "transformar") {
    const instruccion = texto(ejercicio.instruccion);
    const pista = texto(ejercicio.pista);
    if (instruccion) andamio.instruccion = instruccion;
    if (pista) andamio.pista = pista;
  }

  if (ejercicio.tipo === "producir") {
    const instruccion = texto(ejercicio.instruccion);
    const contexto = texto(ejercicio.contexto);
    const criterios = lista(ejercicio.criterios);
    if (instruccion) andamio.instruccion = instruccion;
    if (contexto) andamio.contexto = contexto;
    if (criterios) andamio.criterios = criterios;
  }

  return andamio;
}

/**
 * Lo que hay que traducir de un bloque, listo para mandárselo al modelo.
 *
 * Misma forma que la traducción que esperamos de vuelta, a propósito: el
 * prompt puede enseñar esto y pedir "lo mismo, en el otro idioma", que
 * es una instrucción mucho más difícil de desobedecer que una lista de
 * campos descrita en prosa.
 */
export function andamioDelBloque(bloque: Bloque): Omit<TraduccionBloque, "idioma"> {
  const ejercicios: Record<string, AndamioEjercicio> = {};

  for (const ejercicio of bloque.ejercicios) {
    const andamio = andamioDe(ejercicio);
    if (Object.keys(andamio).length > 0) ejercicios[ejercicio.id] = andamio;
  }

  return { titulo: bloque.titulo, intro: bloque.intro, ejercicios };
}

/** Cuántas cadenas lleva un andamio. Para el log y para medir el coste. */
export function cuantasCadenas(andamio: Omit<TraduccionBloque, "idioma">): number {
  let n = 2; // título e intro
  for (const e of Object.values(andamio.ejercicios)) {
    n += Object.keys(e).filter((k) => k !== "criterios").length;
    n += e.criterios?.length ?? 0;
  }
  return n;
}

// ---------------------------------------------------------------
// VALIDACIÓN
//
// Lo que vuelve del modelo y lo que vuelve de la base pasan por aquí, y
// por la misma razón: en los dos casos es JSON del que no sabemos nada.
// ---------------------------------------------------------------

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Comprueba que un valor cualquiera sea una traducción utilizable.
 *
 * ES PERMISIVA CON LO QUE FALTA Y ESTRICTA CON LO QUE SOBRA. Un
 * ejercicio que el modelo se dejó, o un campo suelto, se queda sin
 * traducir y el visor enseña el original: media traducción es peor que
 * la entera, pero es mucho mejor que ninguna, y desde luego mejor que
 * tirar las cuarenta y tantas cadenas que sí vinieron bien.
 *
 * Lo que no pasa nunca es un campo que no sea del andamio: se descarta
 * en silencio, y con él cualquier intento de que una traducción cambie
 * las opciones o las respuestas de un ejercicio.
 */
export function validarTraduccion(valor: unknown, idioma: IdiomaBloque): TraduccionBloque | null {
  const tanda = validarTanda(valor);
  if (!tanda) return null;
  if (!tanda.titulo || !tanda.intro) return null;
  if (Object.keys(tanda.ejercicios).length === 0) return null;

  return { idioma, titulo: tanda.titulo, intro: tanda.intro, ejercicios: tanda.ejercicios };
}

/**
 * Una tanda suelta: lo que vuelve de UNA de las llamadas en paralelo.
 *
 * Es la misma limpieza campo a campo que `validarTraduccion`, pero sin
 * exigir título ni intro, que solo viajan en la primera. Quien junta las
 * tandas —`lib/traductor.ts`— es el que después comprueba que el
 * conjunto sirva.
 */
export function validarTanda(valor: unknown): {
  titulo?: string;
  intro?: string;
  ejercicios: Record<string, AndamioEjercicio>;
} | null {
  if (!esRegistro(valor)) return null;

  const crudos = valor.ejercicios;
  if (!esRegistro(crudos)) return null;

  const ejercicios: Record<string, AndamioEjercicio> = {};

  for (const [id, crudo] of Object.entries(crudos)) {
    if (!esRegistro(crudo)) continue;

    const andamio: AndamioEjercicio = {};
    const instruccion = texto(crudo.instruccion);
    const contexto = texto(crudo.contexto);
    const pista = texto(crudo.pista);
    const criterios = lista(crudo.criterios);
    const explicacion = texto(crudo.explicacion);
    const acierto = texto(crudo.veredictoAcierto);
    const fallo = texto(crudo.veredictoFallo);

    if (instruccion) andamio.instruccion = instruccion;
    if (contexto) andamio.contexto = contexto;
    if (pista) andamio.pista = pista;
    if (criterios) andamio.criterios = criterios;
    if (explicacion) andamio.explicacion = explicacion;
    if (acierto) andamio.veredictoAcierto = acierto;
    if (fallo) andamio.veredictoFallo = fallo;

    if (Object.keys(andamio).length > 0) ejercicios[id] = andamio;
  }

  const titulo = texto(valor.titulo);
  const intro = texto(valor.intro);

  return {
    ...(titulo ? { titulo } : {}),
    ...(intro ? { intro } : {}),
    ejercicios,
  };
}

// ---------------------------------------------------------------
// APLICARLA
// ---------------------------------------------------------------

/**
 * El bloque con el andamio cambiado, y el material intacto.
 *
 * Devuelve el MISMO bloque cuando no hay nada que aplicar —sin
 * traducción, o pidiendo el idioma en el que ya está escrito—, y eso no
 * es una optimización: el visor lo tiene en un `useMemo`, y devolver un
 * objeto nuevo idéntico le rehace los diez ejercicios en cada render.
 */
export function conTraduccion(
  bloque: Bloque,
  traduccion: TraduccionBloque | null | undefined,
  idiomaPedido: IdiomaBloque
): Bloque {
  if (!traduccion) return bloque;
  if (idiomaPedido === idiomaDe(bloque)) return bloque;
  if (traduccion.idioma !== idiomaPedido) return bloque;

  return {
    ...bloque,
    titulo: traduccion.titulo,
    intro: traduccion.intro,
    idioma: idiomaPedido,
    ejercicios: bloque.ejercicios.map((ejercicio) => {
      const andamio = traduccion.ejercicios[ejercicio.id];
      if (!andamio) return ejercicio;

      // Campo a campo y con el tipo delante, por lo mismo que en
      // `andamioDe`: un `...andamio` a ciegas dejaría que un campo
      // inesperado del JSON pisara el material del ejercicio.
      if (ejercicio.tipo === "producir") {
        return {
          ...ejercicio,
          instruccion: andamio.instruccion ?? ejercicio.instruccion,
          contexto: andamio.contexto ?? ejercicio.contexto,
          criterios: andamio.criterios ?? ejercicio.criterios,
        };
      }

      if (ejercicio.tipo === "transformar") {
        return {
          ...ejercicio,
          instruccion: andamio.instruccion ?? ejercicio.instruccion,
          pista: andamio.pista ?? ejercicio.pista,
          explicacion: andamio.explicacion ?? ejercicio.explicacion,
          veredictoAcierto: andamio.veredictoAcierto ?? ejercicio.veredictoAcierto,
          veredictoFallo: andamio.veredictoFallo ?? ejercicio.veredictoFallo,
        };
      }

      return {
        ...ejercicio,
        explicacion: andamio.explicacion ?? ejercicio.explicacion,
        veredictoAcierto: andamio.veredictoAcierto ?? ejercicio.veredictoAcierto,
        veredictoFallo: andamio.veredictoFallo ?? ejercicio.veredictoFallo,
      };
    }),
  };
}
