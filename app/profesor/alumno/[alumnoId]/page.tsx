import type { Metadata } from "next";
import MarcoProfesor from "@/components/profesor/MarcoProfesor";
import FichaAlumno from "@/components/profesor/FichaAlumno";
import { exigirAlumnoDelProfesor, rutaDelPanel } from "@/lib/panel-profesor";
import { cargarFichaDelAlumno } from "@/lib/panel-profesor-ficha";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ficha del alumno · DRC Práctica" };

/**
 * LA FICHA DEL ALUMNO. Primero el guard: lo ajeno, lo inexistente y lo que
 * ha dejado de estar activo responden el mismo 404 (`not-found.tsx`).
 * Después, un solo cargador con lo que ha devuelto el guard.
 */
export default async function PaginaAlumno({
  params,
  searchParams,
}: {
  params: { alumnoId: string };
  searchParams: { como?: string | string[] };
}) {
  const como = typeof searchParams.como === "string" ? searchParams.como : undefined;
  const { profesor, alumno } = await exigirAlumnoDelProfesor(params.alumnoId, como);
  const ficha = await cargarFichaDelAlumno(profesor, alumno);

  return (
    <MarcoProfesor nombre={profesor.nombre} comoAdmin={profesor.comoAdmin}>
      <FichaAlumno ficha={ficha} volverHref={rutaDelPanel(profesor, "/profesor")} />
    </MarcoProfesor>
  );
}
