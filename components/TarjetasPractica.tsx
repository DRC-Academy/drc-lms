"use client";

import type { TarjetaPractica } from "@/lib/modos";
import type { EstadoGeneracion } from "@/components/TarjetasGeneracion";
import type { Bloque } from "@/lib/data";
import type { EtapaGeneracion } from "@/lib/generacion";
import AvanceGeneracion from "@/components/AvanceGeneracion";
import BloquesGenerados from "@/components/BloquesGenerados";

/**
 * La tarjeta de práctica del inicio.
 *
 * Es la parte que hace distinto a este producto: los ejercicios se
 * generan de lo que el alumno trabajó en su última clase, de lo que
 * arrastra de las anteriores, de su perfil y de su examen. Por eso va
 * justo debajo del curso y no al final de la página.
 *
 * UNA TARJETA, NO TRES. Antes había una por modo y el alumno elegía cuál
 * de sus tres fuentes quería hoy; ahora el bloque las combina y la
 * pantalla lo refleja: una tarjeta que nombra de qué está hecho SU
 * bloque —la descripción la redacta el servidor con lo que ese alumno
 * tiene de verdad— y un botón.
 *
 * Con eso se ha ido también el mapa de colores por modo. Sobraba: el
 * color distinguía tres cosas y ya solo hay una. Queda la tarjeta
 * blanca, el punto verde y el botón verde, que es lo que ya llevaba la
 * de repaso, que era la que veía casi todo el mundo.
 *
 * FORMA HORIZONTAL EN ESCRITORIO —texto a la izquierda, botón a la
 * derecha— en vez de una columna estrecha en medio de una fila vacía.
 * Es lo que ya hacía la composición cuando al alumno le tocaba una sola
 * tarjeta, que ahora es siempre.
 *
 * `/practica` mantiene su propia composición en `TarjetasGeneracion`:
 * allí la sección vive en otro contexto y estas medidas no encajan.
 */

function IconoGirando() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[17px] w-[17px] shrink-0 animate-spin" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function TarjetasPractica({
  tarjeta,
  profesor,
  estado,
  etapa,
  progreso,
  tardando,
  mensajeError,
  esEspera,
  generados,
  idsNuevos,
  alumnoId,
  totalPractica,
  zonaNuevos,
  onGenerar,
  onReintentar,
}: {
  /** Null cuando no hay ninguna fuente de la que tirar. */
  tarjeta: TarjetaPractica | null;
  /** Va en el subtítulo: es lo que hace que esto no parezca genérico. */
  profesor: string;
  estado: EstadoGeneracion;
  /** Etapa que el servidor dice estar ejecutando. */
  etapa: EtapaGeneracion;
  /** De 0 a 95 mientras se espera; 100 solo con el bloque ya en la mano. */
  progreso: number;
  /** La espera se ha pasado del presupuesto previsto. */
  tardando: boolean;
  mensajeError: string;
  /** El mensaje no es un fallo, es un "todavía no toca". */
  esEspera: boolean;
  /** Todos los generados del alumno, el más reciente primero. */
  generados: Bloque[];
  /** Los de esta visita: los únicos que llevan el sello "Nuevo". */
  idsNuevos: string[];
  alumnoId: string;
  /** Cuántos bloques tiene en total, para el enlace a la práctica. */
  totalPractica: number;
  /** Adónde llevar la vista cuando el bloque está listo. */
  zonaNuevos: React.RefObject<HTMLDivElement>;
  onGenerar: () => void;
  onReintentar: () => void;
}) {
  const generando = estado === "generando";

  const subtitulo =
    tarjeta === null
      ? "En cuanto sepamos un poco más de ti, esto se llena de práctica hecha para ti."
      : profesor !== ""
        ? `Diez ejercicios a partir de tu perfil y de lo que trabajas con ${profesor}.`
        : "Diez ejercicios a partir de tu perfil y de lo que trabajas en clase.";

  return (
    <section aria-labelledby="titulo-practica" className="mt-[26px] lg:mt-10">
      <div className="lg:flex lg:items-baseline lg:gap-3.5">
        <h2
          id="titulo-practica"
          className="shrink-0 font-display text-[19px] font-bold text-marca-tinta lg:text-[24px]"
        >
          Tu práctica de hoy
        </h2>
        <p className="mt-1 text-pretty text-[13.5px] leading-[1.4] text-marca-gris lg:mt-0 lg:text-[15px]">
          {subtitulo}
        </p>
      </div>

      {tarjeta && (
        <article className="mt-3.5 flex flex-col rounded-[16px] border border-marca-borde bg-white p-[18px] lg:mt-4 lg:flex-row lg:items-center lg:gap-6 lg:rounded-[18px] lg:p-6">
          <div className="lg:min-w-0 lg:flex-1">
            <p className="flex items-center gap-[7px] lg:gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-marca-verde lg:h-[7px] lg:w-[7px]" />
              <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-gris lg:text-[11px]">
                {tarjeta.etiqueta}
              </span>
            </p>

            <h3 className="mt-2.5 text-pretty font-display text-[18px] font-bold leading-[1.2] text-marca-tinta lg:mt-3 lg:text-[21px]">
              {tarjeta.titulo}
            </h3>

            <p className="mt-[7px] text-pretty text-[14px] leading-[1.45] text-marca-tintaMedia lg:mt-[9px] lg:text-[15px] lg:leading-[1.5]">
              {tarjeta.descripcion}
            </p>

            {/* Mientras no toca, la tarjeta cuenta de qué depende. Va
                antes del botón para que se lea primero el porqué y
                después el botón apagado, y no al revés. */}
            {tarjeta.espera && (
              <p className="mt-2.5 text-[13px] leading-[1.45] text-marca-gris lg:mt-3 lg:text-[13.5px]">
                {tarjeta.espera.nota}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onGenerar}
            disabled={generando || tarjeta.espera !== null}
            aria-live="polite"
            className={`mt-3.5 flex min-h-[44px] w-full items-center justify-center rounded-full px-6 py-[13px] text-[15px] font-semibold leading-[1.1] transition-colors disabled:cursor-default lg:mt-0 lg:w-auto lg:shrink-0 ${
              tarjeta.espera
                ? "bg-marca-pista text-marca-grisInactivo"
                : "btn-verde disabled:cursor-wait disabled:opacity-60"
            }`}
          >
            {generando && <IconoGirando />}
            <span className={generando ? "ml-2" : ""}>
              {generando ? "Preparando…" : (tarjeta.espera?.etiquetaBoton ?? tarjeta.llamada)}
            </span>
          </button>
        </article>
      )}

      {generando && <AvanceGeneracion etapa={etapa} progreso={progreso} tardando={tardando} />}

      {/* Justo debajo de la tarjeta y del panel de avance: el hueco
          animado marca dónde va a caer el bloque y luego se convierte en
          él, sin que la página se mueva. */}
      <BloquesGenerados
        bloques={generados}
        idsNuevos={idsNuevos}
        alumnoId={alumnoId}
        generando={generando}
        totalPractica={totalPractica}
        zonaRef={zonaNuevos}
      />

      {estado === "error" && (
        <div className="aparece mt-4 rounded-[16px] bg-marca-examen px-5 py-4">
          <p className="font-display text-[15px] font-bold text-marca-tinta">
            {esEspera ? "Por ahora, ya está" : "Esta vez no ha salido."}
          </p>
          <p className="mt-1 text-[14px] leading-[1.5] text-marca-gris">{mensajeError}</p>
          {/* Sin botón cuando es una espera: reintentar daría lo mismo. */}
          {!esEspera && (
            <button
              type="button"
              onClick={onReintentar}
              className="btn btn-verde mt-4 min-h-[42px] w-full wide:w-auto"
            >
              Volver a intentarlo
            </button>
          )}
        </div>
      )}
    </section>
  );
}
