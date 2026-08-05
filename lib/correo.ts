// ---------------------------------------------------------------
// EL EMAIL DEL ENLACE
//
// Único envío que hace el LMS. Va por Resend, con RESEND_API_KEY.
//
// El HTML es de tabla y con estilos en línea porque los clientes de
// correo no entienden flexbox ni hojas externas. Sin imágenes de
// ningún tipo: no hay logo remoto ni píxel de seguimiento, así que no
// se sabe si el alumno ha abierto el correo y no hace falta saberlo.
// ---------------------------------------------------------------

import "server-only";
import { Resend } from "resend";
import { MINUTOS_ENLACE } from "@/lib/sesion";

/**
 * PENDIENTE: hay que verificar el dominio drcacademy.com en Resend y
 * cambiar esto por "DRC Academy <acceso@drcacademy.com>". Mientras siga
 * el remitente de pruebas, Resend SOLO entrega al email del titular de
 * la cuenta: cualquier otro destinatario recibe un 403 y el alumno se
 * queda esperando un correo que no llega.
 *
 * Y el remitente por sí solo no basta: mientras el LMS viva en un
 * vercel.app, el correo saldrá de @drcacademy.com con un enlace a otro
 * dominio, que es el patrón que Gmail y Outlook tratan como sospechoso.
 * Poner el LMS en practica.drcacademy.com es parte del mismo arreglo.
 */
const REMITENTE = "DRC Academy <onboarding@resend.dev>";

const ASUNTO = "Tu acceso a la práctica de DRC Academy";

// Los mismos valores que usa la aplicación (tailwind.config.ts, paleta
// `drc`), para que el correo y la pantalla de acceso se parezcan.
const VERDE = "#037A36";
const TITULAR = "#0E2A19";
const CUERPO = "#5A655E";
const FONDO = "#F4F3EF";
const BORDE = "#E6E3DA";

/**
 * De dónde sale el dominio del enlace.
 *
 * A propósito NO se mira el encabezado `Host` de la petición: se puede
 * falsear, y entonces le mandaríamos al alumno un enlace con su token
 * apuntando al servidor de otro. El origen lo decide el entorno, no
 * quien llama.
 */
function urlBase(): string {
  const explicita = process.env.URL_BASE?.trim();
  if (explicita) return explicita.replace(/\/+$/, "");

  // En producción, el dominio de verdad. En preview, el del propio
  // despliegue, para poder probar el flujo entero sin tocar producción.
  const produccion = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && produccion) return `https://${produccion}`;

  const despliegue = process.env.VERCEL_URL?.trim();
  if (despliegue) return `https://${despliegue}`;

  return "http://localhost:3000";
}

function html(enlace: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${FONDO};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tu enlace para entrar en la práctica. Caduca en ${MINUTOS_ENLACE} minutos.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid ${BORDE};border-radius:20px;">
            <tr>
              <td style="padding:36px 32px;font-family:'Radio Canada',Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${VERDE};">DRC Academy</p>

                <h1 style="margin:14px 0 0;font-size:26px;line-height:1.15;font-weight:600;color:${TITULAR};">Entra en tu práctica</h1>

                <p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:${CUERPO};">
                  Has pedido un enlace para entrar. Pulsa el botón y ya estás dentro: no hay contraseña que recordar.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
                  <tr>
                    <td style="border-radius:999px;background:${VERDE};">
                      <a href="${enlace}" style="display:inline-block;padding:14px 28px;font-family:'Radio Canada',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Entrar en la práctica</a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 0;font-size:14px;line-height:1.55;color:${CUERPO};">
                  El enlace caduca en <strong style="color:${TITULAR};">${MINUTOS_ENLACE} minutos</strong>. Si se te pasa, pide otro sin problema.
                </p>

                <hr style="margin:28px 0 0;border:none;border-top:1px solid ${BORDE};" />

                <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:${CUERPO};">
                  ¿El botón no funciona? Copia esta dirección y pégala en el navegador:
                </p>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.5;word-break:break-all;">
                  <a href="${enlace}" style="color:${VERDE};">${enlace}</a>
                </p>

                <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:${CUERPO};">
                  Si no has pedido tú este enlace, no hagas nada: sin pulsarlo no se abre ninguna sesión.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function texto(enlace: string): string {
  return [
    "DRC Academy · Entra en tu práctica",
    "",
    "Has pedido un enlace para entrar. Abre esta dirección y ya estás dentro:",
    "",
    enlace,
    "",
    `El enlace caduca en ${MINUTOS_ENLACE} minutos. Si se te pasa, pide otro sin problema.`,
    "",
    "Si no has pedido tú este enlace, no hagas nada: sin abrirlo no se abre ninguna sesión.",
  ].join("\n");
}

/**
 * Manda el enlace. Devuelve si salió o no, pero quien llama NO debe
 * usar ese dato para cambiarle la respuesta al visitante: la pantalla
 * de acceso contesta lo mismo pase lo que pase. El booleano es para el
 * log, no para la interfaz.
 */
export async function enviarEnlaceAcceso(email: string, token: string): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.error("[correo] Falta RESEND_API_KEY: no se ha enviado el enlace de acceso.");
    return false;
  }

  const enlace = `${urlBase()}/entrar?token=${encodeURIComponent(token)}`;

  try {
    const { error } = await new Resend(clave).emails.send({
      from: REMITENTE,
      to: email,
      subject: ASUNTO,
      html: html(enlace),
      text: texto(enlace),
    });

    if (error) {
      // Sin el email en el mensaje: los logs de Vercel no son sitio
      // para una lista de direcciones de alumnos.
      console.error(`[correo] Resend rechazó el envío: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[correo] No se pudo hablar con Resend:", error);
    return false;
  }
}
