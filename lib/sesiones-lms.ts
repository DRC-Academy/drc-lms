// ---------------------------------------------------------------
// SESIONES REVOCABLES
//
// Hasta ahora la cookie era autocontenida y no se podía revocar antes
// de que caducara; quedaba anotado como pendiente en la cabecera de
// `lib/sesion.ts`. Ahora cada sesión tiene fila en `sesiones` y revocar
// es marcar `revocada_en`.
//
// DÓNDE SE COMPRUEBA, Y POR QUÉ NO EN EL MIDDLEWARE
//
// El middleware corre en el runtime Edge, que es también el motivo por
// el que `lib/sesion.ts` no lleva `server-only`. Consultar la base allí
// significaría un viaje de red antes de CADA navegación, porque el
// matcher cubre casi todo el sitio.
//
// Así que se reparte como ya estaba repartida la autorización, y como
// lo describe la cabecera de `lib/sesion-servidor.ts`: el middleware es
// la puerta de la calle —firma y caducidad, sin base— y la revocación
// se comprueba en los guards, que corren en Node y una vez por página.
//
// EL MEMO
//
// Sin él, cada página serían dos consultas (Gestión y esta). Se cachea
// el resultado 60 segundos por id de sesión, en memoria de la instancia.
// El precio, dicho claro: revocar tarda hasta un minuto en notarse en
// las instancias que ya habían preguntado. Para el cierre de sesión no
// aplica —ver `revocarSesion`—, y para echar a alguien a la fuerza un
// minuto es tolerable.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { baseLms } from "@/lib/supabase-lms";
import type { Rol } from "@/lib/sesion";
// ⚠ TEMPORAL — ver lib/diagnostico.ts
import { diag } from "@/lib/diagnostico";

export type OrigenSesion = "magic_link" | "woocommerce";

/** Lo que dura el memo de «esta sesión sigue viva». */
const MS_MEMO = 60 * 1000;

/**
 * Cada cuánto se refresca `ultimo_uso_en`. Sin este freno sería una
 * escritura por petición, que es exactamente lo que no queremos.
 */
const MS_TOCAR = 5 * 60 * 1000;

/**
 * Tope del memo. Es una instancia serverless y no un servidor de larga
 * vida, pero un mapa sin límite es un fallo esperando una campaña de
 * tráfico. Al llegar al tope se vacía entero: reconstruirlo cuesta una
 * consulta por sesión activa y no hay nada que preservar.
 */
const TOPE_MEMO = 5000;

type EntradaMemo = { viva: boolean; comprobadoEn: number; tocadoEn: number };

const memo = new Map<string, EntradaMemo>();

/**
 * El id viene de una cookie firmada, así que es de fiar. Se comprueba
 * la forma igual, porque una cadena que no sea uuid hace que Postgres
 * devuelva un error de sintaxis (22P02) y llenaría el log de ruido que
 * parece un fallo de conexión.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FilaSesion = { id: string; revocada_en: string | null; expira_en: string };

// ---------------------------------------------------------------
// CREAR
// ---------------------------------------------------------------

/**
 * Abre la sesión en la base y devuelve su id, o null si no se pudo.
 *
 * Que devuelva null tiene que impedir la entrada: la cookie llevaría un
 * id sin fila detrás y el primer guard la rechazaría, así que el alumno
 * entraría para que lo echaran en la página siguiente. Mejor decirlo en
 * la puerta.
 */
export async function crearSesion(datos: {
  rol: Rol;
  alumnoId: string | null;
  emailAdmin: string | null;
  origen: OrigenSesion;
  expiraEn: Date;
}): Promise<string | null> {
  const { data, error } = await baseLms()
    .from("sesiones")
    .insert({
      rol: datos.rol,
      alumno_id: datos.alumnoId,
      email_admin: datos.emailAdmin,
      origen: datos.origen,
      expira_en: datos.expiraEn.toISOString(),
    })
    .select("id")
    .limit(1)
    .returns<{ id: string }[]>();

  if (error) {
    console.error("[sesiones] No se pudo abrir la sesión:", error.message);
    // ⚠ TEMPORAL — ver lib/diagnostico.ts
    //
    // `message` por sí solo no distingue las causas, y son muy
    // distintas. Los códigos que importan aquí:
    //
    //   PGRST125 — ruta inválida: LMS_SUPABASE_URL lleva /rest/v1/ y se
    //              está duplicando. Es el fallo que ya nos pasó una vez.
    //   PGRST205 — la tabla no existe: el esquema se creó en otro
    //              proyecto, o la URL apunta al proyecto viejo.
    //   401      — la clave no es de este proyecto, o no es la secreta.
    //   42501    — RLS denegando: la clave no actúa como service_role,
    //              o sea que se pegó la publishable en vez de la secret.
    //   23514    — violación de CHECK: sería un fallo del código, no del
    //              entorno. Sale también `details` con la restricción.
    diag("sesiones · insert RECHAZADO", {
      code: error.code ?? "(sin código)",
      details: error.details ?? "(sin detalles)",
      hint: error.hint ?? "(sin pista)",
      rol: datos.rol,
      alumno_id: datos.alumnoId === null ? "null" : "presente",
      email_admin: datos.emailAdmin === null ? "null" : "presente",
    });
    return null;
  }

  const id = (data ?? [])[0]?.id ?? null;
  if (id) memo.set(id, { viva: true, comprobadoEn: Date.now(), tocadoEn: Date.now() });
  return id;
}

// ---------------------------------------------------------------
// COMPROBAR
// ---------------------------------------------------------------

async function consultarViva(id: string): Promise<boolean> {
  const { data, error } = await baseLms()
    .from("sesiones")
    .select("id, revocada_en, expira_en")
    .eq("id", id)
    .limit(1)
    .returns<FilaSesion[]>();

  if (error) {
    // FALLO ABIERTO, y es una decisión, no un descuido: si la base no
    // responde, la firma de la cookie sigue siendo válida y lo único
    // que no podemos comprobar es la revocación, que es una capacidad
    // que hasta hoy no existía. Cerrar aquí dejaría a los 184 alumnos
    // fuera por un mal minuto de Supabase.
    //
    // Si algún día se revoca una sesión por un incidente real, hay que
    // cambiar esto a `false` y asumir el coste.
    console.error("[sesiones] No se pudo comprobar la sesión, se deja pasar:", error.message);
    return true;
  }

  const fila = (data ?? [])[0];

  // Sin fila no hay sesión. Aquí sí se cierra: la consulta funcionó y
  // la respuesta es que esa sesión no existe. Es el caso de las cookies
  // emitidas antes de este cambio.
  if (!fila) return false;
  if (fila.revocada_en !== null) return false;

  return Date.parse(fila.expira_en) > Date.now();
}

async function tocarUltimoUso(id: string) {
  const { error } = await baseLms()
    .from("sesiones")
    .update({ ultimo_uso_en: new Date().toISOString() })
    .eq("id", id);

  // Es telemetría: que falle no cambia nada para quien está navegando.
  if (error) console.error("[sesiones] No se pudo refrescar ultimo_uso_en:", error.message);
}

/**
 * ¿Sigue viva esta sesión?
 *
 * Va envuelto en `cache()` de React, que deduplica dentro de una misma
 * petición: `exigirAccesoAFicha` llama a `exigirSesion`, que llama a
 * `sesionActual`, y una página puede pedir el guard más de una vez. Sin
 * esto serían varias consultas para responder lo mismo.
 */
export const sesionViva = cache(async (id: string): Promise<boolean> => {
  if (!UUID.test(id)) return false;

  const ahora = Date.now();
  const entrada = memo.get(id);

  if (entrada && ahora - entrada.comprobadoEn < MS_MEMO) {
    if (entrada.viva && ahora - entrada.tocadoEn > MS_TOCAR) {
      entrada.tocadoEn = ahora;
      await tocarUltimoUso(id);
    }
    return entrada.viva;
  }

  const viva = await consultarViva(id);

  if (memo.size >= TOPE_MEMO) memo.clear();
  memo.set(id, { viva, comprobadoEn: ahora, tocadoEn: entrada?.tocadoEn ?? 0 });

  if (viva) {
    const tocado = entrada?.tocadoEn ?? 0;
    if (ahora - tocado > MS_TOCAR) {
      const guardada = memo.get(id);
      if (guardada) guardada.tocadoEn = ahora;
      await tocarUltimoUso(id);
    }
  }

  return viva;
});

// ---------------------------------------------------------------
// REVOCAR
// ---------------------------------------------------------------

/**
 * Cierra una sesión.
 *
 * El memo se invalida en el acto, así que para quien pulsa «Salir» el
 * cierre es inmediato en esta instancia. Y sobre todo: la ruta de
 * salida borra además la cookie, de modo que ese navegador ya no tiene
 * nada que presentar, independientemente de lo que crea cualquier memo.
 *
 * El minuto de margen solo afecta a alguien que hubiera copiado el
 * valor de la cookie a otro sitio antes de salir.
 */
export async function revocarSesion(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;

  // Antes de la consulta, no después: si la escritura falla, lo que
  // queremos es que esta instancia siga dando la sesión por muerta.
  memo.set(id, { viva: false, comprobadoEn: Date.now(), tocadoEn: Date.now() });

  const { error } = await baseLms()
    .from("sesiones")
    .update({ revocada_en: new Date().toISOString() })
    .eq("id", id)
    .is("revocada_en", null);

  if (error) {
    console.error("[sesiones] No se pudo revocar la sesión:", error.message);
    return false;
  }

  return true;
}
