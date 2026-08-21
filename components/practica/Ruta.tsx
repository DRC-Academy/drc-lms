"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { geometriaRuta, LIENZO, type Parada } from "@/lib/ruta";
import type { TarjetaPractica } from "@/lib/modos";
import type { EstadoGeneracion } from "@/components/usarGenerador";
import type { EtapaGeneracion } from "@/lib/generacion";
import AvanceGeneracion from "@/components/AvanceGeneracion";

/**
 * EL CAMINO DE «PARA TI».
 *
 * Sustituye a la lista de bloques, a la fila destacada y a las cuatro
 * casillas de métrica. Las tres contaban el mismo estado con muebles
 * distintos y ninguna respondía de un vistazo a «¿por dónde iba?».
 *
 * LA LÍNEA VERDE LLEGA HASTA DONDE HAS LLEGADO TÚ, y esa es toda la
 * idea: el avance deja de ser una cifra y pasa a ser una posición. Lo
 * que queda va en traza discontinua, y la última parada —la que sale de
 * la próxima clase— con candado.
 *
 * ---------------------------------------------------------------
 * LA GENERACIÓN VIVE AQUÍ DENTRO, Y ES LA ÚLTIMA PARADA
 *
 * Al pie de la pantalla había un bloque, «Alargar tu ruta», con una
 * tarjeta y un botón que el 90% de las veces estaba apagado. Decía
 * exactamente lo que ya decía el candado de la última parada, así que la
 * pantalla tenía dos piezas contando lo mismo y una de ellas era un
 * botón que no se podía pulsar.
 *
 * Ahora es una sola parada con dos estados:
 *
 *   · CERRADA. Candado, traza discontinua y, al pulsarla, una
 *     explicación: de qué depende, quién lo hace y que se abre sola. Y
 *     ahí acaba. NO LLEVA BOTÓN, NI SIQUIERA APAGADO: el alumno no puede
 *     hacer nada para abrirla —depende de que su profesor suba la clase
 *     siguiente— y ofrecerle un botón muerto es prometer una acción que
 *     no existe.
 *
 *   · ABIERTA. El candado se abre, el nodo pasa a verde y aparece el
 *     único botón de verdad que hay aquí: preparar el bloque. Cuando no
 *     hay otra parada pendiente ocupa la caja blanca —la misma que lleva
 *     la parada de hoy—; si el alumno tiene trabajo a medias, se queda
 *     en su fila con un botón de contorno, porque lo primero es acabar
 *     lo que tiene empezado.
 *
 * ---------------------------------------------------------------
 * DOS ANCHOS, DOS DIBUJOS
 *
 * EN ESCRITORIO, EL CAMINO SERPENTEANTE. El lienzo es 1000×200 y se
 * escala entero: el SVG va a `width:100%` con su relación de aspecto, y
 * las paradas se colocan en PORCENTAJE de esa misma caja, así que camino
 * y nodos cuadran a cualquier ancho sin recalcular nada. Lo único que no
 * escala son los nodos, que llevan medida fija porque son zona táctil.
 *
 * EN MÓVIL, EL MISMO CAMINO DE PIE. A 375px seis nodos con su rótulo se
 * pisan, así que el camino no se encoge: se pone vertical. Se cuenta lo
 * mismo —línea verde hasta donde llegaste, discontinua por delante— con
 * una fila por parada y la de hoy desplegada. Antes aquí no había
 * camino, solo una línea de resumen; la metáfora se caía justo en el
 * ancho por el que entra la mayoría.
 */

export type Generacion = {
  /** Null cuando no hay ninguna fuente: entonces tampoco hay parada. */
  tarjeta: TarjetaPractica | null;
  estado: EstadoGeneracion;
  etapa: EtapaGeneracion;
  progreso: number;
  tardando: boolean;
  mensajeError: string;
  /** El mensaje no es un fallo, es un «todavía no toca». */
  esEspera: boolean;
  onGenerar: () => void;
  onReintentar: () => void;
};

export default function Ruta({
  paradas,
  alumnoId,
  profesor,
  generacion,
}: {
  paradas: Parada[];
  alumnoId: string;
  /** Va en el pie de la parada de hoy: es lo que hace escribir en serio. */
  profesor: string;
  generacion: Generacion;
}) {
  // El aviso del candado. Vive aquí y no en la fila porque en escritorio
  // es un globo sobre el camino y en móvil un desplegable bajo la fila:
  // dos sitios, un solo estado.
  const [avisoAbierto, setAvisoAbierto] = useState(false);

  if (paradas.length === 0) return null;

  const indiceActual = paradas.findIndex((p) => p.tipo === "actual");
  const actual = indiceActual === -1 ? null : paradas[indiceActual];

  const ultima = paradas[paradas.length - 1];
  const paradaGeneracion = ultima.tipo === "generacion" ? ultima : null;
  const esperando = paradaGeneracion !== null && !paradaGeneracion.abierta;

  // Hasta dónde llega el verde. Sin parada actual, hasta el final; pero
  // una parada que todavía no se abre no se pinta como andada, así que
  // el tramo que entra en ella va en discontinuo.
  const corte = Math.max(
    0,
    indiceActual !== -1 ? indiceActual : esperando ? paradas.length - 2 : paradas.length - 1
  );

  const { puntos, recorrido, pendiente } = geometriaRuta(paradas.length, corte);

  const total = paradas.filter((p) => p.tipo !== "resumen").length;
  const hechas = paradas.filter((p) => p.tipo === "hecha").length;
  const agrupadas = paradas.find((p) => p.tipo === "resumen")?.agrupadas ?? 0;

  // Quién se lleva la caja blanca. Primero lo que tiene a medias; si no
  // hay nada a medias, la parada que se puede preparar.
  const foco: Parada | null =
    actual ?? (paradaGeneracion !== null && paradaGeneracion.abierta ? paradaGeneracion : null);

  const rotulo = actual
    ? `vas por la ${actual.numero} de ${total}`
    : paradaGeneracion?.abierta
      ? `${hechas + agrupadas} ${hechas + agrupadas === 1 ? "hecha" : "hechas"}`
      : "al día";

  // En móvil la caja va DENTRO del camino, en la fila a la que
  // pertenece. Sin nada pendiente no hay fila que la reclame, así que se
  // cuelga de la última parada hecha: el estado de la ruta se lee al
  // final de lo andado y la parada cerrada queda debajo, que es su
  // sitio.
  const claveTarjeta =
    foco?.clave ??
    paradas
      .slice()
      .reverse()
      .find((p) => p.tipo !== "generacion")?.clave ??
    ultima.clave;

  const tarjeta = (
    <TarjetaFoco
      foco={foco}
      alumnoId={alumnoId}
      profesor={profesor}
      generacion={generacion}
      hechas={hechas + agrupadas}
    />
  );

  return (
    <section
      aria-label="Tu ruta"
      className="relative overflow-hidden rounded-[24px] border border-marca-rutaBorde bg-marca-ruta px-4 pb-6 pt-5 min-[900px]:rounded-[28px] min-[900px]:px-10 min-[900px]:pb-9 min-[900px]:pt-[34px]"
    >
      {/* Dos formas muy suaves al fondo. Es lo que separa esto de una
          tarjeta blanca más sin meter una ilustración que envejezca. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-marca-rutaForma"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-36 -left-16 h-64 w-64 rounded-full bg-marca-rutaForma2"
      />

      <div className="relative">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
            Tu ruta · {total} {total === 1 ? "parada" : "paradas"}
          </p>
          <p className="shrink-0 text-[12.5px] font-semibold text-marca-verdeOsc">{rotulo}</p>
        </div>

        {/* --------------------------- ESCRITORIO --------------------------- */}
        <div
          className="relative mt-3 hidden min-[900px]:block"
          style={{ aspectRatio: `${LIENZO.ancho} / ${LIENZO.alto}` }}
        >
          <svg
            aria-hidden
            viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
            className="absolute inset-0 h-full w-full"
            fill="none"
          >
            {pendiente !== "" && (
              <path
                d={pendiente}
                stroke="#C4DECF"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="2 16"
              />
            )}
            {recorrido !== "" && (
              <path d={recorrido} stroke="#1E9E3A" strokeWidth="6" strokeLinecap="round" />
            )}
          </svg>

          {paradas.map((parada, i) => (
            <Nodo
              key={parada.clave}
              parada={parada}
              punto={puntos[i]}
              arriba={i % 2 === 1}
              grande={parada.clave === foco?.clave}
              profesor={profesor}
              avisoAbierto={avisoAbierto}
              onAviso={() => setAvisoAbierto((previo) => !previo)}
              onGenerar={generacion.onGenerar}
              generando={generacion.estado === "generando"}
            />
          ))}
        </div>

        <div className="mt-3.5 hidden min-[900px]:block">{tarjeta}</div>

        {/* ------------------------------ MÓVIL ------------------------------ */}
        <div className="mt-3.5 min-[900px]:hidden">
          {paradas.map((parada, i) => (
            <Fila
              key={parada.clave}
              parada={parada}
              andada={i < corte}
              ultima={i === paradas.length - 1}
            >
              {parada.clave === claveTarjeta ? (
                tarjeta
              ) : (
                <RotuloFila
                  parada={parada}
                  profesor={profesor}
                  avisoAbierto={avisoAbierto}
                  onAviso={() => setAvisoAbierto((previo) => !previo)}
                  onGenerar={generacion.onGenerar}
                  generando={generacion.estado === "generando"}
                />
              )}
            </Fila>
          ))}
        </div>

        {/* La espera y el error de la generación, debajo de todo: son de
            la ruta entera, no de una fila. */}
        {generacion.estado === "generando" && (
          <div className="mt-3">
            <AvanceGeneracion
              etapa={generacion.etapa}
              progreso={generacion.progreso}
              tardando={generacion.tardando}
            />
          </div>
        )}

        {generacion.estado === "error" && (
          <div className="aparece mt-3 rounded-[16px] border border-marca-examenBorde bg-marca-examen px-5 py-4">
            <p className="font-display text-[15px] font-bold text-marca-tinta">
              {generacion.esEspera ? "Por ahora, ya está" : "Esta vez no ha salido."}
            </p>
            <p className="mt-1 text-[14px] leading-[1.5] text-marca-gris">
              {generacion.mensajeError}
            </p>
            {/* Sin botón cuando es una espera: reintentar daría lo mismo. */}
            {!generacion.esEspera && (
              <button
                type="button"
                onClick={generacion.onReintentar}
                className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-full btn-verde px-7 text-[15px] font-semibold min-[900px]:w-auto"
              >
                Volver a intentarlo
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// LA CAJA BLANCA
//
// Una sola, y la ocupa lo que toque hacer ahora: la parada de hoy, la
// que se puede preparar, o —cuando no hay ninguna de las dos— el estado
// de la ruta. Nunca hay dos cajas compitiendo.
// ---------------------------------------------------------------

function TarjetaFoco({
  foco,
  alumnoId,
  profesor,
  generacion,
  hechas,
}: {
  foco: Parada | null;
  alumnoId: string;
  profesor: string;
  generacion: Generacion;
  hechas: number;
}) {
  const caja =
    "rounded-[18px] border bg-white p-5 min-[900px]:rounded-[20px] min-[900px]:px-[30px] min-[900px]:py-[26px]";

  // -------------------------- LA PARADA DE HOY --------------------------
  if (foco && foco.tipo === "actual" && foco.bloque) {
    return (
      <article
        className={`${caja} border-marca-rutaTarjeta shadow-[0_14px_32px_-18px_rgba(18,33,26,0.28)] min-[900px]:flex min-[900px]:items-center min-[900px]:gap-9`}
      >
        <div className="min-w-0 min-[900px]:flex-1">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-amarilloTexto min-[900px]:text-[11px]">
              Parada {foco.numero} · {foco.bloque.area}
            </span>
            <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-marca-puntoPendiente" />
            <span className="text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] text-marca-grisSuave min-[900px]:text-[11px]">
              {foco.bloque.ejercicios.length}{" "}
              {foco.bloque.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
            </span>
          </p>

          <h2 className="mt-3 text-balance font-display text-[23px] font-extrabold leading-[1.08] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[32px]">
            {foco.bloque.titulo}
          </h2>

          <p className="mt-2.5 max-w-[56ch] text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia min-[900px]:text-[15.5px] min-[900px]:leading-[1.5]">
            {foco.bloque.intro}
          </p>
        </div>

        <div className="mt-4 shrink-0 min-[900px]:mt-0 min-[900px]:text-center">
          <Link
            href={`/alumno/${alumnoId}/${foco.bloque.id}`}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full btn-verde px-11 text-[16.5px] font-bold shadow-[0_8px_20px_rgba(30,158,58,0.32)] min-[900px]:min-h-[58px] min-[900px]:w-auto min-[900px]:text-[17.5px]"
          >
            Seguir la ruta
            <span className="sr-only"> — {foco.bloque.titulo}</span>
          </Link>
          {profesor !== "" && (
            <p className="mt-2.5 text-center text-[12.5px] leading-[1.4] text-marca-grisSuave min-[900px]:mt-3 min-[900px]:max-w-[22ch] min-[900px]:text-[13px]">
              Lo que escribas al final lo lee {profesor} antes de vuestra próxima clase.
            </p>
          )}
        </div>
      </article>
    );
  }

  // ---------------------- LA PARADA QUE SE PUEDE ABRIR ----------------------
  if (foco && foco.tipo === "generacion") {
    const generando = generacion.estado === "generando";

    return (
      <article
        className={`${caja} border-[1.5px] border-marca-verde shadow-[0_14px_32px_-18px_rgba(18,33,26,0.28)] min-[900px]:flex min-[900px]:items-center min-[900px]:gap-9`}
      >
        <div className="min-w-0 min-[900px]:flex-1">
          <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
            Parada {foco.numero} · lista para abrir
          </p>

          <h2 className="mt-3 text-balance font-display text-[23px] font-extrabold leading-[1.08] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[32px]">
            {profesor !== "" ? `Tu última clase con ${profesor} ya está aquí` : "Tu última clase ya está aquí"}
          </h2>

          {/* De qué está hecho ESTE bloque. Lo redacta el servidor: es lo
              que sostiene la promesa de que sale de lo suyo. */}
          <p className="mt-2.5 max-w-[56ch] text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia min-[900px]:text-[15.5px] min-[900px]:leading-[1.5]">
            {generacion.tarjeta?.descripcion ?? "Diez ejercicios hechos con lo que sabemos de ti."}
          </p>
        </div>

        <div className="mt-4 shrink-0 min-[900px]:mt-0 min-[900px]:text-center">
          <button
            type="button"
            onClick={generacion.onGenerar}
            disabled={generando}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full btn-verde px-11 text-[16.5px] font-bold shadow-[0_8px_20px_rgba(30,158,58,0.32)] disabled:cursor-wait disabled:opacity-60 min-[900px]:min-h-[58px] min-[900px]:w-auto min-[900px]:text-[17.5px]"
          >
            {generando ? "Preparando…" : `Preparar la parada ${foco.numero}`}
          </button>
          <p className="mt-2.5 text-center text-[12.5px] leading-[1.4] text-marca-grisSuave min-[900px]:mt-3 min-[900px]:max-w-[22ch] min-[900px]:text-[13px]">
            Tarda menos de un minuto.
          </p>
        </div>
      </article>
    );
  }

  // ----------------------- TODAVÍA NO HAY NADA HECHO -----------------------
  // Tiene parada —cerrada, esperando a su primera clase— pero no ha
  // cerrado ninguna. «Te has hecho las 0 paradas» sería la frase; lo que
  // toca es contarle qué va a pasar.
  if (hechas === 0) {
    return (
      <div className={`${caja} border-marca-rutaTarjeta`}>
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-amarilloTexto min-[900px]:text-[11px]">
          Parada 1
        </p>
        <h2 className="mt-3 text-balance font-display text-[23px] font-extrabold leading-[1.08] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[30px]">
          Tu ruta empieza con tu primera clase
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia min-[900px]:text-[15.5px] min-[900px]:leading-[1.5]">
          {profesor !== ""
            ? `En cuanto ${profesor} analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo.`
            : "En cuanto tu profesor analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo."}
        </p>
      </div>
    );
  }

  // ------------------------- NADA QUE HACER AHORA -------------------------
  // No se deja el hueco: se dice en qué punto está la ruta y de qué
  // depende la siguiente. Sin celebración y sin premio.
  return (
    <div
      className={`${caja} flex flex-col gap-4 border-marca-rutaTarjeta min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-8`}
    >
      <span
        aria-hidden
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-marca-verde shadow-[0_10px_24px_rgba(30,158,58,0.32)] min-[900px]:h-[84px] min-[900px]:w-[84px]"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-8 w-8 min-[900px]:h-[38px] min-[900px]:w-[38px]"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 10.5l3.5 3.5L15 7" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
          Ruta al día
        </p>
        <h2 className="mt-2.5 text-balance font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[30px]">
          {hechas === 1 ? "Te has hecho la parada que tenías" : `Te has hecho las ${hechas} paradas`}
        </h2>
        <p className="mt-2 max-w-[62ch] text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia min-[900px]:text-[15.5px] min-[900px]:leading-[1.5]">
          {profesor !== ""
            ? `La siguiente sale de tu próxima clase con ${profesor}. Mientras tanto, cualquiera de las hechas se puede repetir.`
            : "La siguiente sale de tu próxima clase. Mientras tanto, cualquiera de las hechas se puede repetir."}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// EL AVISO DEL CANDADO
//
// Lo que se lee al pulsar una parada cerrada. NO TIENE BOTÓN: no hay
// ninguna acción que ofrecer, y «avísame» o «pedir a mi profesor» serían
// promesas que el producto no cumple. Solo cuenta de qué depende y que
// se abre sola.
// ---------------------------------------------------------------

function Aviso({ profesor, onCerrar }: { profesor: string; onCerrar: () => void }) {
  return (
    <>
      <p className="text-[13px] font-bold text-marca-tinta min-[900px]:text-[13.5px]">
        Por qué está cerrada
      </p>
      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[14px]">
        {profesor !== ""
          ? `Esta parada sale de tu próxima clase. En cuanto la deis y ${profesor} suba lo que hayáis trabajado, se abre sola.`
          : "Esta parada sale de tu próxima clase. En cuanto la deis y tu profesor suba lo que hayáis trabajado, se abre sola."}
      </p>
      <p className="mt-2 text-[13.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[14px]">
        No tienes que hacer nada: te la encuentras aquí abierta.
      </p>
      <button
        type="button"
        onClick={onCerrar}
        className="mt-3 text-[13px] font-semibold text-marca-gris transition-colors hover:text-marca-tinta"
      >
        Entendido
      </button>
    </>
  );
}

/** El botón de preparar cuando la parada abierta NO se lleva la caja. */
function BotonPreparar({
  numero,
  onGenerar,
  generando,
}: {
  numero: number | null;
  onGenerar: () => void;
  generando: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onGenerar}
      disabled={generando}
      className="mt-2 inline-flex min-h-[40px] items-center justify-center rounded-full btn-verde-linea bg-white px-5 text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
    >
      {generando ? "Preparando…" : `Preparar la parada ${numero}`}
    </button>
  );
}

// ---------------------------------------------------------------
// MÓVIL: UNA FILA POR PARADA
// ---------------------------------------------------------------

function Fila({
  parada,
  andada,
  ultima,
  children,
}: {
  parada: Parada;
  /** Si el tramo que sale de esta parada ya está andado. */
  andada: boolean;
  ultima: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex w-[34px] shrink-0 flex-col items-center">
        <Marca parada={parada} />
        {!ultima && (
          <span
            aria-hidden
            className="w-0.5 flex-1"
            style={
              andada
                ? { background: "#1E9E3A" }
                : {
                    background:
                      "repeating-linear-gradient(#C4DECF 0 6px, transparent 6px 14px)",
                  }
            }
          />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${ultima ? "" : "pb-3.5"}`}>{children}</div>
    </div>
  );
}

/** Lo que dice una fila que no se lleva la caja blanca. */
function RotuloFila({
  parada,
  profesor,
  avisoAbierto,
  onAviso,
  onGenerar,
  generando,
}: {
  parada: Parada;
  profesor: string;
  avisoAbierto: boolean;
  onAviso: () => void;
  onGenerar: () => void;
  generando: boolean;
}) {
  if (parada.tipo === "resumen") {
    return (
      <div className="pt-1">
        <p className="text-[13.5px] font-semibold text-marca-verdeOsc">{parada.titulo}</p>
        <p className="mt-[3px] text-[12.5px] leading-[1.4] text-marca-grisSuave">
          Las tienes abajo, para repetirlas
        </p>
      </div>
    );
  }

  if (parada.tipo === "hecha") {
    return (
      <div className="pt-1">
        <p className="text-[14px] leading-[1.35] font-medium text-marca-verdeOsc">{parada.titulo}</p>
        {parada.porcentaje !== null && (
          <p className="mt-[2px] text-[12.5px] text-marca-grisSuave">
            <span className="tabular-nums">{parada.porcentaje}%</span> de aciertos
          </p>
        )}
      </div>
    );
  }

  if (parada.tipo === "pendiente") {
    return (
      <div className="pt-1">
        <p className="text-[14px] font-medium leading-[1.35] text-marca-gris">{parada.titulo}</p>
        <p className="mt-[2px] text-[12.5px] text-marca-grisTenue">
          {parada.bloque?.ejercicios.length ?? 10} ejercicios · te espera aquí
        </p>
      </div>
    );
  }

  // ------------------------- LA DE GENERACIÓN -------------------------
  if (parada.abierta) {
    return (
      <div className="pt-1">
        <p className="text-[14px] font-semibold leading-[1.35] text-marca-tinta">
          Parada {parada.numero} · lista para abrir
        </p>
        <BotonPreparar numero={parada.numero} onGenerar={onGenerar} generando={generando} />
      </div>
    );
  }

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onAviso}
        aria-expanded={avisoAbierto}
        className="block w-full text-left"
      >
        <span className="block text-[14px] leading-[1.35] text-marca-grisSuave">
          Parada {parada.numero} · se abre con tu próxima clase
        </span>
        {!avisoAbierto && (
          <span className="mt-[3px] flex items-center gap-1.5 text-[12.5px] text-marca-grisTenue">
            <svg
              aria-hidden
              viewBox="0 0 14 14"
              className="h-3 w-3 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7" cy="7" r="5.6" />
              <path d="M7 6.4v3.4" />
              <path d="M7 4.2v.2" />
            </svg>
            Toca para saber por qué
          </span>
        )}
      </button>

      {avisoAbierto && (
        <div className="aparece relative mt-2.5 rounded-[14px] border border-marca-borde bg-white p-3.5">
          <span
            aria-hidden
            className="absolute -top-[6px] left-4 h-2.5 w-2.5 rotate-45 border-l border-t border-marca-borde bg-white"
          />
          <Aviso profesor={profesor} onCerrar={onAviso} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// ESCRITORIO: UNA PARADA SOBRE EL CAMINO
//
// Medidas fijas a propósito: el lienzo escala, los nodos no. Un nodo que
// encoge con la ventana acaba por debajo de la zona táctil.
//
// EL RÓTULO VA POR FUERA DEL CAMINO, nunca cruzándolo: debajo en las
// paradas de la banda de abajo y encima en las de arriba. Y la parada
// que se lleva la caja blanca no lleva rótulo: lo dice la caja, dos
// dedos más abajo.
// ---------------------------------------------------------------

function Nodo({
  parada,
  punto,
  arriba,
  grande,
  profesor,
  avisoAbierto,
  onAviso,
  onGenerar,
  generando,
}: {
  parada: Parada;
  punto: { x: number; y: number };
  /** Va por la banda alta: su rótulo se coloca encima. */
  arriba: boolean;
  /** Es la parada que se lleva la caja blanca. */
  grande: boolean;
  profesor: string;
  avisoAbierto: boolean;
  onAviso: () => void;
  onGenerar: () => void;
  generando: boolean;
}) {
  const cerrada = parada.tipo === "generacion" && !parada.abierta;
  const nudge = punto.x < 12 ? "-40%" : punto.x > 88 ? "-62%" : "-50%";

  return (
    <>
      <span
        className="absolute grid place-items-center"
        style={{ left: `${punto.x}%`, top: `${punto.y}%`, transform: "translate(-50%, -50%)" }}
      >
        {cerrada ? (
          <button type="button" onClick={onAviso} aria-expanded={avisoAbierto} className="block">
            <Marca parada={parada} grande={grande} />
            <span className="sr-only">Por qué esta parada está cerrada</span>
          </button>
        ) : (
          <Marca parada={parada} grande={grande} />
        )}
      </span>

      {!grande && (
        <span
          className="absolute w-[168px] text-center text-[13px] leading-[1.35]"
          style={{
            left: `${punto.x}%`,
            top: arriba ? `calc(${punto.y}% - 34px)` : `calc(${punto.y}% + 34px)`,
            transform: `translate(${nudge}, ${arriba ? "-100%" : "0"})`,
          }}
        >
          <span className={etiquetaClase(parada)}>{parada.titulo}</span>
          {parada.tipo === "generacion" && parada.abierta && (
            <span className="mt-1 block">
              <BotonPreparar numero={parada.numero} onGenerar={onGenerar} generando={generando} />
            </span>
          )}
        </span>
      )}

      {/* El globo del candado. Cuelga del nodo y se lleva su propia capa:
          en esta banda no hay nada más con lo que competir. */}
      {cerrada && avisoAbierto && (
        <div
          className="aparece absolute z-20 w-[300px] rounded-[16px] border border-marca-borde bg-white p-[18px] shadow-[0_22px_44px_-20px_rgba(18,33,26,0.32)]"
          style={{
            left: `${punto.x}%`,
            top: `calc(${punto.y}% + 40px)`,
            transform: "translate(-86%, 0)",
          }}
        >
          <span
            aria-hidden
            className="absolute -top-[6px] right-[34px] h-2.5 w-2.5 rotate-45 border-l border-t border-marca-borde bg-white"
          />
          <Aviso profesor={profesor} onCerrar={onAviso} />
        </div>
      )}
    </>
  );
}

function etiquetaClase(parada: Parada): string {
  if (parada.tipo === "hecha" || parada.tipo === "resumen") {
    return "font-semibold text-marca-verdeOsc";
  }
  if (parada.tipo === "actual") return "font-semibold text-marca-tinta";
  if (parada.tipo === "generacion") {
    return parada.abierta ? "font-bold text-marca-verdeOsc" : "text-marca-grisSuave";
  }
  return "text-marca-gris";
}

/**
 * El círculo de la parada. Una forma por estado, y la misma en los dos
 * anchos: en móvil encoge, pero no cambia de dibujo.
 */
function Marca({ parada, grande }: { parada: Parada; grande?: boolean }) {
  if (parada.tipo === "actual") {
    return (
      <span
        className={`grid place-items-center rounded-full border-[3px] border-marca-amarillo bg-white shadow-[0_8px_18px_rgba(18,33,26,0.12)] ${
          grande
            ? "h-10 w-10 min-[900px]:h-[92px] min-[900px]:w-[92px] min-[900px]:border-[5px]"
            : "h-10 w-10"
        }`}
      >
        <span
          className={`font-display font-extrabold leading-none tabular-nums text-marca-tinta ${
            grande ? "text-[17px] min-[900px]:text-[27px]" : "text-[17px]"
          }`}
        >
          {parada.numero}
        </span>
      </span>
    );
  }

  if (parada.tipo === "hecha") {
    return (
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-marca-verde shadow-[0_6px_14px_rgba(30,158,58,0.28)] min-[900px]:h-[54px] min-[900px]:w-[54px]">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 min-[900px]:h-[22px] min-[900px]:w-[22px]"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 10.5l3.5 3.5L15 7" />
        </svg>
      </span>
    );
  }

  if (parada.tipo === "resumen") {
    return (
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-marca-verde bg-white min-[900px]:h-[54px] min-[900px]:w-[54px]">
        <span className="font-display text-[12.5px] font-extrabold leading-none tabular-nums text-marca-verdeOsc min-[900px]:text-[15px]">
          +{parada.agrupadas}
        </span>
      </span>
    );
  }

  if (parada.tipo === "generacion") {
    // ABIERTA: el candado se abre y el nodo se enciende. Es el único
    // cambio de estado de la pantalla, así que se ve desde lejos.
    if (parada.abierta) {
      return (
        <span
          className={`grid place-items-center rounded-full bg-marca-verde text-white shadow-[0_0_0_5px_#D7EFDF,0_10px_22px_rgba(30,158,58,0.34)] ${
            grande
              ? "h-10 w-10 min-[900px]:h-[92px] min-[900px]:w-[92px] min-[900px]:border-[5px] min-[900px]:border-marca-verde min-[900px]:bg-white min-[900px]:text-marca-verde min-[900px]:shadow-[0_0_0_9px_rgba(30,158,58,0.10),0_12px_28px_rgba(18,33,26,0.16)]"
              : "h-10 w-10"
          }`}
        >
          <svg
            viewBox="0 0 20 20"
            className={`h-[18px] w-[18px] ${grande ? "min-[900px]:h-8 min-[900px]:w-8" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4.5" y="9" width="11" height="7.5" rx="2" />
            <path d="M7 9V6.6a3 3 0 0 1 5.8-1" />
          </svg>
        </span>
      );
    }

    return (
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-dashed border-marca-rutaTrazo bg-marca-niebla transition-colors hover:border-marca-grisTenue min-[900px]:h-[54px] min-[900px]:w-[54px]">
        <svg
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5 min-[900px]:h-[19px] min-[900px]:w-[19px]"
          fill="none"
          stroke="#8A9891"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4.5" y="8.5" width="11" height="7.5" rx="2" />
          <path d="M7 8.5V6.5a3 3 0 0 1 6 0v2" />
        </svg>
      </span>
    );
  }

  return (
    <span className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-marca-rutaTrazo bg-white min-[900px]:h-[54px] min-[900px]:w-[54px]">
      <span className="font-display text-[13px] font-extrabold leading-none tabular-nums text-marca-grisTenue min-[900px]:text-[17px]">
        {parada.numero}
      </span>
    </span>
  );
}
