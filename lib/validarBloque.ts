// ---------------------------------------------------------------
// VALIDACIÓN DE BLOQUES
// Se usa en dos sitios donde no controlamos el origen del dato:
//   1. La respuesta del modelo en /api/generar-bloque.
//   2. Los bloques releídos de localStorage (pueden venir de una
//      versión anterior de la app).
// Un ejercicio mal formado en una academia de inglés es peor que
// no tener el bloque: si algo no cuadra, devolvemos null.
// ---------------------------------------------------------------

import type { Bloque, Ejercicio, Producir, Reconocer, Transformar } from "@/lib/data";

/** Orden exacto que exigimos: 2 reconocer → 2 transformar → 1 producir. */
const ORDEN: Ejercicio["tipo"][] = [
  "reconocer",
  "reconocer",
  "transformar",
  "transformar",
  "producir",
];

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

function validarReconocer(crudo: Record<string, unknown>, id: string): Reconocer | null {
  const enunciado = cadena(crudo.enunciado, 5);
  const explicacion = cadena(crudo.explicacion, 10);
  const opciones = listaDeCadenas(crudo.opciones, 4, 4); // exactamente cuatro, sin repetir
  const correcta = crudo.correcta;

  if (!enunciado || !explicacion || !opciones) return null;
  if (typeof correcta !== "number" || !Number.isInteger(correcta)) return null;
  if (correcta < 0 || correcta >= opciones.length) return null;

  return { tipo: "reconocer", id, enunciado, opciones, correcta, explicacion };
}

function validarTransformar(crudo: Record<string, unknown>, id: string): Transformar | null {
  const instruccion = cadena(crudo.instruccion, 5);
  const frase = cadena(crudo.frase, 5);
  const pista = cadena(crudo.pista, 3);
  const explicacion = cadena(crudo.explicacion, 10);
  const respuestas = listaDeCadenas(crudo.respuestas, 1, 12, "deduplicar"); // al menos una aceptada

  if (!instruccion || !frase || !pista || !explicacion || !respuestas) return null;

  return { tipo: "transformar", id, instruccion, frase, respuestas, pista, explicacion };
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

  // Los minutos son informativos: los ajustamos a un rango razonable
  // en vez de descartar el bloque entero por un número raro.
  const minutos =
    typeof valor.minutos === "number" && Number.isFinite(valor.minutos)
      ? Math.min(15, Math.max(3, Math.round(valor.minutos)))
      : 5;

  const crudos = valor.ejercicios;
  if (!Array.isArray(crudos) || crudos.length !== ORDEN.length) return null;

  const ejercicios: Ejercicio[] = [];
  for (let i = 0; i < ORDEN.length; i++) {
    const crudo = crudos[i];
    if (!esRegistro(crudo)) return null;
    if (crudo.tipo !== ORDEN[i]) return null;

    const idEjercicio = cadena(crudo.id, 2) ?? `${id}-${i + 1}`;

    const ejercicio =
      ORDEN[i] === "reconocer"
        ? validarReconocer(crudo, idEjercicio)
        : ORDEN[i] === "transformar"
        ? validarTransformar(crudo, idEjercicio)
        : validarProducir(crudo, idEjercicio);

    if (!ejercicio) return null;
    ejercicios.push(ejercicio);
  }

  return { id, titulo, area, nivel: nivel as Bloque["nivel"], intro, minutos, ejercicios };
}
