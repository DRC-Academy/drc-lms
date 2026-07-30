import { notFound } from "next/navigation";
import { ALUMNOS, getAlumno, getBloque, type Bloque } from "@/lib/data";
import PanelAlumno from "@/components/PanelAlumno";

export function generateStaticParams() {
  return ALUMNOS.map((a) => ({ id: a.id }));
}

export default function PerfilAlumno({ params }: { params: { id: string } }) {
  const alumno = getAlumno(params.id);
  if (!alumno) notFound();

  const bloques = alumno.bloques.map(getBloque).filter(Boolean) as Bloque[];

  return <PanelAlumno alumno={alumno} bloques={bloques} />;
}
