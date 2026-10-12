import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarEntradas } from "@/lib/entradas-clase-servidor";
import { comoMes, mesDe } from "@/lib/entradas-clase";
import { diaLocal } from "@/lib/fechas";
import PantallaEntradas from "@/components/admin/PantallaEntradas";

export const dynamic = "force-dynamic";

/**
 * «ENTRADAS A CLASE»: QUIÉN PULSA «UNIRSE A LA CLASE» EN LA PLATAFORMA.
 *
 * Mide el clic en el botón (`/clase/entrar`), no la asistencia, y lo
 * dice arriba. Por eso nada aquí se llama «asistencia».
 *
 * UN MES, EN HORA DE ESPAÑA, y tres filtros que viajan en la URL como
 * en el panel —`mes`, `profesor`, `q`—, más `alumno` para abrir el
 * detalle de uno. Todo de servidor.
 *
 * EL PORCENTAJE NO ESTÁ TODAVÍA. Para «entró en 6 de 8» hace falta el 8,
 * las clases que tuvo de verdad, y eso solo lo sabe Gestión por los
 * partes de los profesores (`supabase/gestion-vista-partes-clase.sql`,
 * sin ejecutar). `FilaResumen.programadas` es su hueco: mientras sea
 * null, la columna no se pinta.
 *
 * La demo y la cuenta de pruebas no salen en la lista, pero su detalle
 * se puede abrir con `?alumno=`: así se prueba de punta a punta.
 */
export default async function Entradas({
  searchParams,
}: {
  searchParams: { mes?: string; profesor?: string; q?: string; alumno?: string };
}) {
  await exigirAdministrador();

  const mesActual = mesDe(diaLocal(new Date()));
  const mes = comoMes(searchParams.mes) ?? mesActual;
  const profesor = typeof searchParams.profesor === "string" ? searchParams.profesor.trim() : "";
  const busqueda = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const elegido = typeof searchParams.alumno === "string" && searchParams.alumno.trim() !== "" ? searchParams.alumno.trim() : null;

  const datos = await cargarEntradas(mes);

  return (
    <PantallaEntradas datos={datos} mes={mes} mesActual={mesActual} profesor={profesor} busqueda={busqueda} elegido={elegido} />
  );
}
