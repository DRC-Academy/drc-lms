import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarPanelValoraciones } from "@/lib/valoraciones-servidor";
import PantallaValoraciones, { leerFiltros } from "@/components/admin/PantallaValoraciones";

export const dynamic = "force-dynamic";

/**
 * «VALORACIONES DE CLASE»: LAS ESTRELLAS QUE DEJAN LOS ALUMNOS.
 *
 * La lista con fecha, alumno, profesor, estrellas y comentario, y arriba
 * la media por profesor y la tasa de respuesta del pop-up. Los filtros
 * —profesor, fechas, estrellas— viajan en la URL y filtra el servidor,
 * como en «Entradas a clase». Las filas solo descartadas no salen en la
 * lista: cuentan en la tasa como pop-ups mostrados.
 *
 * Las cuentas del equipo (`metricas_excluidos`, la demo y la de pruebas)
 * no cuentan; con `?equipo=1` salen, para probar de punta a punta.
 */
export default async function Valoraciones({
  searchParams,
}: {
  searchParams: { profesor?: string; desde?: string; hasta?: string; estrellas?: string; equipo?: string };
}) {
  await exigirAdministrador();
  return <PantallaValoraciones datos={await cargarPanelValoraciones()} filtros={leerFiltros(searchParams)} />;
}
