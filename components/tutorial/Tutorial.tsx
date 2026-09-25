"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as KeyboardEventReact } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  PASOS_RECORRIDO,
  selectorNav,
  type DestinoTutorial,
  type PasoRecorrido,
  type RutaTutorial,
  type TextoTutorial,
} from "@/lib/tutorial/pasos";
import { usarIdioma } from "@/components/ProveedorIdioma";
import AnclaMascota from "@/components/mascota/AnclaMascota";
import { storeMascota } from "@/components/mascota/store";
import { SUCESO_LANZAR_TUTORIAL, type ModoTutorial } from "@/components/tutorial/eventos";

/**
 * EL MOTOR DEL RECORRIDO GUIADO.
 *
 * Montado una sola vez, en el marco de la app (`MarcoApp`): sobrevive a
 * la navegación entre pantallas. Arranca con el suceso
 * `drc:lanzar-tutorial` (ver `eventos.ts`: lo lanzan el onboarding del
 * inicio y el botón de la Ayuda) y recorre `PASOS_RECORRIDO`: los pasos
 * de `lib/tutorial/pasos.ts` con sus PUENTES, uno antes de cada cambio
 * de pantalla.
 *
 * CADA PASO SE RESUELVE ENTERO ANTES DE PINTARSE: si es de otra pantalla,
 * se navega y se espera a llegar; luego se busca su elemento (el primero
 * visible con ese `data-tour`), o el de su alternativa. Nada espera para
 * siempre: sin pantalla en `ESPERA_RUTA_MS` o sin elemento en
 * `ESPERA_ELEMENTO_MS`, el paso se salta en el sentido en que se iba.
 * MIENTRAS SE ESPERA NO SE APAGA LA PANTALLA: sale el cuadro con la
 * mascota en su pose neutra y un «un momento».
 *
 * LO QUE SE PINTA:
 *   el velo     un SVG a pantalla completa con un recorte redondeado
 *               alrededor del elemento (Framer lo mueve de uno a otro).
 *               Tapa la página: durante el recorrido no se pulsa nada de
 *               debajo, salvo el botón de un paso puente.
 *   el cuadro   la frase del paso, el «2 de 8» y los botones. En
 *               escritorio junto al elemento (al lado si es estrecho,
 *               debajo o encima si no); en móvil, a todo el ancho abajo
 *               —o justo encima de lo señalado si está abajo, como las
 *               pestañas—.
 *   la mascota  la única que hay (CapaMascota): el cuadro lleva un ancla
 *               de prioridad 100 en el lado que mira al elemento, y la
 *               mascota viaja a ella. Al llegar, SEÑALA el elemento
 *               (`storeMascota.senalar`): hacia dónde, o si no señala,
 *               lo decide `calcularPoseMascota`. Ningún paso lo dice.
 *
 * LOS PUENTES. Un paso puente se queda en la pantalla en la que está y
 * destaca, con un halo verde que late, el botón de la navegación que
 * lleva a la siguiente. En escritorio abre la barra lateral para que se
 * lea el nombre. «Siguiente» navega, y pulsar el botón destacado también:
 * es lo mismo. Al llegar, ese botón queda marcado durante el primer paso
 * de la pantalla nueva. «Atrás» no pasa por ellos.
 *
 * El paso en curso se guarda en sessionStorage para sobrevivir a la
 * navegación y a una recarga. Esc o «Saltar» lo cierran en cualquier
 * momento; el foco queda dentro del cuadro mientras está abierto.
 */

const PASOS = PASOS_RECORRIDO;
const CLAVE = "drc:tutorial";
const ANCLA = "tutorial";
const ESPERA_RUTA_MS = 7000;
const ESPERA_ELEMENTO_MS = 4000;
/** Lo que se tarda en enseñar el cuadro de espera: lo que llega antes no lo necesita. */
const ANTES_DE_ESPERA_MS = 300;
const SONDEO_MS = 120;
const MARGEN_HUECO = 8;
const MOVIL_PX = 900;
/** Lo más ancho que puede ser un elemento para poner el cuadro a su lado. */
const ANCHO_LATERAL = 420;

type Activo = { indice: number; modo: ModoTutorial; direccion: 1 | -1 };
type Resuelto = { indice: number; el: HTMLElement; texto: TextoTutorial };
type Caja = { x: number; y: number; w: number; h: number };

export default function Tutorial({ rutas }: { rutas: Record<Exclude<RutaTutorial, null>, string> }) {
  const { idioma, t } = usarIdioma();
  const tt = t.mascota.tutorial;
  const router = useRouter();
  const ruta = usePathname() ?? "";
  const reducido = useReducedMotion() ?? false;

  const [activo, setActivo] = useState<Activo | null>(null);
  const [resuelto, setResuelto] = useState<Resuelto | null>(null);
  const [hueco, setHueco] = useState<Caja | null>(null);
  /** El botón de la sección a la que se acaba de llegar por un puente. */
  const [marca, setMarca] = useState<Caja | null>(null);
  const [vista, setVista] = useState({ w: 0, h: 0 });
  const [altoCuadro, setAltoCuadro] = useState(220);
  const [esperando, setEsperando] = useState(false);
  const cuadro = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLButtonElement>(null);
  const navegadoA = useRef<number | null>(null);

  // ---------------------------------------------------------------
  // ARRANCAR, RETOMAR, CERRAR
  // ---------------------------------------------------------------
  const guardar = (a: Activo | null) => {
    try {
      if (a) sessionStorage.setItem(CLAVE, JSON.stringify(a));
      else sessionStorage.removeItem(CLAVE);
    } catch {
      // Sin almacenamiento: el recorrido sigue, pero no sobrevive a una recarga.
    }
  };

  const ir = useCallback((a: Activo | null) => {
    setResuelto(null);
    setHueco(null);
    setMarca(null);
    navegadoA.current = null;
    guardar(a);
    setActivo(a);
    storeMascota.dejarDeSenalar();
    storeMascota.fijarAlFrente(a !== null);
  }, []);

  const cerrar = useCallback(() => {
    ir(null);
    // Se despide en su sitio, sin celebrar.
    setTimeout(() => storeMascota.gesto("saludo"), 700);
  }, [ir]);

  useEffect(() => {
    // Retomar tras navegar o recargar.
    try {
      const guardado = sessionStorage.getItem(CLAVE);
      if (guardado) {
        const a = JSON.parse(guardado) as Activo;
        if (Number.isInteger(a.indice) && a.indice >= 0 && a.indice < PASOS.length) ir(a);
      }
    } catch {
      // Un valor roto no arranca nada.
    }
    const alLanzar = (e: Event) => {
      const modo = (e as CustomEvent<{ modo?: ModoTutorial }>).detail?.modo ?? "manual";
      ir({ indice: 0, modo, direccion: 1 });
    };
    window.addEventListener(SUCESO_LANZAR_TUTORIAL, alLanzar);
    return () => {
      window.removeEventListener(SUCESO_LANZAR_TUTORIAL, alLanzar);
      storeMascota.dejarDeSenalar();
      storeMascota.fijarAlFrente(false);
    };
  }, [ir]);

  /**
   * Al paso siguiente o al anterior; fuera de la lista, se cierra. Hacia
   * atrás se saltan los puentes: enseñan el camino de ida, y volver por
   * él no enseña nada.
   */
  const mover = useCallback(
    (direccion: 1 | -1) => {
      if (!activo) return;
      let indice = activo.indice + direccion;
      if (direccion === -1) while (indice >= 0 && PASOS[indice].puente) indice--;
      if (indice >= PASOS.length) return cerrar();
      if (indice < 0) return ir({ ...activo, indice: 0, direccion: 1 });
      ir({ ...activo, indice, direccion });
    },
    [activo, cerrar, ir],
  );

  // ---------------------------------------------------------------
  // RESOLVER EL PASO: la pantalla, y luego el elemento
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!activo || resuelto?.indice === activo.indice) return;
    const paso = PASOS[activo.indice];

    if (!enRuta(ruta, paso.ruta, rutas)) {
      if (paso.ruta && navegadoA.current !== activo.indice) {
        navegadoA.current = activo.indice;
        router.push(rutas[paso.ruta]);
      }
      // Si la pantalla no llega (una redirección, un error), se salta.
      const reloj = setTimeout(() => mover(activo.direccion), ESPERA_RUTA_MS);
      return () => clearTimeout(reloj);
    }

    const inicio = Date.now();
    const reloj = setInterval(() => {
      const encontrado = buscar(paso);
      if (encontrado) {
        clearInterval(reloj);
        asomar(encontrado.el);
        setResuelto({ indice: activo.indice, ...encontrado });
        return;
      }
      if (Date.now() - inicio > ESPERA_ELEMENTO_MS) {
        clearInterval(reloj);
        mover(activo.direccion);
      }
    }, SONDEO_MS);
    return () => clearInterval(reloj);
  }, [activo, resuelto, ruta, router, rutas, mover]);

  // El cuadro de espera, si la búsqueda tarda: nunca la pantalla apagada.
  useEffect(() => {
    if (!activo || resuelto) {
      setEsperando(false);
      return;
    }
    const reloj = setTimeout(() => setEsperando(true), ANTES_DE_ESPERA_MS);
    return () => clearTimeout(reloj);
  }, [activo, resuelto]);

  // La mascota, al llegar al paso, cuando ya ha viajado: su gesto si el
  // paso tiene uno (saludar); si no, SEÑALA el elemento y lo sigue
  // señalando mientras dure el paso. Hacia dónde, o si no señala, no se
  // decide aquí: ver `calcularPoseMascota`.
  useEffect(() => {
    if (!resuelto) return;
    const paso = PASOS[resuelto.indice];
    const reloj = setTimeout(
      () => {
        if (paso.gesto) storeMascota.gesto(paso.gesto, { desde: ANCLA });
        else storeMascota.senalar(resuelto.el, { desde: ANCLA, duracion: Infinity });
      },
      reducido ? 100 : 1100,
    );
    return () => {
      clearTimeout(reloj);
      storeMascota.dejarDeSenalar();
    };
  }, [resuelto, reducido]);

  // ---------------------------------------------------------------
  // LOS PUENTES: la barra abierta y el botón que también avanza
  // ---------------------------------------------------------------
  const puente = activo ? PASOS[activo.indice].puente : undefined;
  useEffect(() => {
    if (!puente) return;
    // Abre la barra lateral de escritorio con el mismo CSS del hover
    // (`globals.css`, `.barra-app`), para que se lea el nombre.
    document.documentElement.dataset.tutorialPuente = "1";
    return () => {
      delete document.documentElement.dataset.tutorialPuente;
    };
  }, [puente]);

  useEffect(() => {
    if (!resuelto || !PASOS[resuelto.indice].puente) return;
    const el = resuelto.el;
    // Pulsar el botón destacado es lo mismo que «Siguiente»: se corta la
    // navegación del enlace y avanza el recorrido, que navega él. Así no
    // hay dos navegaciones a la vez ni un paso que se pierda.
    const alPulsar = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      mover(1);
    };
    el.addEventListener("click", alPulsar, { capture: true });
    return () => el.removeEventListener("click", alPulsar, { capture: true });
  }, [resuelto, mover]);

  /** El destino del puente de justo antes, si se acaba de llegar por él. */
  const llegada: DestinoTutorial | undefined = activo && activo.indice > 0 ? PASOS[activo.indice - 1].puente : undefined;

  // ---------------------------------------------------------------
  // MEDIR: en cada frame mientras hay paso (scroll, giro, redimensión)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!resuelto) return;
    let frame = 0;
    let anterior = "";
    let anteriorMarca = "";
    const medir = () => {
      const el = resuelto.el;
      if (!el.isConnected) {
        // Se ha repintado la pantalla: se vuelve a buscar.
        setResuelto(null);
        return;
      }
      const caja = conMargen(el.getBoundingClientRect());
      const clave = `${caja.x},${caja.y},${caja.w},${caja.h},${window.innerWidth},${window.innerHeight}`;
      if (clave !== anterior) {
        anterior = clave;
        setHueco(caja);
        setVista({ w: window.innerWidth, h: window.innerHeight });
      }
      // El botón por el que se llegó, marcado mientras dura el paso.
      const boton = llegada ? visible(selectorNav(llegada)) : null;
      const cajaMarca = boton ? conMargen(boton.getBoundingClientRect(), 4) : null;
      const claveMarca = cajaMarca ? `${cajaMarca.x},${cajaMarca.y},${cajaMarca.w},${cajaMarca.h}` : "";
      if (claveMarca !== anteriorMarca) {
        anteriorMarca = claveMarca;
        setMarca(cajaMarca);
      }
      frame = requestAnimationFrame(medir);
    };
    frame = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(frame);
  }, [resuelto, llegada]);

  // Sin paso resuelto, el tamaño de la ventana sigue haciendo falta para
  // colocar el cuadro de espera.
  useEffect(() => {
    if (!activo) return;
    const medirVista = () => setVista({ w: window.innerWidth, h: window.innerHeight });
    medirVista();
    window.addEventListener("resize", medirVista);
    return () => window.removeEventListener("resize", medirVista);
  }, [activo]);

  useEffect(() => {
    const el = cuadro.current;
    if (!el) return;
    const observador = new ResizeObserver(() => setAltoCuadro(el.offsetHeight));
    observador.observe(el);
    return () => observador.disconnect();
  }, [resuelto, esperando]);

  // ---------------------------------------------------------------
  // TECLADO: Esc cierra; el foco, dentro del cuadro
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!activo) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar();
        return;
      }
      // Un Tab con el foco fuera (lo devolvió otra pieza, como la Ayuda
      // al cerrarse) vuelve al cuadro: la página de debajo está tapada.
      if (e.key === "Tab" && cuadro.current && !cuadro.current.contains(document.activeElement)) {
        e.preventDefault();
        principal.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [activo, cerrar]);

  // El foco, al botón principal cuando el cuadro ya se ve: mientras se
  // coloca es invisible, y un elemento invisible no recibe el foco. Se
  // reintenta unos frames porque el `visibility` puede tardar uno en
  // cambiar (con movimiento reducido, `globals.css` da a todo una
  // transición mínima, y `visibility` entra en ella).
  const colocado = hueco !== null && vista.w > 0;
  useEffect(() => {
    if (!(resuelto && colocado) && !esperando) return;
    let intentos = 0;
    let frame = 0;
    const enfocar = () => {
      const boton = principal.current;
      boton?.focus({ preventScroll: true });
      if (boton && document.activeElement !== boton && ++intentos < 20) frame = requestAnimationFrame(enfocar);
    };
    frame = requestAnimationFrame(enfocar);
    return () => cancelAnimationFrame(frame);
  }, [resuelto, colocado, esperando]);

  const atrapar = (e: KeyboardEventReact<HTMLDivElement>) => {
    if (e.key !== "Tab" || !cuadro.current) return;
    const focables = Array.from(cuadro.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (focables.length === 0) return;
    const primero = focables[0];
    const ultimo = focables[focables.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  if (!activo) return null;

  const texto = resuelto ? resuelto.texto[idioma] : tt.unMomento;
  const ultimo = activo.indice === PASOS.length - 1;
  const movil = vista.w > 0 && vista.w < MOVIL_PX;
  const sitio = resuelto && hueco && vista.w > 0 ? colocar(hueco, vista, altoCuadro, movil) : null;
  const espera = !sitio && esperando && vista.w > 0 ? cajaDeEspera(vista, altoCuadro, movil) : null;
  const visibleCuadro = sitio ?? espera;
  // La mascota va en el lado del cuadro que mira al elemento: si el
  // elemento queda a la derecha del cuadro, a la derecha. Así, cuando
  // puede señalarlo, no tiene el cuadro en medio.
  const ladoMascota: "izq" | "der" =
    sitio && hueco && hueco.x + hueco.w / 2 > sitio.x + sitio.w / 2 ? "der" : "izq";
  const bloquea = !puente;

  return (
    <>
      {/* EL VELO, con el recorte. Sin paso resuelto (navegando), sin recorte.
          `data-tutorial-activo` esconde el botón de ayuda mientras dura
          (`globals.css`). En un puente el SVG deja pasar el ratón y lo
          bloquean cuatro franjas alrededor del recorte: así se puede
          pulsar el botón destacado y nada más. */}
      <svg
        aria-hidden
        data-tutorial-activo
        className="fixed inset-0 z-[60] h-full w-full"
        style={{ pointerEvents: bloquea || !hueco ? "auto" : "none" }}
      >
        <defs>
          <mask id="recorte-tutorial">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hueco && (
              <motion.rect
                initial={false}
                animate={{ x: hueco.x, y: hueco.y, width: hueco.w, height: hueco.h }}
                transition={reducido ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
                rx="16"
                fill="black"
              />
            )}
            {marca && <rect x={marca.x} y={marca.y} width={marca.w} height={marca.h} rx="14" fill="black" />}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(18,33,26,0.62)" mask="url(#recorte-tutorial)" />
        {hueco && !puente && (
          <motion.rect
            initial={false}
            animate={{ x: hueco.x, y: hueco.y, width: hueco.w, height: hueco.h }}
            transition={reducido ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
            rx="16"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        )}
      </svg>

      {puente && hueco && (
        <>
          {/* Las cuatro franjas que tapan todo menos el botón. */}
          <div aria-hidden className="fixed inset-x-0 top-0 z-[60]" style={{ height: Math.max(0, hueco.y) }} />
          <div aria-hidden className="fixed inset-x-0 bottom-0 z-[60]" style={{ top: hueco.y + hueco.h }} />
          <div aria-hidden className="fixed left-0 z-[60]" style={{ top: hueco.y, height: hueco.h, width: Math.max(0, hueco.x) }} />
          <div aria-hidden className="fixed right-0 z-[60]" style={{ top: hueco.y, height: hueco.h, left: hueco.x + hueco.w }} />
          {/* EL HALO: verde, alrededor del botón, latiendo (`globals.css`). */}
          <div
            aria-hidden
            className="halo-tutorial pointer-events-none fixed z-[61]"
            style={{ left: hueco.x, top: hueco.y, width: hueco.w, height: hueco.h }}
          />
        </>
      )}

      {/* EL BOTÓN POR EL QUE SE HA LLEGADO, marcado: la relación entre el
          botón y el sitio. Fijo, sin latir: lo que late es lo que se pide
          pulsar. */}
      {marca && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[61] rounded-[14px] border-[3px] border-marca-verde"
          style={{ left: marca.x, top: marca.y, width: marca.w, height: marca.h }}
        />
      )}

      {/* EL CUADRO. Mientras se busca el paso, con «un momento» y la
          mascota en su pose neutra; nunca la pantalla apagada sin más. */}
      <div
        ref={cuadro}
        role="dialog"
        aria-modal="true"
        aria-label={tt.aria}
        onKeyDown={atrapar}
        className={`fixed z-[61] flex items-end gap-3 ${ladoMascota === "der" ? "flex-row-reverse" : ""} ${
          visibleCuadro ? "" : "invisible"
        }`}
        style={
          visibleCuadro
            ? { left: visibleCuadro.x, top: visibleCuadro.y, width: visibleCuadro.w }
            : { left: 16, bottom: 16, width: Math.min(460, (vista.w || 400) - 32) }
        }
      >
        <AnclaMascota
          id={ANCLA}
          prioridad={100}
          estado={resuelto ? PASOS[resuelto.indice].estado : "idle"}
          lado={ladoMascota}
          className="h-[76px] w-[59px] shrink-0 min-[900px]:h-[110px] min-[900px]:w-[86px]"
        />
        <div className="min-w-0 flex-1 rounded-[18px] border border-marca-borde bg-white p-4 shadow-[0_18px_44px_-16px_rgba(18,33,26,0.45)] min-[900px]:p-5">
          <p aria-live="polite" className="text-pretty font-sans text-[16px] font-medium leading-[1.45] text-marca-tinta min-[900px]:text-[17px]">
            {texto}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[14px] tabular-nums text-marca-gris">{tt.pasoDe(activo.indice + 1, PASOS.length)}</span>
            <button
              type="button"
              onClick={cerrar}
              className="min-h-[48px] rounded-full px-2 text-[15px] font-semibold text-marca-verdeOsc underline-offset-4 hover:underline"
            >
              {tt.saltar}
            </button>
          </div>

          <div className="mt-2 flex gap-2.5">
            <button
              type="button"
              onClick={() => mover(-1)}
              disabled={activo.indice === 0}
              className="btn-verde-linea min-h-[48px] flex-1 rounded-full px-4 text-[16px] font-semibold disabled:cursor-default disabled:opacity-40"
            >
              {tt.atras}
            </button>
            <button
              ref={principal}
              type="button"
              onClick={() => (ultimo ? cerrar() : mover(1))}
              className="btn-verde min-h-[48px] flex-1 rounded-full px-4 text-[16px] font-bold"
            >
              {ultimo ? tt.terminar : tt.siguiente}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// PIEZAS
// ---------------------------------------------------------------

/**
 * Si la pantalla actual es la del paso: la ruta de `rutas`, sin su
 * parámetro de foco. La misma que se usa para navegar, así que no pueden
 * decir cosas distintas.
 */
function enRuta(ruta: string, destino: RutaTutorial, rutas: Record<Exclude<RutaTutorial, null>, string>): boolean {
  if (destino === null) return true;
  const camino = rutas[destino].split("?")[0].replace(/\/$/, "");
  return ruta.replace(/\/$/, "") === camino;
}

/** El primer elemento visible con ese selector. */
function visible(selector: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(selector)).find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

/** El primer elemento visible del paso, o el de su alternativa, con lo que se dice de él. */
function buscar(paso: PasoRecorrido): { el: HTMLElement; texto: TextoTutorial } | null {
  for (const senal of [paso, paso.alternativa]) {
    if (!senal) continue;
    const el = visible(senal.selector);
    if (!el) continue;
    const estado = el.dataset.tourEstado;
    const texto = (estado && senal.porEstado?.[estado]) || senal.texto;
    return { el, texto };
  }
  return null;
}

function conMargen(r: DOMRect, margen = MARGEN_HUECO): Caja {
  return {
    x: Math.round(r.left - margen),
    y: Math.round(r.top - margen),
    w: Math.round(r.width + margen * 2),
    h: Math.round(r.height + margen * 2),
  };
}

/** Lo trae a la vista si no lo está del todo; arriba en móvil, para que el cuadro vaya abajo. */
function asomar(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const alto = window.innerHeight;
  if (r.top >= 12 && r.bottom <= alto - 12) return;
  const movil = window.innerWidth < MOVIL_PX;
  const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const destino = movil ? r.top - 90 : r.top - (alto - Math.min(r.height, alto * 0.6)) / 2;
  window.scrollTo({ top: window.scrollY + destino, behavior: suave ? "smooth" : "auto" });
}

/** El cuadro de espera: abajo, como el de un paso sin sitio. */
function cajaDeEspera(vista: { w: number; h: number }, alto: number, movil: boolean): { x: number; y: number; w: number } {
  const margen = 12;
  const w = movil ? vista.w - margen * 2 : Math.min(470, vista.w - margen * 2);
  return { x: movil ? margen : vista.w - w - margen * 2, y: vista.h - alto - margen - 8, w };
}

/**
 * Dónde va el cuadro.
 *
 * EN MÓVIL, a todo el ancho abajo. Si abajo taparía lo señalado y arriba
 * no —las pestañas de abajo, en los puentes—, JUSTO ENCIMA de lo
 * señalado, sin taparlo, y no arriba del todo: así el cuadro y el botón
 * se leen juntos.
 *
 * EN ESCRITORIO, si el elemento es estrecho (un botón, un enlace de la
 * barra), a su lado: la mascota queda entre los dos y puede señalarlo.
 * Si no, debajo; si no cabe, encima; si tampoco, al lado; si nada, abajo
 * a la derecha.
 */
function colocar(h: Caja, vista: { w: number; h: number }, alto: number, movil: boolean): { x: number; y: number; w: number } {
  const margen = 12;
  if (movil) {
    const w = vista.w - margen * 2;
    const cabeAbajo = vista.h - (h.y + h.h) >= alto + margen * 2;
    const cabeArriba = h.y >= alto + margen * 2;
    if (!cabeAbajo && cabeArriba) return { x: margen, y: Math.max(margen + 8, h.y - alto - margen), w };
    return { x: margen, y: vista.h - alto - margen - 8, w };
  }
  const w = Math.min(470, vista.w - margen * 2);
  const hueco = 16;
  const yLado = Math.min(Math.max(h.y + h.h / 2 - alto / 2, margen), vista.h - alto - margen);
  if (h.w <= ANCHO_LATERAL) {
    if (h.x + h.w + hueco + w <= vista.w - margen) return { x: h.x + h.w + hueco, y: yLado, w };
    if (h.x - hueco - w >= margen) return { x: h.x - hueco - w, y: yLado, w };
  }
  const x = Math.min(Math.max(h.x, margen), vista.w - w - margen);
  if (h.y + h.h + hueco + alto <= vista.h - margen) return { x, y: h.y + h.h + hueco, w };
  if (h.y - hueco - alto >= margen) return { x, y: h.y - hueco - alto, w };
  const alLado = h.x + h.w + hueco;
  if (alLado + w <= vista.w - margen) return { x: alLado, y: yLado, w };
  return { x: vista.w - w - margen, y: vista.h - alto - margen, w };
}
