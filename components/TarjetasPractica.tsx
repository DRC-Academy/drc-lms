"use client";

import { type ModoGeneracion, type TarjetaModo } from "@/lib/modos";
import type { EstadoGeneracion } from "@/components/TarjetasGeneracion";

/**
 * Las tarjetas de práctica del inicio.
 *
 * Es la parte que hace distinto a este producto: los ejercicios se
 * generan desde el perfil del alumno y desde lo que trabajó en su última
 * clase, así que van justo debajo del curso y no al final de la página.
 *
 * EL NÚMERO DE TARJETAS DECIDE EL LAYOUT. Con dos o tres, columnas
 * iguales y los botones alineados abajo con `mt-auto`, porque los textos
 * vienen de la API y tienen dos, tres o cuatro líneas según el alumno:
 * sin eso, los botones bailan. Con una sola tarjeta la fila cambia a
 * horizontal —texto a la izquierda, botón a la derecha— en vez de dejar
 * dos tercios de ancho vacíos.
 *
 * NINGÚN BOTÓN ES AMARILLO, tampoco el de examen. El amarillo es acento
 * —el punto, la etiqueta del banner— y las acciones son verdes: con un
 * botón amarillo, la tarjeta de examen competiría con el «Continuar» del
 * banner y la pantalla tendría dos llamadas discutiendo.
 *
 * `/practica` mantiene su propia composición en `TarjetasGeneracion`:
 * allí la lista vive en una columna estrecha y estas medidas no encajan.
 */

const ESTILO: Record<ModoGeneracion, { tarjeta: string; punto: string }> = {
  repaso: { tarjeta: "border-marca-borde bg-white", punto: "bg-marca-verde" },
  examen: { tarjeta: "border-marca-examenBorde bg-marca-examen", punto: "bg-marca-amarillo" },
  contexto: { tarjeta: "border-marca-contextoBorde bg-marca-contexto", punto: "bg-marca-tinta" },
};

function IconoGirando() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[17px] w-[17px] shrink-0 animate-spin" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function TarjetasPractica({
  tarjetas,
  profesor,
  estado,
  modoActivo,
  onGenerar,
}: {
  tarjetas: TarjetaModo[];
  /** Va en el subtítulo: es lo que hace que esto no parezca genérico. */
  profesor: string;
  estado: EstadoGeneracion;
  /** Modo que se está generando ahora mismo, o null si no hay ninguno. */
  modoActivo: ModoGeneracion | null;
  onGenerar: (modo: ModoGeneracion) => void;
}) {
  const generando = estado === "generando";
  const horizontal = tarjetas.length === 1;

  const columnas =
    tarjetas.length >= 3 ? "lg:grid-cols-3" : tarjetas.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

  const subtitulo =
    tarjetas.length === 0
      ? "En cuanto sepamos un poco más de ti, esto se llena de práctica hecha para ti."
      : profesor !== ""
      ? `Generada a partir de tu perfil y de lo que trabajas con ${profesor}. Cada bloque, cinco minutos.`
      : "Generada a partir de tu perfil y de lo que trabajas en clase. Cada bloque, cinco minutos.";

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

      {tarjetas.length > 0 && (
        <ul className={`mt-3.5 grid grid-cols-1 items-stretch gap-3 lg:mt-4 lg:gap-5 ${columnas}`}>
          {tarjetas.map((tarjeta) => {
            const estilo = ESTILO[tarjeta.modo];
            const activa = generando && modoActivo === tarjeta.modo;

            return (
              <li key={tarjeta.modo} className="flex">
                <article
                  className={`flex w-full flex-col rounded-[16px] border p-[18px] lg:rounded-[18px] lg:p-6 ${
                    estilo.tarjeta
                  } ${horizontal ? "lg:flex-row lg:items-center lg:gap-6" : ""}`}
                >
                  <div className={horizontal ? "lg:min-w-0 lg:flex-1" : ""}>
                    <p className="flex items-center gap-[7px] lg:gap-2">
                      <span aria-hidden className={`h-1.5 w-1.5 rounded-full lg:h-[7px] lg:w-[7px] ${estilo.punto}`} />
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
                  </div>

                  <button
                    type="button"
                    onClick={() => onGenerar(tarjeta.modo)}
                    disabled={generando}
                    aria-live="polite"
                    className={`flex min-h-[44px] w-full items-center justify-center rounded-full bg-marca-verde px-6 py-[13px] text-[15px] font-semibold leading-[1.1] text-white transition-colors hover:bg-marca-verdeOsc disabled:cursor-wait disabled:opacity-60 ${
                      horizontal ? "mt-3.5 lg:mt-0 lg:w-auto lg:shrink-0" : "mt-3.5 lg:mt-auto"
                    }`}
                  >
                    {activa && <IconoGirando />}
                    <span className={activa ? "ml-2" : ""}>
                      {activa ? "Preparando…" : tarjeta.llamada}
                    </span>
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {estado === "error" && (
        <div className="aparece mt-4 rounded-[16px] bg-marca-examen px-5 py-4">
          <p className="font-display text-[15px] font-bold text-marca-tinta">Esta vez no ha salido.</p>
          <p className="mt-1 text-[14px] leading-[1.5] text-marca-gris">
            A veces la conexión se hace la remolona. Vuelve a darle y lo preparamos.
          </p>
        </div>
      )}
    </section>
  );
}
