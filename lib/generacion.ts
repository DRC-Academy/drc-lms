// ---------------------------------------------------------------
// EL CONTRATO DE LA GENERACIÓN EN DIRECTO
//
// `app/api/generar-bloque` ya no responde una sola vez al final: emite
// una línea JSON por etapa según avanza y termina con el bloque. El
// motivo es la espera. Entre 20 y 45 segundos con un spinner mudo el
// alumno no distingue "está trabajando" de "se ha roto", y lo segundo
// es lo que acaba asumiendo.
//
// La regla que ordena todo este módulo: las etapas las manda el
// servidor. Nada de temporizadores que adivinen. Si en pantalla pone
// "revisando" es porque el revisor está corriendo de verdad; cuando el
// servidor calla, la barra sigue avanzando por tiempo pero el texto no
// cambia, porque no tenemos nada nuevo que contar.
//
// Módulo puro y compartido: sin `server-only`, porque lo importan la
// ruta y el componente de cliente.
// ---------------------------------------------------------------

import type { Bloque } from "@/lib/data";
import type { ModoGeneracion } from "@/lib/modos";

export type Origen = "ia" | "banco";

/**
 * Las etapas por las que pasa una generación.
 *
 * `preparando` es la única que no viaja por el flujo: cubre desde que el
 * alumno pulsa hasta que llega el primer evento, que es justo el rato en
 * que el servidor comprueba la sesión y lee la ficha en Gestión. Es
 * trabajo real, pero sucede antes de que la respuesta empiece a
 * escribirse, así que la pone el cliente al arrancar.
 */
export type EtapaGeneracion =
  | "preparando"
  | "escribiendo"
  | "revisando"
  | "reescribiendo"
  | "guardando"
  | "banco";

/** Una línea del flujo NDJSON. */
export type EventoGeneracion =
  | { tipo: "etapa"; etapa: Exclude<EtapaGeneracion, "preparando">; ms: number }
  | { tipo: "listo"; bloque: Bloque; origen: Origen }
  | { tipo: "error"; mensaje: string };

/** El tipo de contenido del flujo. Lo comprueba el cliente antes de leerlo. */
export const TIPO_FLUJO = "application/x-ndjson";

// ---------------------------------------------------------------
// CALIBRACIÓN DE LA BARRA
//
// El presupuesto de IA de la ruta es de 45 segundos, así que la barra se
// mide contra esos 45 segundos y no contra una duración inventada.
//
// Dos reglas que no se tocan:
//
//   1. NUNCA llega al 100% antes de tener el bloque. Una barra plantada
//      en el 95% es honesta; una que llega al 100% y sigue esperando
//      convierte cada segundo siguiente en sospecha de que se colgó.
//   2. Solo avanza. El tiempo la empuja poco a poco y cada etapa real
//      del servidor la empuja de golpe hasta su piso, pero nada la hace
//      retroceder: una barra que baja se lee como un fallo.
// ---------------------------------------------------------------

export const PRESUPUESTO_VISIBLE_MS = 45_000;

/** A partir de aquí se reconoce la espera en vez de disimularla. */
export const UMBRAL_TARDANZA_MS = PRESUPUESTO_VISIBLE_MS;

/** Tope mientras no haya bloque. */
export const TECHO_SIN_RESPUESTA = 95;

/**
 * El mínimo al que salta la barra cuando entra cada etapa. Están
 * repartidos por peso real: escribir es lo que se lleva casi todo el
 * presupuesto, revisar es corto.
 */
const PISO: Record<EtapaGeneracion, number> = {
  preparando: 4,
  escribiendo: 10,
  revisando: 62,
  reescribiendo: 70,
  guardando: 94,
  banco: 90,
};

/**
 * Cuánto marcar, combinando el reloj con la última etapa conocida.
 *
 * El tiempo da el movimiento continuo —sin él la barra se queda quieta
 * durante los 30 segundos que tarda el modelo— y la etapa da los saltos
 * verificados. Se toma el mayor de los dos y nunca por debajo de lo ya
 * mostrado.
 */
export function calcularProgreso(
  etapa: EtapaGeneracion,
  transcurridoMs: number,
  mostradoAhora: number
): number {
  const porTiempo = (transcurridoMs / PRESUPUESTO_VISIBLE_MS) * TECHO_SIN_RESPUESTA;
  const candidato = Math.max(PISO[etapa], porTiempo, mostradoAhora);
  return Math.min(TECHO_SIN_RESPUESTA, Math.round(candidato));
}

// ---------------------------------------------------------------
// LO QUE SE LE DICE AL ALUMNO
//
// Cada modo cuenta su propia historia porque cada modo hace de verdad
// una cosa distinta: repaso parte de su última clase, examen del formato
// de la prueba, contexto de su trabajo. Un texto genérico para los tres
// desperdiciaría la única parte de la espera que es interesante.
// ---------------------------------------------------------------

const TEXTO: Record<ModoGeneracion, Record<EtapaGeneracion, string>> = {
  repaso: {
    preparando: "Revisando tu última clase…",
    escribiendo: "Escribiendo los ejercicios…",
    revisando: "Revisando que todo esté bien…",
    reescribiendo: "Afinando un par de detalles…",
    guardando: "Guardando tu bloque…",
    banco: "Preparando un bloque de repaso…",
  },
  examen: {
    preparando: "Mirando qué examen preparas…",
    escribiendo: "Escribiendo las tareas con el formato del examen…",
    revisando: "Comprobando que el formato sea el del examen…",
    reescribiendo: "Ajustando un par de tareas…",
    guardando: "Guardando tu bloque…",
    banco: "Preparando un bloque de práctica…",
  },
  contexto: {
    preparando: "Repasando tu perfil…",
    escribiendo: "Escribiendo ejercicios con tus situaciones…",
    revisando: "Revisando que todo esté bien…",
    reescribiendo: "Afinando un par de detalles…",
    guardando: "Guardando tu bloque…",
    banco: "Preparando un bloque de práctica…",
  },
};

export function textoDeEtapa(modo: ModoGeneracion, etapa: EtapaGeneracion): string {
  return TEXTO[modo][etapa];
}

/**
 * Lee una línea del flujo sin fiarse de lo que venga.
 *
 * Devuelve null en vez de lanzar: una línea partida por el camino no
 * puede tumbar una generación que por lo demás va bien.
 */
export function leerEvento(linea: string): EventoGeneracion | null {
  let crudo: unknown;
  try {
    crudo = JSON.parse(linea);
  } catch {
    return null;
  }

  if (typeof crudo !== "object" || crudo === null) return null;
  const tipo = (crudo as { tipo?: unknown }).tipo;

  if (tipo === "etapa" || tipo === "listo" || tipo === "error") {
    return crudo as EventoGeneracion;
  }
  return null;
}
