// ---------------------------------------------------------------
// PROGRESO Y BLOQUES GENERADOS (localStorage)
// Tres almacenes independientes:
//   - progreso: bloques terminados, con su porcentaje.
//   - avance:   por dónde va un bloque empezado y sin terminar.
//   - bloques:  los bloques que ha generado la IA para este alumno.
// ---------------------------------------------------------------

import type { Bloque } from "@/lib/data";
import { validarBloque } from "@/lib/validarBloque";

const KEY = "drc-progreso-v1";
const KEY_AVANCE = "drc-avance-v1";
const KEY_BLOQUES = "drc-bloques-v1";

/** A partir de este porcentaje consideramos el bloque dominado. */
export const UMBRAL_DOMINADO = 80;

export type RegistroProgreso = { aciertos: number; total: number; fecha: string };
export type RegistroAvance = { indice: number; total: number; fecha: string };

type Progreso = Record<string, RegistroProgreso>;
type Avance = Record<string, RegistroAvance>;
type BloquesGuardados = Record<string, { bloque: Bloque; creado: string }[]>;

function leerJson<T extends object>(clave: string): T {
  if (typeof window === "undefined") return {} as T;
  try {
    const bruto = window.localStorage.getItem(clave);
    if (!bruto) return {} as T;
    const valor: unknown = JSON.parse(bruto);
    return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function escribirJson(clave: string, valor: object) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Cuota llena o almacenamiento bloqueado: seguimos sin persistir.
  }
}

/** Devuelve solo las entradas de un alumno, con la clave reducida al bloque. */
function porAlumno<T>(todo: Record<string, T>, alumnoId: string): Record<string, T> {
  const salida: Record<string, T> = {};
  const prefijo = `${alumnoId}:`;
  for (const clave of Object.keys(todo)) {
    if (clave.startsWith(prefijo)) salida[clave.slice(prefijo.length)] = todo[clave];
  }
  return salida;
}

// ------------------------------ PROGRESO ------------------------------

export function leerProgreso(alumnoId: string, bloqueId: string): RegistroProgreso | null {
  return leerJson<Progreso>(KEY)[`${alumnoId}:${bloqueId}`] ?? null;
}

export function leerProgresoAlumno(alumnoId: string): Record<string, RegistroProgreso> {
  return porAlumno(leerJson<Progreso>(KEY), alumnoId);
}

export function guardarProgreso(alumnoId: string, bloqueId: string, aciertos: number, total: number) {
  const todo = leerJson<Progreso>(KEY);
  todo[`${alumnoId}:${bloqueId}`] = { aciertos, total, fecha: new Date().toISOString() };
  escribirJson(KEY, todo);
}

// ------------------------------- AVANCE -------------------------------

/** Marca por qué ejercicio va un bloque que se ha empezado pero no terminado. */
export function guardarAvance(alumnoId: string, bloqueId: string, indice: number, total: number) {
  const todo = leerJson<Avance>(KEY_AVANCE);
  todo[`${alumnoId}:${bloqueId}`] = { indice, total, fecha: new Date().toISOString() };
  escribirJson(KEY_AVANCE, todo);
}

/** Al terminar el bloque el avance parcial deja de tener sentido. */
export function borrarAvance(alumnoId: string, bloqueId: string) {
  const todo = leerJson<Avance>(KEY_AVANCE);
  delete todo[`${alumnoId}:${bloqueId}`];
  escribirJson(KEY_AVANCE, todo);
}

export function leerAvanceAlumno(alumnoId: string): Record<string, RegistroAvance> {
  return porAlumno(leerJson<Avance>(KEY_AVANCE), alumnoId);
}

// -------------------------- BLOQUES GENERADOS --------------------------

/**
 * Bloques generados para este alumno, del más reciente al más antiguo.
 * Se validan al leerlos: lo guardado puede venir de otra versión.
 */
export function leerBloquesGenerados(alumnoId: string): Bloque[] {
  const todo = leerJson<BloquesGuardados>(KEY_BLOQUES);
  const guardados = todo[alumnoId];
  if (!Array.isArray(guardados)) return [];

  const salida: Bloque[] = [];
  for (const entrada of guardados) {
    if (typeof entrada !== "object" || entrada === null) continue;
    const bloque = validarBloque((entrada as { bloque?: unknown }).bloque);
    if (bloque) salida.push(bloque);
  }
  return salida;
}

export function guardarBloqueGenerado(alumnoId: string, bloque: Bloque) {
  const todo = leerJson<BloquesGuardados>(KEY_BLOQUES);
  const previos = Array.isArray(todo[alumnoId]) ? todo[alumnoId] : [];
  todo[alumnoId] = [{ bloque, creado: new Date().toISOString() }, ...previos].slice(0, 20);
  escribirJson(KEY_BLOQUES, todo);
}

/**
 * La página de práctica se renderiza en el servidor a partir de
 * `lib/data.ts`, así que los bloques generados solo se pueden
 * recuperar aquí, ya en el cliente.
 */
export function buscarBloqueGenerado(alumnoId: string, bloqueId: string): Bloque | null {
  return leerBloquesGenerados(alumnoId).find((bloque) => bloque.id === bloqueId) ?? null;
}

/** Lunes a las 00:00 de la semana en la que cae `fecha`. */
function inicioDeSemana(fecha: Date): number {
  const dia = new Date(fecha);
  dia.setHours(0, 0, 0, 0);
  const desdeLunes = (dia.getDay() + 6) % 7;
  dia.setDate(dia.getDate() - desdeLunes);
  return dia.getTime();
}

export function contarGeneradosEstaSemana(alumnoId: string): number {
  const todo = leerJson<BloquesGuardados>(KEY_BLOQUES);
  const guardados = todo[alumnoId];
  if (!Array.isArray(guardados)) return 0;

  const desde = inicioDeSemana(new Date());
  return guardados.filter((entrada) => {
    if (typeof entrada !== "object" || entrada === null) return false;
    const creado = (entrada as { creado?: unknown }).creado;
    if (typeof creado !== "string") return false;
    const momento = Date.parse(creado);
    return Number.isFinite(momento) && momento >= desde;
  }).length;
}

// ------------------------------- ESTADO -------------------------------

export type EstadoBloque = "dominado" | "en-curso" | "nuevo" | "sin-empezar";

/**
 * Estado visible de un bloque. El orden importa: un bloque generado
 * que ya se ha practicado deja de ser "nuevo".
 */
export function estadoDeBloque(
  progreso: RegistroProgreso | undefined,
  avance: RegistroAvance | undefined,
  esGenerado: boolean
): { estado: EstadoBloque; porcentaje: number | null; fases: number } {
  if (progreso && progreso.total > 0) {
    const porcentaje = Math.round((progreso.aciertos / progreso.total) * 100);
    return {
      estado: porcentaje >= UMBRAL_DOMINADO ? "dominado" : "en-curso",
      porcentaje,
      fases: 3,
    };
  }

  if (avance) {
    // Los cinco ejercicios van 2 reconocer → 2 transformar → 1 producir.
    const fases = avance.indice >= 4 ? 3 : avance.indice >= 2 ? 2 : 1;
    return { estado: "en-curso", porcentaje: null, fases };
  }

  return { estado: esGenerado ? "nuevo" : "sin-empezar", porcentaje: null, fases: 0 };
}

export function borrarProgreso() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(KEY_AVANCE);
  window.localStorage.removeItem(KEY_BLOQUES);
}
