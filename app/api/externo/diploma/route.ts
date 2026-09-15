// ---------------------------------------------------------------
// GET /api/externo/diploma?alumno_id=<id de students en Gestión>
//
// El estado del diploma de un alumno, para que DRC Gestión lo enseñe en
// su ficha de progreso. Consumidor: Gestión, de servidor a servidor.
//
// NO CALCULA NADA NUEVO. Es exactamente lo que pinta el banner del
// diploma en el inicio del alumno, por el mismo camino: el perfil de
// Gestión decide qué cursos tiene (`cursosDelInicio`), el primero de
// ellos es el que manda —el de actividad más reciente, como en el
// banner—, y `calcularDiploma` dice cuánto le falta. Si aquí saliera
// otra cifra que en el inicio, alguien tendría razón y no se sabría
// quién.
//
// SIN CURSO NO ES UN ERROR. Un id que no está en la vista de perfiles,
// o un alumno cuyo plan no da ningún curso, es un alumno sin diploma
// que contar: `estado: "sin-curso"` con 200. Es el mismo estado que
// devuelve `calcularDiploma` y que el inicio pinta como "nada". Lo que
// sí es un error es llamar sin `alumno_id`: eso es un fallo de quien
// llama, y se le dice.
//
// SOLO LECTURA. Cuatro consultas —perfil, cursos, excepciones, y las
// tres del curso en una ola— y ninguna escribe. `no-store` porque el
// dato cambia al completar una lección y Gestión lo pide en cada carga
// de la ficha.
//
// LA RESPUESTA TIENE SIEMPRE LA MISMA FORMA, en los tres estados:
//
//   { estado, completadas, total, restantes, curso }
//
// `curso` es `{ slug, titulo }` o null en "sin-curso". Con la forma
// fija, quien la consume no tiene que preguntar qué campos hay según el
// estado.
// ---------------------------------------------------------------

import { obtenerPerfil } from "@/lib/gestion";
import { nivelDelAlumno } from "@/lib/estimacion";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { calcularDiploma, type EstadoDiploma } from "@/lib/diploma";
import { comoFecha } from "@/lib/fechas";
import { exigirSecretoExterno } from "@/lib/secreto-externo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Respuesta = {
  estado: EstadoDiploma["estado"];
  completadas: number;
  total: number;
  restantes: number;
  curso: { slug: string; titulo: string } | null;
};

const SIN_CURSO: Respuesta = {
  estado: "sin-curso",
  completadas: 0,
  total: 0,
  restantes: 0,
  curso: null,
};

function json(cuerpo: unknown, status = 200): Response {
  return Response.json(cuerpo, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(peticion: Request): Promise<Response> {
  const denegado = exigirSecretoExterno(peticion);
  if (denegado) return denegado;

  // Los ids de `students` son un uuid o `s_<dígitos>`. No se valida la
  // forma —la vista decide si existe— pero sí que venga y que no sea un
  // texto arbitrario de kilobytes camino de una consulta.
  const alumnoId = new URL(peticion.url).searchParams.get("alumno_id")?.trim() ?? "";
  if (alumnoId === "" || alumnoId.length > 64) {
    return json({ error: "alumno_id_requerido" }, 400);
  }

  try {
    // `obtenerPerfil` es la mitad de `obtenerAlumno` que decide el curso;
    // la otra mitad —la última clase analizada— aquí no cambia nada, y
    // pedirla sería una consulta a Gestión por cada carga de la ficha
    // para no leerla.
    const perfil = await obtenerPerfil(alumnoId);
    if (!perfil) return json(SIN_CURSO);

    const estados = await cursosDelInicio(
      alumnoId,
      perfil.plan,
      nivelDelAlumno(alumnoId, perfil),
      comoFecha(perfil.fechaInicio)
    );

    // El que manda en el banner: actividad más reciente y, sin
    // actividad, el del plan. Con dos cursos no se suman ni se
    // promedian —dos diplomas distintos no hacen medio diploma—.
    const principal = estados[0];
    if (!principal) return json(SIN_CURSO);

    const diploma = calcularDiploma(principal.completadas, principal.total);
    if (diploma.estado === "sin-curso") return json(SIN_CURSO);

    const curso = { slug: principal.curso.slug, titulo: principal.curso.titulo };

    if (diploma.estado === "conseguido") {
      return json({
        estado: "conseguido",
        completadas: diploma.total,
        total: diploma.total,
        restantes: 0,
        curso,
      } satisfies Respuesta);
    }

    return json({
      estado: "en-curso",
      completadas: diploma.completadas,
      total: diploma.total,
      restantes: diploma.restantes,
      curso,
    } satisfies Respuesta);
  } catch (error) {
    console.error("[externo/diploma] fallo al calcular:", error);
    return json({ error: "error_interno" }, 500);
  }
}
