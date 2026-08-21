"use client";

import Link from "next/link";
import { Fragment } from "react";
import type { Bloque } from "@/lib/data";

/**
 * Lo que el inicio enseña de los bloques del alumno.
 *
 * UNO SOLO, EL QUE TIENE PENDIENTE, Y HASTA QUE LO HAGA.
 *
 * Antes esto pintaba hasta cinco tarjetas con su botón de «Empezar», y
 * desde ellas se llegaba al mismo ejercicio que desde la pestaña. Dos
 * puertas al mismo sitio y ninguna con memoria de la otra: el alumno lo
 * hacía desde el inicio y al día siguiente lo veía otra vez ahí. La
 * conclusión razonable es que la plataforma le está repitiendo trabajo.
 *
 * La regla de ahora quita ese problema sin dejar la pantalla vacía: se
 * enseña el más reciente que NO haya terminado. En cuanto lo termina
 * desaparece de aquí, así que nadie se reencuentra nada. Y mientras lo
 * tiene a medias, el inicio se lo recuerda, que es justo lo que hacía
 * falta.
 *
 * EL HUECO VACÍO TAMBIÉN ES DISEÑO. Sin bloque pendiente esto no se
 * queda en blanco ni se rellena con contenido de adorno: dice qué falta,
 * quién lo hace y cuánto tarda, y apunta al único botón que lo llena.
 * Es el estado que ve un alumno nuevo —86 de los 168 no tienen ningún
 * bloque generado— así que es el que decide si entiende la aplicación.
 */

const FASES = ["Reconocer", "Transformar", "Producir"];

/**
 * El hueco que ocupa el bloque mientras se genera.
 *
 * Copia las medidas de la tarjeta real —mismo alto de título, mismas
 * tres fases, mismo botón— para que al llegar el bloque no salte nada.
 * Un esqueleto que no mide lo que va a sustituir mueve la página justo
 * en el momento en que el alumno por fin va a leer algo.
 */
function EsqueletoBloque() {
  return (
    <div
      aria-hidden
      className="esqueleto rounded-[16px] border border-marca-borde bg-white p-[18px] lg:rounded-[18px] lg:p-6"
    >
      {/* El sello «Nuevo», que es lo único que va encima del título
          desde que se fueron el área y los minutos. */}
      <span className="block h-[24px] w-[62px] rounded-full bg-marca-pista" />
      <span className="mt-2.5 block h-[21px] w-[58%] rounded-md bg-marca-pista lg:mt-3 lg:h-[23px]" />
      <span className="mt-2.5 block h-[14px] w-full rounded-md bg-marca-niebla" />
      <span className="mt-2 block h-[14px] w-[72%] rounded-md bg-marca-niebla" />
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {FASES.map((fase) => (
          <span key={fase} className="block h-[26px] w-[92px] rounded-full bg-marca-niebla" />
        ))}
      </div>
      <span className="mt-3.5 block h-[44px] w-full rounded-full bg-marca-pista lg:w-[150px]" />
    </div>
  );
}

export default function BloquesGenerados({
  bloques,
  idsNuevos,
  idsTerminados,
  alumnoId,
  generando,
  puedeGenerar,
  totalPractica,
  zonaRef,
}: {
  /** Todos los generados del alumno, el más reciente primero. */
  bloques: Bloque[];
  /** Los creados en esta visita: solo estos llevan el sello «Nuevo». */
  idsNuevos: string[];
  /** Los que ya ha cerrado con un intento completo. Desaparecen de aquí. */
  idsTerminados: string[];
  alumnoId: string;
  /** Con true se enseña el hueco animado del que está en camino. */
  generando: boolean;
  /**
   * Si el botón de arriba se puede pulsar ahora mismo. Decide si el
   * estado vacío señala el botón o cuenta de qué depende: mandar a
   * pulsar algo que está apagado es peor que no decir nada.
   */
  puedeGenerar: boolean;
  /** Cuántos bloques le esperan en «Para ti», generados y de su nivel. */
  totalPractica: number;
  /**
   * Adónde llevar la vista al terminar. Tras casi un minuto de espera el
   * alumno puede haber bajado la página: sin esto el bloque aparece
   * fuera de pantalla y la espera termina en nada.
   */
  zonaRef?: React.RefObject<HTMLDivElement>;
}) {
  const terminados = new Set(idsTerminados);

  // `bloques` ya viene del más reciente al más antiguo, así que el
  // primero sin terminar es el que le toca.
  const pendiente = bloques.find((bloque) => !terminados.has(bloque.id)) ?? null;
  const esNuevo = pendiente !== null && idsNuevos.includes(pendiente.id);

  const restantes = Math.max(0, totalPractica - (pendiente ? 1 : 0));

  return (
    <section ref={zonaRef} aria-labelledby="titulo-bloques" className="scroll-mt-24">
      {/* «TU LECCIÓN PERSONALIZADA», NO «TU BLOQUE PREPARADO». «Bloque» es
          nuestra palabra —viene de la tabla `bloques_generados`— y no
          dice qué es ni qué tiene de particular; «lección personalizada»
          dice las dos cosas y la segunda es la promesa entera del
          producto.

          OJO: el rename está solo AQUÍ. El botón de arriba sigue siendo
          «Preparar mi bloque» y el hueco vacío sigue hablando de
          bloques, así que por ahora el alumno lee dos nombres para la
          misma cosa. Cambiarlo entero es un repaso de copy aparte —y de
          concordancia: «el que prepares» pasa a «la que prepares»—.

          Y DEBAJO, «PENDIENTE» A SECAS. Decía «Lo tienes aquí hasta que
          lo termines», que explicaba una regla nuestra; lo que el alumno
          necesita saber de un vistazo es en qué estado está. */}
      <div className="lg:flex lg:items-baseline lg:gap-3.5">
        <h2
          id="titulo-bloques"
          className="shrink-0 font-display text-[17px] font-bold text-marca-tinta lg:text-[20px]"
        >
          {pendiente ? "Tu lección personalizada" : "Tus bloques"}
        </h2>
        <p className="mt-1 text-pretty text-[14px] leading-[1.4] text-marca-gris lg:mt-0 lg:text-[15px]">
          {pendiente ? "Pendiente" : "Aquí aparece el que prepares, listo para empezarlo."}
        </p>
      </div>

      <div className="mt-3.5 lg:mt-4">
        {generando ? (
          <EsqueletoBloque />
        ) : pendiente ? (
          <TarjetaPendiente bloque={pendiente} esNuevo={esNuevo} alumnoId={alumnoId} restantes={restantes} />
        ) : (
          <HuecoVacio
            sinNinguno={bloques.length === 0}
            puedeGenerar={puedeGenerar}
            totalPractica={totalPractica}
          />
        )}
      </div>
    </section>
  );
}

/**
 * El bloque que tiene a medias, o recién hecho.
 *
 * En móvil se apila; a partir de `min-[900px]` el botón se va a una
 * columna propia a la derecha, porque a lo ancho un botón de borde a
 * borde deja de leerse como un botón.
 */
function TarjetaPendiente({
  bloque,
  esNuevo,
  alumnoId,
  restantes,
}: {
  bloque: Bloque;
  esNuevo: boolean;
  alumnoId: string;
  restantes: number;
}) {
  return (
    <article
      className={`flex flex-col gap-5 rounded-[16px] border bg-white p-[18px] min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-7 lg:rounded-[18px] lg:p-6 ${
        esNuevo ? "aparece border-marca-amarillo" : "border-marca-borde"
      }`}
      style={esNuevo ? { boxShadow: "0 0 0 3px rgba(255, 196, 0, 0.14)" } : undefined}
    >
      <div className="min-w-0 flex-1">
        {/* SIN «GRAMÁTICA · 10 MIN» ENCIMA DEL TÍTULO. El área ya la dice
            el título del bloque con sus palabras, y los minutos son una
            estimación nuestra sobre lo que tarda otra persona: quien va
            más despacio la lee como un suspenso. Es la misma regla que
            «Para ti», donde no se enseña ni un minuto (ver
            `PanelPractica`); esto era el último sitio que los enseñaba.

            Arriba solo queda el sello «Nuevo», y solo el día que lo es. */}
        {esNuevo && (
          <p>
            <span className="inline-flex items-center rounded-full bg-marca-amarillo px-2.5 py-1 text-[11px] font-semibold leading-none text-marca-tinta">
              Nuevo
            </span>
          </p>
        )}

        <h3
          className={`text-pretty font-display text-[18px] font-bold leading-[1.2] text-marca-tinta lg:text-[21px] ${
            esNuevo ? "mt-2.5 lg:mt-3" : ""
          }`}
        >
          {bloque.titulo}
        </h3>

        <p className="mt-[7px] max-w-[70ch] text-pretty text-[14px] leading-[1.45] text-marca-tintaMedia lg:mt-2 lg:text-[15px] lg:leading-[1.5]">
          {bloque.intro}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {FASES.map((fase, i) => (
            <Fragment key={fase}>
              {i > 0 && (
                <span aria-hidden className="text-[13px] text-marca-grisTenue">
                  →
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-marca-niebla px-3 py-1 text-[12px] font-medium leading-none text-marca-gris">
                {fase}
              </span>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 min-[900px]:w-[220px]">
        <Link
          href={`/alumno/${alumnoId}/${bloque.id}`}
          className="flex min-h-[48px] items-center justify-center rounded-full btn-verde px-8 text-[15.5px] font-bold leading-[1.1]"
        >
          Empezar
          <span className="sr-only"> {bloque.titulo}</span>
        </Link>

        {restantes > 0 && (
          <p className="text-center text-[13px] leading-[1.4] text-marca-gris">
            y {restantes} más en{" "}
            <Link
              href="/practica"
              className="font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
            >
              Para ti
            </Link>
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * El mismo sitio, sin bloque pendiente.
 *
 * Tres situaciones distintas y ninguna es "no hay nada": no ha preparado
 * ninguno todavía, los ha hecho todos, o le toca esperar a su próxima
 * clase. La flecha solo aparece cuando de verdad hay un botón que
 * pulsar; señalar uno apagado sería mandar a chocarse contra él.
 */
function HuecoVacio({
  sinNinguno,
  puedeGenerar,
  totalPractica,
}: {
  sinNinguno: boolean;
  puedeGenerar: boolean;
  totalPractica: number;
}) {
  const titulo = sinNinguno ? "Todavía no has preparado ninguno" : "Los has hecho todos";

  const cuerpo = sinNinguno
    ? puedeGenerar
      ? "Pulsa «Preparar mi bloque» y en menos de un minuto tienes diez ejercicios hechos con tu última clase, con lo que se te repite y con tu examen. Aparecerán aquí."
      : "En cuanto tu profesor analice tu primera clase, preparamos aquí tu primer bloque de diez ejercicios."
    : puedeGenerar
      ? "Prepara otro cuando quieras: sale de tu última clase, de lo que se te repite y de tu examen."
      : "En cuanto tengas tu próxima clase, aquí aparece el siguiente.";

  return (
    <div className="flex flex-col items-start gap-6 rounded-[16px] border-[1.5px] border-dashed border-marca-puntoPendiente bg-marca-casiBlanco p-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-10 min-[900px]:px-11 min-[900px]:py-10 lg:rounded-[18px]">
      <span
        aria-hidden
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-marca-verdeFondo min-[900px]:h-[84px] min-[900px]:w-[84px]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 min-[900px]:h-[34px] min-[900px]:w-[34px]"
          fill="none"
          stroke="#1E9E3A"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3.5 14.3 9l5.7.5-4.3 3.7 1.3 5.6L12 15.9l-5 2.9 1.3-5.6L4 9.5 9.7 9 12 3.5Z" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="text-pretty font-display text-[19px] font-bold leading-[1.2] text-marca-tinta min-[900px]:text-[22px]">
          {titulo}
        </h3>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[14.5px] leading-[1.55] text-marca-tintaMedia min-[900px]:text-[15.5px]">
          {cuerpo}
        </p>

        {!sinNinguno && totalPractica > 0 && (
          <p className="mt-3 text-[13.5px] leading-[1.45] text-marca-gris">
            Puedes repetir cualquiera desde{" "}
            <Link
              href="/practica"
              className="font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
            >
              Para ti
            </Link>
            .
          </p>
        )}
      </div>

      {/* La flecha apunta al botón que llena esto: arriba a la derecha en
          escritorio, arriba a secas en móvil. Solo cuando se puede
          pulsar. */}
      {puedeGenerar && (
        <div className="hidden shrink-0 flex-col items-center gap-2.5 pr-2 min-[900px]:flex">
          <svg
            aria-hidden
            viewBox="0 0 60 80"
            className="h-20 w-[60px]"
            fill="none"
            stroke="#1E9E3A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 74 C 8 40, 22 12, 50 8" strokeDasharray="5 7" />
            <path d="M39 6 L 51 7.5 L 47 19" />
          </svg>
          <span className="max-w-[130px] text-center text-[13.5px] font-semibold leading-[1.4] text-marca-verdeOsc">
            Está ahí arriba
          </span>
        </div>
      )}
    </div>
  );
}
