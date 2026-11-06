import type { Metadata } from "next";
import ListaCursos from "@/components/profesor/ListaCursos";
import MarcoProfesor from "@/components/profesor/MarcoProfesor";
import { exigirProfesor, pestanasDelPanel, rutaDelPanel } from "@/lib/panel-profesor";
import { cursosParaRevisar } from "@/lib/panel-profesor-cursos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cursos · DRC Práctica" };

/**
 * «CURSOS». Todos los activos, tenga o no alumnos en ellos, y abiertos enteros:
 * es material para revisar, no algo que el profesor esté cursando.
 */
export default async function Cursos({ searchParams }: { searchParams: { como?: string | string[] } }) {
  const profesor = await exigirProfesor(typeof searchParams.como === "string" ? searchParams.como : undefined);
  const cursos = await cursosParaRevisar(profesor);

  return (
    <MarcoProfesor nombre={profesor.nombre} comoAdmin={profesor.comoAdmin} pestanas={pestanasDelPanel(profesor, "cursos")}>
      <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:text-[34px]">Cursos</h1>
      <p className="mt-2 text-[14.5px] leading-[1.5] text-marca-tintaMedia">
        Todas las lecciones y actividades, abiertas. Lo que hagas aquí no se guarda ni cuenta para ningún alumno.
      </p>
      <ListaCursos filas={cursos.map((curso) => ({ ...curso, href: rutaDelPanel(profesor, `/profesor/cursos/${curso.slug}`) }))} />
    </MarcoProfesor>
  );
}
