import "server-only";
import { AMPLIAR_PLAN_WOO } from "@/lib/cuenta-woo";

/**
 * A dónde lleva «ampliar el plan»: el banner de «Mi progreso» y la
 * comparativa de ritmo del inicio. Configurable sin tocar código con
 * `URL_AMPLIAR_PLAN`; por defecto, el cambio de plan de la web
 * (`lib/cuenta-woo`). Solo en el servidor: la variable no lleva
 * `NEXT_PUBLIC_` y no tiene por qué cruzar al navegador.
 */
export function urlAmpliarPlan(): string {
  return process.env.URL_AMPLIAR_PLAN || AMPLIAR_PLAN_WOO;
}
