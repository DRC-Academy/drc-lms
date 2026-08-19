// ---------------------------------------------------------------
// CLIENTE ÚNICO CONTRA LA BASE DE DRC GESTIÓN
//
// Gestión es la plataforma interna: contiene datos sensibles de
// alumnos, profesores y nóminas. El LMS entra con la service role
// key, que salta el RLS, así que este módulo es la única puerta y
// se cierra por tres sitios:
//
//   1. `import "server-only"` rompe el build si alguien importa esto
//      —aunque sea de forma transitiva— desde un componente cliente.
//   2. La clave se lee de SUPABASE_SERVICE_ROLE_KEY, sin NEXT_PUBLIC_.
//      Sin ese prefijo Next nunca la inyecta en el bundle del navegador.
//   3. `soloLectura()` es el único acceso que se exporta y devuelve un
//      cliente restringido a SELECT sobre la lista blanca de abajo.
//
// El LMS NO escribe en Gestión. Gestión hace escrituras al leer y no
// hay locks: un insert/update desde aquí provocaría conflicto.
// ---------------------------------------------------------------

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------
// LO ÚNICO QUE EL LMS PUEDE LEER DE GESTIÓN
//
// Las dos primeras son las vistas del contrato: se hicieron para esto y
// no exponen nada más que lo acordado.
//
// `class_analyses` es una TABLA y entró después, con el bloque único: la
// vista de la última clase da una fila por alumno y no deja ver qué
// arrastra de las anteriores, que es la mitad del material del bloque.
// Se lee con columnas nombradas, nunca con `*`: la tabla guarda el
// transcript entero y no se quiere ni de paso.
//
// Añadir algo a esta lista es ampliar lo que el LMS ve de una base con
// datos de alumnos, profesores y nóminas. Solo con un motivo escrito,
// como este.
// ---------------------------------------------------------------
export const VISTAS = ["vista_perfil_alumno", "vista_ultima_clase", "class_analyses"] as const;
export type Vista = (typeof VISTAS)[number];

let cliente: SupabaseClient | null = null;

/**
 * El cliente se crea la primera vez que se pide, no al importar el módulo.
 * Si validáramos las variables de entorno en el ámbito del módulo, `next build`
 * fallaría al recolectar las rutas en cualquier entorno sin credenciales.
 */
function crearCliente(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    const faltan = [!url && "SUPABASE_URL", !clave && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter(Boolean)
      .join(" y ");
    throw new Error(
      `Falta ${faltan} en el entorno. El LMS lee de DRC Gestión y sin esas variables no hay conexión.`
    );
  }

  cliente = createClient(url, clave, {
    // No hay usuarios ni sesiones: cada petición entra con la service role key
    // y se resuelve en el servidor. Persistir o refrescar sesión no aplica.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "public" },
  });

  return cliente;
}

// ---------------------------------------------------------------
// SUPERFICIE DE LECTURA
//
// Estos tipos están escritos a mano en lugar de dejar que TypeScript
// infiera los del cliente, por dos motivos:
//
//   1. Seguridad: el lector solo expone `select`, así que un insert,
//      update, delete o upsert no compila. La regla de "solo lectura"
//      la comprueba el type-checker y no la vigilancia humana.
//   2. Coste de compilación: los constructores de consulta de PostgREST
//      son genéricos muy profundos. Si su tipo inferido se propaga por
//      el grafo, `incremental: true` lo serializa en cada build y el
//      chequeo agota la memoria de Node a partir de la segunda pasada.
//      Anclando aquí un tipo estrecho, esos genéricos no salen de este
//      módulo.
// ---------------------------------------------------------------

type Resultado<T> = { data: T | null; error: { message: string } | null };

type Consulta = {
  eq(columna: string, valor: string): Consulta;
  ilike(columna: string, patron: string): Consulta;
  /**
   * Condiciones alternativas, en la sintaxis de PostgREST:
   * `"nombre.ilike.\"%ana%\",email.ilike.\"%ana%\""`. Sigue siendo un
   * filtro de lectura —acota el SELECT, no escribe nada—, y evita tener
   * que lanzar una consulta por columna cuando el buscador mira varias.
   */
  or(filtros: string): Consulta;
  /**
   * Negación de un filtro: `not("errors_detected", "is", null)`. Acota el
   * SELECT igual que `eq`; no escribe nada.
   */
  not(columna: string, operador: string, valor: unknown): Consulta;
  order(columna: string, opciones: { ascending: boolean }): Consulta;
  /**
   * Tope de filas. Lo pide la lectura del historial de clases, que es la
   * única que no se recorta sola por tener una fila por alumno.
   */
  limit(cantidad: number): Consulta;
  returns<T>(): PromiseLike<Resultado<T>>;
};

type LectorVista = {
  select(columnas: string): Consulta;
};

/**
 * Devuelve un lector de una de las relaciones de la lista blanca.
 *
 * La conversión pasa por `unknown` a propósito: es el único punto donde
 * se estrecha el cliente de Supabase, está acotada a esta función y no
 * introduce `any` en ningún sitio.
 */
export function soloLectura(vista: Vista): LectorVista {
  return crearCliente().from(vista) as unknown as LectorVista;
}
