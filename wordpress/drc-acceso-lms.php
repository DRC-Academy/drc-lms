<?php
// ---------------------------------------------------------------
// DRC · ACCESO AL LMS
//
// NO es un plugin: este código se pega en Fluent Snippets.
//
//   Tipo:        PHP
//   Dónde corre: EN TODAS PARTES ("Run Everywhere")
//
// Lo de "en todas partes" no es indiferente. El botón entra por
// wp-admin/admin-post.php, y ese fichero define WP_ADMIN, así que
// is_admin() vale true allí. Con el snippet en "solo frontend" los
// hooks no llegan a registrarse y el botón devuelve una página en
// blanco; con el snippet en "solo admin" el que no sale es el
// shortcode. Hace falta en los dos sitios.
//
// El momento del registro sí es el bueno: admin-post.php carga
// WordPress entero —mu-plugins, plugins y los snippets de Fluent con
// ellos— y solo después dispara admin_init y, detrás,
// admin_post_{accion}. Cuando salta el hook, el add_action ya está.
//
// ---------------------------------------------------------------
// QUÉ HACE
//
// WordPress ya sabe quién está dentro. Esto firma su email con
// HMAC-SHA256 y lo manda al LMS, que verifica la firma y abre sesión.
// Es la otra mitad de `app/entrar/woo/route.ts`; los dos lados tienen
// que decir lo mismo o el botón deja de entrar.
//
// EL SOBRE (contrato con el LMS, ver `lib/sesion.ts`)
//
//   base64url( {"e": email, "t": ms, "n": nonce} ) . "." . base64url( firma )
//
// donde la firma es HMAC-SHA256 de la cadena "woo." + el cuerpo ya
// codificado, con la clave compartida.
//
// POR QUÉ EL BOTÓN NO LLEVA EL TOKEN DENTRO
//
// El enlace apunta a admin-post.php, que es una URL fija e igual para
// todo el mundo, y el sobre se firma allí justo antes de redirigir. Si
// el token viajara en el href estaría dentro del HTML de la página, y
// cualquier caché de página —WP Rocket, LiteSpeed, Cloudflare, y en un
// WooCommerce casi siempre hay una— podría guardar esa copia y
// servírsela a OTRO visitante, que entraría en el LMS como el alumno
// cuya página se cacheó. admin-post.php no lo cachea ningún plugin y
// además llama a nocache_headers(), así que el sobre nunca se queda
// escrito en ningún sitio.
//
// INSTALACIÓN
//
//   1. En wp-config.php, arriba del todo o antes del aviso final de
//      "stop editing", una línea con:
//          define( 'DRC_SECRETO_WOO', 'la-misma-clave-que-en-vercel' );
//   2. Este código en Fluent Snippets, tipo PHP, "Run Everywhere".
//   3. [boton_lms] donde quieras el botón: "Mi cuenta", el menú, la
//      página de bienvenida.
//
// NOTA PARA QUIEN EDITE ESTE FICHERO
//
// Los comentarios de aquí no llevan comillas simples sueltas ni la
// secuencia que abre un bloque de comentario. No es manía: el
// validador de Fluent Snippets analiza el texto sin distinguir qué es
// comentario y qué es código, así que una comilla suelta en una frase
// le invierte la paridad del resto del fichero y rechaza el snippet
// entero con un error de paréntesis en una línea que no tiene nada.
// Por lo mismo, los mensajes de abajo no usan comillas escapadas.
// ---------------------------------------------------------------

// El destino del LMS. Se puede fijar desde wp-config.php sin tocar el
// snippet, que es lo que hará falta el día que esto pase a
// practica.drcacademy.com.
if ( ! defined( 'DRC_LMS_URL' ) ) {
	define( 'DRC_LMS_URL', 'https://drc-lms.vercel.app' );
}

// Un gestor de snippets puede evaluar el mismo código más de una vez
// —al guardarlo, al refrescar su caché—. Sin esta guarda, la segunda
// pasada sería un fatal por redeclaración.
if ( ! class_exists( 'DRC_Acceso_LMS' ) ) {

	final class DRC_Acceso_LMS {

		/** La longitud mínima que le exigimos a la clave compartida. */
		const MINIMO_SECRETO = 32;

		public static function registrar() {
			// Los dos: admin-post.php elige uno u otro según haya
			// cookie de sesión válida, y aquí puede pasar cualquiera
			// de los dos casos.
			add_action( 'admin_post_drc_ir_al_lms', array( __CLASS__, 'ir' ) );
			add_action( 'admin_post_nopriv_drc_ir_al_lms', array( __CLASS__, 'ir' ) );

			add_shortcode( 'boton_lms', array( __CLASS__, 'shortcode' ) );

			// Que una clave mal puesta se vea en el panel y no la
			// descubra un alumno pulsando el botón.
			add_action( 'admin_notices', array( __CLASS__, 'aviso' ) );
		}

		/** La misma codificación que usa el LMS: base64 de URL, sin relleno. */
		private static function b64url( $bytes ) {
			return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
		}

		/**
		 * Qué le pasa a la configuración, o '' si está bien.
		 *
		 * Se comprueba ANTES de firmar nada. Firmar con una clave vacía
		 * produciría un sobre con una firma perfectamente válida para
		 * quien también use la clave vacía, o sea para cualquiera que
		 * se dé cuenta: es peor que no firmar.
		 */
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

		/**
		 * El sobre firmado para quien esté dentro ahora mismo, o ''.
		 *
		 * El email sale SIEMPRE de la sesión de WordPress. Nunca de un
		 * parámetro: si se aceptara de fuera, cualquiera pondría el de
		 * otro y entraría en su ficha.
		 */
		private static function sobre() {
			// Segunda comprobación a propósito: así no hay ningún
			// camino que llegue a hash_hmac() con la clave sin validar.
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
					// Milisegundos desde epoch, como Date.now() en el LMS.
					't' => (int) round( microtime( true ) * 1000 ),
					'n' => $nonce,
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

		/**
		 * El destino del botón. Fijo para todo el mundo, así que la
		 * página que lo contenga se puede cachear sin peligro.
		 */
		public static function url_boton() {
			return admin_url( 'admin-post.php?action=drc_ir_al_lms' );
		}

		/**
		 * Firma y redirige.
		 *
		 * Sin nonce de WordPress a propósito: lo único que podría
		 * provocar un tercero es que alguien acabe dentro de su propia
		 * práctica, y un nonce obligaría a meter un valor distinto por
		 * usuario en el HTML, que es justo lo que evitamos para que la
		 * página se pueda cachear.
		 */
		public static function ir() {
			if ( ! is_user_logged_in() ) {
				// Al identificarse vuelve aquí y sigue camino al LMS.
				wp_safe_redirect( wp_login_url( self::url_boton() ) );
				exit;
			}

			$problema = self::problema();

			if ( '' !== $problema ) {
				error_log( '[drc-lms] ' . $problema );

				// A quien administra el sitio se le dice qué falla. A un
				// alumno no se le cuenta la configuración interna: se le
				// manda por la puerta que sí funciona, que es pedir el
				// enlace por correo.
				if ( current_user_can( 'manage_options' ) ) {
					wp_die(
						esc_html( $problema ),
						'DRC · Acceso al LMS',
						array( 'response' => 500, 'back_link' => true )
					);
				}

				wp_redirect( DRC_LMS_URL . '/acceso', 302 );
				exit;
			}

			$sobre = self::sobre();

			if ( '' === $sobre ) {
				// Aquí ya no es la clave: es un usuario sin email o un
				// fallo al construir el sobre, y los dos quedan en el log.
				wp_redirect( DRC_LMS_URL . '/acceso', 302 );
				exit;
			}

			// wp_redirect y no wp_safe_redirect: este destino es otro
			// dominio a propósito, y wp_safe_redirect solo deja salir
			// al propio sitio.
			wp_redirect( DRC_LMS_URL . '/entrar/woo?token=' . rawurlencode( $sobre ), 302 );
			exit;
		}

		/** [boton_lms] o [boton_lms texto="Practicar ahora"] */
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

		/** El aviso del panel, solo para quien puede arreglarlo. */
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
