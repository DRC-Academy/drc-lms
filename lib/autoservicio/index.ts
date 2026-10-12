// ---------------------------------------------------------------
// EL AUTOSERVICIO: EL INTERRUPTOR Y QUÉ IMPLEMENTACIÓN SE USA
//
// DOS INTERRUPTORES, UNO POR FUNCIÓN, para encender cada una por
// separado:
//
//   AUTOSERVICIO_ACTIVO=1           «Cambiar de horario» (contrato v1).
//   AUTOSERVICIO_PROFESOR_ACTIVO=1  «Cambiar de profesor» (contrato v2).
//                                   Apagado por defecto aunque el otro
//                                   esté encendido. Con Gestión en la v1
//                                   el estado no trae
//                                   `puede_cambiar_profesor` y el botón no
//                                   sale aunque esté encendido.
//
// Apagados —el valor por defecto, y cualquier cosa que no sea «1»—, la
// pantalla es la de siempre y nada de esto se llama.
//
// AUTOSERVICIO_SIMULADO elige los datos simulados en vez de Gestión:
// «1» es el escenario normal, y NO_ELEGIBLE, RECUPERACION_PENDIENTE o
// CALENDARIO_SIN_ACTUALIZAR, el alumno que no puede cambiar nada (ver
// `simulacion.ts`). EN PRODUCCIÓN SE IGNORA: un alumno real que leyera
// «tu profesor ya está avisado» de un cambio que no ha ocurrido es peor
// que no tener el botón.
//
// Las dos son variables de servidor, sin NEXT_PUBLIC_: el navegador no
// las ve, y ningún componente de cliente importa nada de esta carpeta
// salvo los tipos.
// ---------------------------------------------------------------

import "server-only";
import { autoservicioDeGestion } from "@/lib/autoservicio/gestion";
import { autoservicioSimulado, escenarioDe } from "@/lib/autoservicio/simulacion";
import type { ProveedorAutoservicio } from "@/lib/autoservicio/tipos";

/** «Cambiar de horario». */
export function autoservicioActivo(): boolean {
  return process.env.AUTOSERVICIO_ACTIVO?.trim() === "1";
}

/** «Cambiar de profesor». Independiente del de horario. */
export function autoservicioProfesorActivo(): boolean {
  return process.env.AUTOSERVICIO_PROFESOR_ACTIVO?.trim() === "1";
}

/** Si hay que montar «Tu horario»: alguna de las dos funciones encendida. */
export function autoservicioVisible(): boolean {
  return autoservicioActivo() || autoservicioProfesorActivo();
}

export function proveedorAutoservicio(): ProveedorAutoservicio {
  const escenario = escenarioDe(process.env.AUTOSERVICIO_SIMULADO);
  if (!escenario) return autoservicioDeGestion;
  if (process.env.VERCEL_ENV === "production") {
    console.error("[autoservicio] AUTOSERVICIO_SIMULADO está puesta en producción y se ignora: se usa Gestión.");
    return autoservicioDeGestion;
  }
  return autoservicioSimulado(escenario);
}

/**
 * Si se están usando los datos simulados. Con ellos, «Cambiar de
 * profesor» avisa de que lo que se elija no se guarda.
 */
export function autoservicioSimuladoActivo(): boolean {
  return escenarioDe(process.env.AUTOSERVICIO_SIMULADO) !== null && process.env.VERCEL_ENV !== "production";
}
