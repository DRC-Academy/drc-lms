<?php
// ---------------------------------------------------------------
// DRC · AMPLIAR PLAN DESDE EL LMS
//
// NO es un plugin: este código se pega en Fluent Snippets.
//
//   Tipo:        PHP
//   Dónde corre: EN TODAS PARTES ("Run Everywhere") o solo en el
//                frontend; da igual. Se engancha a template_redirect,
//                que solo se dispara al servir una página pública, así
//                que en el panel no hace nada aunque corra allí.
//
// ---------------------------------------------------------------
// QUÉ HACE
//
// El botón "Amplía tu plan" de la pantalla Mi progreso del LMS lleva a
//
//   https://drcacademy.com/mi-cuenta/?drc-ampliar-plan=1
//
// y esto convierte esa URL en el cambio de plan de WooCommerce
// Subscriptions: la misma URL que el botón "Aumentar o Disminuir Plan"
// de la pestaña Suscripción de Mi cuenta
// (/producto/…/?switch-subscription=…&item=…&_wcsnonce=…).
//
// POR QUÉ HACE FALTA. Esa URL lleva un nonce que solo WordPress puede
// generar para el usuario logueado, así que el LMS no la puede
// construir ni adivinar: apunta aquí, y aquí se calcula y se redirige.
// Es el mismo cálculo que hace el snippet de la ficha de progreso de
// DRC Gestión (docs/progreso-wordpress.md de aquel repositorio,
// sección 6), pero sin iframe ni postMessage: una redirección del
// servidor, que es lo único que cabe cuando el alumno viene de otra web.
//
// SIN SESIÓN NO HACE NADA, y es a propósito. Mi cuenta enseña su
// formulario de login y WooCommerce, al entrar, vuelve a la misma URL
// —con el parámetro puesto—, así que la redirección salta sola después.
//
// SIN ITEM CAMBIABLE (ninguna suscripción activa ni en espera cuyo
// item se pueda cambiar) va a la lista de suscripciones de Mi cuenta,
// que es donde el alumno puede ver qué tiene.
//
// EL PARÁMETRO ES CONTRATO CON EL LMS: es lo que lleva URL_AMPLIAR_PLAN
// allí (app/progreso/page.tsx). Si cambia aquí, cambia allí.
//
// ---------------------------------------------------------------
// PRUEBA
//
//   1. Logueado en drcacademy.com como un alumno con suscripción
//      activa, abre /mi-cuenta/view-subscription/{id}/ y apunta el
//      href del botón "Aumentar o Disminuir Plan": los valores de
//      switch-subscription e item.
//   2. Abre https://drcacademy.com/mi-cuenta/?drc-ampliar-plan=1
//   3. Tienes que acabar en /producto/…/?switch-subscription=…&item=…&_wcsnonce=…
//      con el mismo switch-subscription y el mismo item del paso 1, y
//      con el aviso "Elegir una nueva suscripción". El nonce puede
//      cambiar de un día a otro: es normal.
//   4. Si acabas en /mi-cuenta/subscriptions/, el alumno no tiene
//      ningún item cambiable. Si te quedas en /mi-cuenta/ sin más, el
//      snippet no está activo o no estabas logueado.
//
// NOTA PARA QUIEN EDITE ESTE FICHERO
//
// Los comentarios de aquí no llevan comillas simples sueltas ni la
// secuencia que abre un bloque de comentario. El validador de Fluent
// Snippets analiza el texto sin distinguir qué es comentario y qué es
// código, y una comilla suelta le invierte la paridad del resto del
// fichero: rechaza el snippet entero con un error de paréntesis en una
// línea que no tiene nada.
// ---------------------------------------------------------------

// El parámetro que dispara la redirección. Se puede cambiar desde
// wp-config.php sin tocar el snippet, pero entonces hay que cambiar
// también URL_AMPLIAR_PLAN en el LMS.
if ( ! defined( 'DRC_AMPLIAR_PARAM' ) ) {
	define( 'DRC_AMPLIAR_PARAM', 'drc-ampliar-plan' );
}

// Un gestor de snippets puede evaluar el mismo código más de una vez
// —al guardarlo, al refrescar su caché—. Sin esta guarda, la segunda
// pasada sería un fatal por redeclaración.
if ( ! function_exists( 'drc_ampliar_plan_destino' ) ) {

	/**
	 * A dónde va el cambio de plan del usuario actual.
	 *
	 * La primera suscripción activa (o en espera, si no hay activa) con
	 * un item que el usuario pueda cambiar: la misma comprobación y la
	 * misma URL que usa el botón nativo de la pestaña Suscripción. Es el
	 * bucle del snippet de Gestión, tal cual. Sin item cambiable, la
	 * lista de suscripciones, que vale aunque falte el plugin.
	 */
	function drc_ampliar_plan_destino() {
		$destino = function_exists( 'wc_get_account_endpoint_url' )
			? wc_get_account_endpoint_url( 'subscriptions' )
			: home_url( '/mi-cuenta/subscriptions/' );

		if ( class_exists( 'WC_Subscriptions_Switcher' ) && function_exists( 'wcs_get_users_subscriptions' ) ) {
			$suscripciones = wcs_get_users_subscriptions( get_current_user_id() );

			foreach ( array( 'active', 'on-hold' ) as $estado ) {
				foreach ( $suscripciones as $suscripcion ) {
					if ( ! $suscripcion->has_status( $estado ) ) {
						continue;
					}
					foreach ( $suscripcion->get_items() as $item_id => $item ) {
						if ( WC_Subscriptions_Switcher::can_item_be_switched_by_user( $item, $suscripcion ) ) {
							$destino = WC_Subscriptions_Switcher::get_switch_url( $item_id, $item, $suscripcion );
							break 3;
						}
					}
				}
			}
		}

		return $destino;
	}

	/**
	 * La redirección. Solo con el parámetro en la URL y con sesión; en
	 * cualquier otro caso la página se sirve como siempre.
	 */
	function drc_ampliar_plan_redirigir() {
		if ( ! isset( $_GET[ DRC_AMPLIAR_PARAM ] ) ) {
			return;
		}

		// Sin sesión no se redirige: Mi cuenta enseña el login y, al
		// entrar, WooCommerce vuelve a esta misma URL con el parámetro.
		if ( ! is_user_logged_in() ) {
			return;
		}

		// Que ningún caché de página guarde esta respuesta: el destino
		// lleva un nonce del usuario y es una redirección personal.
		nocache_headers();

		// wp_safe_redirect y no wp_redirect: el destino es siempre de
		// esta misma web, y así un plugin que manipule el filtro de
		// hosts permitidos no puede mandar al alumno fuera.
		wp_safe_redirect( drc_ampliar_plan_destino() );
		exit;
	}

	add_action( 'template_redirect', 'drc_ampliar_plan_redirigir' );
}
