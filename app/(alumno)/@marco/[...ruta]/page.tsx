import { alumnoDeLaPagina } from "@/lib/sesion-servidor";
import { datosDelMarco } from "@/lib/navegacion-servidor";
import { PiezasDelMarco } from "@/components/Navegacion";

export const dynamic = "force-dynamic";

/**
 * EL MARCO DE CADA PANTALLA DEL ALUMNO: la tira de revisión, la barra con
 * «Cómo vas» y las pestañas con el perfil.
 *
 * ES UN SLOT Y NO PARTE DEL LAYOUT A PROPÓSITO. Next reutiliza un layout
 * al navegar entre las páginas que cuelgan de él —no lo vuelve a pedir
 * al servidor—, así que un layout que dependa del alumno se queda con el
 * de la primera ficha: el equipo abría a Ane, volvía al buscador, abría a
 * Pilar y veía la página de Pilar con la barra de Ane (auditoría del
 * 30/09/2026). Un slot sí se renderiza con cada URL, `?alumno=` incluido,
 * y mientras carga una lección se queda a la vista.
 *
 * El `[...ruta]` recoge cualquier pantalla del grupo. De ella solo se
 * mira si es `/alumno/<id>/…`, para darle a `alumnoDeLaPagina` el mismo
 * id que recibe la página.
 */
export default async function Marco({ params }: { params: { ruta: string[] } }) {
  const [seccion, id] = params.ruta;
  const alumno = await alumnoDeLaPagina(seccion === "alumno" && id ? id : undefined);
  return <PiezasDelMarco datos={await datosDelMarco(alumno)} />;
}
