import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import { autoservicioProfesorActivo, autoservicioSimuladoActivo, proveedorAutoservicio } from "@/lib/autoservicio";
import type { EstadoAutoservicio, LecturaAutoservicio } from "@/lib/autoservicio/tipos";
import { enlaceWhatsAppHorarios } from "@/lib/soporte";
import { idiomaActual, textosActuales } from "@/lib/idioma-servidor";
import CambiarProfesor from "@/components/clases/autoservicio/CambiarProfesor";
import FlujoNoDisponible from "@/components/clases/autoservicio/FlujoNoDisponible";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { title: `${textosActuales().autoservicio.cambiarProfesor} · DRC Academy` };
}

/**
 * «CAMBIAR DE PROFESOR», A PANTALLA COMPLETA. Como «Cambiar de horario»
 * (ver su página), con AUTOSERVICIO_PROFESOR_ACTIVO.
 *
 * Lo decide `puede_cambiar_profesor` del estado, no `elegible`: con el
 * calendario de su profesor sin actualizar no puede cambiar de horario
 * pero sí de profesor. Con Gestión en v1 no viene, y no hay nada que
 * ofrecer: vuelve a «Mis clases».
 */
export default async function PaginaCambiarProfesor() {
  const { sesion, alumnoId } = await exigirAlumnoDeLaPagina();
  if (sesion.rol !== "alumno" || !autoservicioProfesorActivo()) redirect("/clases");
  const whatsapp = enlaceWhatsAppHorarios(idiomaActual());

  let estado: LecturaAutoservicio<EstadoAutoservicio>;
  try {
    estado = await proveedorAutoservicio().estado(alumnoId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura del estado:", error);
    estado = { ok: false, codigo: "GENERICO" };
  }

  if (!estado.ok) return <FlujoNoDisponible que="profesor" motivo={estado.codigo} whatsapp={whatsapp} />;
  const cambio = estado.datos.cambioProfesor;
  if (!cambio) redirect("/clases");
  if (!cambio.puede) return <FlujoNoDisponible que="profesor" motivo={cambio.motivo} cambio={cambio} whatsapp={whatsapp} />;

  return <CambiarProfesor profesorActual={estado.datos.profesor} whatsapp={whatsapp} simulado={autoservicioSimuladoActivo()} />;
}
