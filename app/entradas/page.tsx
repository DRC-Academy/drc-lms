import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarEntradas, rangoDelMes, usoDelBoton } from "@/lib/entradas-clase-servidor";
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
 * EL PORCENTAJE, de `usoDelBoton` para el mes: clases dadas según los
 * partes de Gestión con al menos una entrada por el botón. Es la misma
 * cuenta que la tarjeta del panel (`medirBoton`), con otro rango. Sale
 * arriba como resumen —del mes entero, sin los filtros— y por alumno en
 * la lista.
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

  const [datos, uso] = await Promise.all([cargarEntradas(mes), usoDelBoton(rangoDelMes(mes))]);

  return (
    <PantallaEntradas datos={datos} uso={uso} mes={mes} mesActual={mesActual} profesor={profesor} busqueda={busqueda} elegido={elegido} />
  );
}
