// ---------------------------------------------------------------
// EL CORREO DE ACCESO DEL BLACK PASS
//
// SIN ENLACE DE ENTRADA, y es lo que lo distingue del magic link: ese caduca
// en 15 minutos y este correo se abre cuando se abre. Lleva a la pantalla
// donde se pide el enlace, igual que la invitación del profesor. Siempre en
// español de España, como el resto de correos del LMS.
//
// Mismo aspecto que los demás correos (`lib/correo.ts`): tabla, estilos en
// línea y sin imágenes. Sin enlace de baja: es un correo de servicio, único,
// sobre algo que la persona acaba de comprar.
// ---------------------------------------------------------------

import "server-only";
import { BORDE, CUERPO, FONDO, REMITENTE, TITULAR, VERDE } from "@/lib/correo";
import { urlPublica } from "@/lib/url-publica";
import { MIS_CURSOS_WOO } from "@/lib/cuenta-woo";

const ASUNTO = "Ya tienes tu Black Pass: así entras";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const FECHA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });

function primerNombre(nombre: string | null): string {
  return nombre?.trim().split(/\s+/)[0] ?? "";
}

/** Lanza si `URL_BASE` no vale: la cola lo reintenta en vez de mandar un enlace roto. */
export function correoAccesoBlackPass({ nombre, hasta }: { nombre: string | null; hasta: Date }) {
  const entrar = `${urlPublica()}/acceso`;
  const fecha = FECHA.format(hasta);
  const quien = primerNombre(nombre);
  const titular = quien ? `Hola, ${quien}: ya tienes tu Black Pass` : "Ya tienes tu Black Pass";

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${FONDO};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Todos los niveles de Mi curso, abiertos desde hoy. Así entras.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid ${BORDE};border-radius:20px;">
            <tr>
              <td style="padding:36px 32px;font-family:'Radio Canada',Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${VERDE};">DRC Academy</p>
                <h1 style="margin:14px 0 0;font-size:26px;line-height:1.15;font-weight:600;color:${TITULAR};">${escapar(titular)}</h1>
                <p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:${CUERPO};">
                  Gracias por tu compra. Tienes abiertos todos los niveles de Mi curso, con su teoría, sus ejercicios y los vídeos de nuestros profesores, hasta el <strong style="color:${TITULAR};">${fecha}</strong>.
                </p>
                <p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:${CUERPO};">
                  Para entrar no necesitas contraseña: escribe este mismo email en la plataforma y te enviaremos un enlace.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
                  <tr>
                    <td style="border-radius:999px;background:${VERDE};">
                      <a href="${entrar}" style="display:inline-block;padding:14px 28px;font-family:'Radio Canada',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Entrar en mi curso</a>
                    </td>
                  </tr>
                </table>
                <hr style="margin:28px 0 0;border:none;border-top:1px solid ${BORDE};" />
                <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:${CUERPO};">
                  También puedes entrar desde <a href="${MIS_CURSOS_WOO}" style="color:${VERDE};">Mi cuenta en drcacademy.com</a>, con tu usuario de la web.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `DRC Academy · ${titular}`,
    "",
    `Gracias por tu compra. Tienes abiertos todos los niveles de Mi curso, con su teoría, sus ejercicios y los vídeos de nuestros profesores, hasta el ${fecha}.`,
    "",
    `Para entrar no necesitas contraseña: abre ${entrar}, escribe este mismo email y te enviaremos un enlace.`,
    "",
    `También puedes entrar desde Mi cuenta en drcacademy.com, con tu usuario de la web: ${MIS_CURSOS_WOO}`,
  ].join("\n");

  return { from: REMITENTE, subject: ASUNTO, html, text };
}
