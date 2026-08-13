// ---------------------------------------------------------------
// LÍMITES DE TIEMPO
//
// Ni el cliente de Supabase ni `fetch` traen plazo por defecto: una
// conexión que se queda a medias no falla, se queda esperando. En una
// ruta que el alumno mira con un spinner delante eso es peor que un
// error, así que todo lo que sale de la instancia pasa por aquí.
//
// OJO con lo que `conLimite` NO hace: no cancela la tarea de debajo.
// `Promise.race` solo deja de esperarla. Para `fetch` propio se usa un
// AbortController de verdad; esto es para lo que no admite señal, como
// las consultas de supabase-js.
// ---------------------------------------------------------------

export class TiempoAgotado extends Error {
  constructor(
    readonly etiqueta: string,
    readonly ms: number
  ) {
    super(`${etiqueta}: sin respuesta tras ${ms}ms`);
    this.name = "TiempoAgotado";
  }
}

/** La tarea, o `TiempoAgotado` si tarda más de `ms`. */
export async function conLimite<T>(tarea: Promise<T>, ms: number, etiqueta: string): Promise<T> {
  let corte: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      tarea,
      new Promise<never>((_, rechazar) => {
        corte = setTimeout(() => rechazar(new TiempoAgotado(etiqueta, ms)), ms);
      }),
    ]);
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Igual que `conLimite`, pero en vez de lanzar devuelve `alternativa`.
 * Es lo que se quiere cuando el fallo no debe cortar la petición: una
 * escritura de telemetría, una lectura que puede venir vacía.
 */
export async function conLimiteOAlternativa<T>(
  tarea: Promise<T>,
  ms: number,
  etiqueta: string,
  alternativa: T
): Promise<T> {
  try {
    return await conLimite(tarea, ms, etiqueta);
  } catch (error) {
    console.error(`[tiempo] ${etiqueta} no respondió a tiempo:`, describir(error));
    return alternativa;
  }
}

/**
 * Un plazo compartido por varias llamadas encadenadas.
 *
 * Sin esto cada llamada respeta su propio máximo y el total es la suma:
 * dos generaciones y dos revisiones daban 210 segundos aunque ninguna
 * pasara sola de 45. El reloj reparte un único presupuesto.
 */
export type Plazo = {
  /** Milisegundos desde que arrancó el reloj. */
  transcurrido(): number;
  /** Lo que queda del presupuesto, nunca negativo. */
  restante(): number;
  /** El menor entre lo que queda y `tope`. Cero si ya no queda nada. */
  hasta(tope: number): number;
  agotado(): boolean;
};

export function abrirPlazo(presupuestoMs: number): Plazo {
  const inicio = Date.now();
  const transcurrido = () => Date.now() - inicio;
  const restante = () => Math.max(0, presupuestoMs - transcurrido());

  return {
    transcurrido,
    restante,
    hasta: (tope: number) => Math.min(tope, restante()),
    agotado: () => restante() <= 0,
  };
}

/** El mensaje de un error, sea o no un `Error`. Nunca lanza. */
export function describir(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "error desconocido";
}
