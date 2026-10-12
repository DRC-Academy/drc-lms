"use server";

// ---------------------------------------------------------------
// EL AUTOSERVICIO DE HORARIOS, CAMINO DE GESTIÓN
//
// Acciones de servidor, como las de las recuperaciones: la llamada a
// Gestión y su secreto no pasan nunca por el navegador. Del navegador
// llega solo lo elegido; QUIÉN ES el alumno sale de la cookie, aquí.
//
// SOLO EL PROPIO ALUMNO, Y SOLO CON EL INTERRUPTOR DE CADA FUNCIÓN
// ENCENDIDO: AUTOSERVICIO_ACTIVO para el horario y
// AUTOSERVICIO_PROFESOR_ACTIVO para el profesor. El equipo revisando una
// ficha ve la sección sin botones; si llamara a esto igualmente, se le
// rechaza.
//
// Lo que vuelve es un código, no un texto: la pantalla lo traduce con
// `motivo(codigo)` en el idioma del alumno.
// ---------------------------------------------------------------

import { sesionActual } from "@/lib/sesion-servidor";
import { autoservicioActivo, autoservicioProfesorActivo, proveedorAutoservicio } from "@/lib/autoservicio";
import { idProfesorValido, idSesionValido, peticionProfesorValida, peticionValida } from "@/lib/autoservicio/leer";
import { olvidarLecturasDe } from "@/lib/cache-gestion";
import type {
  HuecoLibre,
  HuecosDeProfesor,
  LecturaAutoservicio,
  ListaProfesores,
  ModoCambio,
  PeticionCambio,
  PeticionCambioProfesor,
  ResultadoCambio,
  ResultadoCambioProfesor,
  SesionOrigen,
} from "@/lib/autoservicio/tipos";

async function alumnoDeLaSesion(activo: () => boolean = autoservicioActivo): Promise<string | null> {
  if (!activo()) return null;
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "alumno" || !sesion.alumnoId) return null;
  return sesion.alumnoId;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Los huecos libres de su profesor para una de sus clases. En puntual,
 * `fecha` es la clase que quiere mover: con ella Gestión comprueba que se
 * puede mover y no ofrece la propia clase.
 */
export async function huecosAutoservicio(modo: unknown, sesionId: unknown, fecha: unknown = null): Promise<LecturaAutoservicio<HuecoLibre[]>> {
  const alumnoId = await alumnoDeLaSesion();
  const fechaValida = modo === "puntual" && typeof fecha === "string" && FECHA.test(fecha) ? fecha : null;
  if (!alumnoId || (modo !== "fijo" && modo !== "puntual") || !idSesionValido(sesionId)) {
    return { ok: false, codigo: "GENERICO" };
  }
  try {
    const r = await proveedorAutoservicio().huecos(alumnoId, modo as ModoCambio, sesionId, fechaValida);
    // Gestión ya no tiene esa sesión: la pantalla se va a refrescar, y
    // tiene que leer el horario de ahora, no el cacheado.
    if (!r.ok && r.codigo === "SESION_NO_ENCONTRADA") olvidarLecturasDe(alumnoId);
    return r;
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
  const s = typeof o.sesionOrigen === "object" && o.sesionOrigen !== null ? (o.sesionOrigen as Record<string, unknown>) : {};
  const d = typeof o.destino === "object" && o.destino !== null ? (o.destino as Record<string, unknown>) : {};
  const limpia = {
    modo: o.modo,
    sesionOrigen: { dia: s.dia, hora: s.hora, duracion: s.duracion },
    fechaOrigen: o.fechaOrigen ?? null,
    destino: { dia: d.dia, hora: d.hora, duracion: d.duracion, fecha: d.fecha ?? null, primeraClase: d.primeraClase ?? null },
    idempotencyKey: o.idempotencyKey,
  } as PeticionCambio;

  if (!alumnoId || !peticionValida(limpia)) return { ok: false, codigo: "GENERICO", mensaje: null };
  try {
    const r = await proveedorAutoservicio().cambiarHorario(alumnoId, limpia);
    // Hecho, a medias o con la sesión cambiada por otro lado: el horario
    // de Gestión ya no es el cacheado. Se tira aquí, antes de que la
    // pantalla haga su `router.refresh()`.
    if (r.ok || r.codigo === "SESION_NO_ENCONTRADA" || r.codigo === "A_MEDIAS") olvidarLecturasDe(alumnoId);
    return r;
  } catch (error) {
    console.error("[autoservicio] Falló el cambio de horario:", error);
    return { ok: false, codigo: "GENERICO", mensaje: null };
  }
}

// ---------------------------------------------------------------
// v2: CAMBIAR DE PROFESOR
// ---------------------------------------------------------------

/** Todos los profesores disponibles, con sus huecos, en el orden de Gestión. */
export async function huecosProfesoresAutoservicio(): Promise<LecturaAutoservicio<ListaProfesores>> {
  const alumnoId = await alumnoDeLaSesion(autoservicioProfesorActivo);
  if (!alumnoId) return { ok: false, codigo: "GENERICO" };
  try {
    return await proveedorAutoservicio().huecosProfesores(alumnoId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura de los huecos de profesores:", error);
    return { ok: false, codigo: "GENERICO" };
  }
}

/** Los huecos de un profesor para cada una de sus sesiones. */
export async function huecosDeProfesorAutoservicio(profesorId: unknown): Promise<LecturaAutoservicio<HuecosDeProfesor>> {
  const alumnoId = await alumnoDeLaSesion(autoservicioProfesorActivo);
  if (!alumnoId || !idProfesorValido(profesorId)) return { ok: false, codigo: "GENERICO" };
  try {
    return await proveedorAutoservicio().huecosDeProfesor(alumnoId, profesorId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura de los huecos de un profesor:", error);
    return { ok: false, codigo: "GENERICO" };
  }
}

/**
 * El cambio de profesor. Como en el de horario, lo que llega se vuelve a
 * armar campo a campo; Gestión revalida todo.
 */
export async function cambiarProfesorAutoservicio(peticion: unknown): Promise<ResultadoCambioProfesor> {
  const rechazo: ResultadoCambioProfesor = { ok: false, codigo: "GENERICO", mensaje: null, disponibleDesde: null };
  const alumnoId = await alumnoDeLaSesion(autoservicioProfesorActivo);
  const o = typeof peticion === "object" && peticion !== null ? (peticion as Record<string, unknown>) : {};
  const destinos = (Array.isArray(o.destinos) ? o.destinos : []).map((d) => {
    const x = typeof d === "object" && d !== null ? (d as Record<string, unknown>) : {};
    return { dia: x.dia, hora: x.hora, duracion: x.duracion } as SesionOrigen;
  });
  const limpia = { profesorId: o.profesorId, destinos, idempotencyKey: o.idempotencyKey } as PeticionCambioProfesor;

  if (!alumnoId || !peticionProfesorValida(limpia)) return rechazo;
  try {
    const r = await proveedorAutoservicio().cambiarProfesor(alumnoId, limpia);
    // Hecho, a medias, o con su asignación o sus sesiones cambiadas por
    // otro lado: lo cacheado del alumno ya no vale. Se tira aquí, antes
    // del `router.refresh()` de la pantalla.
    if (r.ok || ["A_MEDIAS", "SESION_NO_ENCONTRADA", "ASIGNACION_CAMBIADA", "ASIGNACION_INACTIVA"].includes(r.codigo)) {
      olvidarLecturasDe(alumnoId);
    }
    return r;
  } catch (error) {
    console.error("[autoservicio] Falló el cambio de profesor:", error);
    return rechazo;
  }
}
