// ---------------------------------------------------------------
// LAS REGLAS DEL PANEL DE PROFESORES
//
// Puras: sin base y sin `server-only`, para poder probarlas. Quien las usa
// con datos de verdad es `lib/panel-profesor.ts` (el guard y la pestaña
// de admin), de modo que los dos deciden lo mismo.
// ---------------------------------------------------------------

import { diasNaturales } from "@/lib/fechas";

export type SituacionProfesor =
  /** Puede entrar. */
  | "activo"
  /** Sin fila, o desactivado. */
  | "sin_acceso"
  /** Activado, pero el email de Gestión ya no es la copia aprobada. */
  | "bloqueado_email"
  /** Activado, pero ya no está en la academia (o ha desaparecido de Gestión). */
  | "archivado";

/**
 * La única respuesta a «¿puede entrar este profesor?».
 *
 * EL EMAIL ES UNA COPIA APROBADA. Gestión deja editar `teachers.email`
 * desde el navegador con la clave pública, así que cambiarlo no puede
 * trasladar el acceso a otra dirección: si deja de coincidir, se bloquea
 * hasta que un admin lo revise.
 */
export function situacionDelProfesor(
  acceso: { emailNormalizado: string; activo: boolean } | null,
  gestion: { email: string; archivado: boolean } | null
): SituacionProfesor {
  if (!acceso || !acceso.activo) return "sin_acceso";
  if (!gestion || gestion.archivado) return "archivado";
  return gestion.email === acceso.emailNormalizado ? "activo" : "bloqueado_email";
}

export type FilaPestana = {
  teacherId: string;
  profesor: string;
  email: string;
  /** La copia aprobada, si alguna vez tuvo acceso. */
  emailAprobado: string | null;
  situacion: SituacionProfesor;
  esPrueba: boolean;
  alumnos: number;
  invitadoEn: string | null;
};

/**
 * Qué sale en «Acceso profesores» y en qué orden.
 *
 * Los archivados no salen, salvo que sigan con el acceso activado: esos
 * hay que verlos. Primero lo que pide una revisión, después quien tiene
 * alumnos y al final quien no tiene ninguno.
 */
export function filasDeLaPestana(
  profesores: { teacherId: string; profesor: string; email: string; archivado: boolean; esPrueba: boolean }[],
  accesos: Map<string, { emailNormalizado: string; activo: boolean; invitadoEn: string | null }>,
  alumnos: Map<string, number>
): FilaPestana[] {
  const peso = (f: FilaPestana) =>
    f.situacion === "bloqueado_email" || f.situacion === "archivado" ? 0 : f.alumnos > 0 ? 1 : 2;

  return profesores
    .filter((p) => !p.archivado || accesos.get(p.teacherId)?.activo === true)
    .map((p) => {
      const acceso = accesos.get(p.teacherId) ?? null;
      return {
        teacherId: p.teacherId,
        profesor: p.profesor,
        email: p.email,
        emailAprobado: acceso?.emailNormalizado ?? null,
        situacion: situacionDelProfesor(acceso, p),
        esPrueba: p.esPrueba,
        alumnos: alumnos.get(p.teacherId) ?? 0,
        invitadoEn: acceso?.invitadoEn ?? null,
      };
    })
    .sort((a, b) => peso(a) - peso(b) || a.profesor.localeCompare(b.profesor, "es"));
}

/** El último paso del alumno por la plataforma, en palabras. Días de Madrid. */
export function textoUltimoAcceso(iso: string | null, ahora: Date = new Date()): string {
  if (!iso) return "Aún no ha entrado";
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) return "Aún no ha entrado";
  const dias = diasNaturales(momento, ahora);
  if (dias <= 0) return "Entró hoy";
  if (dias === 1) return "Entró ayer";
  return `Entró hace ${dias} días`;
}
