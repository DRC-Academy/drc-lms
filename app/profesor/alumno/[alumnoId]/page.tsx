import type { Metadata } from "next";
import Link from "next/link";
import MarcoProfesor from "@/components/profesor/MarcoProfesor";
import Chevron from "@/components/admin/Chevron";
import { nivelMostrado } from "@/lib/estimacion";
import { exigirAlumnoDelProfesor, rutaDelPanel } from "@/lib/panel-profesor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Alumno · DRC Academy" };

/**
 * LA ENTRADA A LA FICHA. La ficha llega en la Fase 2; la ruta existe ya
 * porque es la puerta del guard: lo ajeno, lo inexistente y lo que ha
 * dejado de estar activo responden el mismo 404 (`not-found.tsx`).
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
  const nivel = nivelMostrado(alumno.alumnoId, alumno, null).nivel;

  return (
    <MarcoProfesor nombre={profesor.nombre} comoAdmin={profesor.comoAdmin}>
      <Link href={rutaDelPanel(profesor, "/profesor")} className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc">
        <Chevron direccion="izquierda" />
        Mis alumnos
      </Link>
      <h1 className="mt-1 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:text-[34px]">
        {alumno.nombre.trim() || "Sin nombre"}
      </h1>
      {nivel && <p className="mt-2 text-[14.5px] leading-[1.5] text-marca-tintaMedia">Nivel {nivel}</p>}
      <p className="mt-5 text-[15px] leading-[1.5] text-marca-tintaMedia">Muy pronto verás aquí lo que viene trabajando.</p>
    </MarcoProfesor>
  );
}
