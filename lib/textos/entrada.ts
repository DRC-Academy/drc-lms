// ---------------------------------------------------------------
// LAS PANTALLAS DE SERVICIO
//
// Las tres que se ven FUERA del producto: entrar, cuando algo se rompe y
// darse de baja de los avisos. Van juntas porque comparten una
// condición que ninguna otra pantalla tiene —se llega a ellas sin
// sesión, o con la sesión rota— y eso cambia lo que pueden decir.
//
// UN DETALLE QUE CONVIENE SABER de la pantalla de baja: se llega desde
// el pie de un correo, y los correos se quedan en español porque los
// manda un cron que no puede leer la cookie. Así que un alumno que nunca
// haya tocado el botón abrirá un correo español y aterrizará en una
// página inglesa. Se arregla el día que la preferencia suba también a su
// ficha; hasta entonces, quien ya la eligió sí ve las dos en el mismo
// idioma, porque la cookie viaja con él.
//
// EL AVISO DE ACCESO NO DICE SI EL EMAIL EXISTE, en los dos idiomas. Es
// la regla que manda en `app/acceso/acciones.ts`: si dijéramos "ese
// email no está registrado", cualquiera podría averiguar quién estudia
// aquí probando direcciones. La traducción tiene que conservar esa
// ambigüedad, no aclararla.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosEntrada = {
  // --- entrar ---
  tituloPagina: string;
  descripcionPagina: string;
  entraEnTuPractica: string;
  ponTuEmail: string;
  problemasParaEntrar: string;
  tuEmail: string;
  marcadorEmail: string;
  enviarme: string;
  enviando: string;
  revisaTuCorreo: string;
  caducaEnQuince: string;
  probarOtroEmail: string;

  // --- lo que responde el servidor al pedir enlace ---
  mensajeNeutro: string;
  emailIncompleto: string;
  noSePudoEnviar: string;

  // --- por qué se ha acabado en la pantalla de entrar ---
  avisoCaducado: string;
  avisoSinFicha: string;
  avisoError: string;
  avisoSalida: string;
  avisoSesion: string;

  // --- cuando algo se rompe ---
  algoSeHaRoto: string;
  noEsCulpaTuya: string;
  volverAIntentarlo: string;
  irAMiInicio: string;
  siVuelveAPasar: string;
  yDileEsteCodigo: string;
  yLoMiramos: string;

  // --- baja de los avisos ---
  enlaceNoVale: string;
  enlaceNoValeDetalle: string;
  avisosDeContenido: string;
  yaNoRecibes: string;
  avisosActivosDetalle: string;
  avisosBajaDetalle: string;
  dejarDeRecibir: string;
  volverARecibirlos: string;
  bajaNoTocaNada: string;
  bajaReversible: string;
};

const ES: TextosEntrada = {
  tituloPagina: "Entrar · DRC Academy",
  descripcionPagina: "Pide un enlace para entrar en tu práctica.",
  entraEnTuPractica: "Entra en tu práctica",
  ponTuEmail: "Pon tu email y te enviamos un enlace para entrar. Sin contraseñas.",
  problemasParaEntrar: "¿Problemas para entrar? Escribe a tu profesor.",
  tuEmail: "Tu email",
  marcadorEmail: "tucorreo@ejemplo.com",
  enviarme: "Enviarme el enlace",
  enviando: "Enviando…",
  revisaTuCorreo: "Revisa tu correo",
  caducaEnQuince: "El enlace caduca en 15 minutos. Si no lo ves, mira en spam.",
  probarOtroEmail: "Probar con otro email",

  mensajeNeutro: "Si ese email está registrado, te hemos enviado un enlace para entrar.",
  emailIncompleto: "Ese email no parece completo. Revísalo y vuelve a probar.",
  noSePudoEnviar: "No hemos podido enviar el enlace. Inténtalo otra vez en un momento.",

  avisoCaducado: "Ese enlace ya no es válido. Pide uno nuevo.",
  avisoSinFicha:
    "Ese enlace es correcto, pero no encontramos tu ficha. Escribe a tu profesor y lo miramos.",
  avisoError: "No hemos podido abrir tu sesión. Vuelve a intentarlo en un momento.",
  avisoSalida: "Has cerrado sesión. Pide un enlace cuando quieras volver.",
  avisoSesion: "Tu sesión ha caducado. Pide un enlace y sigues donde lo dejaste.",

  algoSeHaRoto: "Algo se ha roto por aquí",
  noEsCulpaTuya:
    "No es culpa tuya y no se ha perdido nada de lo que llevas hecho. Casi siempre se arregla volviendo a intentarlo.",
  volverAIntentarlo: "Volver a intentarlo",
  irAMiInicio: "Ir a mi inicio",
  siVuelveAPasar: "Si vuelve a pasar, escríbele a tu profesor",
  yDileEsteCodigo: "y dile este código:",
  yLoMiramos: " y lo miramos",

  enlaceNoVale: "Este enlace no vale",
  enlaceNoValeDetalle:
    "Puede que esté incompleto por cómo lo ha cortado el cliente de correo. Abre el enlace desde el correo original, o escríbenos y lo cambiamos nosotros.",
  avisosDeContenido: "Avisos de contenido nuevo",
  yaNoRecibes: "Ya no recibes estos avisos",
  avisosActivosDetalle:
    "Es el correo que te llega cuando se abre contenido nuevo de tu curso, más o menos una vez por semana. Puedes dejar de recibirlo aquí.",
  avisosBajaDetalle:
    "No te mandaremos más avisos de contenido nuevo. Seguirás recibiendo los correos que pidas tú, como el enlace para entrar.",
  dejarDeRecibir: "Dejar de recibir estos avisos",
  volverARecibirlos: "Volver a recibirlos",
  bajaNoTocaNada: "Esto no toca nada más: tu curso y tu práctica siguen igual.",
  bajaReversible: "Si cambias de idea, este mismo enlace los vuelve a activar.",
};

const EN: TextosEntrada = {
  tituloPagina: "Log in · DRC Academy",
  descripcionPagina: "Get a link to your practice.",
  entraEnTuPractica: "Get into your practice",
  ponTuEmail: "Enter your email and we'll send you a link. No passwords.",
  problemasParaEntrar: "Trouble getting in? Write to your teacher.",
  tuEmail: "Your email",
  marcadorEmail: "youremail@example.com",
  enviarme: "Send me the link",
  enviando: "Sending…",
  revisaTuCorreo: "Check your email",
  caducaEnQuince: "The link expires in 15 minutes. If you can't see it, check your spam folder.",
  probarOtroEmail: "Try another email",

  // Igual de ambiguo que en español: no dice si el email existe.
  mensajeNeutro: "If that email is registered, we've sent you a link to get in.",
  emailIncompleto: "That email doesn't look complete. Check it and try again.",
  noSePudoEnviar: "We couldn't send the link. Try again in a moment.",

  avisoCaducado: "That link is no longer valid. Ask for a new one.",
  avisoSinFicha:
    "That link is fine, but we can't find your profile. Write to your teacher and we'll look into it.",
  avisoError: "We couldn't open your session. Try again in a moment.",
  avisoSalida: "You've logged out. Ask for a link whenever you want to come back.",
  avisoSesion: "Your session has expired. Ask for a link and carry on where you left off.",

  algoSeHaRoto: "Something broke here",
  noEsCulpaTuya:
    "It isn't your fault and nothing you've done has been lost. Trying again usually fixes it.",
  volverAIntentarlo: "Try again",
  irAMiInicio: "Go to my home",
  siVuelveAPasar: "If it happens again, write to your teacher",
  yDileEsteCodigo: "and give them this code:",
  yLoMiramos: " and we'll look into it",

  enlaceNoVale: "This link doesn't work",
  enlaceNoValeDetalle:
    "It may be incomplete because of how your email app cut it. Open the link from the original email, or write to us and we'll change it for you.",
  avisosDeContenido: "New content emails",
  yaNoRecibes: "You no longer get these emails",
  avisosActivosDetalle:
    "This is the email you get when new content opens on your course, about once a week. You can stop it here.",
  avisosBajaDetalle:
    "We won't send you any more new-content emails. You'll still get the ones you ask for yourself, like the link to get in.",
  dejarDeRecibir: "Stop these emails",
  volverARecibirlos: "Get them again",
  bajaNoTocaNada: "This changes nothing else: your course and your practice stay the same.",
  bajaReversible: "If you change your mind, this same link turns them back on.",
};

export const ENTRADA: Record<Idioma, TextosEntrada> = { en: EN, es: ES };
