"use client";

import { useSyncExternalStore } from "react";
import { DURACION_ESTADO_MS, type EstadoMascota, type GestoMascota } from "@/components/mascota/estados";
import type { MovimientoMascota } from "@/components/mascota/Geckonoid";
import type { ClaveBurbuja } from "@/lib/textos/mascota";

/**
 * EL ESTADO DE LA MASCOTA, UNO PARA TODA LA APP.
 *
 * Hay una sola mascota (la pinta `CapaMascota`, montada una vez en el
 * layout raíz) y este store es lo único que la mueve. Quien quiera algo
 * de ella no la pinta: declara un ANCLA (`useAnclaMascota`) —un hueco
 * en su maqueta, con prioridad— y le pide estados y gestos (`useMascota`).
 *
 * LO QUE GUARDA:
 *   anclas        las declaradas ahora mismo, con su elemento, su
 *                 prioridad y lo que la mascota hace mientras está en
 *                 ella (su estado de base: idle, estudiando, el diploma).
 *   activa        la que manda: la de más prioridad VISIBLE. La decide
 *                 la capa en cada frame, porque visible depende del
 *                 scroll; null es la percha.
 *   transitorio   un estado de paso (éxito, ánimo, duda) que se enseña
 *                 DURACION_ESTADO_MS encima del de base y se va solo.
 *   pose          el último gesto pedido; `n` cambia en cada pedido.
 *   intensidad    cuánta vida propia tiene (tranquila, normal, juguetona),
 *                 elegida por el alumno y guardada en localStorage.
 *   movimiento    el último movimiento suelto pedido (vuelta, salto en el
 *                 sitio, rebote); `n` cambia en cada pedido.
 *   burbuja       la última línea pedida (lib/textos/mascota.ts); la capa
 *                 decide si se dice (una por pantalla, ninguna repetida).
 *   mirarA        un elemento hacia el que mirar (el enunciado del
 *                 ejercicio); manda sobre el cursor.
 *   escena        algo que pasó y que la capa escenifica («bloque_listo»).
 *   velocidad     el ritmo de todo (1 normal), solo para revisar en el
 *                 tablero de /dev/mascota.
 *   eventos       la cola de lo que ha pasado, lo último primero, para
 *                 el tablero de /dev/mascota y para quien tenga que
 *                 reaccionar en orden (los viajes).
 *
 * UN ESTADO PEDIDO DESDE UN ANCLA que no es la activa se ignora: si la
 * mascota está en la espera de generación, que la ruta de debajo diga
 * «ánimo» al colocarse no tiene que cambiarle la cara.
 */

export type Intensidad = "tranquila" | "normal" | "juguetona";
/** Lo que la capa escenifica cuando pasa. */
export type EscenaMascota = "bloque_listo";
export const INTENSIDADES: readonly Intensidad[] = ["tranquila", "normal", "juguetona"];

/** Hacia dónde se alinea la mascota dentro de su hueco, si el hueco es más ancho que ella. */
export type LadoAncla = "izq" | "centro" | "der";

export type Ancla = {
  id: string;
  prioridad: number;
  /** El hueco que mide la capa. */
  el: HTMLElement | null;
  /** Lo que hace la mascota mientras está aquí y nadie le pide nada. */
  estado: EstadoMascota;
  /** Enseñar el estado sin su gesto (ver `quieta` en Geckonoid). */
  quieta: boolean;
  lado: LadoAncla;
  /** False: el ancla existe pero ahora no cuenta (se está recolocando, está oculta). */
  activa: boolean;
  /** Tooltip de la mascota mientras está aquí. */
  titulo?: string;
  /** Qué más pasa al tocarla aquí (la ruta centra la parada). */
  onToque?: () => void;
  /** Lo que escenifica al posarse aquí («inicio»: saludo y burbuja de llegada). */
  escena?: "inicio";
  /** Para desempatar entre dos de la misma prioridad: gana la última. */
  orden: number;
};

export type EventoMascota = {
  n: number;
  t: number;
  tipo: "ancla" | "estado" | "gesto" | "intensidad" | "activa" | "viaje" | "escena" | "burbuja";
  detalle: string;
};

type Estado = {
  anclas: Record<string, Ancla>;
  activa: string | null;
  transitorio: EstadoMascota | null;
  disparo: number;
  pose: { nombre: GestoMascota; n: number; duracion?: number } | undefined;
  movimiento: { nombre: MovimientoMascota; n: number } | undefined;
  burbuja: { clave: ClaveBurbuja; profesor?: string; n: number } | undefined;
  mirarA: HTMLElement | null;
  escena: { nombre: EscenaMascota; n: number } | undefined;
  intensidad: Intensidad;
  velocidad: number;
  /** Solo para el tablero: cuánto se adelanta el reloj del sueño (ms). */
  adelantoSueno: number;
  eventos: EventoMascota[];
};

const CLAVE_INTENSIDAD = "drc:mascota-intensidad";
const MAX_EVENTOS = 30;

function intensidadGuardada(): Intensidad {
  try {
    const v = window.localStorage.getItem(CLAVE_INTENSIDAD);
    return v && (INTENSIDADES as readonly string[]).includes(v) ? (v as Intensidad) : "normal";
  } catch {
    return "normal";
  }
}

let estado: Estado = {
  anclas: {},
  activa: null,
  transitorio: null,
  disparo: 0,
  pose: undefined,
  movimiento: undefined,
  burbuja: undefined,
  mirarA: null,
  escena: undefined,
  intensidad: "normal",
  velocidad: 1,
  adelantoSueno: 0,
  eventos: [],
};
let intensidadLeida = false;
let contadorOrden = 0;
let contadorEventos = 0;
let relojTransitorio: ReturnType<typeof setTimeout> | undefined;
const oyentes = new Set<() => void>();

function cambiar(parcial: Partial<Estado>, evento?: Omit<EventoMascota, "n" | "t">) {
  estado = { ...estado, ...parcial };
  if (evento) {
    const e = { ...evento, n: ++contadorEventos, t: Date.now() };
    estado = { ...estado, eventos: [e, ...estado.eventos].slice(0, MAX_EVENTOS) };
  }
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  if (!intensidadLeida && typeof window !== "undefined") {
    intensidadLeida = true;
    const guardada = intensidadGuardada();
    if (guardada !== estado.intensidad) cambiar({ intensidad: guardada });
  }
  return () => oyentes.delete(oyente);
}

const leer = () => estado;
// En el servidor no hay mascota: el estado inicial vale para pintar los huecos.
const leerServidor = () => estado;

export function useStoreMascota<T>(elegir: (e: Estado) => T): T {
  return useSyncExternalStore(
    suscribir,
    () => elegir(leer()),
    () => elegir(leerServidor()),
  );
}

export const storeMascota = {
  leer,
  suscribir,

  registrarAncla(id: string, datos: Omit<Ancla, "id" | "orden">) {
    cambiar({ anclas: { ...estado.anclas, [id]: { ...datos, id, orden: ++contadorOrden } } }, { tipo: "ancla", detalle: `+ ${id} (p${datos.prioridad})` });
  },

  /** Cambia lo que el ancla ya tenía, sin tocar su orden. Sin evento: pasa en cada render. */
  actualizarAncla(id: string, parcial: Partial<Omit<Ancla, "id" | "orden">>) {
    const vieja = estado.anclas[id];
    if (!vieja) return;
    const cambia = (Object.keys(parcial) as (keyof typeof parcial)[]).some((k) => vieja[k] !== parcial[k]);
    if (!cambia) return;
    cambiar({ anclas: { ...estado.anclas, [id]: { ...vieja, ...parcial } } });
  },

  quitarAncla(id: string) {
    if (!estado.anclas[id]) return;
    const resto = { ...estado.anclas };
    delete resto[id];
    cambiar({ anclas: resto }, { tipo: "ancla", detalle: `− ${id}` });
  },

  /** Lo decide la capa. */
  fijarActiva(id: string | null) {
    if (estado.activa === id) return;
    cambiar({ activa: id }, { tipo: "activa", detalle: id ?? "percha" });
  },

  /**
   * Un estado de paso: se enseña DURACION_ESTADO_MS y vuelve al de base
   * del ancla. «idle» corta el que haya. Con `desde`, solo si ese ancla
   * es la activa.
   */
  dispara(nuevo: EstadoMascota, opciones: { desde?: string } = {}) {
    if (opciones.desde !== undefined && opciones.desde !== estado.activa) return;
    clearTimeout(relojTransitorio);
    if (nuevo === "idle") {
      cambiar({ transitorio: null, disparo: estado.disparo + 1 }, { tipo: "estado", detalle: "idle" });
      return;
    }
    cambiar({ transitorio: nuevo, disparo: estado.disparo + 1 }, { tipo: "estado", detalle: nuevo + (opciones.desde ? ` ← ${opciones.desde}` : "") });
    relojTransitorio = setTimeout(() => cambiar({ transitorio: null }), DURACION_ESTADO_MS);
  },

  /** Un gesto encima de lo que haya. `duracion` en ms, si no la suya (DURACION_GESTO_MS). */
  gesto(nombre: GestoMascota, opciones: { desde?: string; duracion?: number } = {}) {
    if (opciones.desde !== undefined && opciones.desde !== estado.activa) return;
    cambiar({ pose: { nombre, n: (estado.pose?.n ?? 0) + 1, duracion: opciones.duracion } }, { tipo: "gesto", detalle: nombre });
  },

  /** Un movimiento del cuerpo entero, sin parche: vuelta, salto en el sitio, rebote. */
  moverse(nombre: MovimientoMascota) {
    cambiar({ movimiento: { nombre, n: (estado.movimiento?.n ?? 0) + 1 } }, { tipo: "gesto", detalle: `movimiento ${nombre}` });
  },

  /**
   * Una línea (lib/textos/mascota.ts). Se dice cuando la mascota está
   * posada, si no se ha dicho ya en la sesión ni hay otra en la pantalla.
   */
  decir(clave: ClaveBurbuja, opciones: { profesor?: string } = {}) {
    cambiar({ burbuja: { clave, profesor: opciones.profesor, n: (estado.burbuja?.n ?? 0) + 1 } }, { tipo: "burbuja", detalle: `pedida ${clave}` });
  },

  /** Mirar hacia un elemento (null: dejar de mirarlo). Manda sobre el cursor. */
  mirarA(el: HTMLElement | null) {
    if (estado.mirarA === el) return;
    cambiar({ mirarA: el });
  },

  escena(nombre: EscenaMascota) {
    cambiar({ escena: { nombre, n: (estado.escena?.n ?? 0) + 1 } }, { tipo: "escena", detalle: nombre });
  },

  /** Deja constancia en la cola de eventos (los viajes, las escenas, las burbujas). */
  anotar(tipo: EventoMascota["tipo"], detalle: string) {
    cambiar({}, { tipo, detalle });
  },

  /** Tablero: hacer como si llevara `ms` sin que nadie toque nada. */
  adelantarSueno(ms: number) {
    cambiar({ adelantoSueno: ms }, { tipo: "escena", detalle: `sueño adelantado ${Math.round(ms / 1000)} s` });
  },

  fijarVelocidad(velocidad: number) {
    cambiar({ velocidad });
  },

  fijarIntensidad(intensidad: Intensidad) {
    try {
      window.localStorage.setItem(CLAVE_INTENSIDAD, intensidad);
    } catch {
      // Sin almacenamiento: vale para esta visita.
    }
    cambiar({ intensidad }, { tipo: "intensidad", detalle: intensidad });
  },
};

// En desarrollo, a mano desde la consola (y para las pruebas del navegador).
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __mascota: typeof storeMascota }).__mascota = storeMascota;
}

/** El estado que se enseña: el de paso si hay, si no el de base del ancla activa. */
export function estadoVisible(e: Estado): EstadoMascota {
  if (e.transitorio) return e.transitorio;
  return (e.activa && e.anclas[e.activa]?.estado) || "idle";
}
