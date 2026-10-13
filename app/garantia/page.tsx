import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarGarantia } from "@/lib/garantia-servidor";
import { entradasDelAlumno } from "@/lib/entradas-clase-servidor";
import { resumirEntradas } from "@/lib/entradas-clase";
import { ETIQUETA_ESTADO, type Estado } from "@/lib/garantia";
import PantallaGarantia from "@/components/admin/PantallaGarantia";

export const dynamic = "force-dynamic";

/**
 * «GARANTÍA»: SI CADA ALUMNO MANTIENE LA GARANTÍA DE SU PLAN.
 *
 * Solo para el equipo. Al alumno no se le enseña ni se le avisa de nada.
 *
 * Filtros en la URL, como en «Entradas a clase» —`estado`, `profesor`,
 * `q`— y `alumno` para abrir el detalle de uno, también de alguien que
 * no esté en la lista (de baja, o la cuenta de pruebas para probar).
 * `hecho` y `error` los pone la corrección a mano al volver.
 *
 * El veredicto se calcula al abrir la página con los datos de hoy y se
 * le aplica lo guardado: ver `cargarGarantia`.
 */
export default async function Garantia({
  searchParams,
}: {
  searchParams: { estado?: string; profesor?: string; q?: string; alumno?: string; hecho?: string; error?: string };
}) {
  await exigirAdministrador();

  const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");
  const estado = (Object.keys(ETIQUETA_ESTADO) as Estado[]).find((e) => e === searchParams.estado) ?? "";
  const elegido = texto(searchParams.alumno) || null;

  const [datos, clics] = await Promise.all([cargarGarantia(elegido), elegido ? entradasDelAlumno(elegido) : Promise.resolve(null)]);

  return (
    <PantallaGarantia
      datos={datos}
      estado={estado}
      profesor={texto(searchParams.profesor)}
      busqueda={texto(searchParams.q)}
      elegido={elegido}
      entradas={clics ? resumirEntradas(clics) : null}
      hecho={texto(searchParams.hecho) || null}
      error={texto(searchParams.error) || null}
    />
  );
}
