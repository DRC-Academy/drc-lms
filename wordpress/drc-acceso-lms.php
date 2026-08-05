<?php
/**
 * Plugin Name: DRC · Acceso al LMS
 * Description: Botón que lleva al alumno de drcacademy.com a la práctica del LMS con la sesión ya abierta.
 * Version:     1.0.0
 *
 * ---------------------------------------------------------------
 * QUÉ HACE
 *
 * WordPress ya sabe quién está dentro. Este fichero firma su email con
 * HMAC-SHA256 y lo manda al LMS, que verifica la firma y abre sesión.
 * Es la otra mitad de `app/entrar/woo/route.ts`; los dos lados tienen
 * que decir lo mismo o el botón deja de entrar.
 *
 * EL SOBRE (contrato con el LMS, ver `lib/sesion.ts`)
 *
 *   base64url( {"e": email, "t": ms, "n": nonce} ) . "." . base64url( firma )
 *
 * donde la firma es HMAC-SHA256 de la cadena "woo." + el cuerpo ya
 * codificado, con la clave compartida.
 *
 * POR QUÉ EL BOTÓN NO LLEVA EL TOKEN DENTRO
 *
 * El enlace apunta a `admin-post.php`, que es una URL fija e igual para
 * todo el mundo, y el sobre se firma allí justo antes de redirigir. Si
 * el token viajara en el `href` estaría dentro del HTML de la página, y
 * cualquier caché de página —WP Rocket, LiteSpeed, Cloudflare— podría
 * guardar esa copia y servírsela a OTRO visitante, que entraría en el
 * LMS como el alumno cuya página se cacheó. `admin-post.php` no lo
 * cachea ningún plugin, así que el sobre nunca se queda escrito.
 *
 * INSTALACIÓN
 *
 *   1. En wp-config.php, antes de "/* That's all":
 *          define( 'DRC_SECRETO_WOO', 'la-misma-clave-que-en-vercel' );
 *   2. Este fichero en wp-content/plugins/drc-acceso-lms/ y activar el
 *      plugin. (También sirve pegado en el functions.php del tema hijo,
 *      pero como plugin sobrevive a los cambios de tema.)
 *   3. Poner [boton_lms] donde quieras el botón: "Mi cuenta", el correo
 *      de bienvenida, el menú.
 * ---------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * PENDIENTE: cambiar por https://practica.drcacademy.com en cuanto el
 * dominio apunte a Vercel. Mientras el LMS viva en un vercel.app, el
 * botón salta a un dominio que no es el de la academia y el correo de
 * acceso apunta a un sitio distinto del remitente, que es lo que hace
 * que Gmail y Outlook lo traten como sospechoso.
 */
const DRC_LMS_URL = 'https://drc-lms.vercel.app';

/** La misma codificación que usa el LMS: base64 de URL, sin relleno. */
function drc_b64url( $bytes ) {
	return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
}

/**
 * El sobre firmado para el usuario que esté dentro ahora mismo, o ''
 * si no hay nadie, no hay email o falta la clave.
 *
 * El email sale SIEMPRE de la sesión de WordPress. Nunca de un
 * parámetro: si se aceptara de fuera, cualquiera pondría el de otro.
 */
function drc_sobre_lms() {
	if ( ! is_user_logged_in() ) {
		return '';
	}

	if ( ! defined( 'DRC_SECRETO_WOO' ) || strlen( DRC_SECRETO_WOO ) < 32 ) {
		error_log( '[drc-lms] Falta DRC_SECRETO_WOO en wp-config.php, o es demasiado corto.' );
		return '';
	}

	$usuario = wp_get_current_user();
	$email   = strtolower( trim( $usuario->user_email ) );
	if ( '' === $email ) {
		return '';
	}

	$cuerpo = wp_json_encode(
		array(
			'e' => $email,
			// Milisegundos desde epoch, como Date.now() en el LMS.
			't' => (int) round( microtime( true ) * 1000 ),
			'n' => drc_b64url( random_bytes( 12 ) ),
		)
	);

	if ( false === $cuerpo ) {
		error_log( '[drc-lms] No se pudo serializar el sobre.' );
		return '';
	}

	$cuerpo = drc_b64url( $cuerpo );
	$firma  = drc_b64url( hash_hmac( 'sha256', 'woo.' . $cuerpo, DRC_SECRETO_WOO, true ) );

	return $cuerpo . '.' . $firma;
}

/**
 * El destino del botón. Fijo para todo el mundo, así que la página que
 * lo contiene se puede cachear sin peligro.
 */
function drc_url_boton_lms() {
	return admin_url( 'admin-post.php?action=drc_ir_al_lms' );
}

/**
 * Firma y redirige. Sin nonce a propósito: no hay nada que un tercero
 * pueda provocar aquí salvo que alguien acabe dentro de su propia
 * práctica, y un nonce obligaría a meter un valor por usuario en el
 * HTML, que es justo lo que evitamos para poder cachear.
 */
function drc_ir_al_lms() {
	if ( ! is_user_logged_in() ) {
		// Después de identificarse vuelve aquí y sigue camino al LMS.
		wp_safe_redirect( wp_login_url( drc_url_boton_lms() ) );
		exit;
	}

	$sobre = drc_sobre_lms();

	if ( '' === $sobre ) {
		// Sin sobre no hay atajo, pero sí hay puerta: el LMS le pedirá
		// el email y le mandará un enlace.
		wp_redirect( DRC_LMS_URL . '/acceso', 302 );
		exit;
	}

	// wp_redirect y no wp_safe_redirect: este destino es otro dominio a
	// propósito, y wp_safe_redirect solo deja salir al propio sitio.
	wp_redirect( DRC_LMS_URL . '/entrar/woo?token=' . rawurlencode( $sobre ), 302 );
	exit;
}
add_action( 'admin_post_drc_ir_al_lms', 'drc_ir_al_lms' );
add_action( 'admin_post_nopriv_drc_ir_al_lms', 'drc_ir_al_lms' );

/** [boton_lms] o [boton_lms texto="Practicar ahora"] */
function drc_shortcode_boton_lms( $atributos ) {
	$atributos = shortcode_atts(
		array( 'texto' => 'Entrar en mi práctica' ),
		$atributos,
		'boton_lms'
	);

	$estilo = 'display:inline-block;padding:14px 28px;border-radius:999px;'
		. 'background:#037A36;color:#FFFFFF;text-decoration:none;'
		. "font-family:'Radio Canada',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;";

	return sprintf(
		'<a href="%s" style="%s">%s</a>',
		esc_url( drc_url_boton_lms() ),
		esc_attr( $estilo ),
		esc_html( $atributos['texto'] )
	);
}
add_shortcode( 'boton_lms', 'drc_shortcode_boton_lms' );
