import "server-only";
import { autoservicioActivo, autoservicioProfesorActivo, autoservicioSimuladoActivo, proveedorAutoservicio } from "@/lib/autoservicio";
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
 * página solo lo monta con alguno de los dos interruptores encendido
 * (`autoservicioVisible`).
 *
 * EL EQUIPO EN SOLO LECTURA NO PREGUNTA A GESTIÓN: la tarjeta le enseña
 * una frase y ningún botón, así que el estado no se usaría para nada.
 */
export default async function AutoservicioDeGestion({ alumnoId, soloLectura }: { alumnoId: string; soloLectura: boolean }) {
  const conHorario = autoservicioActivo();
  const conProfesor = autoservicioProfesorActivo();
  if (!conHorario && !conProfesor) return null;

  // Sin el de horario no hay nada real que enseñar al equipo: el de
  // profesor solo tiene simulación.
  if (soloLectura) {
    if (!conHorario) return null;
    return <Autoservicio estado={null} whatsapp={enlaceWhatsAppHorarios(idiomaActual())} otrosProfesores={null} soloLectura conHorario />;
  }

  let estado: LecturaAutoservicio<EstadoAutoservicio>;
  try {
    estado = await proveedorAutoservicio().estado(alumnoId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura del estado:", error);
    estado = { ok: false, codigo: "GENERICO" };
  }

  // «Cambiar de profesor»: con su interruptor, y de momento solo en
  // simulación (fase 2): con Gestión de verdad no hay huecos de otros
  // profesores que enseñar hasta el contrato v2.
  let otros: Record<string, HuecoConProfesor[]> | null = null;
  if (conProfesor && autoservicioSimuladoActivo() && estado.ok) {
    otros = Object.fromEntries(estado.datos.sesiones.map((s) => [s.id, huecosDeOtrosProfesores(s.duracion)]));
  }
  // Solo el de profesor encendido y sin nada que ofrecer: la tarjeta no sale.
  if (!conHorario && !otros) return null;

  return (
    <Autoservicio
      estado={estado}
      whatsapp={enlaceWhatsAppHorarios(idiomaActual())}
      otrosProfesores={otros}
      soloLectura={false}
      conHorario={conHorario}
    />
  );
}
