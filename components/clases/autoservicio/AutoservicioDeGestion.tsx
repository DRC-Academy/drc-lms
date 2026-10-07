import "server-only";
import { autoservicioSimuladoActivo, proveedorAutoservicio } from "@/lib/autoservicio";
import { huecosDeOtrosProfesores } from "@/lib/autoservicio/simulacion";
import type { EstadoAutoservicio, HuecoConProfesor, LecturaAutoservicio } from "@/lib/autoservicio/tipos";
import { enlaceWhatsAppHorarios } from "@/lib/soporte";
import { idiomaActual } from "@/lib/idioma-servidor";
import Autoservicio from "@/components/clases/autoservicio/Autoservicio";

/**
 * «Tu horario», pedido a Gestión (o a la simulación).
 *
 * Como las recuperaciones, va aparte y dentro de un `<Suspense>` en la
 * página: si Gestión tarda, el resto de «Mis clases» sale igual. La
 * página solo lo monta con AUTOSERVICIO_ACTIVO=1.
 */
export default async function AutoservicioDeGestion({ alumnoId, soloLectura }: { alumnoId: string; soloLectura: boolean }) {
  let estado: LecturaAutoservicio<EstadoAutoservicio>;
  try {
    estado = await proveedorAutoservicio().estado(alumnoId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura del estado:", error);
    estado = { ok: false, codigo: "GENERICO" };
  }

  // «Cambiar de profesor» solo existe en simulación (fase 2): con
  // Gestión de verdad no hay huecos de otros profesores que enseñar.
  let otros: Record<string, HuecoConProfesor[]> | null = null;
  if (autoservicioSimuladoActivo() && estado.ok) {
    otros = Object.fromEntries(estado.datos.sesiones.map((s) => [s.id, huecosDeOtrosProfesores(s.duracion)]));
  }

  return (
    <Autoservicio
      estado={estado}
      whatsapp={enlaceWhatsAppHorarios(idiomaActual())}
      otrosProfesores={otros}
      soloLectura={soloLectura}
    />
  );
}
