// ---------------------------------------------------------------
// LAS ESTADÍSTICAS DEL ALUMNO: DE DÓNDE SALE CADA UNA
//
//   curso        el curso principal (`cursosDelInicio`[0]) pasado por
//                `calcularDiploma`: el mismo dato que el banner del
//                diploma, así que las dos cifras no pueden discrepar.
//   nivel        `nivelMostrado`: valor y marca de la misma llamada,
//                exactamente como «Mi progreso».
//   profesor     `profesorDelAlumno`: el de la ficha, con su nombre
//                visible y cuántas clases ha dado él.
//   tiempo       semanas que quedan de las 24 del temario desde
//                `perfil.fechaInicio`.
//   clases       `vista_clases_contadas` (Gestión).
//   ejercicios   `intentos_ejercicio` (LMS), ejercicios distintos.
//   bloques      `progreso_bloques` (LMS), bloques de «Para ti» terminados.
//
// Quien llama pasa el perfil y el curso principal que ya ha leído: el
// layout y el inicio los tienen, y pedirlos otra vez aquí sería repetir
// las consultas más caras de la pantalla. Las dos lecturas nuevas van
// en `cache()`, así que el layout y la página las comparten.
// ---------------------------------------------------------------

import "server-only";
import { obtenerClasesContadas } from "@/lib/gestion";
import { profesorDelAlumno } from "@/lib/profesor-servidor";
import { ejerciciosHechos, type EstadoCurso } from "@/lib/cursos-servidor";
import { bloquesTerminados } from "@/lib/progreso-servidor";
import { calcularDiploma } from "@/lib/diploma";
import { nivelMostrado } from "@/lib/estimacion";
import { comoFecha, diasNaturales } from "@/lib/fechas";
import { MESES_MAXIMO, SEMANAS_POR_MES } from "@/lib/temario";
import type { PerfilAlumno } from "@/lib/data";
import type { EstadisticasAlumno } from "@/lib/estadisticas";

export async function estadisticasDelAlumno(
  alumnoId: string,
  perfil: PerfilAlumno | null,
  principal: EstadoCurso | undefined
): Promise<EstadisticasAlumno> {
  const [clases, ejercicios, bloques, profe] = await Promise.all([
    obtenerClasesContadas(alumnoId),
    ejerciciosHechos(alumnoId),
    bloquesTerminados(alumnoId),
    profesorDelAlumno(alumnoId),
  ]);

  const diploma = calcularDiploma(principal?.completadas ?? 0, principal?.total ?? 0);
  const curso =
    principal && diploma.estado !== "sin-curso"
      ? {
          titulo: principal.curso.titulo,
          completadas: diploma.estado === "conseguido" ? diploma.total : diploma.completadas,
          total: diploma.total,
          porcentaje: diploma.estado === "conseguido" ? 100 : diploma.porcentaje,
        }
      : null;

  const mostrado = perfil ? nivelMostrado(alumnoId, perfil, profe?.nombre ?? null) : null;
  const nivel =
    mostrado?.nivel
      ? { valor: mostrado.nivel, origen: mostrado.origen, profesor: mostrado.profesor ?? null }
      : null;

  const profesor = profe
    ? { nombre: profe.nombre, conActual: profe.clasesConActual, soloConActual: profe.soloConActual }
    : null;

  return { curso, nivel, clases, ejercicios, bloques, tiempo: tiempoDeCurso(perfil?.fechaInicio), profesor };
}

/**
 * Las semanas que quedan del curso: 6 meses, 24 semanas, como el temario.
 * Una fecha de inicio en el futuro cuenta como el primer día, igual que
 * en el drip. Cumplido el tiempo, 0: el drip ya lo ha abierto todo, y la
 * tarjeta lo dice así («Todo tu curso está abierto»), no como un plazo.
 */
function tiempoDeCurso(fechaInicio: string | null | undefined): EstadisticasAlumno["tiempo"] {
  const inicio = comoFecha(fechaInicio);
  if (!inicio) return null;
  const semanasTotales = MESES_MAXIMO * SEMANAS_POR_MES;
  const dias = Math.max(0, diasNaturales(inicio, new Date()));
  const semanasRestantes = Math.ceil((semanasTotales * 7 - dias) / 7);
  if (semanasRestantes <= 0) return { semanasRestantes: 0, semanasTotales };
  return { semanasRestantes: Math.min(semanasTotales, semanasRestantes), semanasTotales };
}
