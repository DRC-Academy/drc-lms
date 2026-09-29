<?php
// ---------------------------------------------------------------
// DRC · ENTRADA EN LA TIENDA DESDE EL LMS (el puente inverso)
//
// NO es un plugin: este código se pega en Fluent Snippets.
//
//   Tipo:        PHP
//   Dónde corre: EN TODAS PARTES ("Run Everywhere"), por lo mismo que
//                el snippet de acceso al LMS: entra por admin-post.php,
//                que define WP_ADMIN.
//
// ---------------------------------------------------------------
// QUÉ HACE
//
// El botón del LMS «Quiero ir más rápido» ya no lleva a Mi cuenta a
// secas. El servidor del LMS firma un sobre con el email del alumno y
// lo manda aquí:
//
//   /wp-admin/admin-post.php?action=drc_desde_lms&token=SOBRE
//
// Esto comprueba el sobre, abre la sesión de WordPress del usuario
// cuyo email coincide y redirige al destino del sobre, que solo puede
// ser uno de la lista blanca de abajo (el cambio de plan). Si algo no
// cuadra, NO entra: manda a la pantalla de login normal, con el mismo
// destino, y el alumno sigue como hasta ahora.
//
// EL SOBRE (contrato con el LMS)
//
//   base64url( {"e": email, "t": ms, "n": nonce, "d": destino} ) . "." . base64url( firma )
//
//   firma = HMAC-SHA256( "wp." + cuerpo codificado, DRC_SECRETO_PUENTE )
//
//   e  email del alumno, normalizado (minúsculas, sin espacios)
//   t  emitido en, milisegundos desde epoch
//   n  nonce aleatorio, entre 16 y 64 caracteres base64url
//   d  CLAVE del destino ("cambio-plan"), nunca una URL
//
// LAS REGLAS
//
//   · Clave propia, DRC_SECRETO_PUENTE. No es la del otro sentido
//     (DRC_SECRETO_WOO): quien tenga una no puede fabricar sobres de la
//     otra.
//   · Cinco minutos como máximo, con un minuto de margen para relojes
//     adelantados (un sobre fechado en el futuro se rechaza).
//   · Un solo uso. El nonce se guarda con add_option, que falla si la
//     fila ya existe: la base de datos tiene índice único en el nombre,
//     así que dos usos a la vez no pasan los dos. Una tarea horaria
//     borra los de más de una hora.
//   · Solo usuarios de la tienda. Un usuario con permisos de equipo
//     (editar entradas, gestionar WooCommerce, administrar) no entra
//     nunca por aquí, aunque el email coincida: el peor caso de un LMS
//     comprometido es suplantar a un alumno, no al equipo.
//   · Destino por clave y en lista blanca, y wp_safe_redirect: no hay
//     redirección abierta posible.
//
// LA OTRA MITAD, EN EL LMS: `app/ampliar-plan/route.ts` firma el sobre
// en el momento del clic (`crearTokenPuenteWp`, en `lib/sesion.ts`) y
// redirige aquí. Los dos lados tienen que decir lo mismo.
//
// INSTALACIÓN, EN ESTE ORDEN
//
//   1. Una clave nueva de 32 bytes en hexadecimal. En wp-config.php:
//          define( 'DRC_SECRETO_PUENTE', 'la-clave-nueva' );
//      Distinta de DRC_SECRETO_WOO: si coinciden, el snippet no entra y
//      lo avisa en el panel.
//   2. Este código en Fluent Snippets, tipo PHP, "Run Everywhere".
//   3. La MISMA clave en Vercel como SECRETO_PUENTE_WP, y redesplegar.
//      Es el interruptor: sin ella el LMS sigue mandando al enlace de
//      siempre, así que hasta este paso nada cambia para el alumno. Si
//      se pusiera antes de instalar el snippet, el botón acabaría en una
//      página en blanco de WordPress.
//
// PRUEBA
//
//   Con una cuenta de alumno de prueba cuyo email exista en la tienda,
//   pulsa «Quiero ir más rápido» en el LMS sin sesión en drcacademy.com:
//   tienes que acabar en el cambio de plan ya dentro. Vuelve atrás y
//   repite el mismo enlace del historial (el mismo sobre): tiene que
//   llevarte al login, porque el sobre ya se gastó.
//
// NOTA PARA QUIEN EDITE ESTE FICHERO
//
// Los comentarios de aquí no llevan comillas simples sueltas ni la
// secuencia que abre un bloque de comentario: el validador de Fluent
// Snippets no distingue comentario de código y rechaza el snippet.
// ---------------------------------------------------------------

if ( ! class_exists( 'DRC_Desde_LMS' ) ) {

	final class DRC_Desde_LMS {

		const MINIMO_SECRETO = 32;
		/** Cinco minutos, en milisegundos. */
		const VENTANA_MS = 300000;
		/** El margen para un reloj del LMS adelantado. */
		const MARGEN_MS = 60000;
		/** El prefijo de las filas de wp_options que guardan los nonces. */
		const PREFIJO = 'drc_puente_';

		/**
		 * La lista blanca: clave del sobre => ruta de este sitio. La ruta
		 * se construye aquí, nunca sale del sobre.
		 */
		private static function destinos() {
			return array(
				'cambio-plan' => '/mi-cuenta/?drc-ampliar-plan=1',
			);
		}

		public static function registrar() {
			add_action( 'admin_post_drc_desde_lms', array( __CLASS__, 'entrar' ) );
			add_action( 'admin_post_nopriv_drc_desde_lms', array( __CLASS__, 'entrar' ) );
			add_action( 'drc_puente_limpiar', array( __CLASS__, 'limpiar' ) );
			if ( ! wp_next_scheduled( 'drc_puente_limpiar' ) ) {
				wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', 'drc_puente_limpiar' );
			}
			add_action( 'admin_notices', array( __CLASS__, 'aviso' ) );
		}

		/** Qué le pasa a la configuración, o una cadena vacía si está bien. */
		private static function problema() {
			if ( ! defined( 'DRC_SECRETO_PUENTE' ) ) {
				return 'Falta DRC_SECRETO_PUENTE en wp-config.php.';
			}
			$secreto = (string) constant( 'DRC_SECRETO_PUENTE' );
			if ( strlen( trim( $secreto ) ) < self::MINIMO_SECRETO ) {
				return 'DRC_SECRETO_PUENTE es demasiado corta: hacen falta al menos 32 caracteres.';
			}
			if ( defined( 'DRC_SECRETO_WOO' ) && hash_equals( (string) constant( 'DRC_SECRETO_WOO' ), $secreto ) ) {
				return 'DRC_SECRETO_PUENTE no puede ser la misma clave que DRC_SECRETO_WOO.';
			}
			return '';
		}

		private static function b64url_decodificar( $texto ) {
			if ( ! is_string( $texto ) || '' === $texto || preg_match( '/[^A-Za-z0-9_-]/', $texto ) ) {
				return false;
			}
			$texto = strtr( $texto, '-_', '+/' );
			$resto = strlen( $texto ) % 4;
			if ( $resto ) {
				$texto .= str_repeat( '=', 4 - $resto );
			}
			return base64_decode( $texto, true );
		}

		/**
		 * El contenido del sobre si la firma, la fecha y los campos
		 * cuadran; null en cualquier otro caso. No toca el nonce: eso va
		 * después, para no gastar nonces con sobres que no valen.
		 */
		private static function verificar( $token ) {
			if ( '' !== self::problema() ) {
				return null;
			}
			$partes = explode( '.', (string) $token );
			if ( 2 !== count( $partes ) ) {
				return null;
			}
			list( $cuerpo, $firma ) = $partes;

			$firma_bytes = self::b64url_decodificar( $firma );
			if ( false === $firma_bytes ) {
				return null;
			}
			$esperada = hash_hmac( 'sha256', 'wp.' . $cuerpo, constant( 'DRC_SECRETO_PUENTE' ), true );
			// Comparación en tiempo constante.
			if ( ! hash_equals( $esperada, $firma_bytes ) ) {
				return null;
			}

			$json = self::b64url_decodificar( $cuerpo );
			if ( false === $json ) {
				return null;
			}
			$datos = json_decode( $json, true );
			if ( ! is_array( $datos ) ) {
				return null;
			}

			$email = isset( $datos['e'] ) && is_string( $datos['e'] ) ? strtolower( trim( $datos['e'] ) ) : '';
			$emitido = isset( $datos['t'] ) && is_int( $datos['t'] ) ? $datos['t'] : 0;
			$nonce = isset( $datos['n'] ) && is_string( $datos['n'] ) ? $datos['n'] : '';
			$destino = isset( $datos['d'] ) && is_string( $datos['d'] ) ? $datos['d'] : '';

			if ( ! is_email( $email ) || ! preg_match( '/^[A-Za-z0-9_-]{16,64}$/', $nonce ) ) {
				return null;
			}
			$ahora = (int) round( microtime( true ) * 1000 );
			if ( $emitido <= 0 || $emitido > $ahora + self::MARGEN_MS || $ahora - $emitido > self::VENTANA_MS ) {
				return null;
			}
			$destinos = self::destinos();
			if ( ! isset( $destinos[ $destino ] ) ) {
				return null;
			}

			return array(
				'email'   => $email,
				'nonce'   => $nonce,
				'destino' => $destinos[ $destino ],
			);
		}

		/** Gasta el nonce. True solo la primera vez. */
		private static function gastar( $nonce ) {
			// add_option devuelve false si la fila ya existe, y el nombre
			// de opción es único en la base: no hay carrera entre dos usos.
			return add_option( self::PREFIJO . hash( 'sha256', $nonce ), (string) time(), '', 'no' );
		}

		/** Un usuario del equipo no entra nunca por aquí. */
		private static function es_del_equipo( $usuario ) {
			return user_can( $usuario, 'edit_posts' )
				|| user_can( $usuario, 'manage_woocommerce' )
				|| user_can( $usuario, 'manage_options' );
		}

		/** A la pantalla de login normal, con el destino de vuelta. */
		private static function al_login( $destino, $motivo ) {
			error_log( '[drc-puente] No se abre sesión: ' . $motivo );
			wp_safe_redirect( wp_login_url( home_url( $destino ) ) );
			exit;
		}

		public static function entrar() {
			// La respuesta es personal: ningún caché la puede guardar.
			nocache_headers();

			$destinos = self::destinos();
			$por_defecto = $destinos['cambio-plan'];
			$token = isset( $_GET['token'] ) ? sanitize_text_field( wp_unslash( $_GET['token'] ) ) : '';

			$sobre = self::verificar( $token );
			if ( null === $sobre ) {
				self::al_login( $por_defecto, 'sobre no válido, caducado o sin configuración' );
			}
			if ( ! self::gastar( $sobre['nonce'] ) ) {
				self::al_login( $sobre['destino'], 'sobre ya usado' );
			}

			$usuario = get_user_by( 'email', $sobre['email'] );
			if ( ! $usuario || strtolower( trim( $usuario->user_email ) ) !== $sobre['email'] ) {
				self::al_login( $sobre['destino'], 'no hay usuario con ese email' );
			}
			if ( self::es_del_equipo( $usuario ) ) {
				self::al_login( $sobre['destino'], 'el usuario ' . $usuario->ID . ' es del equipo' );
			}

			$actual = get_current_user_id();
			if ( $actual !== (int) $usuario->ID ) {
				// Otra sesión en este navegador (un ordenador compartido):
				// se cierra antes de abrir la del alumno.
				if ( $actual ) {
					wp_logout();
				}
				wp_clear_auth_cookie();
				wp_set_current_user( $usuario->ID );
				// Sin «recordarme»: dura lo que la sesión del navegador.
				wp_set_auth_cookie( $usuario->ID, false, is_ssl() );
				do_action( 'wp_login', $usuario->user_login, $usuario );
			}

			// Destino de este mismo sitio, y wp_safe_redirect además.
			wp_safe_redirect( home_url( $sobre['destino'] ) );
			exit;
		}

		/** Borra los nonces de más de una hora. */
		public static function limpiar() {
			global $wpdb;
			$filas = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s AND CAST(option_value AS UNSIGNED) < %d LIMIT 500",
					$wpdb->esc_like( self::PREFIJO ) . '%',
					time() - HOUR_IN_SECONDS
				)
			);
			foreach ( $filas as $nombre ) {
				delete_option( $nombre );
			}
		}

		/** El aviso del panel, solo para quien puede arreglarlo. */
		public static function aviso() {
			$problema = self::problema();
			if ( '' === $problema || ! current_user_can( 'manage_options' ) ) {
				return;
			}
			printf(
				'<div class="notice notice-error"><p><strong>Puente desde el LMS:</strong> %s</p></div>',
				esc_html( $problema )
			);
		}
	}

	DRC_Desde_LMS::registrar();
}
