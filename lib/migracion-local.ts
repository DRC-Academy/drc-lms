// ---------------------------------------------------------------
// LO QUE QUEDÓ EN EL NAVEGADOR
//
// Hasta el cambio a base de datos, el progreso vivía en el localStorage
// de cada alumno. Este módulo es lo único que sigue sabiendo leer
// aquellas tres claves, y existe solo para vaciarlas: se leen una vez,
// se mandan al servidor y se borran.
//
// Es código de cliente y de vida corta. Cuando todos los alumnos del
// piloto hayan entrado al menos una vez, se puede borrar el archivo
// entero junto con `app/api/migrar-local`.
//
// NADA DE AQUÍ PUEDE IMPEDIR ENTRAR. Si el localStorage está bloqueado,
// corrupto o a medias, se devuelve lo que se pueda y se sigue.
// ---------------------------------------------------------------

import type { ProgresoLocal } from "@/lib/progreso";
import { validarBloque } from "@/lib/validarBloque";

const KEY = "drc-progreso-v1";
const KEY_AVANCE = "drc-avance-v1";
const KEY_BLOQUES = "drc-bloques-v1";

const CLAVES = [KEY, KEY_AVANCE, KEY_BLOQUES];

function leerJson(clave: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const bruto = window.localStorage.getItem(clave);
    if (!bruto) return {};
    const valor: unknown = JSON.parse(bruto);
    return typeof valor === "object" && valor !== null && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/**
 * Las claves antiguas eran `${alumnoId}:${bloqueId}`, así que hay que
 * partirlas por el PRIMER dos puntos: un id de bloque puede llevar más.
 */
function partirClave(clave: string, alumnoId: string): string | null {
  const prefijo = `${alumnoId}:`;
  return clave.startsWith(prefijo) ? clave.slice(prefijo.length) : null;
}

/** ¿Queda algo por migrar en este navegador? */
export function hayProgresoLocal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return CLAVES.some((clave) => window.localStorage.getItem(clave) !== null);
  } catch {
    // Almacenamiento bloqueado (modo privado, permisos). No hay nada
    // que migrar y tampoco hay forma de saberlo: se sigue.
    return false;
  }
}

/** Todo lo de este alumno, en la forma que espera el servidor. */
export function recogerProgresoLocal(alumnoId: string): ProgresoLocal {
  const salida: ProgresoLocal = { progreso: [], avance: [], bloques: [] };

  for (const [clave, valor] of Object.entries(leerJson(KEY))) {
    const bloqueClave = partirClave(clave, alumnoId);
    if (!bloqueClave || typeof valor !== "object" || valor === null) continue;

    const fila = valor as Record<string, unknown>;
    const aciertos = numero(fila.aciertos);
    const total = numero(fila.total);
    if (aciertos === null || total === null) continue;

    salida.progreso.push({ bloqueClave, aciertos, total, fecha: texto(fila.fecha) });
  }

  for (const [clave, valor] of Object.entries(leerJson(KEY_AVANCE))) {
    const bloqueClave = partirClave(clave, alumnoId);
    if (!bloqueClave || typeof valor !== "object" || valor === null) continue;

    const fila = valor as Record<string, unknown>;
    const indice = numero(fila.indice);
    const total = numero(fila.total);
    if (indice === null || total === null) continue;

    salida.avance.push({ bloqueClave, indice, total, fecha: texto(fila.fecha) });
  }

  const guardados = leerJson(KEY_BLOQUES)[alumnoId];
  if (Array.isArray(guardados)) {
    for (const entrada of guardados) {
      if (typeof entrada !== "object" || entrada === null) continue;
      const bloque = validarBloque((entrada as { bloque?: unknown }).bloque);
      if (!bloque) continue;
      salida.bloques.push({ bloque, creado: texto((entrada as { creado?: unknown }).creado) });
    }
  }

  return salida;
}

/**
 * Se llama SOLO cuando el servidor ha confirmado el volcado. Si la
 * migración falló, las claves se quedan donde están y se reintenta en
 * la siguiente visita.
 */
export function borrarProgresoLocal() {
  if (typeof window === "undefined") return;
  try {
    for (const clave of CLAVES) window.localStorage.removeItem(clave);
  } catch {
    // Si no se puede borrar, lo peor que pasa es que se reintente la
    // migración: el servidor ignora los duplicados.
  }
}
