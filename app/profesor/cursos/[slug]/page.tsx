import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chevron from "@/components/admin/Chevron";
import IndiceCurso from "@/components/profesor/IndiceCurso";
import MarcoProfesor from "@/components/profesor/MarcoProfesor";
import { exigirProfesor, pestanasDelPanel, rutaDelPanel } from "@/lib/panel-profesor";
import { indiceParaRevisar } from "@/lib/panel-profesor-cursos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Curso · DRC Práctica" };

/** El índice de un curso: todas sus lecciones, como enlaces directos. */
export default async function PaginaCurso({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { como?: string | string[]; modulo?: string | string[] };
}) {
  const profesor = await exigirProfesor(typeof searchParams.como === "string" ? searchParams.como : undefined);
  const curso = await indiceParaRevisar(profesor, params.slug);
  if (!curso) notFound();

  return (
    <MarcoProfesor nombre={profesor.nombre} comoAdmin={profesor.comoAdmin} pestanas={pestanasDelPanel(profesor, "cursos")}>
      <Link href={rutaDelPanel(profesor, "/profesor/cursos")} className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc">
        <Chevron direccion="izquierda" />
        Cursos
      </Link>
      <h1 className="mt-1 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:text-[34px]">{curso.titulo}</h1>
      <IndiceCurso
        meses={curso.meses}
        moduloActivo={typeof searchParams.modulo === "string" ? searchParams.modulo : null}
        hrefLeccion={(leccionId) => rutaDelPanel(profesor, `/profesor/cursos/${curso.slug}/${leccionId}`)}
      />
    </MarcoProfesor>
  );
}
