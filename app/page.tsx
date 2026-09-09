import { exigirAdministrador } from "@/lib/sesion-servidor";
import {
  cargarPanel,
  detalleDeVista,
  esPeriodo,
  esVista,
  VISTA_POR_DEFECTO,
  type Periodo,
  type Vista,
} from "@/lib/admin-servidor";
import Cabecera from "@/components/Cabecera";
import PanelAdmin from "@/components/admin/PanelAdmin";
import ListaPanel from "@/components/admin/ListaPanel";

export const dynamic = "force-dynamic";

/**
 * EL PANEL DEL EQUIPO, EN DOS PARTES.
 *
 * Arriba las métricas —todas, juntas y sin desplegables— y debajo una
 * sola lista de alumnos. Las de arriba filtran la de abajo, así que
 * pasar de una métrica a los alumnos que hay detrás no mueve nada de
 * la página: la lista ya estaba ahí y solo cambia lo que enseña.
 *
 * ---------------------------------------------------------------
 * TRES COSAS EN LA URL, Y NINGUNA EN ESTADO DE CLIENTE
 *
 * `periodo`, `ver` y `q` definen entre las tres lo que estás mirando, y
 * las tres viajan igual. Eso hace que el enlace que le pasas a alguien
 * abra exactamente tu pantalla, que el botón de atrás deshaga el
 * filtro, y que la página entera siga siendo de servidor.
 *
 * SE FUE `listarAlumnos`. La página pedía a Gestión su propio listado
 * para el buscador, y `cargarPanel` ya lee esas mismas fichas para
 * calcular las métricas. Ahora la lista sale de ahí: una consulta menos
 * en cada carga, y el buscador y las métricas dejan de poder discrepar
 * sobre cuántos alumnos hay.
 *
 * Y SE FUE EL ÍNDICE DE ANCLAS. Existía para saltar entre las cuatro
 * secciones sin hacer scroll; con las métricas en una sola pantalla no
 * hay a dónde saltar. El `id="alumnos"` sí se queda, en la lista, para
 * que los enlaces viejos a `/#alumnos` sigan llevando a algún sitio.
 * ---------------------------------------------------------------
 */
export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; periodo?: string; ver?: string };
}) {
  await exigirAdministrador();

  const periodo: Periodo = esPeriodo(searchParams.periodo) ? searchParams.periodo : "7";
  const vista: Vista = esVista(searchParams.ver) ? searchParams.ver : VISTA_POR_DEFECTO;
  const busqueda = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const datos = await cargarPanel(periodo);
  const detalle = detalleDeVista(datos, vista);

  // El buscador mira DENTRO de la lista que hay delante, no en todos.
  // Es lo que corresponde a un filtro: si buscara en todo, quitaría el
  // filtro sin decirlo.
  const termino = busqueda.toLowerCase();
  const alumnos = termino
    ? detalle.alumnos.filter(
        (a) =>
          a.nombre.toLowerCase().includes(termino) || a.profesor.toLowerCase().includes(termino)
      )
    : detalle.alumnos;

  return (
    <>
      <Cabecera />

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-9">
        <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verdeOsc lg:text-[11.5px]">
          DRC Academy · equipo
        </p>
        <h1 className="mt-2.5 text-balance font-display text-[26px] font-bold leading-[1.08] tracking-[-0.02em] text-marca-tinta lg:text-[38px]">
          Cómo va la plataforma
        </h1>
        <p className="mt-2 max-w-[60ch] text-pretty text-[14px] leading-[1.5] text-marca-gris lg:text-[16px]">
          Quién entra, qué práctica se genera y a quién conviene ir a buscar. Lo de las clases y
          los pagos sigue en DRC Gestión.
        </p>

        <div className="mt-6 lg:mt-8">
          <PanelAdmin datos={datos} periodo={periodo} vista={vista} busqueda={busqueda} />
        </div>

        <div className="mt-5 lg:mt-6">
          <ListaPanel
            titulo={detalle.titulo}
            alumnos={alumnos}
            periodo={periodo}
            vista={vista}
            busqueda={busqueda}
            ultimaSesion={datos.adopcion.ultimaSesion}
            conUltimaVez={detalle.conUltimaVez}
            urge={detalle.urge}
            filtrada={vista !== VISTA_POR_DEFECTO}
          />
        </div>
      </main>
    </>
  );
}
