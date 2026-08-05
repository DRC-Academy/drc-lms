import { notFound } from "next/navigation";
import { getBloque } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import PracticaCargador from "@/components/PracticaCargador";

// Mismo motivo que la ficha: el alumno se resuelve contra Gestión.
export const dynamic = "force-dynamic";

export default async function PaginaBloque({
  params,
}: {
  params: { id: string; bloqueId: string };
}) {
  // El bloque enseña el nombre y el profesor del alumno: el mismo
  // guard que la ficha, o se colaría por aquí lo que se cierra allí.
  await exigirAccesoAFicha(params.id);

  const datos = await obtenerAlumno(params.id);
  if (!datos) notFound();

  // Si el bloque no está en `lib/data.ts` puede ser uno generado:
  // esos solo se pueden resolver en el cliente.
  const bloque = getBloque(params.bloqueId) ?? null;

  return (
    <PracticaCargador
      alumnoId={params.id}
      nombre={datos.perfil?.nombre ?? ""}
      profesor={datos.perfil?.profesor ?? ""}
      bloqueId={params.bloqueId}
      bloqueEstatico={bloque}
    />
  );
}
