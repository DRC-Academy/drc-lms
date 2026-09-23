"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent as PointerEventReact } from "react";
import parchesJson from "@/components/mascota/parches.json";
import type { GestoMascota } from "@/components/mascota/estados";
import type { MicroGesto, MiradaMascota } from "@/components/mascota/Geckonoid";
import { estadoVisible, storeMascota, useStoreMascota, type Ancla } from "@/components/mascota/store";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { BUCLE_PROFESOR, type ClaveBurbuja } from "@/lib/textos/mascota";

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
 * LA VIDA PROPIA, según la intensidad del store:
 *   tranquila  respira, parpadea y sigue el cursor. Nada más.
 *   normal     además, cada 8–15 s, un micro-gesto: mirar a un lado y al
 *              otro (alternando), pensar, estirarse, inclinar la cabeza.
 *              A los 90 s sin que nadie toque nada, bosteza (se estira) y
 *              se sienta; a los 60 s más se duerme, con zetas. Cualquier
 *              cosa —mover el ratón, una tecla, el scroll— la despierta
 *              con asombro.
 *   juguetona  lo mismo con los intervalos a la mitad, y de vez en cuando
 *              un salto en el sitio.
 * Con el ratón, los ojos siguen al cursor por toda la pantalla y se
 * inclina un poco hacia él; en móvil, sin cursor, mientras se hace
 * scroll mira hacia el contenido que pasa. Con prefers-reduced-motion,
 * nada de esto.
 *
 * TOCARLA. Un clic, un gesto al azar (saludo, salto, guiño); doble clic,
 * una vuelta entera con salto. Con el ratón se puede arrastrar y soltar
 * donde sea: al soltarla rebota, y a los 10 s vuelve a su sitio. En móvil
 * no se arrastra.
 *
 * LAS BURBUJAS (lib/textos/mascota.ts). Una línea corta, junto a la
 * mascota y con ella señalando, cuando ya está posada: como mucho una
 * por pantalla, y ninguna repetida en la sesión (sessionStorage); la de
 * bloque listo, solo si no ha salido otra antes en la visita. Con
 * prefers-reduced-motion aparecen sin animación. Se anuncian al lector
 * de pantalla (role="status"), porque dicen algo.
 *
 * LAS ESCENAS.
 *   inicio        la primera vez en la sesión que se posa en un ancla con
 *                 `escena: "inicio"` (la franja): saluda y dice por dónde
 *                 seguir; si el alumno vuelve tras 5 días o más, asombro y
 *                 «¡Cuánto tiempo!».
 *   bloque_listo  al acabar una generación: asombro donde estudiaba (ya
 *                 sin los anteojos), viaja a su sitio y dice que está listo.
 * Mientras vuela, el estado se congela: lo que llegue en el aire (el
 * «éxito» del cierre) se enseña al aterrizar.
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
/** Entre un clic y otro para que cuente como doble. */
const DOBLE_CLIC_MS = 250;
const ARRASTRE = { umbral: 5, vuelveMs: 10000 };
/** Cada cuánto un micro-gesto (ms), por intensidad. */
const MICRO_CADA: Record<"normal" | "juguetona", [number, number]> = { normal: [8000, 15000], juguetona: [4000, 7500] };
/** A los cuántos ms sin nada bosteza y se sienta, y a los cuántos se duerme. */
const SUENO = { sienta: 90000, duerme: 150000, bostezo: 2000 };
/** El cursor: a cuántos px a un lado mira hacia él, y cuándo vuelve al frente. */
const MIRADA = { lejos: 90, cerca: 45, inclinacionPorPx: 4 / 250 };
/** En móvil, cuánto sigue mirando el contenido después del scroll. */
const MIRADA_SCROLL_MS = 700;
/** Cuánto se ve una burbuja, y cuánto espera tras posarse para decirla. */
const BURBUJA = { dura: 4000, espera: 450, ancho: 220, aire: 10 };
const DIAS_CUANTO_TIEMPO = 5;
const CLAVE_BURBUJAS = "drc:mascota-burbujas";
const CLAVE_ESCENA_INICIO = "drc:mascota-escena-inicio";
const CLAVE_ULTIMA_VISITA = "drc:mascota-ultima-visita";

function leerSesion(clave: string): string | null {
  try {
    return window.sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}
function escribirSesion(clave: string, valor: string) {
  try {
    window.sessionStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento: vale para esta pantalla.
  }
}

/**
 * Los días desde la visita anterior, leídos UNA vez por carga de la app
 * (la navegación entre pantallas no cuenta como volver). Se escribe la
 * de ahora para la próxima.
 */
let diasDesdeLaUltima: number | null | undefined;
function diasSinVenir(): number | null {
  if (diasDesdeLaUltima !== undefined) return diasDesdeLaUltima;
  try {
    const anterior = Number(window.localStorage.getItem(CLAVE_ULTIMA_VISITA));
    window.localStorage.setItem(CLAVE_ULTIMA_VISITA, String(Date.now()));
    diasDesdeLaUltima = anterior > 0 ? (Date.now() - anterior) / 86400000 : null;
  } catch {
    diasDesdeLaUltima = null;
  }
  return diasDesdeLaUltima;
}

type Somnolencia = "despierta" | "sentada" | "dormida";

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

/** prefers-reduced-motion, sin cargar framer (la capa no lo necesita para esto). */
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

export default function CapaMascota() {
  const ruta = usePathname();
  // Fuera de la zona del alumno (la baja de avisos) no hay mascota.
  const fuera = ruta?.startsWith("/avisos") ?? false;

  const caja = useRef<HTMLDivElement>(null);
  const estirar = useRef<HTMLDivElement>(null);
  const safeArea = useRef<HTMLDivElement>(null);
  const [enVuelo, setEnVuelo] = useState(false);
  const [conCajon, setConCajon] = useState(false);
  const [mirada, setMirada] = useState<MiradaMascota>();
  const [inclinacion, setInclinacion] = useState(0);
  const movimiento = useStoreMascota((e) => e.movimiento);
  const burbujaPedida = useStoreMascota((e) => e.burbuja);
  const escena = useStoreMascota((e) => e.escena);
  const [miradaPagina, setMiradaPagina] = useState<MiradaMascota>();
  const [burbuja, setBurbuja] = useState<{ texto: string; n: number }>();
  const burbujaEl = useRef<HTMLDivElement>(null);
  const t = usarIdioma().t.mascota;
  const [micro, setMicro] = useState<{ nombre: MicroGesto; n: number }>();
  const [somnolencia, setSomnolencia] = useState<Somnolencia>("despierta");

  // Lo que comparten el bucle y los manejadores: dónde está dibujada, si
  // se está arrastrando o se soltó en algún sitio, y si está en el aire.
  const dibujadaRef = useRef<Caja | null>(null);
  const arrastre = useRef<Caja | null>(null);
  const suelta = useRef<{ caja: Caja; hasta: number } | null>(null);
  const enVueloRef = useRef(false);
  enVueloRef.current = enVuelo;
  /** Lo llama el bucle cada vez que se posa en un sitio nuevo. */
  const alPosarse = useRef<(id: string | null) => void>(() => {});

  const estado = useStoreMascota(estadoVisible);
  const disparo = useStoreMascota((e) => e.disparo);
  const pose = useStoreMascota((e) => e.pose);
  const activa = useStoreMascota((e) => (e.activa ? e.anclas[e.activa] : undefined));
  const transitorio = useStoreMascota((e) => e.transitorio);
  const velocidad = useStoreMascota((e) => e.velocidad);
  const intensidad = useStoreMascota((e) => e.intensidad);
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
      dibujadaRef.current = c;
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

      // 2. ARRASTRADA, o soltada hace menos de 10 s: donde la dejaron.
      if (arrastre.current) {
        vuelo = null;
        posada = "__arrastre";
        escribir(arrastre.current);
        return;
      }
      if (suelta.current) {
        if (ahora < suelta.current.hasta) {
          posada = "__suelta";
          escribir(suelta.current.caja);
          return;
        }
        suelta.current = null;
      }

      // EN EL AIRE, el viaje manda: el destino se vuelve a medir (se
      // puede mover), y lo demás espera a que aterrice.
      if (vuelo) {
        const destinoAncla = vuelo.hacia === null ? null : anclas[vuelo.hacia];
        if (vuelo.hacia === null) vuelo.hasta = cajaDePercha(ancho, alto);
        else if (destinoAncla?.el?.isConnected) vuelo.hasta = cajaDeAncla(destinoAncla, destinoAncla.el.getBoundingClientRect());
        if (!volar(vuelo, ahora)) {
          posada = vuelo.hacia;
          ultimoDestino = vuelo.hasta;
          vuelo = null;
          alPosarse.current(posada);
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
      if (id !== posada) alPosarse.current(id);
      posada = id;
      if (ahora < apagadaHasta) el.style.opacity = "0";
      else escribir(destino);
    };

    // La mirada que pide la página (el enunciado) y la burbuja, que va
    // junto a la mascota: a su izquierda si cabe —hacia allí señala—, si
    // no a la derecha, a la altura de la cabeza.
    let ultimaMiradaPagina: MiradaMascota | undefined;
    const acompañar = () => {
      const c = dibujada;
      if (!c) return;
      const w = c.alto * PROPORCION;
      const objetivo = storeMascota.leer().mirarA;
      let mira: MiradaMascota | undefined;
      if (objetivo?.isConnected) {
        const r = objetivo.getBoundingClientRect();
        mira = r.left + r.width / 2 < c.x + w * PIES_X ? "mira_izq" : "mira_der";
      }
      if (mira !== ultimaMiradaPagina) {
        ultimaMiradaPagina = mira;
        setMiradaPagina(mira);
      }
      const b = burbujaEl.current;
      if (b && b.dataset.visible === "1") {
        const ancho = b.offsetWidth;
        const cabe = c.x - ancho - BURBUJA.aire > 8;
        const x = cabe ? c.x - ancho - BURBUJA.aire : Math.min(window.innerWidth - ancho - 8, c.x + w + BURBUJA.aire);
        const y = limitar(c.y + c.alto * 0.08, 8, window.innerHeight - b.offsetHeight - 8);
        b.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        b.dataset.lado = cabe ? "izq" : "der";
      }
    };

    const bucle = () => {
      colocar();
      acompañar();
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

  // ---------------------------------------------------------------
  // LA VIDA PROPIA
  // ---------------------------------------------------------------
  const reducido = useMovimientoReducido();
  // La fuente es la ref (la leen los manejadores); el estado es para pintar.
  const somnolenciaRef = useRef<Somnolencia>("despierta");
  const ultimaInteraccion = useRef(0);

  // Cualquier cosa del alumno cuenta como que sigue ahí, y la despierta.
  useEffect(() => {
    if (fuera) return;
    ultimaInteraccion.current = Date.now();
    const alInteractuar = () => {
      ultimaInteraccion.current = Date.now();
      if (storeMascota.leer().adelantoSueno) storeMascota.adelantarSueno(0);
      if (somnolenciaRef.current !== "despierta") {
        somnolenciaRef.current = "despierta";
        setSomnolencia("despierta");
        storeMascota.gesto("asombro");
      }
    };
    const eventos = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    eventos.forEach((e) => window.addEventListener(e, alInteractuar, { passive: true, capture: true }));
    return () => eventos.forEach((e) => window.removeEventListener(e, alInteractuar, { capture: true }));
  }, [fuera]);

  // Los ojos siguen al cursor, y se inclina hacia él. Solo con ratón.
  useEffect(() => {
    if (fuera || reducido) return;
    let ultimaMirada: MiradaMascota | undefined;
    let ultimaInclinacion = 0;
    const alMover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const c = dibujadaRef.current;
      if (!c) return;
      const centro = c.x + c.alto * PROPORCION * PIES_X;
      const dx = e.clientX - centro;
      let nueva = ultimaMirada;
      if (dx < -MIRADA.lejos) nueva = "mira_izq";
      else if (dx > MIRADA.lejos) nueva = "mira_der";
      else if (Math.abs(dx) < MIRADA.cerca) nueva = undefined;
      if (nueva !== ultimaMirada) {
        ultimaMirada = nueva;
        setMirada(nueva);
      }
      // En medios grados: no hace falta más, y así no se repinta en cada píxel.
      const grados = Math.round(limitar(dx * MIRADA.inclinacionPorPx, -4, 4) * 2) / 2;
      if (grados !== ultimaInclinacion) {
        ultimaInclinacion = grados;
        setInclinacion(grados);
      }
    };
    window.addEventListener("pointermove", alMover, { passive: true });
    return () => window.removeEventListener("pointermove", alMover);
  }, [fuera, reducido]);

  // En móvil, sin cursor: mientras se hace scroll, mira hacia el contenido.
  useEffect(() => {
    if (fuera || reducido || !window.matchMedia("(pointer: coarse)").matches) return;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const alScroll = () => {
      const c = dibujadaRef.current;
      if (!c) return;
      // A la derecha de la pantalla, el contenido le queda a su izquierda.
      setMirada(c.x + c.alto * PROPORCION * PIES_X > window.innerWidth / 2 ? "mira_izq" : "mira_der");
      clearTimeout(reloj);
      reloj = setTimeout(() => setMirada(undefined), MIRADA_SCROLL_MS);
    };
    window.addEventListener("scroll", alScroll, { passive: true, capture: true });
    return () => {
      clearTimeout(reloj);
      window.removeEventListener("scroll", alScroll, { capture: true });
    };
  }, [fuera, reducido]);

  // Los micro-gestos, según la intensidad: nunca el mismo dos veces, y
  // las miradas alternando.
  const enReposo = estado === "idle" && !transitorio && somnolencia === "despierta";
  useEffect(() => {
    if (fuera || reducido || intensidad === "tranquila" || !enReposo) return;
    const [min, max] = MICRO_CADA[intensidad];
    let reloj: ReturnType<typeof setTimeout>;
    let ultimo = "";
    let lado: MiradaMascota = "mira_der";
    const programar = () => {
      reloj = setTimeout(() => {
        if (!enVueloRef.current && !arrastre.current) {
          const opciones = enPercha ? ["cabeza"] : ["mira", "piensa", "estira", "cabeza"];
          if (intensidad === "juguetona" && !enPercha && Math.random() < 0.25) opciones.push("salto_sitio");
          const posibles = opciones.filter((o) => o !== ultimo);
          const elegido = posibles[Math.floor(Math.random() * posibles.length)] ?? "cabeza";
          ultimo = elegido;
          if (elegido === "mira") {
            lado = lado === "mira_izq" ? "mira_der" : "mira_izq";
            storeMascota.gesto(lado);
          } else if (elegido === "cabeza") {
            setMicro((m) => ({ nombre: "cabeza", n: (m?.n ?? 0) + 1 }));
          } else if (elegido === "salto_sitio") {
            storeMascota.moverse("salto_sitio");
          } else {
            storeMascota.gesto(elegido as GestoMascota);
          }
        }
        programar();
      }, min + Math.random() * (max - min));
    };
    programar();
    return () => clearTimeout(reloj);
  }, [fuera, reducido, intensidad, enReposo, enPercha]);

  // El sueño: a los 90 s sin nada, bosteza y se sienta; a los 60 s más,
  // se duerme. Si llega otro estado (una generación, un acierto),
  // despierta sin más.
  useEffect(() => {
    if (fuera || reducido || intensidad === "tranquila") return;
    const reloj = setInterval(() => {
      const e = storeMascota.leer();
      const quieto = Date.now() - ultimaInteraccion.current + e.adelantoSueno;
      if (e.transitorio || estadoVisible(e) !== "idle") {
        if (somnolenciaRef.current !== "despierta") {
          somnolenciaRef.current = "despierta";
          setSomnolencia("despierta");
        }
        return;
      }
      if (somnolenciaRef.current === "despierta" && quieto >= SUENO.sienta) {
        somnolenciaRef.current = "sentada";
        storeMascota.gesto("estira", { duracion: SUENO.bostezo });
        setTimeout(() => {
          if (somnolenciaRef.current === "sentada") setSomnolencia("sentada");
        }, SUENO.bostezo);
      } else if (somnolenciaRef.current === "sentada" && quieto >= SUENO.duerme) {
        somnolenciaRef.current = "dormida";
        setSomnolencia("dormida");
      }
    }, 1000);
    return () => clearInterval(reloj);
  }, [fuera, reducido, intensidad]);

  const arrastrada = useRef(false);
  const relojClic = useRef<ReturnType<typeof setTimeout>>();

  // ---------------------------------------------------------------
  // LAS ESCENAS Y LAS BURBUJAS
  // ---------------------------------------------------------------
  // La de llegada al inicio: al posarse, la primera vez en la sesión.
  alPosarse.current = (id) => {
    if (id === null || reducido) return;
    const ancla = storeMascota.leer().anclas[id];
    if (ancla?.escena !== "inicio" || leerSesion(CLAVE_ESCENA_INICIO)) return;
    escribirSesion(CLAVE_ESCENA_INICIO, "1");
    const dias = diasSinVenir();
    setTimeout(() => storeMascota.gesto("saludo"), 250);
    setTimeout(() => {
      if (dias !== null && dias >= DIAS_CUANTO_TIEMPO) {
        storeMascota.gesto("asombro");
        storeMascota.decir("cuantoTiempo");
      } else {
        storeMascota.decir("llegadaInicio");
      }
    }, 2100);
  };
  // La visita cuenta aunque no se pase por el inicio.
  useEffect(() => {
    if (!fuera) diasSinVenir();
  }, [fuera]);

  // Bloque listo: asombro donde estudiaba, y la burbuja al llegar a su sitio.
  useEffect(() => {
    if (escena?.nombre !== "bloque_listo") return;
    storeMascota.gesto("asombro", { duracion: 700 });
    storeMascota.decir("bloqueListo");
  }, [escena?.n, escena?.nombre]);

  // Una burbuja pedida se dice cuando está posada (no en el aire), si no
  // se ha dicho en la sesión ni hay ya otra en esta pantalla. La de bloque
  // listo, además, solo si es la primera de la visita: sale en otra
  // pantalla que la de llegada, y dos seguidas sobran.
  const burbujaEnPantalla = useRef<string | null>(null);
  useEffect(() => {
    if (!burbujaPedida || enVuelo) return;
    const reloj = setTimeout(() => {
      const dichas = (leerSesion(CLAVE_BURBUJAS) ?? "").split(",").filter(Boolean);
      const sobra = burbujaPedida.clave === "bloqueListo" && dichas.length > 0;
      if (sobra || dichas.includes(burbujaPedida.clave) || burbujaEnPantalla.current === ruta) {
        storeMascota.anotar("burbuja", `callada ${burbujaPedida.clave}`);
        return;
      }
      escribirSesion(CLAVE_BURBUJAS, [...dichas, burbujaPedida.clave].join(","));
      burbujaEnPantalla.current = ruta;
      setBurbuja({ texto: textoDe(burbujaPedida.clave, burbujaPedida.profesor), n: burbujaPedida.n });
      storeMascota.gesto("senala", { duracion: 1600 });
      storeMascota.anotar("burbuja", `dicha ${burbujaPedida.clave}`);
    }, BURBUJA.espera);
    return () => clearTimeout(reloj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burbujaPedida?.n, enVuelo]);
  useEffect(() => {
    if (!burbuja) return;
    const reloj = setTimeout(() => setBurbuja(undefined), BURBUJA.dura);
    return () => clearTimeout(reloj);
  }, [burbuja]);

  const textoDe = (clave: ClaveBurbuja, profesor?: string): string => {
    const b = t.burbujas;
    if (clave === "cierreBien") return b.cierreBien(profesor ?? "");
    if (clave === "cierreSigamosProfesor") return b.cierreSigamosProfesor(profesor ?? "");
    return b[clave];
  };

  // Mientras vuela, el estado se congela: se enseña al aterrizar.
  const congelado = useRef({ estado, disparo });
  if (!enVuelo) congelado.current = { estado, disparo };

  if (fuera) return null;

  const tocar = () => {
    activa?.onToque?.();
    // En reposo, un gesto al azar; en mitad de un estado, no se le corta.
    if (!transitorio && (estado === "idle" || enPercha)) {
      storeMascota.gesto(AL_TOCAR[Math.floor(Math.random() * AL_TOCAR.length)]);
    }
  };

  // Un clic espera un poco por si es doble; el arrastre anula el clic.
  const puedeArrastrar = (e: PointerEventReact) =>
    !reducido && e.pointerType !== "touch" && window.innerWidth >= MOVIL_PX && !enVueloRef.current;
  const alPulsar = (e: PointerEventReact<HTMLDivElement>) => {
    const c = dibujadaRef.current;
    if (!c || !puedeArrastrar(e)) return;
    const inicio = { x: e.clientX, y: e.clientY };
    const desfase = { x: e.clientX - c.x, y: e.clientY - c.y };
    const alto = c.alto;
    const mover = (m: PointerEvent) => {
      if (!arrastre.current && Math.hypot(m.clientX - inicio.x, m.clientY - inicio.y) < ARRASTRE.umbral) return;
      arrastrada.current = true;
      arrastre.current = { x: m.clientX - desfase.x, y: m.clientY - desfase.y, alto };
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      if (!arrastre.current) return;
      suelta.current = { caja: arrastre.current, hasta: performance.now() + ARRASTRE.vuelveMs };
      arrastre.current = null;
      storeMascota.moverse("rebote");
      storeMascota.anotar("viaje", "arrastrada y soltada");
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };
  const alClic = () => {
    if (arrastrada.current) {
      arrastrada.current = false;
      return;
    }
    clearTimeout(relojClic.current);
    relojClic.current = setTimeout(tocar, DOBLE_CLIC_MS);
  };
  const alDobleClic = () => {
    clearTimeout(relojClic.current);
    if (!reducido) storeMascota.moverse("vuelta");
  };

  const sostenida: GestoMascota | undefined = enVuelo
    ? "salto"
    : somnolencia === "dormida"
      ? "dormido"
      : somnolencia === "sentada" || enPercha
        ? "sentado"
        : undefined;

  return (
    <>
    {/* La burbuja: fuera de la capa, que es aria-hidden, porque dice algo. */}
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${conCajon ? "z-[56]" : "z-[39]"}`}>
      <div
        ref={burbujaEl}
        role="status"
        data-visible={burbuja ? "1" : "0"}
        className={`absolute left-0 top-0 max-w-[220px] rounded-[14px] border border-marca-borde bg-white px-3.5 py-2.5 font-sans text-[13.5px] font-semibold leading-[1.35] text-marca-tinta shadow-[0_10px_24px_-10px_rgba(18,33,26,0.35)] ${
          reducido ? "" : "transition-opacity duration-200 ease-out"
        } ${burbuja ? "opacity-100" : "opacity-0"}`}
      >
        {burbuja?.texto}
      </div>
    </div>
    <div aria-hidden className={`pointer-events-none fixed inset-0 overflow-hidden ${conCajon ? "z-[55]" : "z-[38]"}`}>
      {/* Para leer el safe-area de abajo, que solo sabe CSS. */}
      <div ref={safeArea} className="invisible absolute" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      <div
        ref={caja}
        title={activa?.titulo}
        className="pointer-events-auto absolute left-0 top-0 origin-top-left cursor-pointer touch-manipulation transition-opacity duration-150"
        style={{ width: ALTO_BASE * PROPORCION, height: ALTO_BASE, opacity: 0 }}
        onPointerDown={alPulsar}
        onClick={alClic}
        onDoubleClick={alDobleClic}
      >
        {/* El estiramiento y el aplastamiento de los viajes, desde los pies. */}
        <div ref={estirar} className="h-full w-full" style={{ transformOrigin: `${PIES_X * 100}% 100%` }}>
          <Geckonoid
            estado={congelado.current.estado}
            disparo={congelado.current.disparo}
            size={ALTO_BASE}
            velocidad={velocidad}
            volverAIdle={false}
            quieta={(activa?.quieta ?? false) && !transitorio}
            pose={pose}
            sostenida={sostenida}
            mirada={somnolencia === "despierta" ? (miradaPagina ?? mirada) : undefined}
            inclinacion={somnolencia === "despierta" ? inclinacion : 0}
            movimiento={movimiento}
            micro={micro}
            vidaPropia={false}
            etiqueta={null}
          />
        </div>
      </div>
    </div>
    </>
  );
}
