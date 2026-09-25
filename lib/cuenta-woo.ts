// ---------------------------------------------------------------
// LA CUENTA DEL ALUMNO EN LA WEB (WooCommerce, drcacademy.com)
//
// La suscripción, los pagos, las facturas y los datos se gestionan allí;
// el LMS no construye nada de eso, solo enlaza. Todo enlace del LMS a la
// cuenta de la web sale de aquí.
//
// NUNCA `https://drcacademy.com/mi-cuenta/` A SECAS. El escritorio de Mi
// cuenta redirige al LMS —es la puerta de entrada de los alumnos—, así
// que un enlace ahí desde el LMS devuelve al alumno a donde estaba. Por
// eso el perfil va a su pestaña (/mi-cuenta/perfil/) y el cambio de plan
// lleva un parámetro: la redirección al LMS no actúa cuando /mi-cuenta/
// lleva parámetros (resuelto en WordPress).
// ---------------------------------------------------------------

/** La pestaña Perfil de Mi cuenta: suscripción, pagos, facturas y datos. */
export const PERFIL_WOO = "https://drcacademy.com/mi-cuenta/perfil/";

/**
 * El cambio de plan. El snippet `wordpress/drc-ampliar-plan.php` convierte
 * el parámetro en el switch de la suscripción del alumno logueado. Sin
 * el snippet activo, el alumno se queda en Mi cuenta —con el parámetro,
 * así que no rebota al LMS—.
 */
export const AMPLIAR_PLAN_WOO = "https://drcacademy.com/mi-cuenta/?drc-ampliar-plan=1";
