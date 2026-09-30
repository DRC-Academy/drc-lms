// ---------------------------------------------------------------
// EL PROFESOR DEL ALUMNO: UNA SOLA RESPUESTA PARA TODA LA APLICACIÓN
//
// Decisión de producto (30/09/2026): el profesor actual es el de la
// FICHA (`vista_perfil_alumno`). Si el calendario o la última clase dicen
// otro —un suplente, un cambio a medias—, al alumno no se le enseña nada
// distinto: la discrepancia sale en el panel del equipo
// (`discrepanciasDeProfesor` en `lib/admin-servidor.ts`).
//
// Aquí se resuelve todo lo que la pantalla necesita saber de él: su id,
// el nombre que ve el alumno (`lib/profesor.ts`) y las dos cifras de
// «16 clases · 7 con Liliana». Ningún componente lee `perfil.profesor`
// para enseñarlo.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { obtenerClasesContadas, obtenerClasesPorProfesor, obtenerPerfil, obtenerProfesores } from "@/lib/gestion";
import { nombreVisibleProfesor } from "@/lib/profesor";

export type ProfesorDelAlumno = {
  /** `teacher_id` de Gestión, o null si no se pudo casar el usuario con ninguno. */
  id: string | null;
  /** El nombre que ve el alumno: el visible de Gestión, o el usuario limpio. */
  nombre: string;
  /** Todas las clases del alumno (`vista_clases_contadas`). Null si la lectura falla. */
  clasesTotales: number | null;
  /** Las que ha dado este profesor (`class_analyses.teacher_id`). Null si no se sabe. */
  clasesConActual: number | null;
  /**
   * Ningún análisis es de otro profesor. Es lo que decide entre «10 clases
   * con Dana» y «16 clases · 7 con Liliana», y no la resta de las dos
   * cifras: el total es `max(class_number, filas)` y puede pasar de las
   * filas sin que haya habido otro profesor. Sin datos, true: no se
   * insinúa un cambio que no se ha visto.
   */
  soloConActual: boolean;
};

/**
 * El profesor de la ficha del alumno, o null si no tiene ninguno.
 *
 * EL ID. Cuando la vista de perfiles exponga `profesor_id`
 * (`supabase/gestion-nombre-visible-profesor.sql`), sale de ahí. Hasta
 * entonces se casa el usuario de la ficha (`assignments.teacher_name`)
 * con el de `vista_profesores` (`teachers.name`), que hoy coinciden
 * letra a letra; sin id no hay «7 con Liliana», solo el total.
 */
export const profesorDelAlumno = cache(async (alumnoId: string): Promise<ProfesorDelAlumno | null> => {
  const perfil = await obtenerPerfil(alumnoId);
  const usuario = perfil?.profesor.trim() ?? "";
  if (!perfil || !usuario) return null;

  const [profesores, clasesTotales, porProfesor] = await Promise.all([
    obtenerProfesores(),
    obtenerClasesContadas(alumnoId),
    obtenerClasesPorProfesor(alumnoId),
  ]);

  let id = perfil.profesorId;
  if (!id) {
    const buscado = usuario.toLowerCase();
    profesores.forEach((p, teacherId) => {
      if (!id && p.usuario.trim().toLowerCase() === buscado) id = teacherId;
    });
  }
  const deGestion = id ? profesores.get(id) : undefined;

  return {
    id,
    nombre: nombreVisibleProfesor(perfil.profesorVisible ?? deGestion?.visible, usuario),
    clasesTotales,
    clasesConActual: id && porProfesor ? (porProfesor.get(id) ?? 0) : null,
    soloConActual: !id || !porProfesor || Array.from(porProfesor.keys()).every((otro) => otro === id),
  };
});

/**
 * Las filas del calendario con el profesor de la ficha en vez del de la
 * celda. Decisión de producto: si el calendario dice otro (un suplente,
 * un cambio a medias), el alumno no ve nada distinto; el equipo lo ve en
 * su panel. Solo cambia el NOMBRE que se enseña: la celda, la hora y el
 * enlace de la clase siguen siendo los de la fila.
 */
export function conProfesorDeLaFicha<T extends { profesor: string | null }>(
  filas: T[],
  profesor: ProfesorDelAlumno | null
): T[] {
  if (!profesor) return filas;
  return filas.map((fila) => ({ ...fila, profesor: profesor.nombre }));
}
