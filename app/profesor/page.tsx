import type { Metadata } from "next";
import MarcoProfesor from "@/components/profesor/MarcoProfesor";
import ListaAlumnos from "@/components/profesor/ListaAlumnos";
import { nivelMostrado } from "@/lib/estimacion";
import { alumnosDelProfesor, exigirProfesor, rutaDelPanel, ultimosAccesos } from "@/lib/panel-profesor";
import { textoUltimoAcceso } from "@/lib/panel-profesor-reglas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mis alumnos · DRC Academy" };

function unValor(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}

/**
 * «MIS ALUMNOS». Los de asignación activa ahora mismo: quien cambia de
 * profesor sale de esta lista en la petición siguiente.
 */
export default async function MisAlumnos({ searchParams }: { searchParams: { como?: string | string[] } }) {
  const profesor = await exigirProfesor(unValor(searchParams.como));
  const alumnos = await alumnosDelProfesor(profesor);
  const accesos = await ultimosAccesos(alumnos);
  const ahora = new Date();

  const filas = alumnos.map((alumno) => ({
    alumnoId: alumno.alumnoId,
    nombre: alumno.nombre,
    nivel: nivelMostrado(alumno.alumnoId, alumno, null).nivel,
    ultimoAcceso: accesos ? textoUltimoAcceso(accesos.get(alumno.alumnoId) ?? null, ahora) : null,
    href: rutaDelPanel(profesor, `/profesor/alumno/${encodeURIComponent(alumno.alumnoId)}`),
  }));

  return (
    <MarcoProfesor nombre={profesor.nombre} comoAdmin={profesor.comoAdmin}>
      <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:text-[34px]">Mis alumnos</h1>
      <p className="mt-2 text-[14.5px] leading-[1.5] text-marca-tintaMedia">
        {filas.length === 1 ? "Tienes 1 alumno asignado." : `Tienes ${filas.length} alumnos asignados.`}
      </p>
      <ListaAlumnos filas={filas} />
    </MarcoProfesor>
  );
}
