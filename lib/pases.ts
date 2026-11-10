// ---------------------------------------------------------------
// LOS PASES DE CURSO: LO QUE SE LEE
//
// Tabla `pases_curso` (`supabase/lms-pases.sql`). Quien decide qué puede
// hacer un alumno es `lib/acceso-alumno.ts`; esto solo lee.
//
// EL INTERRUPTOR ES `PASES_ACTIVO=1`, Y POR DEFECTO ESTÁ APAGADO. Apagado,
// nada de esto toca la base: ningún alumno paga una consulta de más, y el
// LMS se comporta exactamente como antes de que esto existiera. Es también
// el freno de emergencia: quien solo tiene pase deja de poder entrar.
//
// SIN CACHÉ ENTRE PETICIONES, a propósito: la caducidad y un reembolso se
// tienen que notar en la petición siguiente. Solo `cache()` de React, que
// vale para una misma petición.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { baseLms } from "@/lib/supabase-lms";
import { pasesActivos } from "@/lib/pase-id";

export { pasesActivos };

type FilaPase = {
  id: string;
  alumno_id: string;
  email_normalizado: string;
  woo_user_id: number | null;
  nombre: string | null;
  estado: string;
  inicio: string;
  acceso_hasta: string;
};

const COLUMNAS = "id, alumno_id, email_normalizado, woo_user_id, nombre, estado, inicio, acceso_hasta";

export type Pase = {
  id: string;
  alumnoId: string;
  email: string;
  nombre: string | null;
  inicio: string;
  hasta: Date;
  vivo: boolean;
  revocado: boolean;
};

function aPase(fila: FilaPase, ahora: number): Pase {
  const hasta = new Date(fila.acceso_hasta);
  const revocado = fila.estado !== "activo";
  return {
    id: fila.id,
    alumnoId: fila.alumno_id,
    email: fila.email_normalizado,
    nombre: fila.nombre,
    inicio: fila.inicio,
    hasta,
    vivo: !revocado && hasta.getTime() > ahora,
    revocado,
  };
}

export type LecturaPases = {
  /** El vivo que llega más lejos, o null. */
  vivo: Pase | null;
  /** El más reciente, vivo o no: de él sale el nombre de quien no tiene ficha. */
  ultimo: Pase | null;
  /** La base no contestó: no se sabe, que no es lo mismo que «no tiene». */
  fallo: boolean;
};

const SIN_PASES: LecturaPases = { vivo: null, ultimo: null, fallo: false };

/** Los pases de un alumno. Nunca lanza. */
export const leerPases = cache(async (alumnoId: string): Promise<LecturaPases> => {
  if (!pasesActivos() || alumnoId === "") return SIN_PASES;

  const { data, error } = await baseLms()
    .from("pases_curso")
    .select(COLUMNAS)
    .eq("alumno_id", alumnoId)
    .order("acceso_hasta", { ascending: false })
    .returns<FilaPase[]>();

  if (error) {
    console.error("[pases] No se pudieron leer los pases:", error.message);
    return { ...SIN_PASES, fallo: true };
  }

  const ahora = Date.now();
  const pases = (data ?? []).map((fila) => aPase(fila, ahora));
  return { vivo: pases.find((p) => p.vivo) ?? null, ultimo: pases[0] ?? null, fallo: false };
});

/**
 * Los pases de una persona, por su email o por su usuario de WordPress: los
 * dos sirven porque el email de facturación puede no ser el de la cuenta.
 * Lanza si la base falla: quien entra por aquí está decidiendo una sesión.
 */
export async function pasesDePersona(email: string, wooUserId: number | null): Promise<Pase[]> {
  if (!pasesActivos()) return [];

  const consulta = baseLms().from("pases_curso").select(COLUMNAS);
  const { data, error } = await (wooUserId
    ? consulta.or(`email_normalizado.eq."${email.replace(/["\\]/g, "")}",woo_user_id.eq.${wooUserId}`)
    : consulta.eq("email_normalizado", email)
  )
    .order("acceso_hasta", { ascending: false })
    .returns<FilaPase[]>();

  if (error) throw new Error(`No se pudieron leer los pases de la persona: ${error.message}`);

  const ahora = Date.now();
  return (data ?? []).map((fila) => aPase(fila, ahora));
}

/** Por qué curso va, o null si no ha elegido. */
export const cursoElegido = cache(async (alumnoId: string): Promise<string | null> => {
  if (!pasesActivos() || alumnoId === "") return null;

  const { data, error } = await baseLms()
    .from("curso_elegido")
    .select("curso_id")
    .eq("alumno_id", alumnoId)
    .limit(1)
    .returns<{ curso_id: string }[]>();

  if (error) {
    console.error("[pases] No se pudo leer el curso elegido:", error.message);
    return null;
  }
  return (data ?? [])[0]?.curso_id ?? null;
});

export async function guardarCursoElegido(alumnoId: string, cursoId: string): Promise<boolean> {
  const { error } = await baseLms()
    .from("curso_elegido")
    .upsert({ alumno_id: alumnoId, curso_id: cursoId, elegido_en: new Date().toISOString() }, { onConflict: "alumno_id" });

  if (error) {
    console.error("[pases] No se pudo guardar el curso elegido:", error.message);
    return false;
  }
  return true;
}
