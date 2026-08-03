import { notFound } from "next/navigation";
import { ALUMNOS, getAlumno, getBloque } from "@/lib/data";
import PracticaCargador from "@/components/PracticaCargador";

export function generateStaticParams() {
  return ALUMNOS.flatMap((a) => a.bloques.map((b) => ({ id: a.id, bloqueId: b })));
}

export default function PaginaBloque({
  params,
}: {
  params: { id: string; bloqueId: string };
}) {
  const alumno = getAlumno(params.id);
  if (!alumno) notFound();

  // Si el bloque no está en `lib/data.ts` puede ser uno generado:
  // esos solo se pueden resolver en el cliente.
  const bloque = getBloque(params.bloqueId) ?? null;

  return (
    <PracticaCargador
      alumnoId={alumno.id}
      nombre={alumno.nombre}
      profesor={alumno.profesor}
      bloqueId={params.bloqueId}
      bloqueEstatico={bloque}
    />
  );
}
