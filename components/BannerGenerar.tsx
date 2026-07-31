"use client";

export type EstadoGeneracion = "listo" | "generando" | "error";

/** Los pasos que se van mostrando mientras se prepara el bloque. */
export const PASOS_GENERACION = [
  "Revisando tu última clase…",
  "Eligiendo lo que toca practicar…",
  "Preparando los ejercicios…",
];

function IconoChispa() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2.5 11.6 7 16 8.6 11.6 10.2 10 14.7 8.4 10.2 4 8.6 8.4 7Z" />
      <path d="M15.5 13.5 16.2 15.3 18 16 16.2 16.7 15.5 18.5 14.8 16.7 13 16 14.8 15.3Z" />
    </svg>
  );
}

function IconoGirando() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0 animate-spin" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path
        d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BannerGenerar({
  ultimaClase,
  estado,
  paso,
  generadosEstaSemana,
  onGenerar,
}: {
  /** Tema de la última clase del alumno: es lo que da sentido al banner. */
  ultimaClase: string;
  estado: EstadoGeneracion;
  /** Índice dentro de PASOS_GENERACION mientras se genera. */
  paso: number;
  generadosEstaSemana: number;
  onGenerar: () => void;
}) {
  const generando = estado === "generando";

  return (
    <section className="relative isolate overflow-hidden rounded-[26px] bg-drc-banner px-6 py-7 sm:px-9 sm:py-9">
      {/* Acento cálido: da profundidad sin competir con el botón. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-drc-amarillo/25 blur-3xl"
      />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-drc-amarillo" />

      <div className="relative">
        <p className="eyebrow text-drc-amarillo">Práctica a medida</p>

        <h2 className="mt-3.5 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.015em] text-white sm:text-[34px]">
          Genera tu próxima clase
        </h2>

        <p className="mt-3 max-w-[52ch] text-pretty text-[15px] leading-[1.55] text-white/75 sm:text-[16px]">
          A partir de lo que viste en tu última clase sobre{" "}
          <span className="font-medium text-white">{ultimaClase}</span>, preparamos un bloque nuevo
          para ti.
        </p>

        {estado === "error" ? (
          <div className="mt-6 rounded-2xl bg-white/10 px-5 py-4">
            <p className="font-display text-[15px] font-semibold text-white">
              Esta vez no ha salido.
            </p>
            <p className="mt-1 text-[14px] leading-[1.5] text-white/70">
              A veces la conexión se hace la remolona. Vuelve a intentarlo y lo preparamos.
            </p>
            <button
              type="button"
              onClick={onGenerar}
              className="btn btn-amarillo mt-4 min-h-[48px] w-full sm:w-auto"
            >
              <IconoChispa />
              <span className="ml-2">Probar de nuevo</span>
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onGenerar}
              disabled={generando}
              aria-live="polite"
              className="btn mt-7 min-h-[52px] w-full bg-drc-verde-solido px-7 text-[15px] text-white hover:bg-drc-verde-solido-hover disabled:cursor-wait disabled:opacity-90 sm:w-auto"
            >
              {generando ? <IconoGirando /> : <IconoChispa />}
              <span className="ml-2.5">
                {generando ? PASOS_GENERACION[paso] : "Generar bloque nuevo"}
              </span>
            </button>

            <p className="mt-3.5 text-[13px] leading-[1.5] text-white/50">
              {generadosEstaSemana === 0
                ? "Aún no has generado ningún bloque esta semana."
                : generadosEstaSemana === 1
                ? "Llevas 1 bloque nuevo esta semana."
                : `Llevas ${generadosEstaSemana} bloques nuevos esta semana.`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
