// ---------------------------------------------------------------
// EL CORREO DE CONTENIDO NUEVO
//
// Segundo envío del LMS, y el primero que no lo pide el alumno. Mismo
// remitente, misma paleta y la misma tabla con estilos en línea que el
// enlace de acceso (`lib/correo.ts`): sin imágenes, sin fuentes
// remotas, sin píxel de seguimiento. No se sabe quién lo abre y no hace
// falta saberlo.
//
// UN CORREO POR ALUMNO, NUNCA POR MÓDULO. Es la corrección de lo que
// hacía LearnDash: 10.446 correos a 519 alumnos, el 67% en ráfagas de
// dos o más en menos de dos minutos, porque mandaba uno por cada módulo
// y el drip abre dos cada siete días. Aquí, si se abren dos módulos —o
// cuatro, con dos cursos—, sale un solo correo con todo dentro.
//
// LOS CRITERIOS DEL COPY, que no se pierden al maquetar:
//
//   · SIN EXAGERACIÓN. Ni «¡Novedades!» ni exclamaciones. El alumno
//     paga una academia, no está en una app de ofertas.
//   · EL DIPLOMA, EN UNA LÍNEA. Es la palanca de retención y aquí entra
//     sin forzar, porque el correo ya habla de avance. Una frase, no un
//     bloque.
//   · LA ÚLTIMA LÍNEA QUITA PRESIÓN a propósito. Un correo semanal que
//     suena a deber acumula culpa, y la culpa hace que se deje de abrir.
//   · NO SE NOMBRA AL PROFESOR. Esto lo abre un calendario, no una
//     clase. Atribuírselo a nadie sería falso.
//   · NO PROMETE PERSONALIZACIÓN. Este contenido es el mismo para todos
//     los de su nivel. Lo personalizado es «Para ti», y mezclarlo
//     diluye la única diferencia que importa.
//
// LLEVA ENLACE DE BAJA aunque sea comunicación de servicio: sin él,
// quien no lo quiera marca el correo como spam, y eso daña la
// reputación de drcacademy.com, que es el dominio del enlace de acceso.
// Va además en las cabeceras `List-Unsubscribe`, que es lo que hace que
// Gmail enseñe su propio botón de baja arriba: el que se pulsa antes de
// pensar en el de spam.
// ---------------------------------------------------------------

import "server-only";
import { Resend } from "resend";
import { BORDE, CUERPO, FONDO, REMITENTE, TITULAR, VERDE } from "@/lib/correo";

export type ModuloAvisado = {
  titulo: string;
  totalLecciones: number;
};

export type SeccionAviso = {
  /** El nombre del curso. Solo se pinta si el alumno tiene dos. */
  curso: string;
  modulos: ModuloAvisado[];
  /** URL absoluta de la primera lección abierta de ese curso. */
  enlace: string;
  /** Lecciones que le faltan para el diploma. 0 = ya lo tiene. */
  restantes: number;
};

export type AvisoApertura = {
  /** Nombre de pila. Vacío si no lo sabemos. */
  nombre: string;
  secciones: SeccionAviso[];
  /** Semana del plan de la apertura más nueva. Va en el asunto. */
  semana: number;
  /** URL absoluta de la pantalla de baja, con su token firmado. */
  enlaceBaja: string;
  /** La misma baja, en la ruta que acepta POST. Para las cabeceras. */
  enlaceBajaDirecto: string;
};

export function asuntoAviso(aviso: AvisoApertura): string {
  return aviso.secciones.length > 1
    ? "Se ha abierto contenido nuevo en tus dos cursos"
    : `Se ha abierto la semana ${aviso.semana} de tu curso`;
}

/** "3 lecciones", "1 lección". */
function lecciones(cuantas: number): string {
  return `${cuantas} ${cuantas === 1 ? "lección" : "lecciones"}`;
}

/** «Te faltan 12 lecciones», «Te falta 1 lección». */
function lineaDiploma(restantes: number): string {
  return `Te ${restantes === 1 ? "falta" : "faltan"} ${lecciones(restantes)} para tu diploma.`;
}

function saludo(nombre: string): string {
  return nombre.trim() === "" ? "Hola," : `Hola ${nombre.trim()},`;
}

function entradilla(aviso: AvisoApertura): string {
  return aviso.secciones.length > 1
    ? "Se acaba de abrir contenido nuevo en tus dos cursos. Ya lo tienes disponible:"
    : "Se acaba de abrir contenido nuevo en tu curso. Ya lo tienes disponible:";
}

function seccionHtml(seccion: SeccionAviso, conNombreDeCurso: boolean): string {
  const titulo = conNombreDeCurso
    ? `<p style="margin:28px 0 0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${VERDE};">${seccion.curso}</p>`
    : "";

  const modulos = seccion.modulos
    .map(
      (modulo) => `
                <p style="margin:18px 0 0;font-size:17px;line-height:1.35;font-weight:600;color:${TITULAR};">${modulo.titulo}</p>
                <p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:${CUERPO};">${lecciones(modulo.totalLecciones)}</p>`
    )
    .join("");

  const diploma =
    seccion.restantes > 0
      ? `
                <p style="margin:20px 0 0;font-size:14px;line-height:1.55;color:${CUERPO};">${lineaDiploma(seccion.restantes)}</p>`
      : "";

  return `${titulo}${modulos}

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                  <tr>
                    <td style="border-radius:999px;background:${VERDE};">
                      <a href="${seccion.enlace}" style="display:inline-block;padding:14px 28px;font-family:'Radio Canada',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Empezar la lección</a>
                    </td>
                  </tr>
                </table>${diploma}`;
}

export function htmlAviso(aviso: AvisoApertura): string {
  const conNombreDeCurso = aviso.secciones.length > 1;
  const secciones = aviso.secciones.map((s) => seccionHtml(s, conNombreDeCurso)).join("");

  const enlacesPlanos = aviso.secciones
    .map(
      (seccion) => `
                <p style="margin:8px 0 0;font-size:13px;line-height:1.5;word-break:break-all;">
                  <a href="${seccion.enlace}" style="color:${VERDE};">${seccion.enlace}</a>
                </p>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${FONDO};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Ya tienes disponible contenido nuevo de tu curso.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid ${BORDE};border-radius:20px;">
            <tr>
              <td style="padding:36px 32px;font-family:'Radio Canada',Helvetica,Arial,sans-serif;">
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${VERDE};">DRC Academy</p>

                <p style="margin:20px 0 0;font-size:16px;line-height:1.55;color:${CUERPO};">${saludo(aviso.nombre)}</p>

                <p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:${CUERPO};">${entradilla(aviso)}</p>
${secciones}

                <hr style="margin:28px 0 0;border:none;border-top:1px solid ${BORDE};" />

                <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:${CUERPO};">
                  Si ahora no puedes, no pasa nada: el contenido se queda ahí y lo retomas cuando te venga bien.
                </p>

                <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:${CUERPO};">
                  ¿El botón no funciona? Copia esta dirección y pégala en el navegador:
                </p>${enlacesPlanos}

                <p style="margin:24px 0 0;font-size:12px;line-height:1.55;color:#8B958E;">
                  Recibes este correo porque estás matriculado en DRC Academy.
                  <a href="${aviso.enlaceBaja}" style="color:#8B958E;">Dejar de recibir avisos de contenido nuevo</a>
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

export function textoAviso(aviso: AvisoApertura): string {
  const conNombreDeCurso = aviso.secciones.length > 1;

  const bloques = aviso.secciones.flatMap((seccion) => {
    const lineas: string[] = [];
    if (conNombreDeCurso) lineas.push("", seccion.curso.toUpperCase());
    for (const modulo of seccion.modulos) {
      lineas.push("", modulo.titulo, lecciones(modulo.totalLecciones));
    }
    lineas.push("", `Empezar la lección: ${seccion.enlace}`);
    if (seccion.restantes > 0) lineas.push("", lineaDiploma(seccion.restantes));
    return lineas;
  });

  return [
    "DRC Academy",
    "",
    saludo(aviso.nombre),
    "",
    entradilla(aviso),
    ...bloques,
    "",
    "Si ahora no puedes, no pasa nada: el contenido se queda ahí y lo retomas cuando te venga bien.",
    "",
    "Recibes este correo porque estás matriculado en DRC Academy.",
    `Dejar de recibir avisos de contenido nuevo: ${aviso.enlaceBaja}`,
  ].join("\n");
}

export type ResultadoEnvio = { ok: boolean; id: string | null };

/**
 * Manda un aviso. Devuelve el id de Resend para poder guardarlo junto a
 * la fila y rastrear después un correo concreto en su panel.
 *
 * No lanza: un fallo aquí es un aviso que se reintentará mañana, no una
 * ejecución rota. Quien llama suelta la reserva y sigue con el resto de
 * los alumnos.
 */
export async function enviarAviso(email: string, aviso: AvisoApertura): Promise<ResultadoEnvio> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.error("[avisos] Falta RESEND_API_KEY: no se ha enviado ningún aviso.");
    return { ok: false, id: null };
  }

  try {
    const { data, error } = await new Resend(clave).emails.send({
      from: REMITENTE,
      to: email,
      subject: asuntoAviso(aviso),
      html: htmlAviso(aviso),
      text: textoAviso(aviso),
      headers: {
        // Lo que hace que Gmail y Outlook enseñen su propio botón de
        // baja. `One-Click` exige que la URL acepte POST sin más: la
        // sirve `app/api/avisos/baja/route.ts`.
        "List-Unsubscribe": `<${aviso.enlaceBajaDirecto}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      // Sin la dirección en el mensaje: los logs de Vercel no son sitio
      // para una lista de correos de alumnos.
      console.error(`[avisos] Resend rechazó el envío: ${error.message}`);
      return { ok: false, id: null };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[avisos] No se pudo hablar con Resend:", error);
    return { ok: false, id: null };
  }
}
