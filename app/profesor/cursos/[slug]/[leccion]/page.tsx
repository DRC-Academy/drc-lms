import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chevron from "@/components/admin/Chevron";
import LeccionProfesor from "@/components/profesor/LeccionProfesor";
import MarcoProfesor from "@/components/profesor/MarcoProfesor";
import { exigirProfesor, pestanasDelPanel, rutaDelPanel } from "@/lib/panel-profesor";
import { leccionParaRevisar } from "@/lib/panel-profesor-cursos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Lección · DRC Práctica" };

/** Una lección y sus ejercicios, sin esperas y sin guardar nada. */
export default async function PaginaLeccion({
  params,
  searchParams,
}: {
  params: { slug: string; leccion: string };
  searchParams: { como?: string | string[] };
}) {
  const profesor = await exigirProfesor(typeof searchParams.como === "string" ? searchParams.como : undefined);
  const leccion = await leccionParaRevisar(profesor, params.slug, params.leccion);
  if (!leccion) notFound();

  const deLaLeccion = (id: string | null) => (id ? rutaDelPanel(profesor, `/profesor/cursos/${leccion.curso.slug}/${id}`) : null);

  return (
    <MarcoProfesor nombre={profesor.nombre} comoAdmin={profesor.comoAdmin} pestanas={pestanasDelPanel(profesor, "cursos")}>
      <div className="mx-auto w-full max-w-[760px]">
        <Link
          href={rutaDelPanel(profesor, `/profesor/cursos/${leccion.curso.slug}?modulo=${encodeURIComponent(leccion.moduloId)}`)}
          className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc"
        >
          <Chevron direccion="izquierda" />
          {leccion.curso.titulo}
        </Link>
        <p className="mt-1 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-marca-grisSuave">{leccion.etiqueta}</p>
        <h1 className="mt-2 text-balance font-display text-[24px] font-bold leading-[1.16] tracking-[-0.01em] text-marca-tinta lg:text-[30px]">{leccion.titulo}</h1>

        <LeccionProfesor
          key={leccion.id}
          titulo={leccion.titulo}
          videoIncrustado={leccion.videoIncrustado}
          html={leccion.html}
          ejercicios={leccion.ejercicios}
          anteriorHref={deLaLeccion(leccion.anteriorId)}
          siguienteHref={deLaLeccion(leccion.siguienteId)}
        />
      </div>
    </MarcoProfesor>
  );
}
