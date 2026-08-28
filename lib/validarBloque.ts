// ---------------------------------------------------------------
// VALIDACIÓN DE BLOQUES
// Se usa en tres sitios donde no controlamos el origen del dato:
//   1. La respuesta del modelo en /api/generar-bloque.
//   2. Los bloques releídos de la base, que pueden haberse escrito con
//      una versión anterior del validador.
//   3. Los bloques releídos de localStorage (pueden venir de una
//      versión anterior de la app).
// Un ejercicio mal formado en una academia de inglés es peor que
// no tener el bloque: si algo no cuadra, devolvemos null.
// ---------------------------------------------------------------

import type { Bloque, Ejercicio, Producir, Reconocer, Transformar, Veredictos } from "@/lib/data";

// ---------------------------------------------------------------
// LAS DOS FORMAS QUE ACEPTAMOS
//
// La nueva son diez ejercicios: 4 reconocer → 4 transformar → 2
// producir. Es lo único que se genera desde el bloque único.
//
// La vieja son cinco: 2 → 2 → 1. Ya no se genera, pero SIGUE SIENDO
// VÁLIDA, y esto no es cortesía con el pasado: `leerBloquesGenerados`
// pasa por aquí cada bloque que saca de la base, así que rechazar los de
// cinco borraría de la pantalla toda la práctica que los alumnos tienen
// hecha hasta hoy. Se enseñan igual y sin marcar: el alumno nunca supo
// que la forma había cambiado.
//
// Se elige por longitud, que es lo que las distingue sin ambigüedad. Un
// bloque con cualquier otro número de ejercicios no es ninguna de las
// dos y se descarta entero.
// ---------------------------------------------------------------

function orden(reconocer: number, transformar: number, producir: number): Ejercicio["tipo"][] {
  return [
    ...Array<Ejercicio["tipo"]>(reconocer).fill("reconocer"),
    ...Array<Ejercicio["tipo"]>(transformar).fill("transformar"),
    ...Array<Ejercicio["tipo"]>(producir).fill("producir"),
  ];
}

/** La forma de hoy y la de antes, indexadas por número de ejercicios. */
const FORMAS: Record<number, Ejercicio["tipo"][]> = {
  10: orden(4, 4, 2),
  5: orden(2, 2, 1),
};

const NIVELES: Bloque["nivel"][] = ["A1", "A2", "B1", "B2", "C1"];

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Criterio con el que se compara la respuesta del alumno en la práctica.
 *
 * Vive aquí y lo importa `Practica.tsx` para que haya UNA sola regla: la
 * deduplicación de `respuestas` tiene que usar exactamente la misma que
 * la comparación en tiempo real. Si dos variantes se comparan iguales al
 * practicar, guardar las dos no aporta nada.
 */
export function normalizarRespuesta(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.,;!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Devuelve la cadena recortada, o null si está vacía o no es cadena. */
function cadena(valor: unknown, minimo = 1): string | null {
  if (typeof valor !== "string") return null;
  const limpia = valor.trim();
  return limpia.length >= minimo ? limpia : null;
}

/**
 * Lista de cadenas no vacías con un mínimo de elementos.
 *
 * Qué hacer con los duplicados depende de para qué es la lista:
 *
 * - `opciones` los RECHAZA. Dos opciones que se leen igual dejan el
 *   ejercicio sin solución única y rompen el índice `correcta`.
 * - `respuestas` los DEDUPLICA. La práctica valida con `some()`, así que
 *   una variante repetida es inocua; tirar el bloque entero por eso era
 *   la causa de uno de cada cinco descartes.
 */
function listaDeCadenas(
  valor: unknown,
  minimo: number,
  maximo = 12,
  duplicados: "rechazar" | "deduplicar" = "rechazar"
): string[] | null {
  if (!Array.isArray(valor) || valor.length < minimo || valor.length > maximo) return null;

  const salida: string[] = [];
  const vistas = new Set<string>();

  for (const bruto of valor) {
    const limpia = cadena(bruto);
    if (!limpia) return null;

    const clave = normalizarRespuesta(limpia);
    if (vistas.has(clave)) {
      if (duplicados === "rechazar") return null;
      continue; // se conserva la primera, que es la que se muestra de modelo
    }

    vistas.add(clave);
    salida.push(limpia);
  }

  return salida.length >= minimo ? salida : null;
}

/**
 * LOS DOS VEREDICTOS, SI VIENEN Y DICEN ALGO.
 *
 * No invalidan nada. Un ejercicio sin veredicto se enseña con el de
 * siempre, así que descartar el bloque entero porque el modelo se dejó
 * una frase de cortesía sería cambiar diez ejercicios por una.
 *
 * El tope de 180 caracteres no es cosmético: el veredicto ENCABEZA la
 * corrección y la explicación va debajo. Un veredicto de párrafo se
 * come el sitio de la explicación y deja al alumno leyendo dos veces lo
 * mismo, así que si se desmadra vale más el corto de toda la vida.
 */
function veredictos(crudo: Record<string, unknown>): Veredictos {
  const dentroDeRango = (valor: unknown): string | null => {
    const limpia = cadena(valor, 4);
    return limpia && limpia.length <= 180 ? limpia : null;
  };

  const acierto = dentroDeRango(crudo.veredictoAcierto);
  const fallo = dentroDeRango(crudo.veredictoFallo);

  return {
    ...(acierto ? { veredictoAcierto: acierto } : {}),
    ...(fallo ? { veredictoFallo: fallo } : {}),
  };
}

function validarReconocer(crudo: Record<string, unknown>, id: string): Reconocer | null {
  const enunciado = cadena(crudo.enunciado, 5);
  const explicacion = cadena(crudo.explicacion, 10);
  const opciones = listaDeCadenas(crudo.opciones, 4, 4); // exactamente cuatro, sin repetir
  const correcta = crudo.correcta;

  if (!enunciado || !explicacion || !opciones) return null;
  if (typeof correcta !== "number" || !Number.isInteger(correcta)) return null;
  if (correcta < 0 || correcta >= opciones.length) return null;

  return { tipo: "reconocer", id, enunciado, opciones, correcta, explicacion, ...veredictos(crudo) };
}

function validarTransformar(crudo: Record<string, unknown>, id: string): Transformar | null {
  const instruccion = cadena(crudo.instruccion, 5);
  const frase = cadena(crudo.frase, 5);
  const pista = cadena(crudo.pista, 3);
  const explicacion = cadena(crudo.explicacion, 10);
  const respuestas = listaDeCadenas(crudo.respuestas, 1, 12, "deduplicar"); // al menos una aceptada

  if (!instruccion || !frase || !pista || !explicacion || !respuestas) return null;

  return {
    tipo: "transformar",
    id,
    instruccion,
    frase,
    respuestas,
    pista,
    explicacion,
    ...veredictos(crudo),
  };
}

function validarProducir(crudo: Record<string, unknown>, id: string): Producir | null {
  const instruccion = cadena(crudo.instruccion, 5);
  const contexto = cadena(crudo.contexto, 10);
  const modelo = cadena(crudo.modelo, 20);
  const criterios = listaDeCadenas(crudo.criterios, 2, 5);

  if (!instruccion || !contexto || !modelo || !criterios) return null;

  return { tipo: "producir", id, instruccion, contexto, criterios, modelo };
}

/**
 * Comprueba que un valor desconocido tenga exactamente la forma de un
 * `Bloque`. Devuelve el bloque saneado o null si algo no encaja.
 */
export function validarBloque(valor: unknown): Bloque | null {
  if (!esRegistro(valor)) return null;

  const id = cadena(valor.id, 2);
  const titulo = cadena(valor.titulo, 3);
  const area = cadena(valor.area, 3);
  const intro = cadena(valor.intro, 20);
  const nivel = typeof valor.nivel === "string" ? valor.nivel : null;

  if (!id || !titulo || !area || !intro) return null;
  if (!nivel || !NIVELES.includes(nivel as Bloque["nivel"])) return null;

  const crudos = valor.ejercicios;
  if (!Array.isArray(crudos)) return null;

  const forma = FORMAS[crudos.length];
  if (!forma) return null;

  // Los minutos son informativos: los ajustamos a un rango razonable en
  // vez de descartar el bloque entero por un número raro. El tope sube a
  // 20 con los diez ejercicios; el suelo se queda en 3 porque los
  // bloques de cinco que ya están guardados siguen pasando por aquí.
  const minutos =
    typeof valor.minutos === "number" && Number.isFinite(valor.minutos)
      ? Math.min(20, Math.max(3, Math.round(valor.minutos)))
      : crudos.length >= 10
        ? 10
        : 5;

  const ejercicios: Ejercicio[] = [];
  for (let i = 0; i < forma.length; i++) {
    const crudo = crudos[i];
    if (!esRegistro(crudo)) return null;
    if (crudo.tipo !== forma[i]) return null;

    const idEjercicio = cadena(crudo.id, 2) ?? `${id}-${i + 1}`;

    const ejercicio =
      forma[i] === "reconocer"
        ? validarReconocer(crudo, idEjercicio)
        : forma[i] === "transformar"
          ? validarTransformar(crudo, idEjercicio)
          : validarProducir(crudo, idEjercicio);

    if (!ejercicio) return null;
    ejercicios.push(ejercicio);
  }

  return { id, titulo, area, nivel: nivel as Bloque["nivel"], intro, minutos, ejercicios };
}
