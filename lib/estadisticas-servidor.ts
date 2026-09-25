// ---------------------------------------------------------------
// LAS ESTADÍSTICAS DEL ALUMNO: DE DÓNDE SALE CADA UNA
//
//   curso        el curso principal (`cursosDelInicio`[0]) pasado por
//                `calcularDiploma`: el mismo dato que el banner del
//                diploma, así que las dos cifras no pueden discrepar.
//   nivel        `nivelDelAlumno` + `nivelEsFiable(origenDelNivel(…))`,
//                exactamente como «Mi progreso».
//   tiempo       semanas que quedan de las 24 del temario desde
//                `perfil.fechaInicio`.
//   clases       `vista_clases_contadas` (Gestión).
//   ejercicios   `intentos_ejercicio` (LMS), ejercicios distintos.
//
// Quien llama pasa el perfil y el curso principal que ya ha leído: el
// layout y el inicio los tienen, y pedirlos otra vez aquí sería repetir
// las consultas más caras de la pantalla. Las dos lecturas nuevas van
// en `cache()`, así que el layout y la página las comparten.
// ---------------------------------------------------------------

import "server-only";
import { obtenerClasesContadas } from "@/lib/gestion";
import { ejerciciosHechos, type EstadoCurso } from "@/lib/cursos-servidor";
import { calcularDiploma } from "@/lib/diploma";
import { nivelDelAlumno, nivelEsFiable, origenDelNivel } from "@/lib/estimacion";
import { nivelMcer } from "@/lib/recorrido";
import { comoFecha, diasNaturales } from "@/lib/fechas";
import { MESES_MAXIMO, SEMANAS_POR_MES } from "@/lib/temario";
import type { PerfilAlumno } from "@/lib/data";
import type { EstadisticasAlumno } from "@/lib/estadisticas";

export async function estadisticasDelAlumno(
  alumnoId: string,
  perfil: PerfilAlumno | null,
  principal: EstadoCurso | undefined
): Promise<EstadisticasAlumno> {
  const [clases, ejercicios] = await Promise.all([obtenerClasesContadas(alumnoId), ejerciciosHechos(alumnoId)]);

  const diploma = calcularDiploma(principal?.completadas ?? 0, principal?.total ?? 0);
  const curso =
    principal && diploma.estado !== "sin-curso"
      ? {
          titulo: principal.curso.titulo,
          completadas: diploma.estado === "conseguido" ? diploma.total : diploma.completadas,
          total: diploma.total,
          porcentaje: diploma.estado === "conseguido" ? 100 : diploma.porcentaje,
          porcentajeDesbloqueado: porcentajeDeLoAbierto(principal.completadas, principal.desbloqueadas ?? principal.total),
        }
      : null;

  const valor = perfil ? nivelMcer(nivelDelAlumno(alumnoId, perfil)) : null;
  const nivel =
    perfil && valor
      ? {
          valor,
          fiable: nivelEsFiable(
            origenDelNivel(perfil.nivelProfesor, perfil.nivelFicha, perfil.nivelPrueba, perfil.nivel)
          ),
        }
      : null;

  const profesor = perfil?.profesor.trim().split(/\s+/)[0] || null;

  return { curso, nivel, clases, ejercicios, tiempo: tiempoDeCurso(perfil?.fechaInicio), profesor };
}

/** Hechas sobre abiertas, redondeado hacia abajo: el 100 solo cuando es todo. */
function porcentajeDeLoAbierto(hechas: number, abiertas: number): number {
  if (abiertas <= 0) return 0;
  return Math.min(100, Math.floor((hechas / abiertas) * 100));
}

/**
 * Las semanas que quedan del curso: 6 meses, 24 semanas, como el temario.
 * Una fecha de inicio en el futuro cuenta como el primer día, igual que
 * en el drip. Cumplido el tiempo, null: el anillo no se pinta.
 */
function tiempoDeCurso(fechaInicio: string | null | undefined): EstadisticasAlumno["tiempo"] {
  const inicio = comoFecha(fechaInicio);
  if (!inicio) return null;
  const semanasTotales = MESES_MAXIMO * SEMANAS_POR_MES;
  const dias = Math.max(0, diasNaturales(inicio, new Date()));
  const semanasRestantes = Math.ceil((semanasTotales * 7 - dias) / 7);
  if (semanasRestantes <= 0) return null;
  return { semanasRestantes: Math.min(semanasTotales, semanasRestantes), semanasTotales };
}
