"use server";

// ---------------------------------------------------------------
// REFRESCAR EL PANEL
//
// Los datos se cachean cinco minutos, que está bien para mirar de vez
// en cuando y mal el día del lanzamiento, cuando uno quiere ver si la
// última tanda de invitaciones ha entrado. Esto tira ese caché.
//
// Es una acción de servidor y no un enlace con parámetro porque
// `revalidateTag` solo existe en el servidor, y porque un parámetro en
// la URL se quedaría pegado al recargar.
// ---------------------------------------------------------------

import { revalidatePath, revalidateTag } from "next/cache";
import { exigirAdministrador } from "@/lib/sesion-servidor";

export async function refrescarPanel(): Promise<void> {
  // El guard también aquí: una acción de servidor es una ruta más, y
  // sin esto cualquiera con sesión podría invalidar el caché a ritmo.
  await exigirAdministrador();

  revalidateTag("panel-admin");
  revalidatePath("/");
}
