"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  bandasMovil,
  curvaMovil,
  geometriaRuta,
  plegarRuta,
  tramoRuta,
  LIENZO,
  LIENZO_MOVIL,
  PCT_BANDA,
  type Parada,
  type Plegado,
} from "@/lib/ruta";
import type { TarjetaPractica } from "@/lib/modos";
import type { EstadoGeneracion } from "@/components/usarGenerador";
import type { EtapaGeneracion } from "@/lib/generacion";
import { recogerParadaCerrada } from "@/lib/cierre-ruta";
import AvanceGeneracion from "@/components/AvanceGeneracion";

/**
 * EL CAMINO DE «PARA TI».
 *
 * LA LÍNEA VERDE LLEGA HASTA DONDE HAS LLEGADO TÚ, y esa es toda la
 * idea: el avance deja de ser una cifra y pasa a ser una posición. Lo
 * que queda va en piedras, y la última parada —la que sale de la próxima
 * clase— con candado.
 *
 * ---------------------------------------------------------------
 * DOS ANCHOS, DOS DIBUJOS, UN SOLO LENGUAJE
 *
 * EN ESCRITORIO, EL CAMINO SERPENTEANTE. El lienzo es 1000×200 y se
 * escala entero: el SVG va a `width:100%` con su relación de aspecto, y
 * las paradas se colocan en PORCENTAJE de esa misma caja. Lo único que
 * no escala son los nodos, que llevan medida fija porque son zona
 * táctil.
 *
 * EN MÓVIL, EL MISMO CAMINO DE PIE. Un sendero que serpentea de lado a
 * lado según baja, con las paradas alternando entre tres bandas.
 *
 * EN EL MAPA NO HAY TEXTO, Y ESA ES LA REGLA QUE LO SOSTIENE. El trazo
 * barre todo el ancho en cada tramo, así que cualquier rótulo colgado al
 * lado acaba cruzado por la curva en cuanto el título ocupa dos líneas:
 * no existe un lado seguro. Así que el mapa lleva solo nodos —marca,
 * número, candado— y TODO el texto vive en una tarjeta a todo el ancho,
 * debajo del nodo elegido y por delante del trazo. Un título de cinco
 * líneas ya no puede romper nada, porque no hay nada que romper.
 *
 * ---------------------------------------------------------------
 * LA PARADA DISPONIBLE LLAMA, Y NO CON UNA SOLA SEÑAL
 *
 * Cinco a la vez, y cuatro funcionan sin color y sin movimiento: es la
 * única en el centro del sendero, la única al triple de área, la única
 * con fondo verde y aro ámbar, la única con la chapa «Estás aquí» y la
 * única que respira. El icono es un CANDADO ABIERTO —el mismo que lleva
 * cerrado la última parada—, así que el camino entero se lee como una
 * secuencia de cerraduras.
 *
 * ---------------------------------------------------------------
 * LA GENERACIÓN VIVE AQUÍ DENTRO, Y ES LA ÚLTIMA PARADA
 *
 * Al pie de la pantalla había un bloque, «Alargar tu ruta», con una
 * tarjeta y un botón que el 90% de las veces estaba apagado. Decía lo
 * mismo que el candado de la última parada. Ahora es una sola parada con
 * dos estados:
 *
 *   · CERRADA. Candado, traza discontinua y, al elegirla, una
 *     explicación: de qué depende, quién lo hace y que se abre sola. Y
 *     ahí acaba. NO LLEVA BOTÓN, NI SIQUIERA APAGADO: el alumno no puede
 *     hacer nada para abrirla y ofrecerle un botón muerto es prometer una
 *     acción que no existe.
 *
 *   · ABIERTA. El candado se abre, el nodo se enciende y aparece el
 *     único botón de verdad que hay aquí: preparar el bloque.
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

/** Icono del candado, cerrado o abierto. El abierto es el de la parada
 *  disponible; el cerrado, el de la que aún no existe. */
function Candado({
  abierto,
  clase,
  arco,
}: {
  abierto: boolean;
  clase: string;
  /** Solo en el abierto: el arco se levanta con el pulso. */
  arco?: boolean;
}) {
  return (
    <svg viewBox="0 0 20 20" className={clase} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {abierto ? (
        <>
          <rect x="4.5" y="9" width="11" height="7.5" rx="2" />
          <path className={arco ? "ruta-arco" : undefined} d="M7 9V6.6a3 3 0 0 1 5.8-1" />
        </>
      ) : (
        <>
          <rect x="4.6" y="8.8" width="10.8" height="7.4" rx="2" />
          <path d="M7 8.8V6.6a3 3 0 0 1 6 0v2.2" />
        </>
      )}
    </svg>
  );
}

function Marca({ traza }: { traza?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-[21px] w-[21px] min-[900px]:h-[22px] min-[900px]:w-[22px]"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Al cerrar la parada la marca se dibuja; el resto del tiempo ya
          está ahí. */}
      <path className={traza ? "ruta-traza" : undefined} d="M5 10.5l3.5 3.5L15 7" />
    </svg>
  );
}

/** El disco de una parada recién cerrada: se llena de verde y se traza
 *  la marca dentro, con el aro apagándose de ámbar a verde. */
function DiscoCerrando({ medida }: { medida: number }) {
  return (
    <span
      className="ruta-disco ruta-apaga relative grid place-items-center rounded-full border-[3px] border-marca-verde bg-marca-verdeFondo shadow-[0_4px_0_#14722A,0_9px_16px_rgba(30,158,58,0.22)]"
      style={{ width: medida, height: medida }}
    >
      <span className="ruta-llena absolute inset-0 grid place-items-center rounded-full bg-marca-verde">
        <Marca traza />
      </span>
    </span>
  );
}

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
  // Los dos grupos del plegado. Empiezan cerrados: el alumno viene a
  // seguir, no a leer su historial.
  const [plegado, setPlegado] = useState<Plegado>({ atras: false, delante: false });
  // Qué parada tiene la tarjeta. Null es «la que toca».
  const [elegida, setElegida] = useState<string | null>(null);
  // Si la parada disponible se ha ido de la pantalla, y por qué lado.
  const [lejos, setLejos] = useState(false);
  const [haciaArriba, setHaciaArriba] = useState(false);
  // La parada que ACABA de cerrarse, mientras dura su animación.
  const [cerrando, setCerrando] = useState<string | null>(null);

  const nodoActual = useRef<HTMLSpanElement | null>(null);
  const filas = useRef<Record<string, HTMLDivElement | null>>({});
  const notaLeida = useRef(false);

  // ---------------------------------------------------------------
  // EL CIERRE DE UNA PARADA
  //
  // El alumno vuelve de hacer el bloque y la ruta ya llega rehecha del
  // servidor: la parada verde y la siguiente disponible. La nota que
  // dejó `components/Practica` al cerrarlo es lo único que dice que eso
  // acaba de pasar, y se consume al leerla, así que se ve una vez.
  //
  // Si la nota falta —modo privado, otra pestaña, recarga— no pasa
  // nada: la ruta se pinta igual, sin animación.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (notaLeida.current) return;
    notaLeida.current = true;

    const clave = recogerParadaCerrada();
    if (clave === null) return;

    // Solo si de verdad quedó cerrada: si el guardado no llegó, la
    // parada sigue siendo la actual y no hay nada que celebrar.
    const parada = paradas.find((p) => p.clave === clave);
    if (!parada || parada.tipo !== "hecha") return;

    setCerrando(clave);
    const reloj = setTimeout(() => setCerrando(null), 1150);
    return () => clearTimeout(reloj);
  }, [paradas]);

  const visibles = useMemo(() => plegarRuta(paradas, plegado), [paradas, plegado]);
  const bandas = useMemo(() => bandasMovil(visibles), [visibles]);

  const actual = visibles.find((p) => p.tipo === "actual") ?? null;
  const cierre = visibles.find((p) => p.tipo === "generacion") ?? null;

  // Quién se lleva la tarjeta por defecto: lo que tiene a medias; si no
  // hay nada a medias, la parada que ya se puede preparar.
  const foco: Parada | null = actual ?? (cierre?.abierta ? cierre : null);
  const claveTarjeta =
    (elegida && visibles.some((p) => p.clave === elegida) ? elegida : null) ??
    foco?.clave ??
    visibles[visibles.length - 1]?.clave ??
    null;
  const conTarjeta = visibles.find((p) => p.clave === claveTarjeta) ?? null;

  // El pie sale cuando el botón no está en pantalla: porque el alumno se
  // ha ido lejos en el mapa, o porque está mirando otra parada.
  useEffect(() => {
    const nodo = nodoActual.current;
    if (!nodo || typeof IntersectionObserver === "undefined") {
      setLejos(false);
      return;
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        setLejos(!entrada.isIntersecting);
        setHaciaArriba(entrada.boundingClientRect.top < 0);
      },
      { rootMargin: "-72px 0px -140px 0px" }
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [actual?.clave, claveTarjeta]);

  // El pie es `fixed`, así que no ocupa sitio y taparía el final de la
  // página. El hueco se reserva en el `body` mientras el pie exista, con
  // el mismo truco que ya usa la navegación inferior.
  const conPie = actual !== null && (lejos || claveTarjeta !== actual.clave);
  useEffect(() => {
    if (!conPie) return;
    document.body.classList.add("con-pie-ruta");
    return () => document.body.classList.remove("con-pie-ruta");
  }, [conPie]);

  if (paradas.length === 0) return null;

  const total = paradas.filter((p) => p.tipo !== "resumen").length;
  const hechas = paradas.filter((p) => p.tipo === "hecha").length;

  const rotulo = actual
    ? `vas por la ${actual.numero} de ${total}`
    : cierre?.abierta
      ? `${hechas} ${hechas === 1 ? "hecha" : "hechas"}`
      : "al día";

  // ESCRITORIO: hasta dónde llega el verde. Una parada que todavía no se
  // abre no se pinta como andada, así que el tramo que entra en ella va
  // en discontinuo.
  const indiceActual = visibles.findIndex((p) => p.tipo === "actual");
  const esperando = cierre !== null && !cierre.abierta;
  const corte = Math.max(
    0,
    indiceActual !== -1 ? indiceActual : esperando ? visibles.length - 2 : visibles.length - 1
  );
  // Mientras se cierra una parada, el camino se pinta como estaba ANTES
  // —el tramo recién andado todavía en piedras— y encima se le colorea.
  // Sin esto no habría nada que ver: llegaría ya verde del servidor.
  const indiceCerrando =
    cerrando === null ? -1 : visibles.findIndex((p) => p.clave === cerrando);
  const corteVisual = indiceCerrando === -1 ? corte : Math.max(0, corte - 1);
  const { puntos, recorrido, pendiente } = geometriaRuta(visibles.length, corteVisual);

  // Al volver de cerrar un bloque no hay entrada escalonada: el alumno
  // ya conoce este mapa y lo que tiene que ver es lo que ha cambiado.
  const animarEntrada = cerrando === null;

  /** Al plegar o desplegar cambian de sitio muchas filas. Se mide el nodo
   *  tocado antes y después y se corrige el scroll: el mapa crece, pero
   *  lo que tenías bajo el dedo no se mueve. */
  const sinSalto = (clave: string, accion: () => void) => {
    const antes = filas.current[clave]?.getBoundingClientRect().top ?? null;
    accion();
    if (antes === null) return;
    requestAnimationFrame(() => {
      const ahora = filas.current[clave]?.getBoundingClientRect().top ?? null;
      if (ahora !== null) window.scrollBy(0, ahora - antes);
    });
  };

  const alPulsar = (parada: Parada) => {
    if (parada.tipo === "resumen") {
      const cual = parada.futuro ? "delante" : "atras";
      sinSalto(parada.clave, () =>
        setPlegado((previo) => ({ ...previo, [cual]: !previo[cual] }))
      );
      return;
    }
    sinSalto(parada.clave, () => setElegida(parada.clave));
  };

  const tarjeta = (
    <Tarjeta
      parada={conTarjeta}
      alumnoId={alumnoId}
      profesor={profesor}
      generacion={generacion}
      hechas={hechas}
      numeroActual={actual?.numero ?? null}
    />
  );

  return (
    <>
      <section
        aria-label="Tu ruta"
        className="relative overflow-hidden rounded-[24px] border border-marca-rutaBorde bg-marca-ruta px-0 pb-6 pt-5 min-[900px]:rounded-[28px] min-[900px]:px-10 min-[900px]:pb-9 min-[900px]:pt-[34px]"
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
          <div className="flex items-baseline justify-between gap-4 px-4 min-[900px]:px-0">
            <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
              Tu ruta · {total} {total === 1 ? "parada" : "paradas"}
            </p>
            <p className="shrink-0 text-[12.5px] font-semibold text-marca-verdeOsc">{rotulo}</p>
          </div>

          {/* --------------------------- ESCRITORIO ---------------------------
              El margen deja sitio a la chapa de «Estás aquí», que cuelga
              por encima de su nodo y en la banda alta se saldría del
              campo —y el campo recorta—. */}
          <div
            className="relative mt-11 hidden min-[900px]:block"
            style={{ aspectRatio: `${LIENZO.ancho} / ${LIENZO.alto}` }}
          >
            <svg
              aria-hidden
              viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
              className="absolute inset-0 h-full w-full"
              fill="none"
            >
              {/* El lecho del camino: es lo que lo convierte en sendero y
                  no en línea. */}
              <path
                d={`${recorrido} ${pendiente}`.trim()}
                stroke="#DCEEE4"
                strokeWidth="16"
                strokeLinecap="round"
              />
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
              {/* El tramo que acaba de andarse, coloreándose. */}
              {indiceCerrando !== -1 && (
                <path
                  className="ruta-colorea"
                  d={tramoRuta(visibles.length, indiceCerrando)}
                  stroke="#1E9E3A"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {visibles.map((parada, i) => (
              <Nodo
                key={parada.clave}
                parada={parada}
                punto={puntos[i]}
                arriba={i % 2 === 1}
                grande={parada.clave === claveTarjeta}
                retraso={animarEntrada ? Math.min(i, 9) * 70 : null}
                cerrando={parada.clave === cerrando}
                ascendiendo={indiceCerrando !== -1 && parada.tipo === "actual"}
                onPulsar={() => alPulsar(parada)}
                onGenerar={generacion.onGenerar}
                generando={generacion.estado === "generando"}
              />
            ))}
          </div>

          <div className="mt-3.5 hidden min-[900px]:block">{tarjeta}</div>

          {/* ------------------------------ MÓVIL ------------------------------
              Una fila por parada: el nodo anclado arriba y la curva bajando
              de ahí al siguiente, estirándose con lo que ocupe la fila. */}
          <div
            className={`relative min-[900px]:hidden ${
              visibles[0]?.tipo === "actual" ? "mt-[104px]" : "mt-10"
            }`}
          >
            {visibles.map((parada, i) => {
              const banda = bandas[i];
              const esActiva = parada.tipo === "actual";
              const esUltima = i === visibles.length - 1;
              const suya = parada.clave === claveTarjeta;
              const seCierra = parada.clave === cerrando;
              // El tramo que sale de la parada que se cierra se pinta
              // todavía en piedras: encima se le colorea el verde.
              const andado =
                !seCierra &&
                (parada.tipo === "hecha" || (parada.tipo === "resumen" && !parada.futuro));
              const retraso = animarEntrada ? Math.min(i, 9) * 70 : null;
              const d = esUltima ? "" : curvaMovil(banda, bandas[i + 1], suya);

              return (
                <div
                  key={parada.clave}
                  ref={(nodo) => {
                    filas.current[parada.clave] = nodo;
                  }}
                  className="relative"
                  style={{
                    minHeight: suya ? undefined : esUltima ? 62 : esActiva ? 132 : 96,
                  }}
                >
                  <svg
                    aria-hidden
                    viewBox={`0 0 ${LIENZO_MOVIL} 100`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 z-0 h-full w-full"
                    fill="none"
                  >
                    <g
                      className={retraso === null ? undefined : "ruta-asoma"}
                      style={retraso === null ? undefined : { animationDelay: `${retraso}ms` }}
                    >
                      <path
                        d={d}
                        stroke="#D9EDE1"
                        strokeWidth="17"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Solo marcha UN tramo: el que sale de donde estás. */}
                      <path
                        className={esActiva && !esUltima ? "ruta-marcha" : undefined}
                        d={d}
                        stroke={andado ? "#1E9E3A" : "#C4DECF"}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={andado ? undefined : "0.5 15"}
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Y el que acaba de andarse, coloreándose. */}
                      {seCierra && !esUltima && (
                        <path
                          className="ruta-colorea"
                          d={d}
                          stroke="#1E9E3A"
                          strokeWidth="6"
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </g>
                  </svg>

                  <span
                    ref={esActiva ? nodoActual : undefined}
                    className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: PCT_BANDA[banda], top: 0 }}
                  >
                    {esActiva && (
                      <span
                        className={`absolute bottom-full left-1/2 mb-3 -translate-x-1/2 ${
                          retraso === null ? "" : "ruta-brota"
                        }`}
                        style={
                          retraso === null ? undefined : { animationDelay: `${retraso + 320}ms` }
                        }
                      >
                        <span className="relative inline-flex items-center whitespace-nowrap rounded-full bg-marca-amarillo px-[15px] py-[7px] text-[12.5px] font-bold text-marca-tinta shadow-[0_4px_0_#E0A800,0_8px_16px_rgba(18,33,26,0.16)]">
                          Estás aquí
                          <span
                            aria-hidden
                            className="absolute -bottom-[4px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-marca-amarillo"
                          />
                        </span>
                      </span>
                    )}

                    <span
                      className={retraso === null ? "block" : "ruta-entra"}
                      style={retraso === null ? undefined : { animationDelay: `${retraso + 110}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() => alPulsar(parada)}
                        aria-expanded={suya}
                        className={`ruta-nodo block ${esActiva ? "ruta-halo" : ""}`}
                      >
                        <span
                          className={
                            indiceCerrando !== -1 && esActiva
                              ? "ruta-asciende"
                              : esActiva
                                ? "ruta-latido"
                                : "block"
                          }
                        >
                          <DiscoMovil parada={parada} cerrando={seCierra} />
                        </span>
                        <span className="sr-only">{rotuloDe(parada)}</span>
                        {suya && parada.tipo !== "resumen" && (
                          <span
                            aria-hidden
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#9BB8A6]"
                            style={{
                              width: parada.tipo === "actual" ? 90 : 60,
                              height: parada.tipo === "actual" ? 90 : 60,
                            }}
                          />
                        )}
                      </button>
                    </span>
                  </span>

                  {/* El grupo no abre tarjeta: solo pliega y despliega. Pero
                      dice lo que guarda, junto a su nodo. */}
                  {parada.tipo === "resumen" && (
                    <div
                      className={`relative z-10 ${
                        banda === "izq"
                          ? "ml-[28%] mr-[5%] text-left"
                          : "ml-[5%] mr-[28%] text-right"
                      }`}
                    >
                      <p
                        className={`-mt-3.5 text-[13.5px] font-semibold leading-[1.3] ${
                          parada.futuro ? "text-marca-gris" : "text-marca-verdeOsc"
                        }`}
                      >
                        {plegado[parada.futuro ? "delante" : "atras"]
                          ? parada.futuro
                            ? "Plegar lo que viene"
                            : "Plegar las hechas"
                          : parada.titulo}
                      </p>
                      <p className="mt-[3px] text-[12px] leading-[1.3] text-marca-grisTenue">
                        {plegado[parada.futuro ? "delante" : "atras"]
                          ? "Vuelven a un solo punto"
                          : parada.futuro
                            ? "Te esperan aquí"
                            : "Tócalas para verlas en el camino"}
                      </p>
                    </div>
                  )}

                  {suya && (
                    <div
                      className="relative z-20 px-3 pb-[34px]"
                      style={{ paddingTop: esActiva ? 68 : 46 }}
                    >
                      {tarjeta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* La espera y el error de la generación, debajo de todo: son de
              la ruta entera, no de una fila. */}
          {generacion.estado === "generando" && (
            <div className="mt-3 px-4 min-[900px]:px-0">
              <AvanceGeneracion
                etapa={generacion.etapa}
                progreso={generacion.progreso}
                tardando={generacion.tardando}
              />
            </div>
          )}

          {generacion.estado === "error" && (
            <div className="aparece mx-4 mt-3 rounded-[16px] border border-marca-examenBorde bg-marca-examen px-5 py-4 min-[900px]:mx-0">
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

      {/* ============================ EL PIE QUE VUELVE ============================
          Solo en móvil, y solo cuando la parada disponible no está en
          pantalla. Es lo que permite que el mapa sea largo sin perder
          nunca de vista dónde hay que pulsar. Se ancla por encima de la
          navegación inferior, que también está fija. */}
      {actual !== null && conPie && (
        <div
          className="ruta-sube fixed inset-x-0 z-40 flex items-center gap-3 border-t border-marca-borde bg-white/95 px-3.5 pb-3.5 pt-2.5 shadow-[0_-10px_26px_-16px_rgba(18,33,26,0.30)] backdrop-blur min-[900px]:hidden"
          style={{ bottom: "var(--nav-inferior)" }}
        >
          <span
            aria-hidden
            className={`grid h-[26px] w-[26px] shrink-0 place-items-center ${
              haciaArriba ? "ruta-bota-arriba" : "ruta-bota"
            }`}
          >
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="#9A7B00"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={haciaArriba ? "M10 16V4M4.5 9.5L10 4l5.5 5.5" : "M10 4v12M4.5 10.5L10 16l5.5-5.5"} />
            </svg>
          </span>

          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border-[3px] border-marca-amarillo bg-marca-verdeFondo shadow-[0_3px_0_#E0A800]">
            <Candado abierto clase="h-[19px] w-[19px] stroke-marca-verde" arco={false} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-extrabold uppercase leading-none tracking-[0.13em] text-marca-amarilloTexto">
              Parada {actual.numero} · estás aquí
            </span>
            <span className="mt-[3px] block truncate text-[14px] font-semibold leading-[1.25] text-marca-tinta">
              {actual.titulo}
            </span>
          </span>

          <button
            type="button"
            onClick={() => {
              setElegida(actual.clave);
              requestAnimationFrame(() =>
                filas.current[actual.clave]?.scrollIntoView({ behavior: "smooth", block: "center" })
              );
            }}
            className="flex min-h-[46px] shrink-0 items-center justify-center rounded-full bg-marca-verde px-5 text-[15px] font-bold text-white shadow-[0_4px_0_#14722A]"
          >
            Ir
          </button>
        </div>
      )}
    </>
  );
}

function rotuloDe(parada: Parada): string {
  if (parada.tipo === "resumen") return parada.titulo;
  if (parada.tipo === "generacion") {
    return parada.abierta ? "Parada lista para abrir" : "Parada cerrada: se abre con tu próxima clase";
  }
  return `Parada ${parada.numero}: ${parada.titulo}`;
}

/**
 * El disco del móvil. Botón físico: canto macizo abajo y se hunde al
 * pulsarlo. Es todo el aire de mapa que hace falta, sin una sola
 * mecánica de juego detrás.
 */
function DiscoMovil({ parada, cerrando }: { parada: Parada; cerrando?: boolean }) {
  const base = "ruta-disco relative grid place-items-center rounded-full";

  if (cerrando) return <DiscoCerrando medida={46} />;

  if (parada.tipo === "actual") {
    // EL ÚNICO DISCO DEL MAPA QUE NO ES NI BLANCO NI VERDE MACIZO, y el
    // único con el candado ya abierto. Triple de área que los demás.
    return (
      <span
        className={`${base} h-[76px] w-[76px] border-[5px] border-marca-amarillo bg-marca-verdeFondo shadow-[0_6px_0_#E0A800,0_16px_28px_rgba(18,33,26,0.20)]`}
      >
        <Candado abierto arco clase="h-9 w-9 stroke-marca-verde [stroke-width:2.1]" />
      </span>
    );
  }

  if (parada.tipo === "hecha") {
    return (
      <span
        className={`${base} h-[46px] w-[46px] bg-marca-verde shadow-[0_4px_0_#14722A,0_9px_16px_rgba(30,158,58,0.22)]`}
      >
        <Marca />
      </span>
    );
  }

  if (parada.tipo === "resumen") {
    return (
      <span
        className={`${base} h-[46px] w-[46px] bg-white ${
          parada.futuro
            ? "border-2 border-dashed border-marca-rutaTrazo shadow-[0_4px_0_#DFEBE4]"
            : "border-2 border-marca-verde shadow-[0_4px_0_#CFE8D8]"
        }`}
      >
        <span
          className={`font-display text-[14px] font-extrabold leading-none tabular-nums ${
            parada.futuro ? "text-marca-grisSuave" : "text-marca-verdeOsc"
          }`}
        >
          +{parada.agrupadas}
        </span>
      </span>
    );
  }

  if (parada.tipo === "generacion") {
    if (parada.abierta) {
      return (
        <span
          className={`${base} h-[46px] w-[46px] bg-marca-verde shadow-[0_4px_0_#14722A,0_9px_16px_rgba(30,158,58,0.22)]`}
        >
          <Candado abierto clase="h-5 w-5 stroke-white [stroke-width:1.9]" />
        </span>
      );
    }
    return (
      <span
        className={`${base} h-[46px] w-[46px] border-2 border-dashed border-marca-rutaTrazo bg-[#F1F5F2] shadow-[0_4px_0_#E2EDE6]`}
      >
        <Candado abierto={false} clase="h-[19px] w-[19px] stroke-marca-grisTenue [stroke-width:1.9]" />
      </span>
    );
  }

  return (
    <span
      className={`${base} h-[46px] w-[46px] border-2 border-marca-rutaTrazo bg-white shadow-[0_4px_0_#DFEBE4]`}
    >
      <span className="font-display text-[18px] font-extrabold leading-none tabular-nums text-marca-grisSuave">
        {parada.numero}
      </span>
    </span>
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
// que se lleva la tarjeta no lleva rótulo: lo dice la tarjeta, dos dedos
// más abajo.
// ---------------------------------------------------------------

function Nodo({
  parada,
  punto,
  arriba,
  grande,
  retraso,
  cerrando,
  ascendiendo,
  onPulsar,
  onGenerar,
  generando,
}: {
  parada: Parada;
  punto: { x: number; y: number };
  /** Va por la banda alta: su rótulo se coloca encima. */
  arriba: boolean;
  /** Es la parada que se lleva la tarjeta. */
  grande: boolean;
  /** Cuándo entra al cargar, o null si no hay entrada que animar. */
  retraso: number | null;
  /** Acaba de cerrarse: se llena y se traza la marca. */
  cerrando: boolean;
  /** Hereda el turno: se enciende cuando la anterior termina de cerrarse. */
  ascendiendo: boolean;
  onPulsar: () => void;
  onGenerar: () => void;
  generando: boolean;
}) {
  const esActiva = parada.tipo === "actual";
  const nudge = punto.x < 12 ? "-40%" : punto.x > 88 ? "-62%" : "-50%";

  return (
    <>
      {esActiva && (
        <span
          className={retraso === null ? "absolute z-20" : "ruta-brota absolute z-20"}
          style={{
            left: `${punto.x}%`,
            top: `calc(${punto.y}% - 66px)`,
            transform: "translate(-50%, -100%)",
            animationDelay: retraso === null ? undefined : `${retraso + 320}ms`,
          }}
        >
          <span className="relative inline-flex items-center whitespace-nowrap rounded-full bg-marca-amarillo px-[15px] py-[7px] text-[12.5px] font-bold text-marca-tinta shadow-[0_4px_0_#E0A800,0_8px_16px_rgba(18,33,26,0.16)]">
            Estás aquí
            <span
              aria-hidden
              className="absolute -bottom-[4px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-marca-amarillo"
            />
          </span>
        </span>
      )}

      <span
        className={retraso === null ? "absolute z-10" : "ruta-entra absolute z-10"}
        style={{
          left: `${punto.x}%`,
          top: `${punto.y}%`,
          transform: "translate(-50%, -50%)",
          animationDelay: retraso === null ? undefined : `${retraso + 110}ms`,
        }}
      >
        <button type="button" onClick={onPulsar} className={`ruta-nodo ${esActiva ? "ruta-halo" : ""}`}>
          <span className={ascendiendo ? "ruta-asciende" : esActiva ? "ruta-latido" : "block"}>
            <DiscoEscritorio parada={parada} grande={grande} cerrando={cerrando} />
          </span>
          <span className="sr-only">{rotuloDe(parada)}</span>
        </button>
      </span>

      {!grande && (
        <span
          className={`absolute w-[168px] text-center text-[13px] leading-[1.35] ${
            retraso === null ? "" : "ruta-entra"
          }`}
          style={{
            left: `${punto.x}%`,
            top: arriba ? `calc(${punto.y}% - 40px)` : `calc(${punto.y}% + 40px)`,
            transform: `translate(${nudge}, ${arriba ? "-100%" : "0"})`,
            animationDelay: retraso === null ? undefined : `${retraso + 110}ms`,
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

function DiscoEscritorio({
  parada,
  grande,
  cerrando,
}: {
  parada: Parada;
  grande: boolean;
  cerrando?: boolean;
}) {
  const base = "ruta-disco relative grid place-items-center rounded-full";

  if (cerrando) return <DiscoCerrando medida={54} />;

  if (parada.tipo === "actual") {
    return (
      <span
        className={`${base} border-marca-amarillo bg-marca-verdeFondo ${
          grande
            ? "h-[100px] w-[100px] border-[6px] shadow-[0_6px_0_#E0A800,0_18px_30px_rgba(18,33,26,0.20)]"
            : "h-[62px] w-[62px] border-[4px] shadow-[0_5px_0_#E0A800]"
        }`}
      >
        <Candado
          abierto
          arco
          clase={`stroke-marca-verde [stroke-width:2] ${grande ? "h-[46px] w-[46px]" : "h-7 w-7"}`}
        />
      </span>
    );
  }

  if (parada.tipo === "hecha") {
    return (
      <span
        className={`${base} h-[54px] w-[54px] bg-marca-verde shadow-[0_4px_0_#14722A,0_9px_16px_rgba(30,158,58,0.24)]`}
      >
        <Marca />
      </span>
    );
  }

  if (parada.tipo === "resumen") {
    return (
      <span
        className={`${base} h-[54px] w-[54px] bg-white ${
          parada.futuro
            ? "border-2 border-dashed border-marca-rutaTrazo shadow-[0_4px_0_#DFEBE4]"
            : "border-2 border-marca-verde shadow-[0_4px_0_#CFE8D8]"
        }`}
      >
        <span
          className={`font-display text-[15px] font-extrabold leading-none tabular-nums ${
            parada.futuro ? "text-marca-grisSuave" : "text-marca-verdeOsc"
          }`}
        >
          +{parada.agrupadas}
        </span>
      </span>
    );
  }

  if (parada.tipo === "generacion") {
    if (parada.abierta) {
      return (
        <span
          className={`${base} bg-marca-verde text-white ${
            grande
              ? "h-[86px] w-[86px] shadow-[0_5px_0_#14722A,0_14px_26px_rgba(30,158,58,0.28)]"
              : "h-[54px] w-[54px] shadow-[0_4px_0_#14722A,0_9px_16px_rgba(30,158,58,0.24)]"
          }`}
        >
          <Candado abierto clase={`stroke-white [stroke-width:1.8] ${grande ? "h-9 w-9" : "h-6 w-6"}`} />
        </span>
      );
    }
    return (
      <span
        className={`${base} h-[54px] w-[54px] border-2 border-dashed border-marca-rutaTrazo bg-[#F1F5F2] shadow-[0_4px_0_#E2EDE6]`}
      >
        <Candado abierto={false} clase="h-[22px] w-[22px] stroke-marca-grisTenue [stroke-width:1.9]" />
      </span>
    );
  }

  return (
    <span
      className={`${base} h-[54px] w-[54px] border-2 border-marca-rutaTrazo bg-white shadow-[0_4px_0_#DFEBE4]`}
    >
      <span className="font-display text-[17px] font-extrabold leading-none tabular-nums text-marca-grisSuave">
        {parada.numero}
      </span>
    </span>
  );
}

/** El botón de preparar cuando la parada abierta NO se lleva la tarjeta. */
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
// LA TARJETA
//
// Una sola en toda la pantalla, y la ocupa la parada que el alumno tenga
// elegida —por defecto, la que toca hacer ahora—. Nunca hay dos cajas
// compitiendo por ser la acción.
// ---------------------------------------------------------------

function Tarjeta({
  parada,
  alumnoId,
  profesor,
  generacion,
  hechas,
  numeroActual,
}: {
  parada: Parada | null;
  alumnoId: string;
  profesor: string;
  generacion: Generacion;
  hechas: number;
  numeroActual: number | null;
}) {
  const caja =
    "rounded-[18px] border bg-white p-5 min-[900px]:rounded-[20px] min-[900px]:px-[30px] min-[900px]:py-[26px]";

  // -------------------------- LA PARADA DE HOY --------------------------
  if (parada && parada.tipo === "actual" && parada.bloque) {
    return (
      <article
        className={`${caja} border-marca-rutaTarjeta border-t-[3px] border-t-marca-amarillo shadow-[0_16px_34px_-18px_rgba(18,33,26,0.32)] min-[900px]:flex min-[900px]:items-center min-[900px]:gap-9`}
      >
        <div className="min-w-0 min-[900px]:flex-1">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-amarilloTexto min-[900px]:text-[11px]">
              Parada {parada.numero} · {parada.bloque.area}
            </span>
            <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-marca-puntoPendiente" />
            <span className="text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] text-marca-grisSuave min-[900px]:text-[11px]">
              {parada.bloque.ejercicios.length}{" "}
              {parada.bloque.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
            </span>
          </p>

          <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.09] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[32px]">
            {parada.bloque.titulo}
          </h2>

          <p className="mt-2.5 max-w-[56ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
            {parada.bloque.intro}
          </p>
        </div>

        <div className="mt-4 shrink-0 min-[900px]:mt-0 min-[900px]:text-center">
          <Link
            href={`/alumno/${alumnoId}/${parada.bloque.id}`}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full btn-verde px-11 text-[16.5px] font-bold shadow-[0_4px_0_#14722A,0_10px_20px_rgba(30,158,58,0.26)] min-[900px]:min-h-[58px] min-[900px]:w-auto min-[900px]:text-[17.5px]"
          >
            Seguir la ruta
            <span className="sr-only"> — {parada.bloque.titulo}</span>
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

  // ------------------------------ UNA HECHA ------------------------------
  if (parada && parada.tipo === "hecha" && parada.bloque) {
    return (
      <article className={`${caja} border-marca-rutaTarjeta border-t-[3px] border-t-marca-verde`}>
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
          Parada {parada.numero} · hecha
          {parada.porcentaje !== null && (
            <span className="tabular-nums"> · {parada.porcentaje}% de aciertos</span>
          )}
        </p>
        <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.09] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[30px]">
          {parada.bloque.titulo}
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
          {parada.bloque.intro}
        </p>
        <Link
          href={`/alumno/${alumnoId}/${parada.bloque.id}`}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full btn-verde-linea bg-white px-7 text-[15.5px] font-bold min-[900px]:w-auto"
        >
          Volver a hacerla
        </Link>
        <p className="mt-2.5 text-center text-[12.5px] leading-[1.4] text-marca-grisSuave min-[900px]:text-left">
          No cambia lo que ya tienes hecho.
        </p>
      </article>
    );
  }

  // ---------------------------- UNA PENDIENTE ----------------------------
  if (parada && parada.tipo === "pendiente" && parada.bloque) {
    return (
      <article className={`${caja} border-marca-rutaTarjeta`}>
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-gris min-[900px]:text-[11px]">
          Parada {parada.numero} · te espera aquí
        </p>
        <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.09] tracking-[-0.025em] text-marca-tintaCuerpo min-[900px]:text-[30px]">
          {parada.bloque.titulo}
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
          {parada.bloque.intro}
        </p>
        <Aviso>
          {numeroActual !== null
            ? `Llegas a ella en cuanto cierres la parada ${numeroActual}.`
            : "Llegas a ella cuando sigas la ruta."}
        </Aviso>
      </article>
    );
  }

  // ---------------------- LA PARADA QUE SE PUEDE ABRIR ----------------------
  if (parada && parada.tipo === "generacion" && parada.abierta) {
    const generando = generacion.estado === "generando";

    return (
      <article
        className={`${caja} border-[1.5px] border-marca-verde shadow-[0_16px_34px_-18px_rgba(18,33,26,0.32)] min-[900px]:flex min-[900px]:items-center min-[900px]:gap-9`}
      >
        <div className="min-w-0 min-[900px]:flex-1">
          <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
            Parada {parada.numero} · lista para abrir
          </p>

          <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.09] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[32px]">
            {profesor !== ""
              ? `Tu última clase con ${profesor} ya está aquí`
              : "Tu última clase ya está aquí"}
          </h2>

          {/* De qué está hecho ESTE bloque. Lo redacta el servidor: es lo
              que sostiene la promesa de que sale de lo suyo. */}
          <p className="mt-2.5 max-w-[56ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
            {generacion.tarjeta?.descripcion ?? "Diez ejercicios hechos con lo que sabemos de ti."}
          </p>
        </div>

        <div className="mt-4 shrink-0 min-[900px]:mt-0 min-[900px]:text-center">
          <button
            type="button"
            onClick={generacion.onGenerar}
            disabled={generando}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full btn-verde px-11 text-[16.5px] font-bold shadow-[0_4px_0_#14722A,0_10px_20px_rgba(30,158,58,0.26)] disabled:cursor-wait disabled:opacity-60 min-[900px]:min-h-[58px] min-[900px]:w-auto min-[900px]:text-[17.5px]"
          >
            {generando ? "Preparando…" : `Preparar la parada ${parada.numero}`}
          </button>
          <p className="mt-2.5 text-center text-[12.5px] leading-[1.4] text-marca-grisSuave min-[900px]:mt-3 min-[900px]:max-w-[22ch] min-[900px]:text-[13px]">
            Tarda menos de un minuto.
          </p>
        </div>
      </article>
    );
  }

  // ---------------------------- EL CANDADO ----------------------------
  // NO TIENE BOTÓN: no hay ninguna acción que ofrecer, y «avísame» o
  // «pedir a mi profesor» serían promesas que el producto no cumple. El
  // sujeto de la frase es el profesor, nunca el alumno: si quien actúa es
  // una persona, esperar deja de ser un bloqueo.
  if (parada && parada.tipo === "generacion") {
    return (
      <article className={`${caja} border-marca-rutaTarjeta`}>
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-grisSuave min-[900px]:text-[11px]">
          Parada {parada.numero} · aún no está
        </p>
        <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.09] tracking-[-0.025em] text-marca-tintaCuerpo min-[900px]:text-[30px]">
          Se abre con tu próxima clase
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
          {profesor !== ""
            ? `${profesor} la prepara cuando suba lo que trabajéis. Sale de esa clase, así que hasta entonces no existe.`
            : "Tu profesor la prepara cuando suba lo que trabajéis. Sale de esa clase, así que hasta entonces no existe."}
        </p>
        <Aviso>No tienes que hacer nada: te la encuentras aquí abierta.</Aviso>
      </article>
    );
  }

  // ----------------------- TODAVÍA NO HAY NADA HECHO -----------------------
  if (hechas === 0) {
    return (
      <div className={`${caja} border-marca-rutaTarjeta`}>
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-amarilloTexto min-[900px]:text-[11px]">
          Parada 1
        </p>
        <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.09] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[30px]">
          Tu ruta empieza con tu primera clase
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
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
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-marca-verde shadow-[0_4px_0_#14722A,0_10px_24px_rgba(30,158,58,0.32)] min-[900px]:h-[84px] min-[900px]:w-[84px]"
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
        <p className="mt-2 max-w-[62ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
          {profesor !== ""
            ? `La siguiente sale de tu próxima clase con ${profesor}. Mientras tanto, cualquiera de las hechas se puede repetir.`
            : "La siguiente sale de tu próxima clase. Mientras tanto, cualquiera de las hechas se puede repetir."}
        </p>
      </div>
    </div>
  );
}

/** La nota gris del pie de una tarjeta sin acción. */
function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-[13px] bg-marca-niebla px-3.5 py-3">
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="mt-[1px] h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="#7A8A80"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="6.3" />
        <path d="M8 7.3v3.9" />
        <path d="M8 4.9v.25" />
      </svg>
      <p className="text-[12.5px] leading-[1.45] text-marca-gris">{children}</p>
    </div>
  );
}
