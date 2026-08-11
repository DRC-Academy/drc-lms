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

  cliente = createClient(url, clave, {
    // No hay usuarios ni sesiones de Supabase: la sesión del alumno la
    // gestiona `lib/sesion.ts` con cookies propias, y cada petición entra
    // aquí con la clave de servicio. Persistir o refrescar no aplica.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "public" },
  });

  return cliente;
}
