"use client";

import type { TarjetaPractica } from "@/lib/modos";
import type { EstadoGeneracion } from "@/components/TarjetasGeneracion";
import type { EtapaGeneracion } from "@/lib/generacion";
import AvanceGeneracion from "@/components/AvanceGeneracion";

/**
 * La tarjeta que prepara el bloque, en el inicio.
 *
 * VIVE EN LA COLUMNA DERECHA, junto a la franja del curso y no debajo de
 * todo. Esa columna fue de la invitación al perfil y luego del anillo del
 * diploma; al encoger el diploma a una fila quedó libre y se la lleva
 * esto, que es lo que hace distinto al producto. Antes estaba tercera en
 * una pantalla de tres, y en móvil eso significa que la mitad de la
 * gente no llegaba a verla.
 *
 * Aquí solo está LA TARJETA y lo que la acompaña mientras trabaja —la
 * barra de avance y el error—. La lista de bloques vive en
 * `BloquesGenerados`, debajo de la rejilla, porque va a ancho completo y
 * esta columna mide 416px.
 *
 * SIN COLOR PROPIO. Es una tarjeta blanca como las demás; lo que la
 * destaca es el sello ámbar y ser la única con botón verde a la vista.
 * Con la franja del curso ya en tinta, un tercer color aquí volvería a
 * dar una pantalla con dos llamadas discutiendo.
 */

function IconoGirando() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[17px] w-[17px] shrink-0 animate-spin" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** El sello: lo único que dice, sin leer, que esto no es material fijo. */
function SelloNuevo() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-marca-examenBorde bg-marca-examen px-2.5 py-[5px]">
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="h-[13px] w-[13px]"
        fill="none"
        stroke="#9A7B00"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 2.5 11.9 7l4.6.4-3.5 3 1.1 4.5L10 12.5 5.9 14.9 7 10.4l-3.5-3L8.1 7 10 2.5Z" />
      </svg>
      <span className="text-[11.5px] font-semibold leading-none text-marca-amarilloTexto">
        Nuevo tras cada clase
      </span>
    </span>
  );
}

export default function TarjetaGeneracion({
  tarjeta,
  estado,
  etapa,
  progreso,
  tardando,
  mensajeError,
  esEspera,
  onGenerar,
  onReintentar,
}: {
  /** Null cuando no hay ninguna fuente de la que tirar. */
  tarjeta: TarjetaPractica | null;
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
  onGenerar: () => void;
  onReintentar: () => void;
}) {
  const generando = estado === "generando";

  // Sin ninguna fuente no hay tarjeta que ofrecer. La invitación a
  // completar el perfil vive en «Para ti», que es donde está pegada a lo
  // que promete.
  if (tarjeta === null) return null;

  return (
    <div className="flex flex-col gap-3">
      <article className="flex flex-col rounded-[16px] border border-marca-borde bg-white p-[18px] shadow-[0_10px_24px_rgba(18,33,26,0.07)] lg:rounded-[20px] lg:p-6">
        <p className="flex flex-wrap items-center gap-2">
          <SelloNuevo />
        </p>

        <h2 className="mt-3.5 text-pretty font-display text-[20px] font-bold leading-[1.15] text-marca-tinta lg:mt-4 lg:text-[24px]">
          {tarjeta.titulo}
        </h2>

        <p className="mt-2 text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia lg:mt-2.5 lg:text-[15px]">
          {tarjeta.descripcion}
        </p>

        {/* Mientras no toca, la tarjeta cuenta de qué depende. Va antes
            del botón para que se lea primero el porqué y después el
            botón apagado, y no al revés. */}
        {tarjeta.espera && (
          <p className="mt-3 text-[13px] leading-[1.45] text-marca-gris lg:text-[13.5px]">
            {tarjeta.espera.nota}
          </p>
        )}

        {/* `mt-auto` pega el botón al fondo: en escritorio esta tarjeta
            comparte fila con la franja del curso y así el botón no se
            queda flotando a media altura. */}
        <button
          type="button"
          onClick={onGenerar}
          disabled={generando || tarjeta.espera !== null}
          aria-live="polite"
          className={`mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-[15.5px] font-bold leading-[1.1] transition-colors disabled:cursor-default lg:mt-auto lg:pt-0 ${
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

      {generando && <AvanceGeneracion etapa={etapa} progreso={progreso} tardando={tardando} />}

      {estado === "error" && (
        <div className="aparece rounded-[16px] border border-marca-examenBorde bg-marca-examen px-5 py-4">
          <p className="font-display text-[15px] font-bold text-marca-tinta">
            {esEspera ? "Por ahora, ya está" : "Esta vez no ha salido."}
          </p>
          <p className="mt-1 text-[14px] leading-[1.5] text-marca-gris">{mensajeError}</p>
          {/* Sin botón cuando es una espera: reintentar daría lo mismo. */}
          {!esEspera && (
            <button
              type="button"
              onClick={onReintentar}
              className="btn btn-verde mt-4 min-h-[44px] w-full"
            >
              Volver a intentarlo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
