import { exigirAdministrador } from "@/lib/sesion-servidor";
import {
  cargarPanel,
  detalleDeVista,
  esOrden,
  esPeriodo,
  esVista,
  ORDEN_POR_DEFECTO,
  VISTA_POR_DEFECTO,
  type Orden,
  type Periodo,
  type Vista,
} from "@/lib/admin-servidor";
import Cabecera from "@/components/Cabecera";
import PanelAdmin from "@/components/admin/PanelAdmin";
import ListaPanel from "@/components/admin/ListaPanel";
import ListaActivos from "@/components/admin/ListaActivos";

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
 * CUATRO COSAS EN LA URL, Y NINGUNA EN ESTADO DE CLIENTE
 *
 * `periodo`, `ver`, `q` y `orden` definen entre las cuatro lo que estás
 * mirando, y las cuatro viajan igual. Eso hace que el enlace que le
 * pasas a alguien abra exactamente tu pantalla, que el botón de atrás
 * deshaga el filtro o el cambio de orden, y que la página entera siga
 * siendo de servidor.
 *
 * `orden` solo lo miran las dos listas que llevan columna de espera
 * —sin ficha, sin medir—; en las demás no hay tiempo que ordenar y se
 * ignora. Y solo aparece en la URL cuando NO es el de por defecto, para
 * no arrastrar un parámetro que dice lo que ya pasa sin decirlo.
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
 *
 * ---------------------------------------------------------------
 * EN MÓVIL, EL PANEL Y LA LISTA SE ALTERNAN
 *
 * En escritorio las dos partes están juntas y las métricas filtran la
 * lista de debajo sin que nada se mueva. A 375px la lista quedaba a
 * 1.500px de la métrica que acababas de pulsar, así que en móvil son
 * dos pantallas: el panel —siete cifras y el buscador, en una sola
 * pantalla— y la lista, con una barra arriba que devuelve al panel.
 *
 * Quién se ve lo decide `explicita`: si `ver` VENÍA EN LA URL. No es lo
 * mismo que `filtrada` —que compara con la vista por defecto—, y hace
 * falta la distinción porque la página abre con la lista de «entraron»
 * puesta sin que nadie la haya pedido: en escritorio eso es lo que se
 * quiere ver, y en móvil sería abrir en la lista en vez de en el panel.
 * En escritorio `explicita` se ignora; nada de lo de móvil vive fuera
 * de clases responsive.
 *
 * EL BUSCADOR DE ARRIBA ES OTRO. El de la lista busca DENTRO de lo que
 * hay delante, y por eso vive allí; en móvil buscar a una persona es lo
 * que más se hace, así que hay un segundo formulario, solo móvil, que
 * busca entre todos: manda `ver=todos` y la consulta, y aterriza en la
 * lista de todos con la barra de vuelta. Busca por nombre y profesor,
 * como el otro: el panel no carga emails a propósito (ver `lib/gestion.ts`).
 *
 * Y DEBAJO DEL PANEL, LA AGENDA. Las siete cifras caben en un iPhone SE;
 * en cualquier teléfono más alto dejaban un hueco. Lo ocupa la lista de
 * todos los alumnos activos, por orden alfabético: no compite con las
 * cifras y es la otra forma de llegar a una ficha, con el pulgar.
 * ---------------------------------------------------------------
 */
export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; periodo?: string; ver?: string; orden?: string };
}) {
  await exigirAdministrador();

  const periodo: Periodo = esPeriodo(searchParams.periodo) ? searchParams.periodo : "7";
  const vista: Vista = esVista(searchParams.ver) ? searchParams.ver : VISTA_POR_DEFECTO;
  const orden: Orden = esOrden(searchParams.orden) ? searchParams.orden : ORDEN_POR_DEFECTO;
  const busqueda = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  /** Si la vista venía en la URL. Solo lo mira móvil. */
  const explicita = esVista(searchParams.ver);

  const datos = await cargarPanel(periodo);
  const detalle = detalleDeVista(datos, vista, orden);

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

      {/* 20px de margen lateral en móvil, no los 16 del resto de pantallas:
          aquí casi todo son filas que llegan hasta el borde de su tarjeta,
          y con 16 la tarjeta quedaba pegada al canto del teléfono. */}
      <main className="mx-auto w-full max-w-[1240px] px-5 pb-16 lg:px-10 lg:pb-20 lg:pt-9">
        {/* El panel: en móvil, solo cuando no hay lista pedida. El
            antetítulo y el párrafo son de escritorio —orientan a quien
            llega por primera vez, y en el teléfono llega quien lo abre
            cada día—. */}
        <div className={`pt-4 lg:pt-0 ${explicita ? "hidden lg:block" : ""}`}>
          <p className="hidden text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verdeOsc lg:block lg:text-[11.5px]">
            DRC Academy · equipo
          </p>
          <h1 className="font-display text-[21px] font-bold leading-[1.1] tracking-[-0.02em] text-marca-tinta lg:mt-2.5 lg:text-balance lg:text-[38px] lg:leading-[1.08]">
            Cómo va la plataforma
          </h1>
          <p className="mt-2 hidden max-w-[60ch] text-pretty text-[16px] leading-[1.5] text-marca-gris lg:block">
            Quién entra, qué práctica se genera y a quién conviene ir a buscar. Lo de las clases y
            los pagos sigue en DRC Gestión.
          </p>

          {/* EL BUSCADOR DE MÓVIL: primer control de la pantalla, y busca
              entre todos. 16px de letra a propósito: iOS hace zoom al
              enfocar cualquier campo más pequeño. */}
          <form method="get" role="search" className="relative mt-3 lg:hidden">
            <input type="hidden" name="periodo" value={periodo} />
            <input type="hidden" name="ver" value="todos" />
            <label htmlFor="q-movil" className="sr-only">
              Buscar alumno por nombre o profesor
            </label>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              width="16"
              height="16"
              className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-marca-grisTenue"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <circle cx="9" cy="9" r="5.4" />
              <path d="M13 13l3.5 3.5" />
            </svg>
            <input
              id="q-movil"
              name="q"
              type="search"
              placeholder="Buscar alumno…"
              className="h-11 w-full rounded-full border border-marca-borde bg-white pl-[42px] pr-4 text-marca-tinta outline-none transition-colors placeholder:text-marca-grisTenue focus:border-marca-verde"
            />
          </form>

          <div className="mt-3 lg:mt-8">
            <PanelAdmin
              datos={datos}
              periodo={periodo}
              vista={vista}
              orden={orden}
              busqueda={busqueda}
            />
          </div>

          {/* Debajo de las siete cifras, la agenda: en un teléfono alto
              el panel dejaba doscientos píxeles vacíos, y esto es lo que
              menos compite con las cifras y lo único que además sirve. */}
          <ListaActivos alumnos={datos.alumnos} />
        </div>

        {/* En móvil nunca comparte pantalla con el panel, así que no
            necesita separarse de él. */}
        <div className="lg:mt-6">
          <ListaPanel
            titulo={detalle.titulo}
            alumnos={alumnos}
            periodo={periodo}
            vista={vista}
            busqueda={busqueda}
            ultimaSesion={datos.adopcion.ultimaSesion}
            conUltimaVez={detalle.conUltimaVez}
            etiquetaEspera={detalle.etiquetaEspera}
            orden={orden}
            urge={detalle.urge}
            filtrada={vista !== VISTA_POR_DEFECTO}
            explicita={explicita}
            dePeriodo={detalle.dePeriodo}
          />
        </div>
      </main>
    </>
  );
}
