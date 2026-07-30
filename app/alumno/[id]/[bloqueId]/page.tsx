import { notFound } from "next/navigation";
import { ALUMNOS, getAlumno, getBloque } from "@/lib/data";
import Practica from "@/components/Practica";

export function generateStaticParams() {
  return ALUMNOS.flatMap((a) => a.bloques.map((b) => ({ id: a.id, bloqueId: b })));
}

export default function PaginaBloque({
  params,
}: {
  params: { id: string; bloqueId: string };
}) {
  const alumno = getAlumno(params.id);
  const bloque = getBloque(params.bloqueId);
  if (!alumno || !bloque) notFound();

  return <Practica bloque={bloque} alumnoId={alumno.id} />;
}
