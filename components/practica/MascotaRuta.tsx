"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import { DURACION_ESTADO_MS } from "@/components/mascota/estados";
import parchesJson from "@/components/mascota/parches.json";
import { useAnclaMascota } from "@/components/mascota/AnclaMascota";
import { storeMascota } from "@/components/mascota/store";

/** El id del ancla de la ruta. */
const ANCLA = "parati-ruta";

/**
 * EL SITIO DE LA MASCOTA EN EL CAMINO DE «PARA TI».
 *
 * No pinta la mascota: mueve un ANCLA (prioridad 2) por el camino, y
 * CapaMascota, que la sigue en cada frame, pone encima la única
 * mascota de la app. Lo de abajo describe dónde va ese hueco y cómo
 * anda; la mascota va donde vaya él.
 *
 * Vive sobre la parada donde está el presente —la que lleva «Estás
 * aquí»— y cuando el presente cambia de parada, la recorre andando por
 * el trazo hasta la nueva. Una sola instancia para los dos mapas: no
 * sabe si el camino es el serpenteante de escritorio o el vertical de
 * móvil, solo pide dónde está cada nodo (`posicionDe`) y con qué regla
 * se curva el tramo entre dos.
 *
 * DÓNDE SE PONE. En escritorio, DE PIE SOBRE EL NODO: es el único sitio
 * sin trazo, porque las curvas salen planas del nodo y solo suben a
 * partir de su borde; la chapa y el rótulo del nodo se apartan por
 * encima de su cabeza (eso lo hace `Ruta`). En móvil, JUNTO AL NODO:
 * el trazo entra vertical por arriba y sale por abajo, así que arriba
 * estorba; va del lado exterior de la curva —lejos de la parada
 * anterior— y, en las bandas de los bordes, hacia el centro para no
 * salirse del campo.
 *
 * CÓMO AVANZA. El presente puede cambiar con la pantalla montada —en
 * el banco de pruebas— o en otra pantalla: el alumno cierra el bloque
 * en su página y vuelve. Para el segundo caso se guarda en localStorage
 * la última parada donde estuvo; al montar, si el presente ya no es
 * esa y la vieja sigue en el camino, se camina desde ella. Es una nota
 * para animar: si falta o no cuadra, la mascota aparece donde toca y
 * ya está.
 *
 * La caminata muestrea la misma cúbica con la que `lib/ruta` dibuja el
 * tramo, en píxeles del contenedor, y le suma tres saltitos por tramo;
 * los fotogramas se le dan a framer con paso lineal sobre un avance ya
 * suavizado. Al llegar, «ánimo» y a idle: sin estrellas ni salto
 * grande, que son del cierre del bloque y del diploma
 * (lib/gamificacion). Con prefers-reduced-motion no anda: aparece en
 * la nueva parada con un fundido.
 *
 * Para el lector de pantalla es decorativa: el estado lo dice el nodo.
 * El tooltip («Estás en: …») es el `titulo` del ancla, y al tocarla se
 * centra la parada (`onToque`), además del gesto que haga la mascota.
 */

export type MapaRuta = "escritorio" | "movil";

/** Dónde está un nodo: su centro en píxeles del contenedor, y su radio. */
export type PuntoRuta = { x: number; y: number; r: number; mapa: MapaRuta };

type Ancla = { x: number; y: number };
type Lado = "izq" | "der";

const ALTO: Record<MapaRuta, number> = { escritorio: 96, movil: 64 };
const PROPORCION = parchesJson.lienzo.proporcion;
/** Los pies de Geckonoid, como fracción de su ancho (ver Geckonoid.tsx). */
const PIES_X = 0.414;
/** Escritorio: cuánto pisa el disco, para que se vea que está encima. */
const PISADA = 12;
/** Móvil: aire entre el disco y la mascota, y cuánto bajan los pies del centro del nodo. */
const HUECO = 6;
const BAJADA = 12;
/** Alto de los saltitos al andar. */
const SALTO: Record<MapaRuta, number> = { escritorio: 14, movil: 10 };
const SALTITOS_POR_TRAMO = 3;
const DURACION_TRAMO_MS = 800;
/** Más lejos que esto no se anda: aparece. */
const MAX_TRAMOS = 3;
const MUESTRAS_POR_TRAMO = 24;

const claveVista = (alumnoId: string) => `drc:mascota-parada:${alumnoId}`;
const claveEscena = (alumnoId: string) => `drc:mascota-escena-ruta:${alumnoId}`;

function leer(almacen: Storage | undefined, clave: string): string | null {
  try {
    return almacen?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}

function escribir(almacen: Storage | undefined, clave: string, valor: string): void {
  try {
    almacen?.setItem(clave, valor);
  } catch {
    // Modo privado o cuota llena: sin nota, la próxima vez aparece sin andar.
  }
}

/** El punto de una cúbica. */
function cubica(a: Ancla, c1: Ancla, c2: Ancla, b: Ancla, t: number): Ancla {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

/**
 * Los tiradores del tramo entre dos nodos: LOS MISMOS que usa
 * `lib/ruta` para dibujarlo. Escritorio: a media distancia y a la
 * altura de cada nodo. Móvil: en vertical, al 52 % de la bajada.
 */
function tiradores(a: PuntoRuta, b: PuntoRuta): [Ancla, Ancla] {
  if (a.mapa === "escritorio") {
    const mitad = (b.x - a.x) / 2;
    return [
      { x: a.x + mitad, y: a.y },
      { x: b.x - mitad, y: b.y },
    ];
  }
  const h = b.y - a.y;
  return [
    { x: a.x, y: a.y + 0.52 * h },
    { x: b.x, y: a.y + 0.52 * h },
  ];
}

/** De qué lado del nodo va, en móvil. En escritorio no hay lado: va encima. */
function ladoDe(p: PuntoRuta, anterior: PuntoRuta | null, anchoContenedor: number): Lado {
  if (p.mapa === "escritorio") return "der";
  if (p.x < anchoContenedor * 0.35) return "der";
  if (p.x > anchoContenedor * 0.65) return "izq";
  return anterior && anterior.x > p.x ? "izq" : "der";
}

/** Dónde caen los pies para un nodo. */
function anclaDe(p: PuntoRuta, lado: Lado): Ancla {
  const ancho = ALTO[p.mapa] * PROPORCION;
  if (p.mapa === "escritorio") return { x: p.x, y: p.y - p.r + PISADA };
  return lado === "der"
    ? { x: p.x + p.r + HUECO + PIES_X * ancho, y: p.y + BAJADA }
    : { x: p.x - p.r - HUECO - (1 - PIES_X) * ancho, y: p.y + BAJADA };
}

const suave = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export default function MascotaRuta({
  contenedor,
  posicionDe,
  orden,
  claveAqui,
  titulo,
  alumnoId,
  completa,
  version,
  retrasoEntrada,
  estasEn,
}: {
  /** El contenedor respecto al que se miden los nodos. */
  contenedor: RefObject<HTMLElement>;
  /** Dónde está el nodo de una parada, o null si no se puede saber. */
  posicionDe: (clave: string) => PuntoRuta | null;
  /** Las claves de las paradas visibles, en el orden del camino. */
  orden: string[];
  /** La parada del presente. Null: no hay mascota. */
  claveAqui: string | null;
  /** Su título, para el tooltip. */
  titulo: string;
  alumnoId: string;
  /** Todo hecho: la mascota espera con el diploma en la mano. */
  completa: boolean;
  /** Cambia cuando los nodos se mueven de sitio (plegar, elegir otra tarjeta). */
  version: string;
  /** Cuánto esperar al montar para que los nodos hayan entrado, en ms. */
  retrasoEntrada: number;
  estasEn: (titulo: string) => string;
}) {
  const reducido = useReducedMotion() ?? false;
  const [raiz, animar] = useAnimate<HTMLDivElement>();
  const [visible, setVisible] = useState(false);
  const [mapa, setMapa] = useState<MapaRuta>("escritorio");
  // Con todo hecho, el diploma: es el estado de base del ancla, el que
  // tiene mientras está aquí. «Ánimo» al llegar es un estado de paso.
  const [conDiploma, setConDiploma] = useState(false);
  const [quieta, setQuieta] = useState(false);

  // Lo que cambia cada render se lee de refs, para que los efectos no
  // dependan de ello.
  const buscar = useRef(posicionDe);
  buscar.current = posicionDe;
  const ordenActual = useRef(orden);
  ordenActual.current = orden;
  const retraso = useRef(retrasoEntrada);
  retraso.current = retrasoEntrada;

  /** Dónde está parada ahora (la clave), y si ya se colocó alguna vez. */
  const parada = useRef<string | null>(null);
  const listo = useRef(false);
  const andando = useRef<{ stop: () => void } | null>(null);
  const yaHizoScroll = useRef(false);

  const animo = () => storeMascota.dispara("animo", { desde: ANCLA });

  /**
   * Lo que hace al quedarse en una parada: con todo hecho, el diploma;
   * si no, nada. La escena —salto y estrellas— solo la primera vez en
   * la sesión: la marca se escribe AQUÍ, cuando de verdad se enseña, y
   * no en un efecto, que en desarrollo React ejecuta dos veces.
   */
  const enReposo = () => {
    if (!completa) return;
    const vista = leer(window.sessionStorage, claveEscena(alumnoId)) === "1";
    setQuieta(vista);
    setConDiploma(true);
    if (!vista) {
      escribir(window.sessionStorage, claveEscena(alumnoId), "1");
      // Celebrada una vez, se queda quieta: si la mascota se va a otra
      // ancla y vuelve, no repite el salto.
      setTimeout(() => setQuieta(true), DURACION_ESTADO_MS);
    }
  };

  /** Lleva la ventana hasta el nodo del presente si no está a la vista, o siempre si se pide. */
  const centrar = (clave: string, siempre: boolean) => {
    const cont = contenedor.current;
    const p = buscar.current(clave);
    if (!cont || !p) return;
    const y = cont.getBoundingClientRect().top + p.y;
    const alto = window.innerHeight;
    if (!siempre && y > 90 && y < alto - 160) return;
    window.scrollBy({ top: y - alto / 2, behavior: reducido ? "auto" : "smooth" });
  };

  /**
   * Coloca la mascota en la parada `clave`. Si `desde` es una parada
   * anterior del camino y no está lejos, va andando; si no, aparece
   * —o se desliza, si ya estaba en pantalla—.
   */
  const colocar = (clave: string, desde: string | null) => {
    const el = raiz.current;
    const cont = contenedor.current;
    const p = buscar.current(clave);
    if (!el || !cont || !p) {
      setVisible(false);
      return;
    }
    andando.current?.stop();
    andando.current = null;

    const orden = ordenActual.current;
    const anchoCont = cont.getBoundingClientRect().width;
    const iHasta = orden.indexOf(clave);
    const anterior = iHasta > 0 ? buscar.current(orden[iHasta - 1]) : null;
    const meta = anclaDe(p, ladoDe(p, anterior, anchoCont));
    setMapa(p.mapa);

    const iDesde = desde === null ? -1 : orden.indexOf(desde);
    const tramos = iDesde !== -1 && iDesde < iHasta ? iHasta - iDesde : 0;
    const puedeAndar = tramos > 0 && tramos <= MAX_TRAMOS && !reducido;

    const terminar = () => {
      parada.current = clave;
      escribir(window.localStorage, claveVista(alumnoId), clave);
      setVisible(true);
    };

    if (puedeAndar) {
      // Los nodos por los que pasa, medidos ahora: si alguno no está,
      // no se anda.
      const nodos: PuntoRuta[] = [];
      for (let i = iDesde; i <= iHasta; i++) {
        const q = buscar.current(orden[i]);
        if (!q) break;
        nodos.push(q);
      }
      if (nodos.length === tramos + 1) {
        const anclas = nodos.map((q, k) => {
          const prev = iDesde + k > 0 ? buscar.current(orden[iDesde + k - 1]) : null;
          return anclaDe(q, ladoDe(q, prev, anchoCont));
        });
        const xs: number[] = [];
        const ys: number[] = [];
        const total = tramos * MUESTRAS_POR_TRAMO;
        for (let k = 0; k <= total; k++) {
          const u = suave(k / total);
          const pos = Math.min(tramos - 1e-9, u * tramos);
          const i = Math.floor(pos);
          const t = pos - i;
          const [c1, c2] = tiradores(nodos[i], nodos[i + 1]);
          const sobre = cubica(nodos[i], c1, c2, nodos[i + 1], t);
          // Los pies no van sobre el centro del nodo sino a su lado o
          // encima: ese desvío se interpola entre el de salida y el de
          // llegada del tramo.
          const dA = { x: anclas[i].x - nodos[i].x, y: anclas[i].y - nodos[i].y };
          const dB = { x: anclas[i + 1].x - nodos[i + 1].x, y: anclas[i + 1].y - nodos[i + 1].y };
          const salto = SALTO[p.mapa] * Math.abs(Math.sin(Math.PI * SALTITOS_POR_TRAMO * tramos * u));
          xs.push(sobre.x + dA.x + (dB.x - dA.x) * t - meta.x);
          ys.push(sobre.y + dA.y + (dB.y - dA.y) * t - salto - meta.y);
        }
        xs[xs.length - 1] = 0;
        ys[ys.length - 1] = 0;

        animar(el, { left: meta.x, top: meta.y, x: xs[0], y: ys[0] }, { duration: 0 });
        setVisible(true);
        const marcha = animar(
          el,
          { x: xs, y: ys },
          { duration: (DURACION_TRAMO_MS * tramos) / 1000, ease: "linear" }
        );
        andando.current = marcha;
        marcha.then(
          () => {
            if (andando.current !== marcha) return;
            andando.current = null;
            terminar();
            // Al llegar: «ánimo», o el diploma si con esta ya está todo.
            if (completa) enReposo();
            else animo();
          },
          () => {}
        );
        return;
      }
    }

    if (reducido && desde !== null && desde !== clave) {
      // Sin caminata: se apaga, se coloca, y se enciende en la nueva
      // con el fundido de la capa, que se enciende en el ancla nueva.
      setVisible(false);
      animar(el, { left: meta.x, top: meta.y, x: 0, y: 0 }, { duration: 0 });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          terminar();
          enReposo();
        })
      );
      return;
    }

    if (parada.current !== null && visible && !reducido) {
      // Ya estaba a la vista: los nodos se movieron (plegar, otra
      // tarjeta) y ella los sigue.
      animar(el, { left: meta.x, top: meta.y, x: 0, y: 0 }, { type: "spring", stiffness: 260, damping: 26 });
    } else {
      animar(el, { left: meta.x, top: meta.y, x: 0, y: 0 }, { duration: 0 });
    }
    terminar();
    // Sin repetir la escena si ya está con el diploma: esto también
    // corre cuando los nodos solo se mueven de sitio.
    if (!conDiploma) enReposo();
  };
  const colocarRef = useRef(colocar);
  colocarRef.current = colocar;

  // ---------------------------------------------------------------
  // AL MONTAR: esperar a que los nodos entren, y aparecer —o venir
  // andando desde la última parada donde estuvo, si el presente
  // cambió mientras no estaba esta pantalla—.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (claveAqui === null) return;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const arrancar = () => {
      if (listo.current) return;
      listo.current = true;
      const vista = leer(window.localStorage, claveVista(alumnoId));
      colocarRef.current(claveAqui, vista !== claveAqui ? vista : null);
      if (!yaHizoScroll.current) {
        yaHizoScroll.current = true;
        centrar(claveAqui, false);
      }
    };
    if (retraso.current <= 0) arrancar();
    else reloj = setTimeout(arrancar, retraso.current);
    return () => clearTimeout(reloj);
    // Solo al montar: el cambio de parada lo lleva el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si la entrada del camino se cancela —vuelve de cerrar un bloque y
  // la ruta se pinta sin escalonado—, no hay que esperar.
  useEffect(() => {
    if (retrasoEntrada > 0 || listo.current || claveAqui === null) return;
    listo.current = true;
    const vista = leer(window.localStorage, claveVista(alumnoId));
    colocarRef.current(claveAqui, vista !== claveAqui ? vista : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retrasoEntrada]);

  // El presente cambió con la pantalla montada: de la parada donde
  // estaba a la nueva.
  useEffect(() => {
    if (!listo.current || claveAqui === null) return;
    if (parada.current === claveAqui) return;
    colocarRef.current(claveAqui, parada.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveAqui]);

  // Los nodos cambiaron de sitio: seguirlos. Mientras anda, no: la
  // caminata acaba donde se calculó y al terminar se vuelve a colocar.
  useEffect(() => {
    if (!listo.current || claveAqui === null || andando.current) return;
    colocarRef.current(claveAqui, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  useEffect(() => {
    const cont = contenedor.current;
    if (!cont || typeof ResizeObserver === "undefined") return;
    const seguir = () => {
      if (!listo.current || claveAqui === null || andando.current) return;
      colocarRef.current(claveAqui, null);
    };
    const observador = new ResizeObserver(seguir);
    observador.observe(cont);
    window.addEventListener("resize", seguir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", seguir);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveAqui]);

  useEffect(() => () => andando.current?.stop(), []);

  // Deja de estar todo hecho —llegó la clase siguiente—: suelta el
  // diploma. Ponérselo es cosa de `enReposo`, al quedarse en la parada.
  useEffect(() => {
    if (completa) return;
    setQuieta(false);
    setConDiploma(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completa]);

  const ancla = useAnclaMascota(ANCLA, {
    prioridad: 2,
    estado: conDiploma ? "nivel_superado" : "idle",
    quieta,
    activa: visible && claveAqui !== null,
    titulo: estasEn(titulo),
    onToque: () => {
      if (claveAqui !== null) centrar(claveAqui, true);
    },
  });

  if (claveAqui === null) return null;

  const alto = ALTO[mapa];
  const ancho = alto * PROPORCION;

  return (
    <div
      ref={raiz}
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        width: ancho,
        height: alto,
        // Los pies (al 41 % del ancho) sobre el punto de anclaje.
        marginLeft: -PIES_X * ancho,
        marginTop: -alto,
      }}
    >
      {/* El hueco que mide la capa: se mueve con la caja al andar. */}
      <div ref={ancla} className="h-full w-full" />
    </div>
  );
}
