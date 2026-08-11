// ---------------------------------------------------------------
// CLIENTE CONTRA LA BASE PROPIA DEL LMS
//
// No confundir con `lib/supabase-server.ts`: aquel es la puerta a DRC
// Gestión, vive en otro proyecto de Supabase y es de solo lectura sobre
// dos vistas. Este apunta a la base del LMS, que es nuestra, y aquí sí
// se escribe.
//
// La separación es deliberada y conviene mantenerla:
//
//   1. Son dos proyectos distintos, con credenciales distintas. Cruzar
//      la URL de uno con la clave del otro da 401 en cada petición, que
//      es un fallo caro de diagnosticar porque no dice nada del cruce.
//   2. Gestión escribe por su cuenta y sin locks. Que el módulo que
//      permite escrituras sea otro archivo hace difícil escribir allí
//      por accidente.
//
// Igual que en el módulo de Gestión, `import "server-only"` rompe el
// build si esto se importa desde un componente cliente, y la clave se
// lee sin prefijo NEXT_PUBLIC_ para que Next no la inyecte en el
// bundle del navegador.
// ---------------------------------------------------------------

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// ⚠ TEMPORAL — ver lib/diagnostico.ts
import { diag } from "@/lib/diagnostico";

/**
 * ⚠ TEMPORAL — ver lib/diagnostico.ts
 *
 * Ni la URL ni la clave salen en claro. Del host solo se publica el ref
 * enmascarado, que es lo justo para distinguir un proyecto del otro sin
 * dejar la dirección escrita en los logs.
 */
function diagnosticarConexion(url: string, clave: string) {
  let pathname = "(URL ilegible)";
  let ref = "(desconocido)";

  try {
    const u = new URL(url);
    pathname = u.pathname;
    const m = u.hostname.match(/^([a-z0-9]+)\.supabase\./i);
    if (m) ref = `${m[1].slice(0, 4)}***${m[1].slice(-2)}`;
  } catch {
    // Se queda con los valores por defecto de arriba.
  }

  const tipo = /^sb_secret_/.test(clave)
    ? "sb_secret_ (correcta)"
    : /^sb_publishable_/.test(clave)
      ? "sb_publishable_ ← PÚBLICA, RLS la bloqueará"
      : clave.split(".").length === 3
        ? "JWT legacy"
        : "formato desconocido";

  diag("supabase-lms · conexión", {
    ref,
    pathname: JSON.stringify(pathname),
    path_limpio: pathname === "/" ? "sí" : "NO ← la URL lleva path pegado",
    termina_en_barra: url.endsWith("/") ? "sí" : "no",
    clave: tipo,
    clave_longitud: clave.length,
  });
}

let cliente: SupabaseClient | null = null;

/**
 * El cliente se crea la primera vez que se pide, no al importar el módulo.
 * Si validáramos las variables de entorno en el ámbito del módulo, `next build`
 * fallaría al recolectar las rutas en cualquier entorno sin credenciales.
 */
export function baseLms(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.LMS_SUPABASE_URL;
  const clave = process.env.LMS_SUPABASE_SERVICE_KEY;

  if (!url || !clave) {
    const faltan = [!url && "LMS_SUPABASE_URL", !clave && "LMS_SUPABASE_SERVICE_KEY"]
      .filter(Boolean)
      .join(" y ");
    throw new Error(
      `Falta ${faltan} en el entorno. Es la base propia del LMS, distinta de la de Gestión.`
    );
  }

  // ⚠ TEMPORAL — ver lib/diagnostico.ts
  //
  // Se ejecuta una sola vez por instancia, al crear el cliente. Mira las
  // dos cosas que pueden estar mal en Vercel y no en local, sin escribir
  // ni la URL ni la clave:
  //
  //   pathname distinto de "/"  → la URL lleva /rest/v1/ pegado y
  //     supabase-js lo va a duplicar. Toda consulta dará PGRST125.
  //   tipo de clave             → tiene que ser sb_secret_. Si sale
  //     sb_publishable_, RLS se aplica y no hay política ninguna, así
  //     que cualquier escritura se deniega.
  diagnosticarConexion(url, clave);

  cliente = createClient(url, clave, {
    // No hay usuarios ni sesiones de Supabase: la sesión del alumno la
    // gestiona `lib/sesion.ts` con cookies propias, y cada petición entra
    // aquí con la clave de servicio. Persistir o refrescar no aplica.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "public" },
  });

  return cliente;
}
