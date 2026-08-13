import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirSesion } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { arbolDelCurso, cursoPorSlug, cursosAsignados } from "@/lib/cursos-servidor";
import { construirTemario } from "@/lib/temario";
import CabeceraLeccion from "@/components/leccion/CabeceraLeccion";
import Temario from "@/components/curso/Temario";

export const dynamic = "force-dynamic";

/**
 * El índice del curso completo, mes a mes.
 *
 * ANTES ERA UNA REJILLA PLANA de 47 tarjetas: los 47 módulos se veían de
 * una vez, sí, pero nada decía que el curso dura seis meses ni por dónde
 * iba el alumno dentro de ese plan. Ahora se agrupa en meses
 * desplegables, cada uno con sus cuatro semanas, y arriba un panel que
 * enseña el curso entero como densidad de lecciones hechas.
 *
 * SOBRE LAS "SEMANAS": el número que viene en el título ("Week 1 -
 * Lesson 1: …") se repite cada ocho módulos, y durante un tiempo eso lo
 * hizo inservible como agrupador —daba seis "Semana 1" distintas—. Con
 * los meses por encima vuelve a significar algo: la semana 1 del mes 3
 * es un sitio concreto del curso. Ese reinicio es justo lo que confirma
 * el corte por meses.
 *
 * La agrupación y todos los contadores se resuelven en `lib/temario.ts`,
 * en el servidor. Al cliente solo le llega qué pintar y qué abrir.
 */
export default async function IndiceCurso({ params }: { params: { slug: string } }) {
  const sesion = await exigirSesion();

  const curso = await cursoPorSlug(params.slug);
  if (!curso) notFound();

  // El equipo entra en cualquier curso para revisarlo, pero sin progreso
  // propio: no es alumno de nada. Se le pinta todo como pendiente.
  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : "";
  const perfil = sesion.rol === "alumno" ? await obtenerPerfil(sesion.alumnoId) : null;

  // Un alumno solo abre los cursos de su plan. Sin esto, el slug sería
  // decorativo y cualquiera se leería el temario de los otros niveles.
  if (sesion.rol === "alumno") {
    const suyos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel) : [];
    if (!suyos.some((c) => c.id === curso.id)) redirect(`/alumno/${sesion.alumnoId}`);
  }

  const arbol = await arbolDelCurso(alumnoId, curso);
  const temario = construirTemario(arbol);

  const inicio = sesion.rol === "alumno" ? `/alumno/${sesion.alumnoId}` : "/";
  const nombre = perfil?.nombre.trim() ?? "";

  return (
    <div className="min-h-screen bg-temario-fondo text-temario-tinta">
      <CabeceraLeccion
        cursoTitulo={curso.titulo}
        cursoSlug={curso.slug}
        completadas={arbol.completadas}
        total={arbol.total}
        inicial={nombre[0]?.toUpperCase() ?? ""}
        volverA={inicio}
      />

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-14 pt-6 min-[900px]:px-11 min-[900px]:pb-16 min-[900px]:pt-10">
        <Link
          href={arbol.leccionActual ? `/curso/${curso.slug}/${arbol.leccionActual}` : inicio}
          className="text-[13px] font-semibold text-temario-enlace transition-colors hover:text-temario-tinta min-[900px]:text-[14px]"
        >
          ← {arbol.leccionActual ? "Volver a la lección" : "Volver al inicio"}
        </Link>

        {/* ------------------------------ CABECERA ------------------------------ */}
        <header className="mt-3 flex flex-col gap-2 min-[900px]:mt-[22px] min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between min-[900px]:gap-10">
          <div className="min-w-0">
            <p className="hidden text-[11.5px] font-extrabold uppercase leading-none tracking-[0.18em] text-temario-suave min-[900px]:block">
              Curso completo
            </p>
            <h1 className="text-pretty font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] min-[900px]:mt-[9px] min-[900px]:text-[42px] min-[900px]:leading-[1.05] min-[900px]:tracking-[-0.025em]">
              {curso.titulo}
            </h1>
          </div>

          {/* Los tres contadores salen de los datos, nunca fijos: si el
              curso cambia de tamaño, el titular se ajusta solo. */}
          <p className="flex items-center gap-2.5 text-[12.5px] font-medium text-temario-medio tabular-nums min-[900px]:shrink-0 min-[900px]:text-[13.5px]">
            <span>
              {temario.totalModulos} {temario.totalModulos === 1 ? "módulo" : "módulos"}
            </span>
            <span aria-hidden className="text-temario-separador">·</span>
            <span>
              {temario.totalLecciones} {temario.totalLecciones === 1 ? "lección" : "lecciones"}
            </span>
            <span aria-hidden className="text-temario-separador">·</span>
            <span>
              {temario.totalSemanas} {temario.totalSemanas === 1 ? "semana" : "semanas"}
            </span>
          </p>
        </header>

        <Temario temario={temario} slug={curso.slug} />
      </main>
    </div>
  );
}
