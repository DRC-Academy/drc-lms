"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
 * la barra del banner, el botón de Ayuda— y del safe-area. Con un cajón
 * abierto (el panel del bloque por debajo de 1200 px, que marca
 * `data-cajon-mascota`) también va a la percha, y la capa sube por
 * encima del velo para no quedar tapada.
 *
 * SI EL ANCLA QUE MANDA DESAPARECE —se desmonta y se vuelve a montar,
 * como la de la ruta al cambiar de parada, o se sale de la vista—, la
 * mascota espera GRACIA_MS donde estaba antes de irse a otra o a la
 * percha. Una de MÁS prioridad que aparece se la lleva enseguida.
 *
 * LOS VIAJES. Al cambiar de ancla, salta: se agacha, vuela en parábola
 * con la pose de «salto» (500–800 ms según la distancia, estirada al
 * subir y al bajar), se aplasta al caer y pone cara de asombro 200 ms.
 * El destino se mide en cada frame, así que llega aunque se mueva. Si
 * sale de fuera de la ventana, arranca desde el borde. Nunca dos a la
 * vez: lo que cambie en el aire espera a que aterrice y, si hace falta,
 * sale otro. La primera vez entra saltando desde abajo. Con
 * prefers-reduced-motion no viaja: se apaga y se enciende en el destino.
 *
 * AL CERRAR SESIÓN se despide con la mano antes de irse.
 *
 * UN SOLO RELOJ. Parpadeo, respiración y micro-gestos los lleva el
 * único Geckonoid; el «piensa» cada 4 s de la espera, esta capa.
 */

const ALTO_BASE = 200;
const PROPORCION = parchesJson.lienzo.proporcion;
/** Los pies, en fracción del ancho: de ahí salen el estiramiento y el aplastamiento. */
const PIES_X = 0.414;
const MOVIL_PX = 900;
const CAJON_PX = 1200;
const PERCHA = { alto: 72, altoMovil: 50, margen: 20, aire: 12 };
/** Media altura dentro para entrar; la activa aguanta hasta un cuarto. */
const VISIBLE_ENTRA = 0.5;
const VISIBLE_AGUANTA = 0.25;
const TELEPORTE_MS = 130;
const GRACIA_MS = 300;
/** El viaje: agacharse, el vuelo (entre min y max según la distancia) y la caída. */
const VUELO = { anticipa: 90, min: 500, max: 800, aterriza: 150, asombro: 200 };
const PIENSA_CADA_MS = 4000;
const DESPEDIDA_MS = 900;
/** Lo que hay fijo abajo y la percha no tiene que tapar. */
const EVITAR = "[data-nav-inferior], [data-barra-inferior] > *, .zona-ayuda";
/** Los gestos al tocarla en reposo. */
const AL_TOCAR: readonly GestoMascota[] = ["saludo", "salto", "guino"];

type Caja = { x: number; y: number; alto: number };
type Vuelo = {
  desde: Caja;
  /** El ancla a la que va (null: la percha) y dónde estaba la última vez que se midió. */
  hacia: string | null;
  hasta: Caja;
  t0: number;
  dur: number;
  arco: number;
  enElAire: boolean;
  enElSuelo: boolean;
};

/** Qué parte de la altura del rectángulo cae dentro de la ventana (0 si no se ve). */
function fraccionVisible(r: DOMRect, altoVentana: number, anchoVentana: number): number {
  if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.left >= anchoVentana) return 0;
  const dentro = Math.min(r.bottom, altoVentana) - Math.max(r.top, 0);
  return dentro <= 0 ? 0 : dentro / r.height;
}

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const mezclar = (a: number, b: number, t: number) => a + (b - a) * t;

/** Dónde va la mascota sobre un ancla: su alto y, si sobra ancho, según `lado`. */
function cajaDeAncla(ancla: Ancla, rect: DOMRect): Caja {
  const w = rect.height * PROPORCION;
  const x = ancla.lado === "izq" ? rect.left : ancla.lado === "der" ? rect.right - w : rect.left + (rect.width - w) / 2;
  return { x, y: rect.top, alto: rect.height };
}

export default function CapaMascota() {
  const ruta = usePathname();
  // Fuera de la zona del alumno (la baja de avisos) no hay mascota.
  const fuera = ruta?.startsWith("/avisos") ?? false;

  const caja = useRef<HTMLDivElement>(null);
  const estirar = useRef<HTMLDivElement>(null);
  const safeArea = useRef<HTMLDivElement>(null);
  const [enVuelo, setEnVuelo] = useState(false);
  const [conCajon, setConCajon] = useState(false);

  const estado = useStoreMascota(estadoVisible);
  const disparo = useStoreMascota((e) => e.disparo);
  const pose = useStoreMascota((e) => e.pose);
  const activa = useStoreMascota((e) => (e.activa ? e.anclas[e.activa] : undefined));
  const transitorio = useStoreMascota((e) => e.transitorio);
  const velocidad = useStoreMascota((e) => e.velocidad);
  const enPercha = !activa;

  // ---------------------------------------------------------------
  // EL BUCLE: medir, elegir, viajar y colocar
  // ---------------------------------------------------------------
  useEffect(() => {
    if (fuera) return;
    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let vez = 0;
    let evitar: Element[] = [];
    let inferior = 0;
    let cajon = false;
    /** Dónde está posada: el ancla (null, la percha; undefined, todavía en ningún sitio). */
    let posada: string | null | undefined = undefined;
    let apagadaHasta = 0;
    let dibujada: Caja | null = null;
    let ultimoDestino: Caja | null = null;
    let prioridadActual = -Infinity;
    let perdidaDesde: number | null = null;
    let vuelo: Vuelo | null = null;

    const escribir = (c: Caja, sx = 1, sy = 1, opacidad = "1") => {
      const el = caja.current;
      if (!el) return;
      el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.alto / ALTO_BASE})`;
      el.style.opacity = opacidad;
      if (estirar.current) estirar.current.style.transform = sx === 1 && sy === 1 ? "" : `scale(${sx}, ${sy})`;
      dibujada = c;
    };

    const cajaDePercha = (ancho: number, alto: number): Caja => {
      const h = ancho < MOVIL_PX ? PERCHA.altoMovil : PERCHA.alto;
      const w = h * PROPORCION;
      const x = ancho - PERCHA.margen - w;
      let suelo = alto - PERCHA.margen - inferior;
      for (const e of evitar) {
        const r = e.getBoundingClientRect();
        if (r.height <= 0 || r.bottom <= 0 || r.top >= alto) continue;
        if (r.right < x || r.left > x + w) continue;
        suelo = Math.min(suelo, r.top - PERCHA.aire);
      }
      return { x, y: suelo - h, alto: h };
    };

    /** Sale de fuera de la ventana: desde el borde más cercano, asomando. */
    const alBorde = (c: Caja, ancho: number, alto: number): Caja => {
      const w = c.alto * PROPORCION;
      return { x: limitar(c.x, -w * 0.6, ancho - w * 0.4), y: limitar(c.y, -c.alto * 0.6, alto - c.alto * 0.4), alto: c.alto };
    };

    const despegar = (desde: Caja, hacia: string | null, hasta: Caja, ahora: number): Vuelo => {
      const distancia = Math.hypot(hasta.x - desde.x, hasta.y - desde.y);
      return {
        desde,
        hacia,
        hasta,
        t0: ahora,
        dur: limitar(VUELO.min + distancia * 0.45, VUELO.min, VUELO.max) / storeMascota.leer().velocidad,
        arco: limitar(50 + distancia * 0.3, 50, 180),
        enElAire: false,
        enElSuelo: false,
      };
    };

    /** Un frame del viaje: agacharse, volar, caer. Devuelve false al terminar. */
    const volar = (v: Vuelo, ahora: number): boolean => {
      const ritmo = storeMascota.leer().velocidad;
      const A = VUELO.anticipa / ritmo;
      const C = VUELO.aterriza / ritmo;
      const t = ahora - v.t0;
      if (t < A) {
        const e = t / A;
        escribir(v.desde, 1 + 0.08 * e, 1 - 0.1 * e);
        return true;
      }
      if (t < A + v.dur) {
        if (!v.enElAire) {
          v.enElAire = true;
          setEnVuelo(true);
        }
        const k = (t - A) / v.dur;
        const estirado = Math.abs(1 - 2 * k);
        escribir(
          {
            x: mezclar(v.desde.x, v.hasta.x, k),
            y: mezclar(v.desde.y, v.hasta.y, k) - v.arco * 4 * k * (1 - k),
            alto: mezclar(v.desde.alto, v.hasta.alto, k),
          },
          1 - 0.06 * estirado,
          1 + 0.08 * estirado,
        );
        return true;
      }
      if (t < A + v.dur + C) {
        if (!v.enElSuelo) {
          v.enElSuelo = true;
          setEnVuelo(false);
          storeMascota.gesto("asombro", { duracion: VUELO.asombro / ritmo });
        }
        const e = Math.sin(Math.PI * ((t - A - v.dur) / C));
        escribir(v.hasta, 1 + 0.1 * e, 1 - 0.12 * e);
        return true;
      }
      escribir(v.hasta);
      return false;
    };

    const colocar = () => {
      const el = caja.current;
      if (!el) return;
      const ancho = window.innerWidth;
      const alto = window.innerHeight;
      const ahora = performance.now();

      // 1. LEER. Todas las anclas, y lo que la percha tiene que esquivar.
      if (vez++ % 30 === 0) {
        evitar = Array.from(document.querySelectorAll(EVITAR));
        inferior = parseFloat(safeArea.current ? getComputedStyle(safeArea.current).paddingBottom : "0") || 0;
        const hayCajon = ancho < CAJON_PX && document.querySelector("[data-cajon-mascota]") !== null;
        if (hayCajon !== cajon) {
          cajon = hayCajon;
          setConCajon(hayCajon);
        }
      }
      const { anclas, activa: actual } = storeMascota.leer();
      let mejor: { ancla: Ancla; rect: DOMRect } | null = null;
      if (!cajon) {
        for (const ancla of Object.values(anclas)) {
          if (!ancla.activa || !ancla.el || !ancla.el.isConnected) continue;
          const rect = ancla.el.getBoundingClientRect();
          const umbral = ancla.id === actual ? VISIBLE_AGUANTA : VISIBLE_ENTRA;
          if (fraccionVisible(rect, alto, ancho) < umbral) continue;
          if (!mejor || ancla.prioridad > mejor.ancla.prioridad || (ancla.prioridad === mejor.ancla.prioridad && ancla.orden > mejor.ancla.orden)) {
            mejor = { ancla, rect };
          }
        }
      }

      // 2. EN EL AIRE, el viaje manda: el destino se vuelve a medir (se
      // puede mover), y lo demás espera a que aterrice.
      if (vuelo) {
        const destinoAncla = vuelo.hacia === null ? null : anclas[vuelo.hacia];
        if (vuelo.hacia === null) vuelo.hasta = cajaDePercha(ancho, alto);
        else if (destinoAncla?.el?.isConnected) vuelo.hasta = cajaDeAncla(destinoAncla, destinoAncla.el.getBoundingClientRect());
        if (!volar(vuelo, ahora)) {
          posada = vuelo.hacia;
          ultimoDestino = vuelo.hasta;
          vuelo = null;
        }
        return;
      }

      let id = mejor?.ancla.id ?? null;
      let destino = mejor ? cajaDeAncla(mejor.ancla, mejor.rect) : cajaDePercha(ancho, alto);

      // La gracia: la que mandaba no está, y nada de más prioridad la
      // sustituye. Se queda donde estaba un momento.
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

      // 3. ¿VIAJE? Al cambiar de sitio, o la primera vez (desde abajo).
      if (id !== posada && !movimientoReducido.matches) {
        const desde = dibujada ? alBorde(dibujada, ancho, alto) : { x: destino.x, y: alto + 10, alto: destino.alto };
        storeMascota.anotar("viaje", `${posada === undefined ? "entrada" : (posada ?? "percha")} → ${id ?? "percha"}`);
        vuelo = despegar(desde, id, destino, ahora);
        volar(vuelo, ahora);
        return;
      }

      // 4. ESCRIBIR. Sin viaje (movimiento reducido): se apaga y se
      // enciende en el sitio nuevo.
      if (posada !== undefined && id !== posada) apagadaHasta = ahora + TELEPORTE_MS;
      posada = id;
      if (ahora < apagadaHasta) el.style.opacity = "0";
      else escribir(destino);
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

  // ---------------------------------------------------------------
  // LA DESPEDIDA: el formulario de salir espera a que salude.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (fuera) return;
    const alEnviar = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || !/\/salir\/?$/.test(form.action) || form.dataset.mascotaDespedida) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      e.preventDefault();
      form.dataset.mascotaDespedida = "1";
      storeMascota.gesto("saludo");
      // `submit()` no vuelve a lanzar el evento: no entra aquí otra vez.
      setTimeout(() => form.submit(), DESPEDIDA_MS);
    };
    document.addEventListener("submit", alEnviar, true);
    return () => document.removeEventListener("submit", alEnviar, true);
  }, [fuera]);

  if (fuera) return null;

  const tocar = () => {
    activa?.onToque?.();
    // En reposo, un gesto al azar; en mitad de un estado, no se le corta.
    if (!transitorio && (estado === "idle" || enPercha)) {
      storeMascota.gesto(AL_TOCAR[Math.floor(Math.random() * AL_TOCAR.length)]);
    }
  };

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 overflow-hidden ${conCajon ? "z-[55]" : "z-[38]"}`}>
      {/* Para leer el safe-area de abajo, que solo sabe CSS. */}
      <div ref={safeArea} className="invisible absolute" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      <div
        ref={caja}
        title={activa?.titulo}
        className="pointer-events-auto absolute left-0 top-0 origin-top-left cursor-pointer transition-opacity duration-150"
        style={{ width: ALTO_BASE * PROPORCION, height: ALTO_BASE, opacity: 0 }}
      >
        {/* El estiramiento y el aplastamiento de los viajes, desde los pies. */}
        <div ref={estirar} className="h-full w-full" style={{ transformOrigin: `${PIES_X * 100}% 100%` }}>
          <Geckonoid
            estado={estado}
            disparo={disparo}
            size={ALTO_BASE}
            velocidad={velocidad}
            volverAIdle={false}
            quieta={(activa?.quieta ?? false) && !transitorio}
            pose={pose}
            sostenida={enVuelo ? "salto" : enPercha ? "sentado" : undefined}
            onToque={tocar}
            etiqueta={null}
          />
        </div>
      </div>
    </div>
  );
}
