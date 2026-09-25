"use client";

import Link from "next/link";
import { conFoco } from "@/lib/foco";
import { usarIdioma } from "@/components/ProveedorIdioma";
import type { TextosPractica } from "@/lib/textos/practica";
import { Fragment, type ReactNode } from "react";
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
 * SIN BLOQUE PENDIENTE, EL SITIO ES DE LA COMPARATIVA DE RITMO
 * («Ahora puedes llegar más rápido», `ComparativaRitmo`), que llega hecha
 * del servidor en `ritmo`. Sin ella —ya va al plan más alto, o no hay
 * datos— no se pinta nada: la página se cierra con lo de arriba, sin un
 * hueco. Antes aquí iba un hueco vacío que explicaba el botón de arriba;
 * esa explicación ya la da la propia tarjeta de generación.
 */



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
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[26px] w-[92px] rounded-full bg-marca-niebla" />
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
  totalPractica,
  ritmo = null,
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
  /** Cuántos bloques le esperan en «Para ti», generados y de su nivel. */
  totalPractica: number;
  /** Lo que ocupa este sitio sin bloque pendiente: la comparativa de ritmo, o nada. */
  ritmo?: ReactNode;
  /**
   * Adónde llevar la vista al terminar. Tras casi un minuto de espera el
   * alumno puede haber bajado la página: sin esto el bloque aparece
   * fuera de pantalla y la espera termina en nada.
   */
  zonaRef?: React.RefObject<HTMLDivElement>;
}) {
  const t = usarIdioma().t.practica;
  const terminados = new Set(idsTerminados);

  // `bloques` ya viene del más reciente al más antiguo, así que el
  // primero sin terminar es el que le toca.
  const pendiente = bloques.find((bloque) => !terminados.has(bloque.id)) ?? null;
  const esNuevo = pendiente !== null && idsNuevos.includes(pendiente.id);

  const restantes = Math.max(0, totalPractica - (pendiente ? 1 : 0));

  // Sin bloque que enseñar ni uno en camino, el sitio es de la
  // comparativa. `zonaRef` va con ella: es donde aparecerá el bloque
  // cuando se genere, y ahí tiene que llevar la vista.
  if (!generando && !pendiente) {
    return ritmo ? (
      <div ref={zonaRef} className="scroll-mt-24">
        {ritmo}
      </div>
    ) : null;
  }

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
          {pendiente ? t.tuLeccionPersonalizada : t.tusBloques}
        </h2>
        <p className="mt-1 text-pretty text-[14px] leading-[1.4] text-marca-gris min-[900px]:mt-0 min-[900px]:text-[15px]">
          {pendiente ? t.pendiente : t.aquiApareceElQuePrepares}
        </p>
      </div>

      <div className="mt-3.5 min-[900px]:mt-4">
        {generando ? (
          <EsqueletoBloque />
        ) : pendiente ? (
          <TarjetaPendiente
            t={t}
            bloque={pendiente}
            esNuevo={esNuevo}
            alumnoId={alumnoId}
            foco={foco}
            restantes={restantes}
          />
        ) : null}
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
  t,
  bloque,
  esNuevo,
  alumnoId,
  foco,
  restantes,
}: {
  t: TextosPractica;
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
              {t.nuevo}
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
          {t.fases.map((fase, i) => (
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
          {t.empezar}
          <span className="sr-only"> {bloque.titulo}</span>
        </Link>

        {restantes > 0 && (
          <p className="text-center text-[13px] leading-[1.4] text-marca-gris">
            {t.yMasEn(restantes)}{" "}
            <Link
              href={conFoco("/practica", foco)}
              className="font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
            >
              {usarIdioma().t.navegacion.paraTi}
            </Link>
          </p>
        )}
      </div>
    </article>
  );
}
