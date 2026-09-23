"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import AnclaMascota from "@/components/mascota/AnclaMascota";
import type { TipoFrase } from "@/lib/textos/mascota-feedback";

/**
 * EL CUADRO DE DIÁLOGO DE LA MASCOTA, debajo de cada ejercicio.
 *
 * Todo el feedback de un ejercicio pasa por aquí: la mascota dice el
 * veredicto en una frase corta (lib/textos/mascota-feedback.ts) y,
 * debajo, en el mismo cuadro, van el veredicto del modelo si lo hay, la
 * respuesta buena y la explicación. La pista también: se pide con el
 * botón que el visor pone en `acciones`, y la mascota piensa, señala y
 * la dice aquí. El cuadro no se cierra solo: se va al pasar al
 * ejercicio siguiente, porque la corrección es lo que el alumno ha
 * venido a leer.
 *
 * DÓNDE VA.
 *   escritorio  al pie de la tarjeta del ejercicio, a todo su ancho: el
 *               ancla «ejercicio» apoyada en la esquina de abajo a la
 *               izquierda y el cuadro saliendo a su derecha, con el pico
 *               hacia ella.
 *   móvil       (< 900 px) el ancla se queda al pie de la tarjeta
 *               mientras no hay nada que decir; al hablar, sale un dock
 *               fijo abajo, sobre la navegación inferior y el safe-area,
 *               con su propia ancla («ejercicio-dock», un punto más de
 *               prioridad) a la izquierda y el texto a la derecha. El
 *               alto del dock se publica en `--dock-dialogo` (en <html>):
 *               con él el visor deja sitio debajo de sus botones y la
 *               Ayuda se sube (globals.css).
 *
 * LAS ANCLAS son las de más prioridad de la app (10 y 11): mientras hay
 * ejercicio, la mascota está aquí. Sin nada que decir espera en idle; el
 * visor le pide que mire al enunciado.
 *
 * EL TEXTO se escribe a máquina, a ~40 caracteres por segundo; un toque
 * en el cuadro o cualquier tecla lo completa, y lo de debajo aparece al
 * acabar la frase. Con prefers-reduced-motion sale entero de golpe. Al
 * lector de pantalla le llega completo desde el principio, por una
 * región `aria-live` aparte: lo que se ve letra a letra va aria-hidden.
 */

export const ANCLA_EJERCICIO = "ejercicio";
const ANCLA_DOCK = "ejercicio-dock";
const PRIORIDAD = 10;
const TAMAÑO = 100;
const CARACTERES_POR_SEGUNDO = 40;

/**
 * Cuál de las frases de un tipo toca: al azar, sin repetir la anterior
 * de ese tipo. La memoria es del módulo, así que vale para todos los
 * ejercicios de la visita.
 */
const ultimas: Partial<Record<TipoFrase, number>> = {};
export function elegirFrase(tipo: TipoFrase, cuantas: number): number {
  if (cuantas <= 1) return 0;
  const anterior = ultimas[tipo];
  let i = Math.floor(Math.random() * (anterior === undefined ? cuantas : cuantas - 1));
  if (anterior !== undefined && i >= anterior) i += 1;
  ultimas[tipo] = i;
  return i;
}

function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducido(mq.matches);
    const cambio = () => setReducido(mq.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return reducido;
}

export default function DialogoMascota({
  clave,
  frase,
  cuerpo,
  acciones,
  aria,
  alMedirDock,
}: {
  /** Cambia con cada cosa que dice: con ella vuelve a escribirse. */
  clave: string;
  /** Lo que dice la mascota. null: nada que decir, solo el hueco y las acciones. */
  frase: string | null;
  /** Lo de debajo de la frase: el veredicto del modelo, la respuesta, la explicación, la pista. */
  cuerpo?: ReactNode;
  /** Junto a la mascota mientras no habla: el botón de la pista. */
  acciones?: ReactNode;
  /** El nombre del cuadro para el lector de pantalla. */
  aria: string;
  /** Cada vez que el dock de móvil cambia de alto (0 al cerrarse). */
  alMedirDock?: (alto: number) => void;
}) {
  const reducido = useMovimientoReducido();
  const [escritas, setEscritas] = useState(0);
  const total = frase?.length ?? 0;
  const completa = frase === null || reducido || escritas >= total;
  const hasta = completa ? total : escritas;
  const completar = () => setEscritas(Infinity);

  // La máquina de escribir. Con `max`, lo completado a mano no lo deshace
  // el reloj.
  useEffect(() => {
    setEscritas(0);
    if (frase === null || reducido) return;
    const inicio = performance.now();
    const reloj = setInterval(() => {
      const n = Math.floor(((performance.now() - inicio) / 1000) * CARACTERES_POR_SEGUNDO) + 1;
      setEscritas((previas) => Math.max(previas, n));
      if (n >= frase.length) clearInterval(reloj);
    }, 1000 / CARACTERES_POR_SEGUNDO);
    return () => clearInterval(reloj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, reducido]);

  // Cualquier tecla la completa (sin robarle la tecla a nadie: Enter
  // sigue pasando al ejercicio siguiente).
  useEffect(() => {
    if (completa) return;
    const alPulsar = () => setEscritas(Infinity);
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [completa]);

  // El dock es fijo: se pinta en <body> para que ningún antepasado con
  // transform (las animaciones de entrada) lo convierta en relativo.
  const [enCliente, setEnCliente] = useState(false);
  useEffect(() => setEnCliente(true), []);

  // Su alto, para el visor y para la Ayuda.
  const dock = useRef<HTMLDivElement>(null);
  const medir = useRef(alMedirDock);
  medir.current = alMedirDock;
  const hayDock = enCliente && frase !== null;
  useEffect(() => {
    const el = dock.current;
    const raiz = document.documentElement;
    if (!hayDock || !el) return;
    const observador = new ResizeObserver(() => {
      const alto = el.offsetHeight;
      raiz.style.setProperty("--dock-dialogo", `${alto}px`);
      medir.current?.(alto);
    });
    observador.observe(el);
    return () => {
      observador.disconnect();
      raiz.style.removeProperty("--dock-dialogo");
      medir.current?.(0);
    };
  }, [hayDock]);

  const cuadro = (enDock: boolean) => (
    <div
      aria-hidden
      onPointerDown={completar}
      className="relative min-w-0 flex-1 rounded-[16px] border border-marca-borde bg-marca-niebla font-sans"
    >
      {/* El pico, hacia la mascota. */}
      <span
        aria-hidden
        className={`absolute -left-[7px] h-3 w-3 rotate-45 border-b border-l border-marca-borde bg-marca-niebla ${
          enDock ? "bottom-5" : "bottom-7"
        }`}
      />
      <div
        className={
          enDock
            ? "max-h-[38vh] overflow-y-auto overscroll-contain px-4 py-3"
            : "px-5 py-4"
        }
      >
        {frase !== null && (
          <p className="text-pretty text-[16px] font-semibold leading-[1.35] text-marca-tinta min-[900px]:text-[17px]">
            {frase.slice(0, hasta)}
            {/* Lo que falta, invisible: el cuadro tiene su tamaño final desde la primera letra. */}
            <span className="invisible">{frase.slice(hasta)}</span>
          </p>
        )}
        {completa && cuerpo && (
          <div className="aparece mt-2 flex flex-col gap-1.5 text-pretty text-[14.5px] leading-[1.55] text-marca-tintaCuerpo min-[900px]:text-[15px]">
            {cuerpo}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Al pie de la tarjeta, hasta sus bordes de abajo y de la
          izquierda: la mascota se apoya en la esquina. En móvil, mientras
          habla, se pliega: ella está en el dock y aquí quedaría un hueco
          en blanco. */}
      <div
        className={`-mb-6 -ml-3 mt-6 flex items-end gap-3 min-[900px]:-mb-8 min-[900px]:-ml-7 min-[900px]:mt-8 min-[900px]:gap-4 ${
          frase !== null ? "max-[899px]:hidden" : ""
        }`}
      >
        <AnclaMascota id={ANCLA_EJERCICIO} prioridad={PRIORIDAD} tamaño={TAMAÑO} lado="izq" />
        {frase !== null ? (
          <div className="mb-8 hidden min-w-0 flex-1 min-[900px]:flex">{cuadro(false)}</div>
        ) : (
          acciones && <div className="mb-6 flex min-w-0 flex-1 items-center min-[900px]:mb-8">{acciones}</div>
        )}
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-label={aria}>
        {frase !== null && (
          <>
            <p>{frase}</p>
            {cuerpo}
          </>
        )}
      </div>

      {hayDock &&
        createPortal(
          <div
            ref={dock}
            data-dock-dialogo
            className="fixed inset-x-0 z-[37] border-t border-marca-borde bg-white px-5 pb-3 pt-3 shadow-[0_-12px_28px_-18px_rgba(18,33,26,0.35)] min-[900px]:hidden"
            style={{ bottom: "max(var(--nav-inferior, 0px), env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto flex max-w-[760px] items-end gap-3">
              <AnclaMascota id={ANCLA_DOCK} prioridad={PRIORIDAD + 1} tamaño={TAMAÑO} lado="izq" />
              {cuadro(true)}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
