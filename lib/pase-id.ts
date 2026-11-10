// ---------------------------------------------------------------
// EL ID DE QUIEN SOLO TIENE PASE
//
// El comprador del Black Pass sin ficha en Gestión tiene un id propio,
// `pase-<uuid>`, que crea `conceder_pase_pedido` (`supabase/lms-pases.sql`).
// Es el mismo truco que `demo-`: el prefijo dice, sin consultar nada, que de
// este alumno no hay que preguntarle nada a Gestión.
//
// Sin `server-only`: también lo lee la barra, para no enseñar «Clases» ni
// un instante mientras llegan los datos.
// ---------------------------------------------------------------

export const PREFIJO_PASE = "pase-";

/**
 * EL INTERRUPTOR DEL BLACK PASS: `PASES_ACTIVO=1`. Por defecto, apagado. Solo
 * tiene sentido en el servidor: la variable no llega al navegador.
 */
export function pasesActivos(): boolean {
  return process.env.PASES_ACTIVO === "1";
}

export function esIdPase(alumnoId: string | null | undefined): boolean {
  return typeof alumnoId === "string" && alumnoId.startsWith(PREFIJO_PASE);
}
