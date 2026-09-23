"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as KeyboardEventReact } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PASOS_TUTORIAL, type PasoTutorial, type RutaTutorial, type TextoTutorial } from "@/lib/tutorial/pasos";
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
 * inicio y el botón de la Ayuda) y recorre `PASOS_TUTORIAL`, la única
 * definición de pasos.
 *
 * CADA PASO SE RESUELVE ENTERO ANTES DE PINTARSE: si es de otra pantalla,
 * se navega y se espera a llegar; luego se busca su elemento (el primero
 * visible con ese `data-tour`), o el de su alternativa. Nada espera para
 * siempre: sin pantalla en `ESPERA_RUTA_MS` o sin elemento en
 * `ESPERA_ELEMENTO_MS`, el paso se salta en el sentido en que se iba.
 *
 * LO QUE SE PINTA:
 *   el velo     un SVG a pantalla completa con un recorte redondeado
 *               alrededor del elemento (Framer lo mueve de uno a otro).
 *               Tapa la página: durante el recorrido no se pulsa nada de
 *               debajo.
 *   el cuadro   la frase del paso, el «2 de 6» y los botones. En
 *               escritorio junto al elemento (debajo, encima o al lado,
 *               donde quepa); en móvil, a todo el ancho abajo —o arriba si
 *               lo señalado está abajo, como las pestañas—.
 *   la mascota  la única que hay (CapaMascota): el cuadro lleva un ancla
 *               de prioridad 100 a su izquierda, y la mascota viaja a ella
 *               con el salto de siempre. La capa sube por encima del velo
 *               mientras dura (`fijarAlFrente`). Con prefers-reduced-motion
 *               la capa no viaja y el recorte no se anima.
 *
 * El paso en curso se guarda en sessionStorage para sobrevivir a la
 * navegación y a una recarga. Esc o «Saltar» lo cierran en cualquier
 * momento; el foco queda dentro del cuadro mientras está abierto.
 */

const CLAVE = "drc:tutorial";
const ANCLA = "tutorial";
const ESPERA_RUTA_MS = 7000;
const ESPERA_ELEMENTO_MS = 4000;
const SONDEO_MS = 120;
const MARGEN_HUECO = 8;
const MOVIL_PX = 900;

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
  const [vista, setVista] = useState({ w: 0, h: 0 });
  const [altoCuadro, setAltoCuadro] = useState(220);
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
    navegadoA.current = null;
    guardar(a);
    setActivo(a);
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
        if (Number.isInteger(a.indice) && a.indice >= 0 && a.indice < PASOS_TUTORIAL.length) ir(a);
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
      storeMascota.fijarAlFrente(false);
    };
  }, [ir]);

  /** Al paso siguiente o al anterior; fuera de la lista, se cierra. */
  const mover = useCallback(
    (direccion: 1 | -1) => {
      if (!activo) return;
      const indice = activo.indice + direccion;
      if (indice >= PASOS_TUTORIAL.length) return cerrar();
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
    const paso = PASOS_TUTORIAL[activo.indice];

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

  // La mascota, al llegar al paso: su gesto, cuando ya ha viajado.
  useEffect(() => {
    if (!resuelto) return;
    const paso = PASOS_TUTORIAL[resuelto.indice];
    if (!paso.gesto) return;
    const reloj = setTimeout(() => storeMascota.gesto(paso.gesto!, { desde: ANCLA }), reducido ? 100 : 1100);
    return () => clearTimeout(reloj);
  }, [resuelto, reducido]);

  // ---------------------------------------------------------------
  // MEDIR: en cada frame mientras hay paso (scroll, giro, redimensión)
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!resuelto) return;
    let frame = 0;
    let anterior = "";
    const medir = () => {
      const el = resuelto.el;
      if (!el.isConnected) {
        // Se ha repintado la pantalla: se vuelve a buscar.
        setResuelto(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const caja = {
        x: Math.round(r.left - MARGEN_HUECO),
        y: Math.round(r.top - MARGEN_HUECO),
        w: Math.round(r.width + MARGEN_HUECO * 2),
        h: Math.round(r.height + MARGEN_HUECO * 2),
      };
      const clave = `${caja.x},${caja.y},${caja.w},${caja.h},${window.innerWidth},${window.innerHeight}`;
      if (clave !== anterior) {
        anterior = clave;
        setHueco(caja);
        setVista({ w: window.innerWidth, h: window.innerHeight });
      }
      frame = requestAnimationFrame(medir);
    };
    frame = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(frame);
  }, [resuelto]);

  useEffect(() => {
    const el = cuadro.current;
    if (!el) return;
    const observador = new ResizeObserver(() => setAltoCuadro(el.offsetHeight));
    observador.observe(el);
    return () => observador.disconnect();
  }, [resuelto]);

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
    if (!resuelto || !colocado) return;
    let intentos = 0;
    let frame = 0;
    const enfocar = () => {
      const boton = principal.current;
      boton?.focus({ preventScroll: true });
      if (boton && document.activeElement !== boton && ++intentos < 20) frame = requestAnimationFrame(enfocar);
    };
    frame = requestAnimationFrame(enfocar);
    return () => cancelAnimationFrame(frame);
  }, [resuelto, colocado]);

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

  const paso = PASOS_TUTORIAL[activo.indice];
  const texto = resuelto ? resuelto.texto[idioma] : null;
  const ultimo = activo.indice === PASOS_TUTORIAL.length - 1;
  const movil = vista.w > 0 && vista.w < MOVIL_PX;
  const sitio = hueco && vista.w > 0 ? colocar(hueco, vista, altoCuadro, movil) : null;

  return (
    <>
      {/* EL VELO, con el recorte. Sin paso resuelto (navegando), sin recorte. */}
      <svg aria-hidden className="fixed inset-0 z-[60] h-full w-full" style={{ pointerEvents: "auto" }}>
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
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(18,33,26,0.62)" mask="url(#recorte-tutorial)" />
        {hueco && (
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

      {/* EL CUADRO. Mientras se resuelve el paso no se enseña: el velo solo. */}
      <div
        ref={cuadro}
        role="dialog"
        aria-modal="true"
        aria-label={tt.aria}
        onKeyDown={atrapar}
        className={`fixed z-[61] flex items-end gap-3 ${sitio ? "" : "invisible"}`}
        style={
          sitio
            ? { left: sitio.x, top: sitio.y, width: sitio.w }
            : { left: 16, bottom: 16, width: Math.min(460, (vista.w || 400) - 32) }
        }
      >
        {resuelto && (
          <AnclaMascota
            id={ANCLA}
            prioridad={100}
            estado={paso.estado}
            lado="izq"
            className="h-[76px] w-[59px] shrink-0 min-[900px]:h-[110px] min-[900px]:w-[86px]"
          />
        )}
        <div className="min-w-0 flex-1 rounded-[18px] border border-marca-borde bg-white p-4 shadow-[0_18px_44px_-16px_rgba(18,33,26,0.45)] min-[900px]:p-5">
          <p aria-live="polite" className="text-pretty font-sans text-[16px] font-medium leading-[1.45] text-marca-tinta min-[900px]:text-[17px]">
            {texto}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[14px] tabular-nums text-marca-gris">{tt.pasoDe(activo.indice + 1, PASOS_TUTORIAL.length)}</span>
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

/** El primer elemento visible del paso, o el de su alternativa, con lo que se dice de él. */
function buscar(paso: PasoTutorial): { el: HTMLElement; texto: TextoTutorial } | null {
  for (const senal of [paso, paso.alternativa]) {
    if (!senal) continue;
    const el = Array.from(document.querySelectorAll<HTMLElement>(senal.selector)).find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!el) continue;
    const estado = el.dataset.tourEstado;
    const texto = (estado && senal.porEstado?.[estado]) || senal.texto;
    return { el, texto };
  }
  return null;
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

/**
 * Dónde va el cuadro. En móvil, a todo el ancho abajo, o arriba si abajo
 * taparía lo señalado y arriba no (las pestañas). En escritorio, debajo del elemento;
 * si no cabe, encima; si tampoco (algo alto, como la barra lateral), a su
 * lado; si nada, abajo a la derecha.
 */
function colocar(h: Caja, vista: { w: number; h: number }, alto: number, movil: boolean): { x: number; y: number; w: number } {
  const margen = 12;
  if (movil) {
    const w = vista.w - margen * 2;
    const cabeAbajo = vista.h - (h.y + h.h) >= alto + margen * 2;
    const cabeArriba = h.y >= alto + margen * 2;
    const arriba = !cabeAbajo && cabeArriba;
    return { x: margen, y: arriba ? margen + 8 : vista.h - alto - margen - 8, w };
  }
  const w = Math.min(470, vista.w - margen * 2);
  const x = Math.min(Math.max(h.x, margen), vista.w - w - margen);
  const hueco = 16;
  if (h.y + h.h + hueco + alto <= vista.h - margen) return { x, y: h.y + h.h + hueco, w };
  if (h.y - hueco - alto >= margen) return { x, y: h.y - hueco - alto, w };
  const alLado = h.x + h.w + hueco;
  const yLado = Math.min(Math.max(h.y + h.h / 2 - alto / 2, margen), vista.h - alto - margen);
  if (alLado + w <= vista.w - margen) return { x: alLado, y: yLado, w };
  return { x: vista.w - w - margen, y: vista.h - alto - margen, w };
}
