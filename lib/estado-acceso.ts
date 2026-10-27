// ---------------------------------------------------------------
// ¿PUEDE ESTE ALUMNO USAR LA PLATAFORMA? LA ÚNICA RESPUESTA
//
// Un alumno con la suscripción "En espera" en WooCommerce (pago
// fallido) no usa DRC Práctica hasta que regulariza el pago. Lo decide
// `estadoDeAcceso`, y SOLO ella: el layout del alumno, las rutas de la
// API, las acciones de servidor y las páginas sueltas la llaman, y
// ninguna repite la comprobación. `lib/estado-acceso.test.ts` recorre
// `app/` y falla si una ruta o una acción nueva no pasa por aquí ni
// está en su lista de las que no tienen alumno delante.
//
// LO QUE DE VERDAD PROTEGE SON LAS ACCIONES. El velo desenfocado del
// layout es presentación; lo que cierra la puerta es que generar
// práctica, guardar progreso, valorar una clase o cualquier otra
// escritura devuelva 403 (o su rechazo, en las acciones de servidor).
//
// LAS REGLAS
//   · El equipo (rol admin) nunca se bloquea.
//   · Las cuentas de prueba y demo nunca se bloquean: las que
//     `metricas_excluido()` da por excluidas en la base del LMS, que es
//     la única lista que hay.
//   · Varias suscripciones, Pausa, activación manual y Oritalk ya los
//     resuelve Gestión antes de abrir el episodio: aquí no se repite.
//   · SI ALGO FALLA, SE DEJA PASAR (fail-open) y se apunta en los logs.
//     Nunca se bloquea a un alumno que paga por una avería nuestra.
//   · Sin caché entre peticiones (`leerEnEspera`): solo `cache()` de
//     React, que vale para una misma petición.
//
// LA ÚNICA EXCEPCIÓN: `/ampliar-plan` (`RUTAS_SIN_BLOQUEO`). Lleva a la
// tienda, que es donde se paga; bloquearla sería cerrarle al alumno una
// de las puertas para salir de la espera.
//
// PARA PROBARLO: `ESTADO_ACCESO_SIMULADO=<alumnoId>:impago` (o
// `:fallo`, que simula que Gestión no contesta). Solo fuera de
// producción —`VERCEL_ENV !== "production"`: en local y en las previews—
// y por encima de las exenciones, para poder probarlo con una cuenta de
// pruebas. En producción se ignora y se avisa en los logs.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { leerEnEspera } from "@/lib/gestion";
import { baseLms } from "@/lib/supabase-lms";
import { textosActuales } from "@/lib/idioma-servidor";
import type { SesionAbierta } from "@/lib/sesion";

export type EstadoAcceso = "activo" | "impago";

/**
 * Las rutas de alumno que NO se bloquean, con su motivo. Es la única
 * lista: el test de cobertura la lee de aquí.
 */
export const RUTAS_SIN_BLOQUEO: Readonly<Record<string, string>> = {
  "/ampliar-plan": "Lleva a la tienda, que es donde se paga.",
};

/** El código con el que las rutas rechazan a un alumno en espera. */
export const CODIGO_IMPAGO = "pago_pendiente";

type Quien = Pick<SesionAbierta, "rol" | "alumnoId">;

/**
 * El estado de acceso de quien ha entrado. Sin sesión, o del equipo,
 * `activo`: lo que no sea un alumno no se decide aquí.
 */
export async function estadoDeAcceso(quien: Quien | null): Promise<EstadoAcceso> {
  if (!quien || quien.rol !== "alumno" || !quien.alumnoId) return "activo";
  return estadoDelAlumno(quien.alumnoId);
}

const estadoDelAlumno = cache(async (alumnoId: string): Promise<EstadoAcceso> => {
  const simulado = simulacionPara(alumnoId);
  if (simulado === "impago") return "impago";

  try {
    if (simulado === "fallo") throw new Error("fallo simulado con ESTADO_ACCESO_SIMULADO");
    if (!(await leerEnEspera(alumnoId))) return "activo";
    // Solo se pregunta por la exención de quien Gestión tiene en espera,
    // que son muy pocos: el resto no paga esta consulta.
    if (await exento(alumnoId)) return "activo";
    return "impago";
  } catch (error) {
    console.error(
      `[estado-acceso] No se pudo comprobar el estado de ${alumnoId}; se deja pasar:`,
      error instanceof Error ? error.message : error
    );
    return "activo";
  }
});

/** Cuenta de pruebas o demo, según la base del LMS. Lanza si no contesta. */
async function exento(alumnoId: string): Promise<boolean> {
  const { data, error } = await baseLms().rpc("metricas_excluido", { p_alumno_id: alumnoId });
  if (error) throw new Error(`metricas_excluido: ${error.message}`);
  return data === true;
}

// ---------------------------------------------------------------
// LA SIMULACIÓN
// ---------------------------------------------------------------

type Simulacion = "impago" | "fallo";

let avisadoEnProduccion = false;

/** `ESTADO_ACCESO_SIMULADO`, por si es para este alumno. Admite varios separados por comas. */
function simulacionPara(alumnoId: string): Simulacion | null {
  const valor = process.env.ESTADO_ACCESO_SIMULADO?.trim();
  if (!valor) return null;

  if (process.env.VERCEL_ENV === "production") {
    if (!avisadoEnProduccion) {
      avisadoEnProduccion = true;
      console.warn("[estado-acceso] ESTADO_ACCESO_SIMULADO está definida en producción y se ignora. Quítala de Vercel.");
    }
    return null;
  }

  for (const par of valor.split(",")) {
    const [id, modo] = par.trim().split(":");
    if (id === alumnoId && (modo === "impago" || modo === "fallo")) return modo;
  }
  return null;
}

// ---------------------------------------------------------------
// EL RECHAZO, IGUAL EN TODAS LAS RUTAS
// ---------------------------------------------------------------

/**
 * El 403 de las rutas de la API. El texto puede acabar delante del
 * alumno —detrás del velo, si una pantalla lo pinta—, así que no habla
 * de errores ni de bloqueos: dice lo que pasa y que se arregla solo.
 */
export function respuestaImpago(): NextResponse {
  return NextResponse.json(
    { codigo: CODIGO_IMPAGO, error: textosActuales().impago.api },
    { status: 403, headers: { "cache-control": "no-store" } }
  );
}
