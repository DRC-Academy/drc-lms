// ---------------------------------------------------------------
// EL VÍNCULO ENTRE WOOCOMMERCE, GESTIÓN Y EL LMS
//
// El problema que resuelve: hoy el email es la única llave entre los
// tres sitios, y es un dato que el alumno puede cambiar en cualquiera
// de ellos. El día que alguien cambie el email en WooCommerce y no en
// Gestión, el botón deja de encontrarle la ficha.
//
// Con esta tabla, la primera entrada por el botón fija el vínculo:
// `woo_user_id` ↔ `alumno_id`. A partir de ahí se resuelve por id y el
// email deja de importar.
//
// NADA DE AQUÍ PUEDE IMPEDIR ENTRAR. El vínculo es un atajo; si falla,
// se cae al camino de siempre —resolver por email contra Gestión— y el
// alumno entra igual. Por eso todo devuelve null o false en vez de
// lanzar.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";

type FilaVinculo = { alumno_id: string };

/**
 * El alumno vinculado a este usuario de WordPress, o null si es la
 * primera vez que entra por el botón.
 *
 * Cuando devuelve un id nos ahorramos la consulta a Gestión, y sobre
 * todo dejamos de depender de que los dos emails coincidan.
 */
export async function resolverPorWooUserId(wooUserId: number): Promise<string | null> {
  if (!Number.isSafeInteger(wooUserId) || wooUserId <= 0) return null;

  const { data, error } = await baseLms()
    .from("alumno_vinculos")
    .select("alumno_id")
    .eq("woo_user_id", wooUserId)
    .limit(1)
    .returns<FilaVinculo[]>();

  if (error) {
    console.error("[vinculos] No se pudo resolver por woo_user_id:", error.message);
    return null;
  }

  return (data ?? [])[0]?.alumno_id ?? null;
}

/**
 * Guarda o actualiza el vínculo de un alumno.
 *
 * `onConflict: alumno_id` porque la clave primaria es el alumno: si ya
 * tenía fila —por ejemplo con el email de cuando entró por el correo—
 * se le añade ahora el `woo_user_id`.
 *
 * Puede fallar por dos choques de unicidad, y los dos son datos que hay
 * que mirar a mano, no cosas que este código pueda arreglar:
 *
 *   · el email ya está en otra fila → dos fichas en Gestión con el
 *     mismo email, o sea un alumno duplicado;
 *   · el `woo_user_id` ya está en otra fila → una cuenta de WooCommerce
 *     que antes resolvía a otro alumno.
 *
 * En los dos casos se deja constancia en el log y se sigue: el alumno
 * ya está entrando por email, que es lo que hacía antes de existir esta
 * tabla.
 */
export async function guardarVinculo(
  alumnoId: string,
  emailNormalizado: string,
  wooUserId: number | null
): Promise<boolean> {
  if (alumnoId === "" || emailNormalizado === "") return false;

  const fila: Record<string, unknown> = {
    alumno_id: alumnoId,
    email_normalizado: emailNormalizado,
    actualizado_en: new Date().toISOString(),
  };

  // Solo se manda `woo_user_id` cuando lo tenemos. Enviarlo como null
  // borraría el vínculo que se guardó en una entrada anterior.
  if (wooUserId !== null && Number.isSafeInteger(wooUserId) && wooUserId > 0) {
    fila.woo_user_id = wooUserId;
  }

  const { error } = await baseLms()
    .from("alumno_vinculos")
    .upsert(fila, { onConflict: "alumno_id" });

  if (error) {
    console.error("[vinculos] No se pudo guardar el vínculo:", error.message);
    return false;
  }

  return true;
}
