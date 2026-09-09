import Link from "next/link";
import type { AlumnoPanel, Orden, Periodo, Vista } from "@/lib/admin-servidor";
import { ORDEN_POR_DEFECTO, VISTA_POR_DEFECTO } from "@/lib/admin-servidor";
import GestorAccesos from "@/components/admin/GestorAccesos";

/**
 * LA LISTA DEL PANEL. UNA SOLA, Y ES LA QUE CAMBIA.
 *
 * Aquí está la respuesta a «cómo se pasa de una métrica a los alumnos
 * que hay detrás sin que la página se descoloque»: no se despliega
 * nada. Las métricas de arriba no abren su propia lista —eso es lo que
 * empujaba media página hacia abajo— sino que FILTRAN esta, que ya está
 * en pantalla y se queda donde está.
 *
 * De regalo sale una cosa que el acordeón no daba: solo se puede mirar
 * un conjunto a la vez, que es exactamente lo que quieres cuando estás
 * repartiendo trabajo.
 *
 * SIN EMAIL, y no es un olvido: son 177 personas y basta una captura de
 * pantalla para exponerlas. Con el nombre, el nivel y el profesor se
 * identifica a cualquiera dentro del equipo, y lo demás está en su
 * ficha, detrás de un guard.
 *
 * HAY UNA CUARTA COLUMNA QUE CAMBIA CON EL FILTRO, y es la única
 * excepción a que la tabla sea siempre igual. Siempre es un TIEMPO, y
 * siempre es el que decide a quién llamas primero:
 *
 *   en «Entraron»            cuándo fue la última vez, que separa a
 *                            quien entró ayer de quien entró una vez
 *                            hace dos meses.
 *   en las listas de lo que  cuánto lleva el alumno en la academia sin
 *   FALTA                    completarlo. Un alumno de tres días sin
 *                            ficha no es un problema; uno de catorce
 *                            meses lleva catorce meses recibiendo
 *                            práctica genérica.
 *
 * En las demás no sale: o no han entrado —y saldría vacía— o el dato no
 * decide nada. Nunca salen las dos a la vez, así que es una sola
 * columna con dos rótulos, no dos columnas que se turnan.
 *
 * Se renderiza en el servidor. Lo único de cliente es `GestorAccesos`,
 * que ya lo era.
 */
export default function ListaPanel({
  titulo,
  alumnos,
  periodo,
  vista,
  busqueda,
  ultimaSesion,
  conUltimaVez,
  etiquetaEspera,
  orden,
  urge,
  filtrada,
}: {
  titulo: string;
  alumnos: AlumnoPanel[];
  periodo: Periodo;
  vista: Vista;
  busqueda: string;
  /** Última entrada por id de alumno. Solo se usa con `conUltimaVez`. */
  ultimaSesion: Record<string, string>;
  conUltimaVez: boolean;
  /** Rótulo de la columna de espera, o null si esta lista no la lleva. */
  etiquetaEspera: string | null;
  /** En qué sentido está ordenada la columna de espera ahora mismo. */
  orden: Orden;
  /** El chip en ámbar: la lista que se está mirando es trabajo pendiente. */
  urge: boolean;
  /** false en la vista por defecto: entonces no hay filtro que quitar. */
  filtrada: boolean;
}) {
  const rotuloTiempo = conUltimaVez ? "Última vez" : etiquetaEspera;

  /** El texto de la cuarta columna para un alumno, o "" si no la hay. */
  const tiempoDe = (alumno: AlumnoPanel) =>
    conUltimaVez
      ? desdeCuando(ultimaSesion[alumno.alumnoId])
      : etiquetaEspera
        ? llevaEsperando(alumno.fechaInicio)
        : "";

  const columnas = rotuloTiempo
    ? "grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_92px_150px_118px_auto]"
    : "grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_92px_150px_auto]";

  /** El sentido contrario al que está puesto. Es lo que hace el enlace. */
  const alReves: Orden = orden === "antiguos" ? "nuevos" : "antiguos";

  /**
   * Esta misma lista con el orden cambiado.
   *
   * Termina en `#alumnos` a propósito: sin el ancla, ordenar te devuelve
   * al principio de la página y hay que volver a bajar hasta la tabla
   * que acabas de tocar. Con ella, la lista se queda donde estaba y solo
   * cambia lo de dentro, que es la misma regla que siguen las métricas
   * de arriba al filtrar.
   *
   * El orden por defecto NO se escribe en la URL: es el que sale al
   * abrir, y ponerlo solo alargaría todos los enlaces del panel para
   * decir lo que ya pasa sin decirlo.
   */
  const hrefOrden = `/?periodo=${periodo}&ver=${vista}${
    busqueda ? `&q=${encodeURIComponent(busqueda)}` : ""
  }${alReves !== ORDEN_POR_DEFECTO ? `&orden=${alReves}` : ""}#alumnos`;

  return (
    <section id="alumnos" className="scroll-mt-6 overflow-hidden rounded-[16px] border border-marca-borde bg-white">
      {/* ------------------------- LA CABECERA -------------------------
          Qué estás mirando, cuántos son y cómo salir del filtro. El
          buscador va aquí y no arriba: busca DENTRO de lo que hay
          delante, y ponerlo junto a las métricas sugeriría que busca
          en todo. */}
      <div className="flex flex-col gap-3 border-b border-marca-borde bg-marca-casiBlanco px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:px-[18px] lg:py-4">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <h2 className="font-display text-[17px] font-bold leading-none text-marca-tinta lg:text-[19px]">
            {titulo}
          </h2>
          <span className="text-[13px] tabular-nums text-marca-gris lg:text-[13.5px]">
            {alumnos.length} {alumnos.length === 1 ? "alumno" : "alumnos"}
          </span>

          {filtrada && (
            <Link
              href={`/?periodo=${periodo}&ver=${VISTA_POR_DEFECTO}${busqueda ? `&q=${encodeURIComponent(busqueda)}` : ""}`}
              className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold transition-colors ${
                urge
                  ? "border-marca-examenBorde bg-[#FFF8E1] text-marca-calidoBadgeTexto hover:border-marca-amarilloTexto"
                  : "border-marca-verdePalido bg-marca-verdeFondo text-marca-verdeTexto hover:border-marca-verde"
              }`}
            >
              Filtrado
              <span aria-hidden className="text-[13px] leading-none">
                ×
              </span>
              <span className="sr-only">Quitar el filtro</span>
            </Link>
          )}
        </div>

        {/* Formulario normal: lo filtra el servidor. La vista y el
            periodo viajan en campos ocultos para no perderlos. */}
        <form method="get" className="flex shrink-0 gap-2">
          <input type="hidden" name="periodo" value={periodo} />
          <input type="hidden" name="ver" value={vista} />
          {/* Buscar dentro de una lista no es motivo para reordenarla. */}
          {orden !== ORDEN_POR_DEFECTO && <input type="hidden" name="orden" value={orden} />}
          <label htmlFor="q" className="sr-only">
            Buscar por nombre o profesor
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder="Buscar por nombre o profesor…"
            className="h-[34px] w-full min-w-0 rounded-full border border-marca-borde bg-white px-4 text-[13px] text-marca-tinta outline-none transition-colors placeholder:text-marca-grisTenue focus:border-marca-verde lg:w-[250px]"
          />
        </form>
      </div>

      {alumnos.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13.5px] text-marca-grisSuave">
          {busqueda
            ? `Nadie de esta lista responde a «${busqueda}».`
            : "No hay nadie en este grupo."}
        </p>
      ) : (
        <>
          {/* Los rótulos de columna solo en escritorio: en móvil las
              filas no son columnas, así que no habría nada que rotular. */}
          <div
            className={`hidden gap-3.5 border-b border-marca-borde px-3.5 py-2 lg:grid ${columnas}`}
          >
            <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
              Alumno
            </span>
            <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
              Nivel
            </span>
            <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
              Profesor
            </span>
            {/* LA ÚNICA CABECERA QUE SE PULSA, y solo cuando hay espera
                que ordenar. «Última vez» no lleva enlace: en «Entraron»
                el orden que importa es el de la propia lista y no hay
                una segunda pregunta que hacerle a esa columna.

                El sentido puesto se lee en la flecha, y lo que hace el
                enlace —lo contrario— está en el `title` y en el texto
                para lector de pantalla. Una flecha sola no distingue
                «así está» de «así lo vas a dejar». */}
            {rotuloTiempo &&
              (etiquetaEspera ? (
                <Link
                  href={hrefOrden}
                  title={
                    orden === "antiguos"
                      ? "Ahora: los que llevan más esperando primero. Pulsa para ver antes a los más recientes."
                      : "Ahora: los más recientes primero. Pulsa para ver antes a los que llevan más esperando."
                  }
                  className="flex items-center justify-end gap-1 text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave transition-colors hover:text-marca-tinta"
                >
                  {rotuloTiempo}
                  <span aria-hidden className="text-[11px] leading-none">
                    {orden === "antiguos" ? "↓" : "↑"}
                  </span>
                  <span className="sr-only">
                    {orden === "antiguos"
                      ? ". Ordenado de más antiguos a más nuevos. Pulsa para invertirlo."
                      : ". Ordenado de más nuevos a más antiguos. Pulsa para invertirlo."}
                  </span>
                </Link>
              ) : (
                <span className="text-right text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
                  {rotuloTiempo}
                </span>
              ))}
            <span />
          </div>

          <ul>
            {alumnos.map((alumno) => (
              <li key={alumno.alumnoId} className="relative border-b border-marca-nieblaOscura last:border-b-0">
                <Link
                  href={`/alumno/${alumno.alumnoId}`}
                  className={`grid items-center gap-x-3.5 py-2.5 pl-3.5 pr-12 transition-colors hover:bg-marca-niebla ${columnas}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-marca-tinta">
                      {alumno.nombre || "Sin nombre"}
                    </span>
                    {/* En móvil no hay columnas: nivel, profesor y la
                        última vez bajan a una segunda línea. A 375px,
                        cuatro columnas solo caben truncando el nombre,
                        que es el único dato con el que se busca a
                        alguien. */}
                    <span className="mt-0.5 block truncate text-[12px] text-marca-grisSuave lg:hidden">
                      {alumno.nivel || "sin nivel"}
                      {alumno.profesor ? ` · ${alumno.profesor}` : ""}
                      {rotuloTiempo ? ` · ${tiempoDe(alumno)}` : ""}
                    </span>
                  </span>

                  <span className="hidden text-[13px] text-marca-gris lg:block">
                    {alumno.nivel || "—"}
                  </span>
                  <span className="hidden truncate text-[13px] text-marca-gris lg:block">
                    {alumno.profesor || "—"}
                  </span>
                  {rotuloTiempo && (
                    <span className="hidden text-right text-[13px] tabular-nums text-marca-gris lg:block">
                      {tiempoDe(alumno)}
                    </span>
                  )}

                  <span aria-hidden className="text-[13px] text-marca-grisTenue">
                    →
                  </span>
                </Link>

                <GestorAccesos
                  alumnoId={alumno.alumnoId}
                  nombre={alumno.nombre}
                  nivel={alumno.nivel}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * "hace 2 d" · "hace 3 meses" · "hoy".
 *
 * En días hasta el mes y en meses a partir de ahí: a partir de sesenta
 * días, "hace 87 d" obliga a dividir mentalmente para saber si eso es
 * mucho, y lo que se quiere saber es justo eso.
 */
function desdeCuando(iso: string | undefined): string {
  if (!iso) return "—";

  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(dias) || dias < 0) return "—";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 60) return `hace ${dias} d`;

  const meses = Math.round(dias / 30);
  return `hace ${meses} meses`;
}

/**
 * CUÁNTO LLEVA EN LA ACADEMIA SIN COMPLETARLO: "12 d" · "4 meses".
 *
 * Es una DURACIÓN, no un instante, y por eso no dice "hace": la columna
 * de al lado ya usa esa forma para la última visita y las dos no
 * significan lo mismo. Corta en días hasta el segundo mes por la misma
 * razón que `desdeCuando`: a partir de ahí "111 d" obliga a dividir de
 * cabeza justo para saber si eso es mucho.
 *
 * LOS DOS BORDES SON DATOS REALES, no defensa por si acaso. Hoy hay un
 * alumno sin `fecha_inicio` y ocho cuya fecha todavía no ha llegado
 * —altas firmadas que empiezan la semana que viene—. A esos ocho no se
 * les puede reclamar nada: no llevan esperando, es que aún no han
 * empezado, y meterlos en la cuenta con un cero los pondría los
 * primeros de la lista, que es exactamente al revés.
 */
function llevaEsperando(fechaInicio: string | null): string {
  if (!fechaInicio) return "—";

  const dias = Math.floor((Date.now() - new Date(fechaInicio).getTime()) / 86_400_000);
  if (!Number.isFinite(dias)) return "—";
  if (dias < 0) return "aún no empieza";
  if (dias === 0) return "hoy";
  if (dias === 1) return "1 d";
  if (dias < 60) return `${dias} d`;

  const meses = Math.round(dias / 30);
  return `${meses} meses`;
}
