"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import parchesJson from "@/components/mascota/parches.json";
import type { GestoMascota } from "@/components/mascota/estados";
import { estadoVisible, storeMascota, useStoreMascota, type Ancla } from "@/components/mascota/store";

// Framer y los parches pesan: no hacen falta para pintar la página.
const Geckonoid = dynamic(() => import("@/components/mascota/Geckonoid"), { ssr: false });

/**
 * LA CAPA DE LA MASCOTA: la única que se pinta en toda la app.
 *
 * Va montada una vez, en el layout raíz: así sobrevive a la navegación
 * entre pantallas y no hay dos. Es una capa fija a pantalla completa
 * que no recibe el ratón (salvo sobre la propia mascota), con z-index
 * 38: encima del contenido y de la barra fija del banner (30), debajo
 * de la navegación inferior y de los paneles (40 y más).
 *
 * DÓNDE SE PONE. Las pantallas declaran anclas (useAnclaMascota): huecos
 * en su maqueta. En cada frame —UN solo requestAnimationFrame— la capa
 * lee el rectángulo de todas, se queda con las visibles (al menos media
 * altura dentro de la ventana; la que ya manda aguanta hasta un
 * cuarto, para no parpadear en el borde) y elige la de más prioridad,
 * y a igualdad la última montada. La mascota se pone encima con su
 * alto: se pinta siempre a ALTO_BASE y se escala. Primero se leen todos
 * los rectángulos y después se escribe un único `transform`: sin
 * layout thrashing, y el transform no invalida el layout.
 *
 * SIN ANCLA VISIBLE, A LA PERCHA: abajo a la derecha, chica y sentada,
 * por encima de lo que haya fijo en esa esquina —la navegación inferior,
 * la barra del banner, el botón de Ayuda— y del safe-area.
 *
 * SI EL ANCLA QUE MANDA DESAPARECE —se desmonta y se vuelve a montar,
 * como la de la ruta al cambiar de parada, o se sale de la vista—, la
 * mascota espera GRACIA_MS donde estaba antes de irse a otra o a la
 * percha. Una de MÁS prioridad que aparece se la lleva enseguida.
 *
 * AL CAMBIAR DE ANCLA, por ahora, se apaga y se enciende en la nueva
 * (TELEPORTE_MS). Es también lo que queda con prefers-reduced-motion.
 *
 * UN SOLO RELOJ. Parpadeo, respiración y micro-gestos los lleva el
 * único Geckonoid; el «piensa» cada 4 s de la espera, esta capa.
 */

const ALTO_BASE = 200;
const PROPORCION = parchesJson.lienzo.proporcion;
const MOVIL_PX = 900;
const PERCHA = { alto: 72, altoMovil: 50, margen: 20, aire: 12 };
/** Media altura dentro para entrar; la activa aguanta hasta un cuarto. */
const VISIBLE_ENTRA = 0.5;
const VISIBLE_AGUANTA = 0.25;
const TELEPORTE_MS = 130;
const GRACIA_MS = 300;
const PIENSA_CADA_MS = 4000;
/** Lo que hay fijo abajo y la percha no tiene que tapar. */
const EVITAR = "[data-nav-inferior], [data-barra-inferior] > *, .zona-ayuda";
/** Los gestos al tocarla en reposo. */
const AL_TOCAR: readonly GestoMascota[] = ["saludo", "salto", "guino"];

type Caja = { x: number; y: number; alto: number };

/** Qué parte de la altura del rectángulo cae dentro de la ventana (0 si no se ve). */
function fraccionVisible(r: DOMRect, altoVentana: number, anchoVentana: number): number {
  if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.left >= anchoVentana) return 0;
  const dentro = Math.min(r.bottom, altoVentana) - Math.max(r.top, 0);
  return dentro <= 0 ? 0 : dentro / r.height;
}

export default function CapaMascota() {
  const ruta = usePathname();
  // Fuera de la zona del alumno (la baja de avisos) no hay mascota.
  const fuera = ruta?.startsWith("/avisos") ?? false;

  const caja = useRef<HTMLDivElement>(null);
  const safeArea = useRef<HTMLDivElement>(null);

  const estado = useStoreMascota(estadoVisible);
  const disparo = useStoreMascota((e) => e.disparo);
  const pose = useStoreMascota((e) => e.pose);
  const activa = useStoreMascota((e) => (e.activa ? e.anclas[e.activa] : undefined));
  const transitorio = useStoreMascota((e) => e.transitorio);
  const velocidad = useStoreMascota((e) => e.velocidad);
  const enPercha = !activa;

  // ---------------------------------------------------------------
  // EL BUCLE: medir y colocar
  // ---------------------------------------------------------------
  useEffect(() => {
    if (fuera) return;
    let frame = 0;
    let vez = 0;
    let evitar: Element[] = [];
    let inferior = 0;
    let ultima: string | null | undefined = undefined;
    let apagadaHasta = 0;
    let colocada = false;
    let ultimoDestino: Caja | null = null;
    let prioridadActual = -Infinity;
    let perdidaDesde: number | null = null;

    const colocar = () => {
      const el = caja.current;
      if (!el) return;
      const ancho = window.innerWidth;
      const alto = window.innerHeight;
      const movil = ancho < MOVIL_PX;

      // 1. LEER. Todas las anclas, y lo que la percha tiene que esquivar.
      const { anclas, activa: actual } = storeMascota.leer();
      let mejor: { ancla: Ancla; rect: DOMRect } | null = null;
      for (const ancla of Object.values(anclas)) {
        if (!ancla.activa || !ancla.el || !ancla.el.isConnected) continue;
        const rect = ancla.el.getBoundingClientRect();
        const umbral = ancla.id === actual ? VISIBLE_AGUANTA : VISIBLE_ENTRA;
        if (fraccionVisible(rect, alto, ancho) < umbral) continue;
        if (!mejor || ancla.prioridad > mejor.ancla.prioridad || (ancla.prioridad === mejor.ancla.prioridad && ancla.orden > mejor.ancla.orden)) {
          mejor = { ancla, rect };
        }
      }

      let destino: Caja;
      if (mejor) {
        const { rect, ancla } = mejor;
        const w = rect.height * PROPORCION;
        const x = ancla.lado === "izq" ? rect.left : ancla.lado === "der" ? rect.right - w : rect.left + (rect.width - w) / 2;
        destino = { x, y: rect.top, alto: rect.height };
      } else {
        // La lista de lo que hay que esquivar y el safe-area se refrescan
        // cada medio segundo, no en cada frame.
        if (vez++ % 30 === 0) {
          evitar = Array.from(document.querySelectorAll(EVITAR));
          inferior = parseFloat(safeArea.current ? getComputedStyle(safeArea.current).paddingBottom : "0") || 0;
        }
        const h = movil ? PERCHA.altoMovil : PERCHA.alto;
        const w = h * PROPORCION;
        const x = ancho - PERCHA.margen - w;
        let suelo = alto - PERCHA.margen - inferior;
        for (const e of evitar) {
          const r = e.getBoundingClientRect();
          if (r.height <= 0 || r.bottom <= 0 || r.top >= alto) continue;
          if (r.right < x || r.left > x + w) continue;
          suelo = Math.min(suelo, r.top - PERCHA.aire);
        }
        destino = { x, y: suelo - h, alto: h };
      }

      // La gracia: la que mandaba no está, y nada de más prioridad la
      // sustituye. Se queda donde estaba un momento.
      const ahora = performance.now();
      let id = mejor?.ancla.id ?? null;
      const sigueLaActual = actual !== null && id === actual;
      if (actual !== null && !sigueLaActual && (mejor?.ancla.prioridad ?? -Infinity) <= prioridadActual && ultimoDestino) {
        perdidaDesde ??= ahora;
        if (ahora - perdidaDesde < GRACIA_MS) {
          id = actual;
          destino = ultimoDestino;
        }
      } else {
        perdidaDesde = null;
      }
      if (id === (mejor?.ancla.id ?? null)) prioridadActual = mejor?.ancla.prioridad ?? -Infinity;
      if (id !== actual) storeMascota.fijarActiva(id);
      ultimoDestino = destino;

      // 2. ESCRIBIR. Un transform y, al cambiar de sitio, un fundido.
      if (ultima !== undefined && id !== ultima) apagadaHasta = ahora + TELEPORTE_MS;
      ultima = id;
      if (ahora < apagadaHasta) {
        el.style.opacity = "0";
      } else {
        el.style.transform = `translate3d(${destino.x}px, ${destino.y}px, 0) scale(${destino.alto / ALTO_BASE})`;
        el.style.opacity = "1";
        colocada = true;
      }
      if (!colocada) el.style.opacity = "0";
    };

    const bucle = () => {
      colocar();
      frame = requestAnimationFrame(bucle);
    };
    frame = requestAnimationFrame(bucle);
    // El scroll se sigue en el mismo evento, sin esperar al frame: si no,
    // la mascota iría un frame por detrás del contenido.
    const alScroll = () => colocar();
    window.addEventListener("scroll", alScroll, { passive: true, capture: true });
    // Con la pestaña oculta, el navegador ya para el rAF.
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", alScroll, { capture: true });
    };
  }, [fuera]);

  // ---------------------------------------------------------------
  // LA ESPERA: «piensa» cada 4 s, con los anteojos puestos.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (estado !== "estudiando" || transitorio) return;
    const reloj = setInterval(() => storeMascota.gesto("piensa"), PIENSA_CADA_MS);
    return () => clearInterval(reloj);
  }, [estado, transitorio]);

  if (fuera) return null;

  const tocar = () => {
    activa?.onToque?.();
    // En reposo, un gesto al azar; en mitad de un estado, no se le corta.
    if (!transitorio && (estado === "idle" || enPercha)) {
      storeMascota.gesto(AL_TOCAR[Math.floor(Math.random() * AL_TOCAR.length)]);
    }
  };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[38] overflow-hidden">
      {/* Para leer el safe-area de abajo, que solo sabe CSS. */}
      <div ref={safeArea} className="invisible absolute" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      <div
        ref={caja}
        title={activa?.titulo}
        className="pointer-events-auto absolute left-0 top-0 origin-top-left cursor-pointer transition-opacity duration-150"
        style={{ width: ALTO_BASE * PROPORCION, height: ALTO_BASE, opacity: 0 }}
      >
        <Geckonoid
          estado={estado}
          disparo={disparo}
          size={ALTO_BASE}
          velocidad={velocidad}
          volverAIdle={false}
          quieta={(activa?.quieta ?? false) && !transitorio}
          pose={pose}
          sostenida={enPercha ? "sentado" : undefined}
          onToque={tocar}
          etiqueta={null}
        />
      </div>
    </div>
  );
}
