// ---------------------------------------------------------------
// ⚠ TEMPORAL — BORRAR CUANDO SE RESUELVA LO DE /acceso
//
// Instrumentación del flujo de "pedir un enlace", que no llega a
// enviarse. Todo lo de aquí sale por `console.info` con el prefijo
// `[diag]`, así que en los logs de Vercel se filtra escribiendo eso.
//
// PARA BORRARLO: `grep -rn "\[diag\]\|@/lib/diagnostico" lib app` y
// quitar lo que salga, más este archivo.
//
// QUÉ NO SE ESCRIBE NUNCA, aunque sea un log temporal:
//
//   · emails completos — los logs de Vercel no son sitio para una lista
//     de direcciones de alumnos, y este flujo pasa por todas;
//   · el token del enlace — quien lo lea entra como esa persona;
//   · RESEND_API_KEY ni ninguna otra clave — solo su longitud y las dos
//     primeras letras, que es lo que hace falta para saber si está
//     puesta y si es del tipo correcto.
// ---------------------------------------------------------------

import "server-only";

/**
 * `facu@drcacademy.com` → `f***@drcacademy.com`.
 *
 * Se conserva el dominio entero a propósito: es lo que permite ver de un
 * vistazo si el que escribe es del equipo o de fuera, y un dominio no
 * identifica a nadie. Lo que se tapa es la persona.
 */
export function ofuscarEmail(valor: string): string {
  const arroba = valor.indexOf("@");
  if (arroba <= 0) return valor === "" ? "(vacío)" : "(sin arroba)";
  return `${valor[0]}***${valor.slice(arroba)}`;
}

/** Una clave, reducida a lo que se puede decir de ella sin decirla. */
export function describirClave(valor: string | undefined): string {
  if (valor === undefined) return "NO DEFINIDA";
  if (valor.trim() === "") return "definida pero VACÍA";
  return `definida · ${valor.length} caracteres · empieza por "${valor.slice(0, 3)}"`;
}

/** `[diag] paso · clave=valor · clave=valor` */
export function diag(paso: string, datos: Record<string, unknown> = {}) {
  const partes = Object.entries(datos).map(([clave, valor]) => `${clave}=${String(valor)}`);
  console.info(`[diag] ${paso}${partes.length ? " · " + partes.join(" · ") : ""}`);
}

/**
 * Radiografía de EMAILS_ADMIN sin publicar la lista.
 *
 * Busca en concreto las dos formas en que esta variable falla en
 * silencio, las dos avisadas en `.env.example`:
 *
 *   · comillas — en local, dotenv se las come; en el panel de Vercel
 *     pasan a formar parte del valor, así que `"facu@drcacademy.com"`
 *     nunca va a coincidir con `facu@drcacademy.com`;
 *   · espacios o mayúsculas — `esAdministrador` compara contra el email
 *     ya normalizado, así que cualquiera de las dos rompe la igualdad.
 *
 * `normalizarEmail` se pasa como argumento en vez de importarlo para no
 * crear una dependencia desde este archivo temporal hacia `lib/sesion`.
 */
export function radiografiaEmailsAdmin(
  bruto: string | undefined,
  normalizar: (valor: unknown) => string
): Record<string, unknown> {
  if (bruto === undefined) return { definida: "NO" };

  const crudas = bruto.split(",");
  const entradas = crudas.map((entrada) => entrada.trim()).filter((entrada) => entrada !== "");

  return {
    definida: "sí",
    longitud: bruto.length,
    entradas: entradas.length,
    // Cada uno de estos, si no es 0, es la causa.
    con_comillas: entradas.filter((entrada) => /^["']|["']$/.test(entrada)).length,
    con_espacio_interno: entradas.filter((entrada) => /\s/.test(entrada)).length,
    con_mayusculas: entradas.filter((entrada) => entrada !== entrada.toLowerCase()).length,
    // Cuántas sobreviven a la normalización tal cual se escribieron. Si
    // este número es menor que `entradas`, alguna no va a coincidir nunca.
    normalizan_igual: entradas.filter((entrada) => normalizar(entrada) === entrada).length,
    dominios: entradas
      .map((entrada) => entrada.slice(entrada.indexOf("@")))
      .join("|") || "(ninguno)",
  };
}
