import { obtenerPerfil } from "@/lib/gestion";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import { progresoDiploma } from "@/lib/diploma";
import PantallaDiploma from "@/components/diploma/PantallaDiploma";

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
  const { alumnoId } = await exigirAlumnoDeLaPagina();
  const perfil = await obtenerPerfil(alumnoId);

  return <PantallaDiploma progreso={progresoDiploma(perfil, new Date())} />;
}
