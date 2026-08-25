import type { Estimacion } from "@/lib/estimacion";
import { enMeses } from "@/lib/estimacion";

/**
 * EL BANNER DE RITMO. La misma distancia recorrida a dos o tres
 * velocidades, con la fecha de llegada de cada una.
 *
 * LA FECHA ES LO QUE CONVENCE. "29 meses" es abstracto; "mayo de 2028"
 * se entiende de golpe, porque el alumno sabe qué edad tendrá y qué
 * estará haciendo. Por eso la fecha va en la fila y no en una nota.
 *
 * ES EL ÚNICO SITIO DE LA PANTALLA CON FONDO OSCURO, y es deliberado.
 * Todo lo demás son tarjetas blancas sobre niebla; esto es lo único que
 * pide algo. Separarlo por color evita tener que separarlo por tamaño,
 * que le quitaría peso al recorrido.
 *
 * PORTADO DE GESTIÓN, donde este banner existe desde antes en
 * `/progreso/{token}` (`PaceBanner`). El cálculo está en
 * `lib/estimacion.ts`, que es copia declarada de `lib/progressEstimate.ts`
 * de allí. Aquí no se calcula nada: solo se pinta lo que llega.
 *
 * SIN ANIMACIÓN DE ENTRADA. La de Gestión crece las barras desde cero al
 * montar, y para eso necesita estado de cliente. Esta pantalla es entera
 * de servidor —198 B de JavaScript— y meter un componente cliente por
 * una animación sería pagar el arranque de React para que una barra se
 * estire. Las longitudes ya se comparan bien quietas.
 */
export default function Ritmo({
  estimacion,
  urlAmpliar,
}: {
  estimacion: Estimacion;
  /** A dónde lleva "Amplía tu plan". */
  urlAmpliar: string;
}) {
  const mejor = estimacion.opciones[estimacion.opciones.length - 1];
  const metaEsExamen = estimacion.meta.origen === "examen";
  const primeraAmpliacion = estimacion.opciones[1];

  return (
    <section className="mt-7 overflow-hidden rounded-[18px] bg-marca-tinta px-[18px] py-[22px] min-[900px]:mt-9 min-[900px]:px-[30px] min-[900px]:py-7">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-marca-verdeClaro">
        Tu ritmo
      </p>

      <h2 className="mt-2 text-[21px] font-bold leading-[1.2] tracking-[-0.015em] text-white min-[900px]:text-[26px]">
        {estimacion.hayAmpliacion
          ? "Puedes llegar antes de lo que crees"
          : "Vas al mejor ritmo posible"}
      </h2>

      <p className="mt-2.5 max-w-[52ch] text-[14.5px] leading-[1.6] text-white/75 min-[900px]:text-[15px]">
        Para alcanzar el <strong className="font-bold text-white">{estimacion.meta.nivel}</strong>
        {metaEsExamen ? " que preparas" : ""} quedan unas{" "}
        <strong className="font-bold text-white">{estimacion.horasQueFaltan} horas</strong> de
        inglés.{" "}
        {estimacion.hayAmpliacion
          ? "Esto es lo que tardarías según las horas que hagas cada semana."
          : "A tu ritmo actual, esta es la previsión."}
      </p>

      <ol className="mt-5 space-y-4 min-[900px]:mt-6">
        {estimacion.opciones.map((opcion) => (
          <li key={opcion.horasSemanales}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="flex items-center gap-2 text-[14.5px] font-semibold text-white min-[900px]:text-[15.5px]">
                <span className="tabular-nums">{opcion.horasSemanales} h</span> a la semana
                {opcion.esSuPlan && (
                  <span className="rounded-full bg-white/[0.14] px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-white">
                    Tu plan
                  </span>
                )}
              </p>

              <p className="text-[14.5px] font-bold tabular-nums text-marca-amarillo min-[900px]:text-[15.5px]">
                {enMeses(opcion.meses)}
              </p>
            </div>

            {/* La barra. `role="presentation"` porque el dato ya está
                escrito arriba y abajo en palabras: para un lector de
                pantalla esto es decoración, no una tercera fuente. */}
            <div
              role="presentation"
              className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/[0.12]"
            >
              <div
                className={`h-full rounded-full ${
                  opcion.esSuPlan ? "bg-white/45" : "bg-marca-verdeClaro"
                }`}
                style={{ width: `${opcion.porcentajeBarra}%` }}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[13px] text-white/70 min-[900px]:text-[13.5px]">
                Llegarías en {opcion.llegada}
              </p>

              {opcion.mesesAhorrados > 0 && (
                <p className="text-[13px] font-semibold text-marca-verdeClaro min-[900px]:text-[13.5px]">
                  {enMeses(opcion.mesesAhorrados)} antes
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {estimacion.hayAmpliacion && (
        <div className="mt-6 border-t border-white/[0.14] pt-5">
          {/* EL BOTÓN ANTES QUE SU EXPLICACIÓN. En móvil el alumno llega
              aquí con el pulgar ya en la mitad baja de la pantalla, y
              poner dos líneas de texto por delante lo aleja sin añadir
              nada que no diga la lista de arriba. */}
          <a
            href={urlAmpliar}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-marca-amarillo px-6 text-[15.5px] font-bold text-marca-tinta transition-colors hover:bg-[#FFD230] sm:w-auto"
          >
            Amplía tu plan
            <span aria-hidden>→</span>
          </a>

          <p className="mt-3 text-[13.5px] leading-[1.55] text-white/70">
            Con una hora más a la semana llegarías {enMeses(primeraAmpliacion.mesesAhorrados)}{" "}
            antes.
            {mejor.horasSemanales > primeraAmpliacion.horasSemanales &&
              ` Con ${mejor.horasSemanales} horas, ${enMeses(mejor.mesesAhorrados)} antes.`}
          </p>
        </div>
      )}

      {/* LA NOTA AL PIE NO ES LETRA PEQUEÑA DE ABOGADO, es la parte que
          hace que el resto se pueda creer. Va con el mismo texto que en
          Gestión, palabra por palabra: si un alumno abre las dos
          pantallas, la promesa tiene que estar redactada igual. */}
      <p className="mt-6 border-t border-white/[0.14] pt-4 text-[12.5px] leading-[1.6] text-white/55">
        Estimación orientativa. Partimos de las horas de estudio guiado que Cambridge asocia a
        cada nivel del MCER y contamos con que practicas por tu cuenta entre clases. Tu ritmo real
        depende de ti y de tu constancia.
      </p>
    </section>
  );
}
