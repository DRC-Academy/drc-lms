import type { Metadata } from "next";
import MarcoProfesor from "@/components/profesor/MarcoProfesor";
import ListaAlumnos from "@/components/profesor/ListaAlumnos";
import { nivelMostrado } from "@/lib/estimacion";
import { alumnosDelProfesor, exigirProfesor, rutaDelPanel, ultimosAccesos } from "@/lib/panel-profesor";
import { resumenesDeLaLista } from "@/lib/panel-profesor-ficha";
import { ordenarPorProximaClase, textoUltimoAcceso } from "@/lib/panel-profesor-reglas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mis alumnos · DRC Práctica" };

function unValor(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}

/**
 * «MIS ALUMNOS». Los de asignación activa ahora mismo: quien cambia de
 * profesor sale de esta lista en la petición siguiente. Primero quien
 * tiene antes su clase.
 */
export default async function MisAlumnos({ searchParams }: { searchParams: { como?: string | string[] } }) {
  const profesor = await exigirProfesor(unValor(searchParams.como));
  const alumnos = await alumnosDelProfesor(profesor);
  const ahora = new Date();
  const [accesos, resumenes] = await Promise.all([ultimosAccesos(alumnos), resumenesDeLaLista(alumnos, ahora)]);

  const filas = ordenarPorProximaClase(
    alumnos.map((alumno) => {
      const resumen = resumenes.get(alumno.alumnoId);
      return {
        alumnoId: alumno.alumnoId,
        nombre: alumno.nombre,
        nivel: nivelMostrado(alumno.alumnoId, alumno, null).nivel,
        ultimoAcceso: accesos ? textoUltimoAcceso(accesos.get(alumno.alumnoId) ?? null, ahora) : null,
        proxima: resumen?.proxima ?? null,
        calendarioLeido: resumen?.calendarioLeido ?? false,
        empiezaEn: resumen?.empiezaEn ?? null,
        semana: resumen?.semana ?? null,
        practico: resumen?.practico ?? null,
        href: rutaDelPanel(profesor, `/profesor/alumno/${encodeURIComponent(alumno.alumnoId)}`),
      };
    })
  );

  return (
    <MarcoProfesor nombre={profesor.nombre} comoAdmin={profesor.comoAdmin}>
      <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:text-[34px]">Mis alumnos</h1>
      <p className="mt-2 text-[14.5px] leading-[1.5] text-marca-tintaMedia">
        {filas.length === 1 ? "Tienes 1 alumno asignado." : `Tienes ${filas.length} alumnos asignados.`}
        {filas.length > 1 ? " Primero, quien tiene antes su clase. Horas de España." : " Horas de España."}
      </p>
      <ListaAlumnos filas={filas} />
    </MarcoProfesor>
  );
}
