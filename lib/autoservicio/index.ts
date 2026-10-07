// ---------------------------------------------------------------
// EL AUTOSERVICIO: EL INTERRUPTOR Y QUÉ IMPLEMENTACIÓN SE USA
//
// AUTOSERVICIO_ACTIVO=1 enseña los botones en «Mis clases». Apagado —el
// valor por defecto, y cualquier cosa que no sea «1»—, la pantalla es la
// de siempre y nada de esto se llama.
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

export function autoservicioActivo(): boolean {
  return process.env.AUTOSERVICIO_ACTIVO?.trim() === "1";
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
