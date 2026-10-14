import "server-only";
import { autoservicioActivo, autoservicioProfesorActivo, proveedorAutoservicio } from "@/lib/autoservicio";
import type { EstadoAutoservicio, LecturaAutoservicio } from "@/lib/autoservicio/tipos";
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
  const whatsapp = enlaceWhatsAppHorarios(idiomaActual());

  if (soloLectura) {
    return <Autoservicio estado={null} whatsapp={whatsapp} soloLectura conHorario={conHorario} conProfesor={conProfesor} />;
  }

  let estado: LecturaAutoservicio<EstadoAutoservicio>;
  try {
    estado = await proveedorAutoservicio().estado(alumnoId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura del estado:", error);
    estado = { ok: false, codigo: "GENERICO" };
  }

  // Solo el de profesor encendido y Gestión sin `puede_cambiar_profesor`
  // (todavía en el contrato v1), o sin contestar: no hay nada que
  // ofrecer, y la tarjeta no sale.
  if (!conHorario && !(estado.ok && estado.datos.cambioProfesor)) return null;

  return (
    <Autoservicio
      estado={estado}
      whatsapp={whatsapp}
      soloLectura={false}
      conHorario={conHorario}
      conProfesor={conProfesor}
    />
  );
}
