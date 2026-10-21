import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarExclusiones } from "@/lib/panel-metricas";
import PantallaExclusiones from "@/components/panel/PantallaExclusiones";

export const dynamic = "force-dynamic";

/**
 * LAS CUENTAS QUE NO CUENTAN EN EL PANEL.
 *
 * Solo lectura. La lista vive en la base del LMS (`metricas_exclusiones`
 * y `cuentas_demo`, juntas en la vista `metricas_excluidos`) y se cambia
 * a mano, por `alumno_id`, con un motivo: ver `supabase/panel-metricas.sql`.
 *
 * Arriba, destacado, cualquier alumno del profesor de prueba de Gestión
 * (t1) que no esté en la lista: casi seguro es una cuenta del equipo
 * nueva que hay que añadir. No se excluye solo: la lista es explícita.
 */
export default async function Exclusiones() {
  await exigirAdministrador();
  return <PantallaExclusiones datos={await cargarExclusiones()} />;
}

