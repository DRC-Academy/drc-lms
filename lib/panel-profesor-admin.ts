// ---------------------------------------------------------------
// LA PESTAÑA «ACCESO PROFESORES»
//
// Lo que hay detrás de `app/acciones-profesores.ts`. El permiso lo pone la
// acción con `exigirAdministrador()`; quién hace cada cosa llega de su
// cookie. Se escribe con `baseLms()`: de Gestión solo se lee.
//
// EL EMAIL SIEMPRE SE LEE DE GESTIÓN EN EL MOMENTO de activar o aprobar,
// nunca del navegador: lo que se aprueba es lo que dice Gestión ahora.
// ---------------------------------------------------------------

import "server-only";
import { contarAlumnosPorProfesor, leerProfesorDeGestion, leerProfesoresDeGestion } from "@/lib/gestion";
import { enviarInvitacionProfesor } from "@/lib/correo";
import { esEmailPlausible } from "@/lib/sesion";
import { revocarSesionesDeProfesor } from "@/lib/sesiones-lms";
import { baseLms } from "@/lib/supabase-lms";
import { nombreVisibleProfesor } from "@/lib/profesor";
import { filasDeLaPestana, situacionDelProfesor, type FilaPestana } from "@/lib/panel-profesor-reglas";

export type Resultado = { ok: boolean; error?: string };

const NO_LEIDO: Resultado = { ok: false, error: "No se ha podido leer a este profesor en Gestión. Vuelve a intentarlo." };

/** La violación del índice único: otro profesor activo con esa dirección. */
const EMAIL_EN_USO = "23505";

type FilaAcceso = {
  teacher_id: string;
  email_normalizado: string;
  activo: boolean;
  invitado_en: string | null;
};

/** Las filas de la pestaña, o null si no se pudo leer algo. */
export async function cargarPestanaProfesores(): Promise<FilaPestana[] | null> {
  try {
    const [profesores, alumnos, accesos] = await Promise.all([
      leerProfesoresDeGestion(),
      contarAlumnosPorProfesor(),
      baseLms()
        .from("profesores_acceso")
        .select("teacher_id, email_normalizado, activo, invitado_en")
        .returns<FilaAcceso[]>(),
    ]);
    if (accesos.error) throw new Error(accesos.error.message);

    const porProfesor = new Map(
      (accesos.data ?? []).map((a) => [
        a.teacher_id,
        { emailNormalizado: a.email_normalizado, activo: a.activo, invitadoEn: a.invitado_en },
      ])
    );
    return filasDeLaPestana(profesores, porProfesor, alumnos);
  } catch (error) {
    console.error("[panel-profesor] No se pudo cargar la pestaña:", error);
    return null;
  }
}

/** Da acceso y guarda la copia del email que dice Gestión ahora mismo. */
export async function activarAcceso(teacherId: string, por: string): Promise<Resultado> {
  let gestion;
  try {
    gestion = await leerProfesorDeGestion(teacherId);
  } catch {
    return NO_LEIDO;
  }
  if (!gestion) return { ok: false, error: "Este profesor no existe en Gestión." };
  if (gestion.archivado) return { ok: false, error: "Este profesor está archivado en Gestión." };
  if (!esEmailPlausible(gestion.email)) return { ok: false, error: "Este profesor no tiene un email válido en Gestión." };

  const { error } = await baseLms()
    .from("profesores_acceso")
    .upsert(
      {
        teacher_id: teacherId,
        email_normalizado: gestion.email,
        activo: true,
        activado_en: new Date().toISOString(),
        activado_por: por,
      },
      { onConflict: "teacher_id" }
    );

  if (error) {
    if (error.code === EMAIL_EN_USO) return { ok: false, error: "Otro profesor activo ya entra con este email." };
    console.error("[panel-profesor] No se pudo activar:", error.message);
    return { ok: false, error: "No se ha podido guardar. Vuelve a intentarlo." };
  }
  return { ok: true };
}

/**
 * Quita el acceso y cierra sus sesiones. Primero el acceso: desde ese
 * momento el guard ya le niega la entrada, aunque revocar fallara.
 */
export async function desactivarAcceso(teacherId: string, por: string): Promise<Resultado> {
  const { error } = await baseLms()
    .from("profesores_acceso")
    .update({ activo: false, desactivado_en: new Date().toISOString(), desactivado_por: por })
    .eq("teacher_id", teacherId);

  if (error) {
    console.error("[panel-profesor] No se pudo desactivar:", error.message);
    return { ok: false, error: "No se ha podido desactivar. Sigue teniendo acceso: vuelve a intentarlo." };
  }

  if (!(await revocarSesionesDeProfesor(teacherId))) {
    return { ok: false, error: "Ya no puede entrar, pero no se han podido cerrar sus sesiones. Vuelve a pulsar." };
  }
  return { ok: true };
}

/**
 * Da por buena la dirección que dice Gestión tras un bloqueo, y cierra las
 * sesiones abiertas con la anterior.
 */
export async function aprobarEmail(teacherId: string, por: string): Promise<Resultado> {
  let gestion;
  try {
    gestion = await leerProfesorDeGestion(teacherId);
  } catch {
    return NO_LEIDO;
  }
  if (!gestion) return { ok: false, error: "Este profesor no existe en Gestión." };
  if (gestion.archivado) return { ok: false, error: "Este profesor está archivado en Gestión." };
  if (!esEmailPlausible(gestion.email)) return { ok: false, error: "Este profesor no tiene un email válido en Gestión." };

  const { error } = await baseLms()
    .from("profesores_acceso")
    .update({
      email_normalizado: gestion.email,
      email_revisado_en: new Date().toISOString(),
      email_revisado_por: por,
    })
    .eq("teacher_id", teacherId)
    .eq("activo", true);

  if (error) {
    if (error.code === EMAIL_EN_USO) return { ok: false, error: "Otro profesor activo ya entra con este email." };
    console.error("[panel-profesor] No se pudo aprobar el email:", error.message);
    return { ok: false, error: "No se ha podido guardar. Vuelve a intentarlo." };
  }

  if (!(await revocarSesionesDeProfesor(teacherId))) {
    return { ok: false, error: "Email aprobado, pero no se han podido cerrar sus sesiones anteriores. Vuelve a pulsar." };
  }
  return { ok: true };
}

/** Manda la invitación a la copia aprobada. Solo a quien ya puede entrar. */
export async function invitarProfesor(teacherId: string, por: string): Promise<Resultado> {
  const { data, error } = await baseLms()
    .from("profesores_acceso")
    .select("email_normalizado, activo")
    .eq("teacher_id", teacherId)
    .limit(1)
    .returns<{ email_normalizado: string; activo: boolean }[]>();
  if (error) return { ok: false, error: "No se ha podido leer su acceso. Vuelve a intentarlo." };

  const fila = (data ?? [])[0];
  if (!fila) return { ok: false, error: "Activa primero su acceso." };

  let gestion;
  try {
    gestion = await leerProfesorDeGestion(teacherId);
  } catch {
    return NO_LEIDO;
  }
  const situacion = situacionDelProfesor({ emailNormalizado: fila.email_normalizado, activo: fila.activo }, gestion);
  if (situacion !== "activo" || !gestion) return { ok: false, error: "Este profesor no puede entrar ahora mismo: revisa su estado." };

  const enviado = await enviarInvitacionProfesor(fila.email_normalizado, nombreVisibleProfesor(null, gestion.profesor));
  if (!enviado) return { ok: false, error: "No se ha podido enviar la invitación. Vuelve a intentarlo." };

  const { error: alGuardar } = await baseLms()
    .from("profesores_acceso")
    .update({ invitado_en: new Date().toISOString(), invitado_por: por })
    .eq("teacher_id", teacherId);
  if (alGuardar) console.error("[panel-profesor] Invitación enviada, pero sin anotar:", alGuardar.message);

  return { ok: true };
}
