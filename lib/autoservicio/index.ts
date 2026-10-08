// ---------------------------------------------------------------
// EL AUTOSERVICIO: EL INTERRUPTOR Y QUÉ IMPLEMENTACIÓN SE USA
//
// AUTOSERVICIO_ACTIVO=1 enseña los botones en «Mis clases» a todos.
// Apagado —el valor por defecto, y cualquier cosa que no sea «1»—, la
// pantalla es la de siempre y nada de esto se llama…
//
// …SALVO PARA LOS ALUMNOS DE PRUEBA: AUTOSERVICIO_ALUMNOS_PRUEBA lleva
// `alumno_id` separados por comas, y esos lo ven aunque el interruptor
// esté apagado. Es para probarlo en producción con cuentas de prueba
// antes de abrirlo a todos. La misma regla (`autoservicioActivoPara`)
// decide la pantalla y las acciones de servidor.
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

type Variables = Record<string, string | undefined>;

/** Los `alumno_id` de AUTOSERVICIO_ALUMNOS_PRUEBA, sin espacios ni huecos vacíos. */
export function alumnosDePrueba(valor: string | undefined): Set<string> {
  return new Set((valor ?? "").split(",").map((id) => id.trim()).filter((id) => id !== ""));
}

/**
 * Si ese alumno ve el autoservicio: todos con AUTOSERVICIO_ACTIVO=1, y
 * con el interruptor apagado, solo los de AUTOSERVICIO_ALUMNOS_PRUEBA.
 * Sin alumno, nadie.
 */
export function autoservicioActivoPara(alumnoId: string | null | undefined, env: Variables = process.env): boolean {
  if (!alumnoId) return false;
  if (env.AUTOSERVICIO_ACTIVO?.trim() === "1") return true;
  return alumnosDePrueba(env.AUTOSERVICIO_ALUMNOS_PRUEBA).has(alumnoId);
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
 * Si se están usando los datos simulados. Es lo que enseña «Cambiar de
 * profesor», que de momento solo tiene simulación (fase 2).
 */
export function autoservicioSimuladoActivo(): boolean {
  return escenarioDe(process.env.AUTOSERVICIO_SIMULADO) !== null && process.env.VERCEL_ENV !== "production";
}
