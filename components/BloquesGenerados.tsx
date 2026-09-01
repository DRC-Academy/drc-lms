"use client";

import Link from "next/link";
import { conFoco } from "@/lib/foco";
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
      className="esqueleto rounded-[16px] border border-marca-borde bg-white p-[18px] min-[900px]:rounded-[18px] min-[900px]:p-6"
    >
      {/* El sello «Nuevo», que es lo único que va encima del título
          desde que se fueron el área y los minutos. */}
      <span className="block h-[24px] w-[62px] rounded-full bg-marca-pista" />
      <span className="mt-2.5 block h-[21px] w-[58%] rounded-md bg-marca-pista min-[900px]:mt-3 min-[900px]:h-[23px]" />
      <span className="mt-2.5 block h-[14px] w-full rounded-md bg-marca-niebla" />
      <span className="mt-2 block h-[14px] w-[72%] rounded-md bg-marca-niebla" />
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {FASES.map((fase) => (
          <span key={fase} className="block h-[26px] w-[92px] rounded-full bg-marca-niebla" />
        ))}
      </div>
      <span className="mt-3.5 block h-[44px] w-full rounded-full bg-marca-pista min-[900px]:w-[150px]" />
    </div>
  );
}

export default function BloquesGenerados({
  bloques,
  idsNuevos,
  idsTerminados,
  alumnoId,
  foco = null,
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
  /** Contexto de revisión de los enlaces a «Para ti». Ver `lib/foco.ts`. */
  foco?: string | null;
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
      <div className="min-[900px]:flex min-[900px]:items-baseline min-[900px]:gap-3.5">
        <h2
          id="titulo-bloques"
          className="shrink-0 font-display text-[17px] font-bold text-marca-tinta min-[900px]:text-[20px]"
        >
          {pendiente ? "Tu lección personalizada" : "Tus bloques"}
        </h2>
        <p className="mt-1 text-pretty text-[14px] leading-[1.4] text-marca-gris min-[900px]:mt-0 min-[900px]:text-[15px]">
          {pendiente ? "Pendiente" : "Aquí aparece el que prepares, listo para empezarlo."}
        </p>
      </div>

      <div className="mt-3.5 min-[900px]:mt-4">
        {generando ? (
          <EsqueletoBloque />
        ) : pendiente ? (
          <TarjetaPendiente
            bloque={pendiente}
            esNuevo={esNuevo}
            alumnoId={alumnoId}
            foco={foco}
            restantes={restantes}
          />
        ) : (
          <HuecoVacio
            sinNinguno={bloques.length === 0}
            puedeGenerar={puedeGenerar}
            totalPractica={totalPractica}
            foco={foco}
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
  foco,
  restantes,
}: {
  bloque: Bloque;
  esNuevo: boolean;
  alumnoId: string;
  foco: string | null;
  restantes: number;
}) {
  return (
    <article
      className={`flex flex-col gap-5 rounded-[16px] border bg-white p-[18px] min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-7 min-[900px]:rounded-[18px] min-[900px]:p-6 ${
        // EL BLOQUE QUE SUSTITUYE AL ESQUELETO ENTRA DIFUMINADO.
        // Llevaba `aparece`, que son 6px de deslizamiento: el mismo
        // gesto exacto con el que entra un mensaje de error dos
        // componentes más abajo. Mismo movimiento para «ya está tu
        // bloque» y para «esto ha fallado».
        //
        // `entra-difuminado` lo separa por el motivo correcto: aquí no
        // aparece algo nuevo, se SUSTITUYE el esqueleto que ocupaba ese
        // hueco, y sin desenfoque se ven un instante los dos objetos
        // solapados. El desenfoque los funde y el ojo lee una sola
        // transformación en vez de un cambiazo.
        esNuevo ? "entra-difuminado border-marca-amarillo" : "border-marca-borde"
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
          className={`text-pretty font-display text-[18px] font-bold leading-[1.2] text-marca-tinta min-[900px]:text-[21px] ${
            esNuevo ? "mt-2.5 min-[900px]:mt-3" : ""
          }`}
        >
          {bloque.titulo}
        </h3>

        <p className="mt-[7px] max-w-[70ch] text-pretty text-[14px] leading-[1.45] text-marca-tintaMedia min-[900px]:mt-2 min-[900px]:text-[15px] min-[900px]:leading-[1.5]">
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
              href={conFoco("/practica", foco)}
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
  foco,
}: {
  sinNinguno: boolean;
  puedeGenerar: boolean;
  totalPractica: number;
  foco: string | null;
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
    <div className="flex flex-col items-start gap-6 rounded-[16px] border-[1.5px] border-dashed border-marca-puntoPendiente bg-marca-casiBlanco p-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-10 min-[900px]:px-11 min-[900px]:py-10 min-[900px]:rounded-[18px]">
      <DibujoDeClase />

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
              href={conFoco("/practica", foco)}
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

/**
 * DE DÓNDE SALE UN BLOQUE: DE UNA CONVERSACIÓN.
 *
 * Aquí había una estrella de cinco puntas dentro de un círculo verde.
 * Una estrella significa «nuevo», que es exactamente lo que ya dice el
 * sello ámbar de la tarjeta de arriba, así que el único dibujo de la
 * pantalla estaba gastado en repetir una palabra. Y es el dibujo que
 * más gente ve: 86 de 168 alumnos no tienen ningún bloque generado, o
 * sea que para la mitad de la academia esta es la única ilustración del
 * producto.
 *
 * Ahora dibuja lo que un bloque ES: dos bocadillos, uno del profesor y
 * otro del alumno, y de ellos sale la hoja de ejercicios. Es literal
 * —el bloque se genera de la última clase— y es lo que separa a esta
 * academia de una aplicación de autoestudio: detrás de cada ejercicio
 * hubo una persona hablando contigo.
 *
 * ---------------------------------------------------------------
 * POR QUÉ NO ES UN ICONO, Y POR QUÉ NO ES UN EMOJI
 *
 * Los trazos no cierran del todo y las líneas no son rectas perfectas:
 * las esquinas quedan abiertas y los bocadillos están ligeramente
 * torcidos y a distinta altura. Eso es lo que separa un dibujo de un
 * pictograma —un icono de set es geométricamente perfecto, y la
 * perfección se lee como sistema, no como mano—.
 *
 * Un emoji habría sido más rápido y habría dado lo contrario: se dibuja
 * distinto en cada sistema operativo, no hereda el color de la marca, y
 * al lado de los SVG a mano de esta aplicación se ve pegado. Con un
 * público que llega a los sesenta, además, la carita es la frontera
 * exacta entre cálido e infantil.
 * ---------------------------------------------------------------
 *
 * En cálido y no en verde: el verde es el color de «pulsa aquí» y esto
 * no se pulsa. La única nota verde es la hoja, que es lo que el alumno
 * va a recibir.
 */
function DibujoDeClase() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 132 108"
      className="h-[92px] w-[112px] shrink-0 min-[900px]:h-28 min-[900px]:w-[132px]"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* EL BOCADILLO DEL PROFESOR. El más grande y el que habla
          primero, arriba a la izquierda. Relleno cálido: es quien pone
          el contexto. */}
      <path
        d="M8 14 q0-6 6-6 h44 q6 0 6 6 v22 q0 6-6 6 h-30 l-10 9 v-9 h-4 q-6 0-6-6 z"
        fill="#FBF7EF"
        stroke="#C0A97A"
        strokeWidth="2.2"
      />
      <path d="M20 21h30M20 29h20" stroke="#C0A97A" strokeWidth="2" opacity="0.75" />

      {/* EL DEL ALUMNO. Más pequeño, a la derecha y un poco más abajo:
          responde. La cola mira al otro lado para que se lean como una
          conversación y no como dos avisos. */}
      <path
        d="M74 34 q0-5 5-5 h40 q5 0 5 5 v18 q0 5-5 5 h-26 l-9 8 v-8 h-5 q-5 0-5-5 z"
        fill="#FFFFFF"
        stroke="#C0A97A"
        strokeWidth="2.2"
        opacity="0.9"
      />
      <path d="M85 40h24M85 47h15" stroke="#C0A97A" strokeWidth="2" opacity="0.6" />

      {/* LA HOJA QUE SALE DE LOS DOS. Verde, porque es lo único de este
          dibujo que el alumno va a poder hacer. Ligeramente girada: sale
          de una conversación, no de una imprenta. */}
      <g transform="rotate(-4 56 86)">
        <path
          d="M32 68 h48 q4 0 4 4 v30 q0 4-4 4 h-48 q-4 0-4-4 v-30 q0-4 4-4 z"
          fill="#F0FAF2"
          stroke="#1E9E3A"
          strokeWidth="2.2"
        />
        <path d="M40 78h32M40 86h32M40 94h20" stroke="#1E9E3A" strokeWidth="2" opacity="0.55" />
      </g>

      {/* Los dos puntos que bajan del bocadillo a la hoja: el hilo entre
          lo que se habló y lo que se practica. */}
      <path d="M96 64 v3M92 71 v3" stroke="#C0A97A" strokeWidth="2.4" opacity="0.5" />
    </svg>
  );
}
