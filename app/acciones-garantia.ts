"use server";

// ---------------------------------------------------------------
// CORREGIR LA GARANTÍA A MANO
//
// Las dos acciones del detalle de `/garantia`. Mismos tres cierres que
// las de accesos (`app/acciones-accesos.ts`):
//
//   1. `exigirAdministrador()` abre las dos: una acción de servidor es
//      una ruta más.
//   2. Quién corrige sale de la COOKIE, nunca del formulario.
//   3. La nota es obligatoria: una corrección sin motivo es ilegible
//      dentro de seis meses, y la tabla tampoco la acepta.
//
// Son formularios normales (sin JavaScript): al terminar se vuelve al
// detalle del alumno con `?hecho=` o `?error=`.
// ---------------------------------------------------------------

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { corregir, quitarCorreccion, LARGO_MAXIMO_NOTA } from "@/lib/garantia-servidor";
import type { Estado } from "@/lib/garantia";

const ESTADOS: readonly Estado[] = ["en_curso", "perdida", "cumplida", "sin_datos"];

function volver(alumnoId: string, resultado: { hecho?: string; error?: string }): never {
  const p = new URLSearchParams({ alumno: alumnoId });
  if (resultado.hecho) p.set("hecho", resultado.hecho);
  if (resultado.error) p.set("error", resultado.error);
  redirect(`/garantia?${p.toString()}`);
}

function leer(datos: FormData): { alumnoId: string; nota: string } {
  const alumnoId = String(datos.get("alumno") ?? "").trim();
  const nota = String(datos.get("nota") ?? "").trim().slice(0, LARGO_MAXIMO_NOTA);
  return { alumnoId, nota };
}

export async function corregirGarantia(datos: FormData): Promise<void> {
  const sesion = await exigirAdministrador();
  const { alumnoId, nota } = leer(datos);
  const estado = String(datos.get("estado") ?? "") as Estado;

  if (!alumnoId) redirect("/garantia");
  if (!ESTADOS.includes(estado)) volver(alumnoId, { error: "estado" });
  if (nota === "") volver(alumnoId, { error: "nota" });

  const ok = await corregir(alumnoId, estado, nota, sesion.email);
  revalidatePath("/garantia");
  volver(alumnoId, ok ? { hecho: "corregido" } : { error: "guardar" });
}

export async function quitarCorreccionGarantia(datos: FormData): Promise<void> {
  const sesion = await exigirAdministrador();
  const { alumnoId, nota } = leer(datos);

  if (!alumnoId) redirect("/garantia");
  if (nota === "") volver(alumnoId, { error: "nota" });

  const ok = await quitarCorreccion(alumnoId, nota, sesion.email);
  revalidatePath("/garantia");
  volver(alumnoId, ok ? { hecho: "automatico" } : { error: "guardar" });
}
