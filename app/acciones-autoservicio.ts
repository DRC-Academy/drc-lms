"use server";

// ---------------------------------------------------------------
// EL AUTOSERVICIO DE HORARIOS, CAMINO DE GESTIÓN
//
// Acciones de servidor, como las de las recuperaciones: la llamada a
// Gestión y su secreto no pasan nunca por el navegador. Del navegador
// llega solo lo elegido; QUIÉN ES el alumno sale de la cookie, aquí.
//
// SOLO EL PROPIO ALUMNO, Y SOLO CON EL INTERRUPTOR ENCENDIDO. El equipo
// revisando una ficha ve la sección sin botones; si llamara a esto
// igualmente, se le rechaza.
//
// Lo que vuelve es un código, no un texto: la pantalla lo traduce con
// `motivo(codigo)` en el idioma del alumno.
// ---------------------------------------------------------------

import { sesionActual } from "@/lib/sesion-servidor";
import { autoservicioActivo, proveedorAutoservicio } from "@/lib/autoservicio";
import { peticionValida } from "@/lib/autoservicio/leer";
import type {
  HuecoLibre,
  LecturaAutoservicio,
  ModoCambio,
  PeticionCambio,
  ResultadoCambio,
} from "@/lib/autoservicio/tipos";

async function alumnoDeLaSesion(): Promise<string | null> {
  if (!autoservicioActivo()) return null;
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno" || !sesion.alumnoId) return null;
  return sesion.alumnoId;
}

const ID = /^[A-Za-z0-9_-]{1,80}$/;

/** Los huecos libres de su profesor para una de sus clases. */
export async function huecosAutoservicio(modo: unknown, sesionId: unknown): Promise<LecturaAutoservicio<HuecoLibre[]>> {
  const alumnoId = await alumnoDeLaSesion();
  if (!alumnoId || (modo !== "fijo" && modo !== "puntual") || typeof sesionId !== "string" || !ID.test(sesionId)) {
    return { ok: false, codigo: "GENERICO" };
  }
  try {
    return await proveedorAutoservicio().huecos(alumnoId, modo as ModoCambio, sesionId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura de huecos:", error);
    return { ok: false, codigo: "GENERICO" };
  }
}

/**
 * El cambio. Lo que llega se vuelve a armar campo a campo y se valida
 * antes de salir hacia Gestión: del navegador no se reenvía nada tal cual.
 */
export async function cambiarHorarioAutoservicio(peticion: unknown): Promise<ResultadoCambio> {
  const alumnoId = await alumnoDeLaSesion();
  const o = typeof peticion === "object" && peticion !== null ? (peticion as Record<string, unknown>) : {};
  const d = typeof o.destino === "object" && o.destino !== null ? (o.destino as Record<string, unknown>) : {};
  const limpia = {
    modo: o.modo,
    sesionOrigen: o.sesionOrigen,
    fechaOrigen: o.fechaOrigen ?? null,
    destino: { dia: d.dia, hora: d.hora, duracion: d.duracion, fecha: d.fecha ?? null },
    idempotencyKey: o.idempotencyKey,
  } as PeticionCambio;

  if (!alumnoId || !peticionValida(limpia)) return { ok: false, codigo: "GENERICO", mensaje: null };
  try {
    return await proveedorAutoservicio().cambiarHorario(alumnoId, limpia);
  } catch (error) {
    console.error("[autoservicio] Falló el cambio de horario:", error);
    return { ok: false, codigo: "GENERICO", mensaje: null };
  }
}
