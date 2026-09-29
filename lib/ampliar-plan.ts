import "server-only";
import { AMPLIAR_PLAN_WOO } from "@/lib/cuenta-woo";
import { esIdDemo } from "@/lib/demo/cuenta";
import type { Sesion } from "@/lib/sesion";

/**
 * A dónde lleva «ampliar el plan» SIN el puente: el cambio de plan de la
 * web (`lib/cuenta-woo`), donde el alumno tiene que volver a entrar.
 * Configurable sin tocar código con `URL_AMPLIAR_PLAN`. Solo en el
 * servidor: la variable no lleva `NEXT_PUBLIC_`.
 */
export function urlAmpliarPlan(): string {
  return process.env.URL_AMPLIAR_PLAN || AMPLIAR_PLAN_WOO;
}

/**
 * EL HREF DE LOS BOTONES: «Quiero ir más rápido» (inicio) y «Amplía tu
 * plan» (Mi progreso).
 *
 * Es una ruta del propio LMS y no la de la tienda porque el sobre para
 * entrar en la tienda se firma en el momento del clic, en el servidor
 * (`app/ampliar-plan/route.ts`): si fuera en el href, quedaría escrito
 * en el HTML y en cualquier caché. Esa ruta decide, con `viaDeAmpliar`,
 * si usa el puente o manda al enlace de siempre.
 */
export const RUTA_AMPLIAR = "/ampliar-plan";

/**
 * Si el puente está listo para usarse: hay clave. Sin SECRETO_PUENTE_WP,
 * el botón sigue yendo a Mi cuenta como hasta ahora. ES EL INTERRUPTOR:
 * la clave se pone en Vercel el mismo día que se instala el snippet en
 * WordPress, y no antes, porque sin el snippet la entrada del puente no
 * existe y el alumno acabaría en una página en blanco de WordPress.
 */
export function puenteWpActivo(): boolean {
  return (process.env.SECRETO_PUENTE_WP ?? "").length >= 32;
}

/**
 * Por dónde va el clic.
 *
 *   · "puente": un alumno de verdad, con el puente activo. Se firma su
 *     email y WordPress le abre la sesión de la tienda.
 *   · "tienda": todo lo demás, al enlace de siempre. En concreto:
 *       - el EQUIPO revisando una ficha. Firmar ahí con el email del
 *         alumno metería a quien revisa en la cuenta de la tienda del
 *         alumno. Su sesión es de administrador y no tiene email de
 *         alumno que firmar, así que ni se intenta.
 *       - la CUENTA DEMO. Su email es una cuenta del equipo en
 *         WordPress; el snippet ya no abre cuentas del equipo, pero
 *         aquí no se llega ni a pedirlo.
 *       - sin clave (puente sin instalar).
 */
export function viaDeAmpliar(sesion: Sesion, activo: boolean): "puente" | "tienda" {
  if (!activo) return "tienda";
  if (sesion.rol !== "alumno") return "tienda";
  if (esIdDemo(sesion.alumnoId)) return "tienda";
  if (sesion.email.trim() === "") return "tienda";
  return "puente";
}
