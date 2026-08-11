<?php
// DRC · Acceso al LMS. Snippet de Fluent Snippets, tipo PHP.
// PONLO EN "Run Everywhere": el botón entra por admin-post.php, que
// define WP_ADMIN, así que en "solo frontend" no se registran los
// hooks y en "solo admin" no aparece el shortcode.
// La clave va en wp-config.php: define( 'DRC_SECRETO_WOO', ... );
// Versión comentada y contrato con el LMS: wordpress/drc-acceso-lms.php

if ( ! defined( 'DRC_LMS_URL' ) ) {
	define( 'DRC_LMS_URL', 'https://drc-lms.vercel.app' );
}

// La guarda evita el fatal por redeclaración si el snippet se evalúa dos veces.
if ( ! class_exists( 'DRC_Acceso_LMS' ) ) {

	final class DRC_Acceso_LMS {

		const MINIMO_SECRETO = 32;

		public static function registrar() {
			add_action( 'admin_post_drc_ir_al_lms', array( __CLASS__, 'ir' ) );
			add_action( 'admin_post_nopriv_drc_ir_al_lms', array( __CLASS__, 'ir' ) );
			add_shortcode( 'boton_lms', array( __CLASS__, 'shortcode' ) );
			add_action( 'admin_notices', array( __CLASS__, 'aviso' ) );
		}

		private static function b64url( $bytes ) {
			return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
		}

		// Se comprueba antes de firmar: una clave vacía produce una firma
		// que puede reproducir cualquiera, y eso es peor que no firmar.
		private static function problema() {
			if ( ! defined( 'DRC_SECRETO_WOO' ) ) {
				return 'Falta DRC_SECRETO_WOO en wp-config.php. Tiene que definirse ahí con el mismo valor que SECRETO_WOO en Vercel.';
			}

			$secreto = (string) constant( 'DRC_SECRETO_WOO' );

			if ( '' === trim( $secreto ) ) {
				return 'DRC_SECRETO_WOO está definida pero vacía en wp-config.php. Tiene que llevar el mismo valor que SECRETO_WOO en Vercel.';
			}

			if ( strlen( $secreto ) < self::MINIMO_SECRETO ) {
				return sprintf(
					'DRC_SECRETO_WOO tiene %d caracteres y hacen falta al menos %d. Genera una clave nueva de 32 bytes en hexadecimal y ponla igual en wp-config.php y en Vercel.',
					strlen( $secreto ),
					self::MINIMO_SECRETO
				);
			}

			return '';
		}

		// El email sale siempre de la sesión de WordPress, nunca de un parámetro.
		private static function sobre() {
			if ( '' !== self::problema() || ! is_user_logged_in() ) {
				return '';
			}

			$usuario = wp_get_current_user();
			$email   = strtolower( trim( $usuario->user_email ) );

			if ( '' === $email ) {
				error_log( '[drc-lms] El usuario ' . $usuario->ID . ' no tiene email; no se puede firmar el sobre.' );
				return '';
			}

			try {
				$nonce = self::b64url( random_bytes( 12 ) );
			} catch ( Exception $e ) {
				error_log( '[drc-lms] Sin fuente de aleatoriedad para el nonce: ' . $e->getMessage() );
				return '';
			}

			$cuerpo = wp_json_encode(
				array(
					'e' => $email,
					't' => (int) round( microtime( true ) * 1000 ),
					'n' => $nonce,
					// El ID de WordPress. Es lo que permite al LMS
					// vincular al alumno por id y dejar de depender de
					// que el email coincida en los tres sistemas. El LMS
					// acepta sobres sin este campo, así que los dos lados
					// no tienen que desplegarse a la vez.
					'u' => (int) $usuario->ID,
				)
			);

			if ( false === $cuerpo ) {
				error_log( '[drc-lms] No se pudo serializar el sobre.' );
				return '';
			}

			$cuerpo = self::b64url( $cuerpo );
			$firma  = self::b64url( hash_hmac( 'sha256', 'woo.' . $cuerpo, constant( 'DRC_SECRETO_WOO' ), true ) );

			return $cuerpo . '.' . $firma;
		}

		// URL fija e igual para todos: así el token no queda escrito en el
		// HTML y la página que lleva el botón se puede cachear sin peligro.
		public static function url_boton() {
			return admin_url( 'admin-post.php?action=drc_ir_al_lms' );
		}

		public static function ir() {
			if ( ! is_user_logged_in() ) {
				wp_safe_redirect( wp_login_url( self::url_boton() ) );
				exit;
			}

			$problema = self::problema();

			if ( '' !== $problema ) {
				error_log( '[drc-lms] ' . $problema );

				if ( current_user_can( 'manage_options' ) ) {
					wp_die(
						esc_html( $problema ),
						'DRC · Acceso al LMS',
						array( 'response' => 500, 'back_link' => true )
					);
				}

				// Al alumno no se le cuenta la configuración: se le manda por
				// la puerta que sí funciona, que es pedir el enlace por correo.
				wp_redirect( DRC_LMS_URL . '/acceso', 302 );
				exit;
			}

			$sobre = self::sobre();

			if ( '' === $sobre ) {
				wp_redirect( DRC_LMS_URL . '/acceso', 302 );
				exit;
			}

			// wp_redirect y no wp_safe_redirect: el destino es otro dominio.
			wp_redirect( DRC_LMS_URL . '/entrar/woo?token=' . rawurlencode( $sobre ), 302 );
			exit;
		}

		public static function shortcode( $atributos ) {
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
				esc_url( self::url_boton() ),
				esc_attr( $estilo ),
				esc_html( $atributos['texto'] )
			);
		}

		public static function aviso() {
			$problema = self::problema();

			if ( '' === $problema || ! current_user_can( 'manage_options' ) ) {
				return;
			}

			printf(
				'<div class="notice notice-error"><p><strong>Acceso al LMS:</strong> %s</p></div>',
				esc_html( $problema )
			);
		}
	}

	DRC_Acceso_LMS::registrar();
}
