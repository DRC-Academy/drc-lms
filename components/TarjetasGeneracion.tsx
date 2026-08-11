"use client";

import { URL_FORMULARIO, type ModoGeneracion, type TarjetaModo } from "@/lib/modos";

export type EstadoGeneracion = "listo" | "generando" | "error";

/**
 * El acento de cada modo.
 *
 * El amarillo se queda en la BARRA, que es donde distingue un modo de
 * otro, y no pasa al botón: el amarillo es acento —etiquetas, chips,
 * barras— y las acciones son verdes. Con un botón amarillo, la tarjeta
 * de examen competía con el verde del banner de curso y la página tenía
 * dos llamadas a la acción discutiendo.
 *
 * Sobre blanco el amarillo tampoco llega al contraste mínimo, así que
 * como texto no se usa en ningún caso.
 */
const ACENTO: Record<ModoGeneracion, { barra: string; boton: string }> = {
  repaso: { barra: "bg-marca-verde", boton: "btn-primario" },
  examen: { barra: "bg-marca-amarillo", boton: "btn-primario" },
  contexto: {
    barra: "bg-marca-tinta",
    boton: "bg-marca-tinta text-white hover:bg-drc-titular",
  },
};

function IconoGirando() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[17px] w-[17px] shrink-0 animate-spin" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Enlace al formulario, que vive en Gestión: el LMS no escribe. */
function EnlaceFormulario({ className }: { className: string }) {
  return (
    <a href={URL_FORMULARIO} target="_blank" rel="noopener noreferrer" className={className}>
      Completar mi perfil
    </a>
  );
}

/**
 * Tarjeta única para quien todavía no tiene de dónde tirar. No es un
 * estado de error ni un bloqueo: es una invitación, y cuenta qué gana.
 */
function TarjetaSinDatos() {
  return (
    <article className="tarjeta relative flex flex-col overflow-hidden">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-marca-verde" />
      <p className="eyebrow text-drc-verde-texto">Empieza por aquí</p>
      <h3 className="mt-3 font-display text-[20px] font-semibold leading-tight text-drc-titular">
        Cuéntanos un poco de ti
      </h3>
      <p className="mt-2.5 flex-1 text-pretty text-[15px] leading-[1.55] text-drc-cuerpo">
        Con saber a qué te dedicas y qué quieres conseguir con el inglés, preparamos ejercicios
        con tus situaciones de verdad en lugar de frases de libro. Se tarda dos minutos y lo
        notas desde el primer bloque.
      </p>
      <EnlaceFormulario className="btn btn-primario mt-5 min-h-[46px] w-full wide:w-auto wide:self-start" />
    </article>
  );
}

export default function TarjetasGeneracion({
  tarjetas,
  estado,
  modoActivo,
  onGenerar,
}: {
  tarjetas: TarjetaModo[];
  estado: EstadoGeneracion;
  /** Modo que se está generando ahora mismo, o null si no hay ninguno. */
  modoActivo: ModoGeneracion | null;
  onGenerar: (modo: ModoGeneracion) => void;
}) {
  const generando = estado === "generando";

  // Quien ya tiene alguna tarjeta pero no la de contexto puede desbloquearla.
  // Se ofrece en una línea discreta, nunca como candado ni como requisito.
  const puedeSumarContexto =
    tarjetas.length > 0 && !tarjetas.some((tarjeta) => tarjeta.modo === "contexto");

  return (
    <section aria-labelledby="titulo-practica">
      <div className="border-b border-drc-borde pb-5">
        <h2
          id="titulo-practica"
          className="font-display text-[30px] font-semibold leading-[1.1] text-drc-titular"
        >
          Tu práctica de hoy
        </h2>
        <p className="mt-2 max-w-[52ch] text-pretty text-[15px] leading-[1.55] text-drc-cuerpo">
          {tarjetas.length > 0
            ? "Elige por dónde quieres tirar hoy. Cada bloque son cinco minutos."
            : "En cuanto sepamos un poco más de ti, esto se llena de práctica hecha para ti."}
        </p>
      </div>

      {tarjetas.length === 0 ? (
        <div className="mt-5">
          <TarjetaSinDatos />
        </div>
      ) : (
        <>
          {/* Apiladas en móvil, dos columnas desde `wide`. `items-stretch`
              y la descripción en `flex-1` dejan los botones a la misma altura. */}
          <ul className="mt-5 grid grid-cols-1 items-stretch gap-4 wide:grid-cols-2">
            {tarjetas.map((tarjeta) => {
              const acento = ACENTO[tarjeta.modo];
              const activa = generando && modoActivo === tarjeta.modo;

              return (
                <li key={tarjeta.modo} className="flex">
                  <article className="tarjeta relative flex w-full flex-col overflow-hidden">
                    <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${acento.barra}`} />

                    <p className="eyebrow text-drc-cuerpo">{tarjeta.etiqueta}</p>

                    <h3 className="mt-3 text-balance font-display text-[20px] font-semibold leading-tight text-drc-titular">
                      {tarjeta.titulo}
                    </h3>

                    <p className="mt-2.5 flex-1 text-pretty text-[15px] leading-[1.55] text-drc-cuerpo">
                      {tarjeta.descripcion}
                    </p>

                    <button
                      type="button"
                      onClick={() => onGenerar(tarjeta.modo)}
                      disabled={generando}
                      aria-live="polite"
                      className={`btn mt-5 min-h-[46px] w-full disabled:cursor-wait ${acento.boton}`}
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

          {puedeSumarContexto && (
            <p className="mt-4 text-[14px] leading-[1.55] text-drc-cuerpo">
              ¿Nos cuentas a qué te dedicas? Con eso te preparamos también ejercicios con tus
              situaciones del día a día.{" "}
              <EnlaceFormulario className="font-medium text-drc-verde-texto underline underline-offset-2 transition-colors hover:text-drc-enlace-hover" />
            </p>
          )}
        </>
      )}

      {estado === "error" && (
        <div className="aparece mt-4 rounded-[18px] bg-[#FFF7E0] px-5 py-4">
          <p className="font-display text-[15px] font-semibold text-drc-titular">
            Esta vez no ha salido.
          </p>
          <p className="mt-1 text-[14px] leading-[1.5] text-drc-cuerpo">
            A veces la conexión se hace la remolona. Vuelve a darle y lo preparamos.
          </p>
        </div>
      )}
    </section>
  );
}
