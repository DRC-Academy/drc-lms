import { obtenerPerfil } from "@/lib/gestion";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import { progresoDiploma } from "@/lib/diploma";
import PantallaDiploma from "@/components/diploma/PantallaDiploma";
import MarcoDeLaPagina from "@/components/marco/MarcoDeLaPagina";
import { redirect } from "next/navigation";
import { accesoPorAlumno } from "@/lib/acceso-alumno";
import { conFoco } from "@/lib/foco";

export const dynamic = "force-dynamic";

/**
 * «Mi diploma», como sexta sección.
 *
 * Igual que «Mi progreso»: el alumno de la sesión, o el que el equipo
 * está revisando (`?alumno=`, ver `lib/foco.ts`). Sin `/diploma/{id}`.
 * Es de solo lectura, así que la revisión no necesita nada más.
 *
 * Una sola lectura —el perfil de Gestión, por `fecha_inicio`— y un
 * cálculo, `progresoDiploma`, el mismo de la tarjeta del inicio, de «Mi
 * progreso», de «Cómo vas» y de la landing. Sin perfil o sin fecha, la
 * pantalla sale igual con su mensaje neutro.
 */
export default async function PaginaDiploma() {
  const alumno = await exigirAlumnoDeLaPagina();

  // Quien solo tiene pase no tiene diploma, tampoco por URL.
  if (!(await accesoPorAlumno(alumno.alumnoId)).diploma) {
    redirect(conFoco(`/alumno/${alumno.alumnoId}`, alumno.paraEnlaces));
  }

  const perfil = await obtenerPerfil(alumno.alumnoId);

  return (
    <>
      <MarcoDeLaPagina alumno={alumno} />
      <PantallaDiploma progreso={progresoDiploma(perfil, new Date())} />
    </>
  );
}
