// ---------------------------------------------------------------
// DESDE DÓNDE Y CON QUÉ SE CONECTA EL ALUMNO
//
// IP y navegador de cada entrada a clase, sesión, visita e intento de
// acceso. Son la prueba del servicio prestado si un pago acaba en una
// disputa de Stripe.
//
// ESTE ES EL ÚNICO SITIO QUE LEE ESAS CABECERAS. Quien necesite la IP o
// el user agent llama aquí; nadie lee `x-forwarded-for` por su cuenta.
//
// NUNCA BLOQUEA. Guardarlos es secundario a entrar: si las columnas no
// existen todavía (antes de `supabase/lms-ip-user-agent.sql`) o la
// inserción con ellas falla, `conColumnasCliente` repite sin ellas.
// ---------------------------------------------------------------

import "server-only";
import { headers } from "next/headers";

export type ClienteRequest = { ip: string | null; userAgent: string | null };

const SIN_CLIENTE: ClienteRequest = { ip: null, userAgent: null };

/** Lo que se guarda del user agent, como mucho. */
const TOPE_USER_AGENT = 500;

type Cabeceras = { get(nombre: string): string | null };

function valor(cabeceras: Cabeceras, nombre: string): string | null {
  const v = cabeceras.get(nombre)?.trim();
  return v ? v : null;
}

/**
 * La IP y el user agent de una petición. La IP, por este orden:
 * `x-real-ip` y el primer valor de `x-forwarded-for` (el cliente; los
 * siguientes son proxies). Las dos las sobrescribe Vercel con la IP
 * real. `cf-connecting-ip` NO: la web no tiene Cloudflare delante y esa
 * cabecera la puede mandar cualquiera con la IP que quiera.
 */
export function clienteDeRequest(cabeceras: Cabeceras): ClienteRequest {
  try {
    const reenviada = valor(cabeceras, "x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ip = valor(cabeceras, "x-real-ip") ?? reenviada;
    const userAgent = valor(cabeceras, "user-agent")?.slice(0, TOPE_USER_AGENT) ?? null;
    return { ip, userAgent };
  } catch {
    return SIN_CLIENTE;
  }
}

/**
 * Lo mismo, con las cabeceras de la petición en curso. Para el código
 * que no recibe la petición (acciones de servidor, guards). Fuera de una
 * petición —tests, scripts— devuelve los dos a null.
 */
export function clienteActual(): ClienteRequest {
  try {
    return clienteDeRequest(headers());
  } catch {
    return SIN_CLIENTE;
  }
}

type ColumnasCliente = { ip?: string; user_agent?: string };

/** Solo las que tienen valor: las dos columnas son null por defecto. */
function columnasCliente(cliente: ClienteRequest | undefined): ColumnasCliente {
  return {
    ...(cliente?.ip ? { ip: cliente.ip } : {}),
    ...(cliente?.userAgent ? { user_agent: cliente.userAgent } : {}),
  };
}

/**
 * Inserta con `ip` y `user_agent` añadidos a la fila y, si falla,
 * repite sin ellos: guardarlos nunca puede costar la inserción. Es lo
 * que pasa mientras las columnas no existan en la base (PostgREST
 * contesta PGRST204), y por eso aquí no se distingue el motivo.
 *
 * `insertar` recibe las columnas que tiene que añadir a la fila.
 */
export async function conColumnasCliente<R extends { error: { message: string } | null }>(
  cliente: ClienteRequest | undefined,
  insertar: (extra: ColumnasCliente) => PromiseLike<R>
): Promise<R> {
  const extra = columnasCliente(cliente);
  if (Object.keys(extra).length === 0) return insertar({});

  const conCliente = await insertar(extra);
  if (!conCliente.error) return conCliente;

  console.warn("[cliente] Se inserta sin ip ni user_agent:", conCliente.error.message);
  return insertar({});
}
