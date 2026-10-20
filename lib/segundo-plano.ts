// ---------------------------------------------------------------
// TRABAJO QUE NO TIENE QUE HACER ESPERAR A NADIE
//
// Apuntar un acceso o un clic es telemetría: la redirección o la página
// no tienen por qué esperar a que la base conteste. Pero en Vercel una
// promesa suelta después de responder no está garantizada: la instancia
// se puede congelar con ella a medias. `waitUntil` es lo que le dice a la
// plataforma «responde ya, pero no me congeles hasta que acabe esto».
//
// NEXT 14 NO TRAE `after()` (llega en la 15), y el paquete oficial
// `@vercel/functions` arrastra 25 dependencias para lo mismo que hacen
// estas líneas: leer el contexto de la petición que el runtime de Vercel
// deja en `globalThis` y llamar a su `waitUntil`. Es exactamente lo que
// hace ese paquete por dentro (`get-context.js`).
//
// Fuera de Vercel —`next dev`, los tests, los scripts— no hay contexto y
// la promesa corre sola, que en un proceso de larga vida es suficiente.
// ---------------------------------------------------------------

import "server-only";

type ContextoVercel = { waitUntil?: (promesa: Promise<unknown>) => void };

const CONTEXTO = Symbol.for("@vercel/request-context");

function contexto(): ContextoVercel {
  const fuente = (globalThis as Record<symbol, { get?: () => ContextoVercel } | undefined>)[CONTEXTO];
  return fuente?.get?.() ?? {};
}

/**
 * Lanza `tarea` sin esperarla. Nunca lanza: un fallo se registra con
 * `etiqueta` y ya está, porque quien la llama ya ha respondido.
 */
export function enSegundoPlano(etiqueta: string, tarea: () => Promise<unknown>): void {
  const promesa = Promise.resolve()
    .then(tarea)
    .catch((error) => console.error(`[${etiqueta}]`, error instanceof Error ? error.message : error));
  contexto().waitUntil?.(promesa);
}
