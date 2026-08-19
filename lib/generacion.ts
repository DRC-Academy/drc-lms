// ---------------------------------------------------------------
// EL CONTRATO DE LA GENERACIÓN EN DIRECTO
//
// `app/api/generar-bloque` no responde una sola vez al final: emite una
// línea JSON por etapa según avanza y termina con el bloque. El motivo
// es la espera. Antes eran de 20 a 45 segundos; con diez ejercicios en
// vez de cinco son de 43 a 52 segundos medidos, y con un spinner mudo
// el alumno no distingue "está trabajando" de "se ha roto", que es lo
// segundo que acaba asumiendo.
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

export type Origen = "ia" | "banco";

/**
 * Las etapas por las que pasa una generación.
 *
 * `preparando` es la única que no viaja por el flujo: cubre desde que el
 * alumno pulsa hasta que llega el primer evento, que es justo el rato en
 * que el servidor comprueba la sesión y lee su ficha y su historial en
 * Gestión. Es trabajo real, pero sucede antes de que la respuesta empiece
 * a escribirse, así que la pone el cliente al arrancar.
 *
 * `reescribiendo` se ha ido con la regeneración. El presupuesto de la
 * plataforma —60 segundos de techo en el plan actual— no da para un
 * segundo intento después de una generación de 48, así que el revisor
 * ahora deja constancia pero no manda rehacer nada. Una etapa que no
 * puede ocurrir no debe existir en el contrato.
 */
export type EtapaGeneracion =
  | "preparando"
  | "escribiendo"
  | "revisando"
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
// El presupuesto de IA de la ruta es de 52 segundos, así que la barra se
// mide contra esos 52 y no contra una duración inventada. Sube desde los
// 45 de antes por lo mismo que sube todo aquí: el bloque pasó de cinco
// ejercicios a diez.
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

export const PRESUPUESTO_VISIBLE_MS = 52_000;

/** A partir de aquí se reconoce la espera en vez de disimularla. */
export const UMBRAL_TARDANZA_MS = PRESUPUESTO_VISIBLE_MS;

/** Tope mientras no haya bloque. */
export const TECHO_SIN_RESPUESTA = 95;

/**
 * El mínimo al que salta la barra cuando entra cada etapa.
 *
 * Repartidos por peso REAL, y el reparto ha cambiado: escribir son ahora
 * 48 segundos de media y revisar son 3, así que revisar entra al 90% y
 * no al 62% de antes. Con el piso viejo, la barra pegaba un salto hacia
 * atrás en percepción —del 90% que llevaba por tiempo al 62% de la
 * etapa— justo en el último tramo.
 */
const PISO: Record<EtapaGeneracion, number> = {
  preparando: 4,
  escribiendo: 8,
  revisando: 90,
  guardando: 94,
  banco: 90,
};

/**
 * Cuánto marcar, combinando el reloj con la última etapa conocida.
 *
 * El tiempo da el movimiento continuo —sin él la barra se queda quieta
 * durante los cincuenta segundos que tarda el modelo— y la etapa da los
 * saltos verificados. Se toma el mayor de los dos y nunca por debajo de
 * lo ya mostrado.
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
// Un solo juego de textos, porque ya solo hay un modo. Antes había tres
// —uno por modo— y cada uno contaba su propia historia; ahora la
// historia es que el bloque mira a varios sitios a la vez, y eso se
// cuenta mejor en la etapa de preparar, que es justo cuando el servidor
// está leyendo su ficha y su historial de clases.
// ---------------------------------------------------------------

const TEXTO: Record<EtapaGeneracion, string> = {
  preparando: "Repasando tus clases y tu perfil…",
  escribiendo: "Escribiendo tus diez ejercicios…",
  revisando: "Revisando que todo esté bien…",
  guardando: "Guardando tu bloque…",
  banco: "Preparando un bloque de práctica…",
};

export function textoDeEtapa(etapa: EtapaGeneracion): string {
  return TEXTO[etapa];
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
