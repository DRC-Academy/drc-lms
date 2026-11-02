// ---------------------------------------------------------------
// LA CUENTA DEL ALUMNO EN LA WEB (WooCommerce, drcacademy.com)
//
// La suscripción, los pagos, las facturas y los datos se gestionan allí;
// el LMS no construye nada de eso, solo enlaza. Todo enlace del LMS a la
// cuenta de la web sale de aquí: `lib/cuenta-woo.test.ts` falla si
// aparece una URL de drcacademy.com/mi-cuenta o /wp-admin escrita a mano
// en `app/`, `components/` o `lib/`.
//
// NUNCA `https://drcacademy.com/mi-cuenta/` A SECAS. El escritorio de Mi
// cuenta redirige al LMS —es la puerta de entrada de los alumnos—, así
// que un enlace ahí desde el LMS devuelve al alumno a donde estaba. Por
// eso el perfil va a su pestaña (/mi-cuenta/perfil/) y el cambio de plan
// lleva un parámetro: la redirección al LMS no actúa cuando /mi-cuenta/
// lleva parámetros (resuelto en WordPress).
//
// Ese rebote fue el fallo del aviso de pago pendiente (02/11/2026): su
// botón iba a /mi-cuenta y el alumno volvía al LMS, otra vez bloqueado,
// sin ver nada. Sin sesión pasa lo mismo: el login de Mi cuenta vuelve a
// la página en la que estaba, y si es el escritorio, rebota.
// ---------------------------------------------------------------

/** La pestaña Perfil de Mi cuenta: suscripción, pagos, facturas y datos. */
export const PERFIL_WOO = "https://drcacademy.com/mi-cuenta/perfil/";

/** La página de referidos de Mi cuenta, «Consigue un descuento». */
export const DESCUENTO_WOO = "https://drcacademy.com/mi-cuenta/consigue-un-descuento/";

/**
 * El cambio de plan. El snippet `wordpress/drc-ampliar-plan.php` convierte
 * el parámetro en el switch de la suscripción del alumno logueado. Sin
 * el snippet activo, el alumno se queda en Mi cuenta —con el parámetro,
 * así que no rebota al LMS—.
 */
export const AMPLIAR_PLAN_WOO = "https://drcacademy.com/mi-cuenta/?drc-ampliar-plan=1";

/** La ficha de una suscripción en Mi cuenta. Solo por `urlActualizarPago`. */
const SUSCRIPCION_WOO = "https://drcacademy.com/mi-cuenta/view-subscription/";

/**
 * A dónde lleva «Actualizar mi pago» del aviso de pago pendiente.
 *
 * Con el ID de la suscripción de WooCommerce, a su ficha: con la
 * suscripción en espera, WooCommerce enseña allí «Renovar mi
 * suscripción», que paga el pedido de renovación que falló. Sin ID, a
 * Perfil, donde el alumno ve sus suscripciones y llega a la misma ficha
 * con un toque más. (No `/mi-cuenta/subscriptions/`: la web la redirige
 * a Perfil, así que solo añadiría un salto.)
 *
 * Solo acepta un entero positivo: el ID acaba dentro de la ruta y
 * cualquier otra cosa podría cambiarla. Lo que no lo sea cuenta como
 * «sin ID». Se llama en el servidor y el aviso recibe la URL ya hecha.
 */
export function urlActualizarPago(suscripcionId?: number | string | null): string {
  const id = typeof suscripcionId === "number" ? String(suscripcionId) : suscripcionId?.trim();
  if (!id || !/^[1-9]\d{0,18}$/.test(id)) return PERFIL_WOO;
  return `${SUSCRIPCION_WOO}${id}/`;
}

/**
 * La entrada del puente inverso en WordPress (`wordpress/drc-desde-lms.php`):
 * recibe el sobre `wp` en `token`, abre la sesión de la tienda y lleva al
 * cambio de plan. Solo la usa `app/ampliar-plan`.
 */
export const PUENTE_WP = "https://drcacademy.com/wp-admin/admin-post.php?action=drc_desde_lms";

/**
 * El final de «Salir». Cierra la sesión de WordPress y redirige al login
 * de Mi cuenta; sin sesión en la web, solo redirige. Lo usa `app/salir`
 * después de cerrar la del LMS.
 */
export const SALIR_WP = "https://drcacademy.com/wp-admin/admin-post.php?action=drc_salir";
