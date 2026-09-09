import { textosActuales } from "@/lib/idioma-servidor";
import type { ReactNode } from "react";
import { textoDiploma, type EstadoDiploma } from "@/lib/diploma";

/**
 * EL DIPLOMA, EN UN FILETE.
 *
 * Va entre el saludo y la rejilla, a lo ancho: es lo primero que se ve
 * al entrar.
 *
 * ---------------------------------------------------------------
 * SE LE QUITÓ LA CAJA, Y ESO ES TODO EL REDISEÑO
 *
 * Tenía superficie de pergamino con doble filete interior, un círculo
 * de 68px con el icono dentro y la cifra a 28px. Tres piezas que
 * pesaban como una franja de acción, para decir un dato que no se puede
 * pulsar: el banner ocupaba como la pieza principal de la pantalla sin
 * serlo.
 *
 * Ahora no hay caja. Una línea de texto y un carril de 8px a ancho
 * completo, sobre el fondo de la página. Lo que antes era un objeto
 * pasa a ser una marca de agua del progreso: se ve —la barra cruza la
 * pantalla entera y se llena al entrar— sin meterse en medio de nada.
 *
 * LA BARRA ES LA PIEZA. Por eso engorda de los 7-8px que tenía dentro
 * de la caja a 8px sin caja, que a ancho completo y sin nada alrededor
 * pesa mucho más que antes. La cifra baja de 28px a 14,5: el número
 * mayor del inicio ya no es el único que no se puede pulsar.
 *
 * NI UN BOTÓN, que eso no cambia. El verde de acción es de la franja y
 * de la práctica. Cuando exista la descarga del diploma, este es su
 * sitio y será lo único pulsable aquí.
 *
 * ---------------------------------------------------------------
 * LA CARGA, Y POR QUÉ NO PARPADEA
 *
 * Al entrar, el carril se llena de cero a su sitio (`.llena`), un
 * brillo lo recorre tres veces (`.barre`) y la punta asoma con un halo
 * que se apaga (`.punta`). Se ve moverse cada vez que el alumno abre el
 * inicio, que es cuando lo mira.
 *
 * Y ahí se acaba. Un elemento que late en bucle en una pantalla que se
 * lee entera pide atención sin tener nada que ofrecer a cambio, y
 * además promete una acción que aquí no existe. Carga, llega y se
 * queda. Los tres gestos están en `globals.css` y cumplen su regla: con
 * movimiento reducido la barra sale llena y quieta.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerDiploma({
  estado,
  sendero,
}: {
  estado: EstadoDiploma;
  /**
   * El camino que sustituye a la barra, o nada.
   *
   * Solo lo pasa el inicio. El curso no, y no es un olvido: allí el
   * temario entero está debajo, mes a mes y desplegable, así que un
   * mapa de seis nodos encima sería un resumen de lo que se ve completo
   * dos dedos más abajo.
   */
  sendero?: ReactNode;
}) {
  const t = textosActuales().banners;
  const texto = textoDiploma(estado, t);
  if (texto === null) return null;

  const conseguido = estado.estado === "conseguido";
  const total = estado.estado === "sin-curso" ? 0 : estado.total;
  const hechas = estado.estado === "en-curso" ? estado.completadas : total;

  // Solo para el lector de pantalla: la barra sin narrar es un
  // porcentaje suelto, y el número de al lado no dice de cuántas.
  const descripcion = conseguido
    ? t.cursoCompletado
    : t.faltanParaDiploma(texto.cifra ?? 0, total);

  return (
    <section aria-label={t.tuDiploma}>
      {/* ------------------------- LA LÍNEA -------------------------
          El icono y la frase a la izquierda; el recuento a la derecha,
          en el gris más apagado. El recuento es la escala de la barra:
          sin él, el carril es un porcentaje sin denominador. */}
      <div className="mb-[11px] flex items-baseline justify-between gap-4">
        <p className="flex min-w-0 items-center gap-2.5">
          <IconoDiploma conseguido={conseguido} />
          {texto.cifra === null ? (
            <span className="truncate font-display text-[14.5px] font-bold leading-[1.25] text-marca-verdeOsc">
              {texto.unidad}
            </span>
          ) : (
            <span className="text-pretty text-[14.5px] leading-[1.25] text-marca-tintaMedia">
              <span className="font-display font-bold tabular-nums text-marca-tinta">
                {texto.cifra}
              </span>{" "}
              {texto.unidad}
            </span>
          )}
        </p>

        {total > 0 && (
          <span className="shrink-0 whitespace-nowrap text-[12.5px] leading-none tabular-nums text-marca-grisTenue">
            {t.progresoDiploma(hechas, total)}
          </span>
        )}
      </div>

      {/* O EL SENDERO, DONDE LO HAYA. El inicio pasa un camino y el
          curso no pasa nada, así que cada pantalla cuenta el avance una
          sola vez: allí el mapa, aquí la barra. */}
      {sendero ?? <Barra relleno={texto.relleno} descripcion={descripcion} conseguido={conseguido} />}
    </section>
  );
}

/**
 * El carril del curso entero. El porcentaje solo se ve, no se escribe:
 * la distancia se lee mejor de lo que se cuenta.
 *
 * La punta —el punto claro donde llega el relleno— es el único adorno,
 * y está donde el ojo ya mira. Al llegar al final se convierte en el
 * sello, que es lo único que celebra en toda la pieza.
 */
function Barra({
  relleno,
  descripcion,
  conseguido,
}: {
  relleno: number;
  descripcion: string;
  conseguido: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={relleno}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={descripcion}
      className="relative h-2 rounded-[4px] bg-marca-pista"
    >
      {/* El ancho se queda en línea —es el estado en reposo, y el
          correcto— y lo que se anima es la escala. Ver `.llena`. */}
      <div
        className="barre llena relative h-full overflow-hidden rounded-[4px] bg-gradient-to-r from-marca-verde to-marca-verdeClaro"
        style={{ width: `${relleno}%` }}
      />

      {conseguido ? (
        <span
          aria-hidden
          className="punta absolute right-[-3px] top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full border-2 border-marca-niebla bg-marca-verde"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6.4 10.4l2.4 2.4 4.8-5.2" />
          </svg>
        </span>
      ) : (
        <span
          aria-hidden
          className="punta absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6FD98A]"
          style={{ left: `${relleno}%` }}
        />
      )}
    </div>
  );
}

/**
 * EL DIPLOMA, NO UNA MEDALLA. Un medallón con cinta es el icono de ganar
 * una carrera: premia un resultado y lo compara con el de otros. Un
 * diploma acredita que has hecho un curso, y eso se dibuja como un
 * pergamino: la hoja con su rollo a la izquierda.
 *
 * SIN CÍRCULO DETRÁS. Lo llevaba —52px en móvil, 68 en escritorio— y era
 * la mitad de la altura de la pieza para envolver un icono de 27px. Sin
 * caja alrededor no hay nada que ese círculo separe de nada.
 */
function IconoDiploma({ conseguido }: { conseguido: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="#14722A"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* La hoja. Se cierra sola por la izquierda, donde va el rollo. */}
      <path d="M5.6 4.2h8.6a1.9 1.9 0 0 1 1.9 1.9v7.8a1.9 1.9 0 0 1-1.9 1.9H5.6" />
      {/* El rollo. */}
      <ellipse cx="5.6" cy="10" rx="1.8" ry="5.8" />
      {/* Dos renglones mientras se persigue; un visto cuando ya está. */}
      {conseguido ? (
        <path d="M8.9 10.2l1.7 1.7 3.2-3.4" />
      ) : (
        <path d="M8.9 8.2h4.6M8.9 11.4h3" />
      )}
    </svg>
  );
}
