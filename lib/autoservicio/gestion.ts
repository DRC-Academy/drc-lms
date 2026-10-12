// ---------------------------------------------------------------
// EL AUTOSERVICIO CONTRA GESTIÓN DE VERDAD
//
// Los cinco endpoints de `tipos.ts`, por `llamarGestion` (el mismo
// cliente, secreto y tope de espera que las recuperaciones). Lo que
// llega pasa por `leer.ts`. Un error trae su código en el cuerpo
// (`{ ok: false, codigo, mensaje }`) también al leer; sin cuerpo —no
// contestó, o no está configurado— es `GENERICO`.
//
// EL ESTADO VA CON CACHÉ DE ~90 s por alumno (`lib/cache-gestion.ts`):
// sin ella se pedía en cada flecha de semana y en cada refresco de «Mis
// clases». Se guarda la respuesta que dice algo del alumno —elegible, o
// por qué no—, nunca un error de Gestión. Las acciones la tiran tras un
// cambio (`olvidarLecturasDe`). Los huecos y el cambio, sin caché.
//
// LA DEMO NO PREGUNTA: Diego Ruiz no existe en Gestión. Sale como no
// elegible y ve el WhatsApp, que es lo que vería cualquier alumno al que
// Gestión no deja cambiar nada. Para enseñar el flujo, la simulación.
// ---------------------------------------------------------------

import "server-only";
import { esIdDemo } from "@/lib/demo/cuenta";
import { llamarGestion } from "@/lib/gestion-api";
import { NoSeGuarda, SEGUNDOS_ALUMNO, conCache, etiquetaAlumno } from "@/lib/cache-gestion";
import {
  aHuecoGestion,
  leerError,
  leerEstado,
  leerHuecos,
  leerHuecosDeProfesor,
  leerListaProfesores,
  leerResultadoCambio,
  leerResultadoCambioProfesor,
} from "@/lib/autoservicio/leer";
import type {
  CodigoAutoservicio,
  CuerpoCambiarHorario,
  CuerpoCambiarProfesor,
  EstadoAutoservicio,
  LecturaAutoservicio,
  ProveedorAutoservicio,
} from "@/lib/autoservicio/tipos";

const PREFIJO = "autoservicio";
const BASE = "/api/lms/autoservicio";

/** Las negativas que son del alumno, no de Gestión: esas sí se guardan. */
const NEGATIVAS_DEL_ALUMNO: CodigoAutoservicio[] = ["NO_ELEGIBLE", "RECUPERACION_PENDIENTE", "CALENDARIO_SIN_ACTUALIZAR"];

/** El estado tal como lo da Gestión. Lo que no se debe guardar sale por `NoSeGuarda`. */
async function estadoDeGestion(alumnoId: string): Promise<LecturaAutoservicio<EstadoAutoservicio>> {
  const r = await llamarGestion(PREFIJO, `${BASE}/estado?${new URLSearchParams({ alumno_id: alumnoId })}`, { method: "GET" });
  if (!r.ok) {
    const respuesta: LecturaAutoservicio<EstadoAutoservicio> = { ok: false, codigo: leerError(r.cuerpo).codigo };
    if (NEGATIVAS_DEL_ALUMNO.includes(respuesta.codigo)) return respuesta;
    throw new NoSeGuarda(respuesta);
  }
  const estado = leerEstado(r.cuerpo);
  if (!estado) {
    console.error(`[${PREFIJO}] Gestión devolvió un estado que no se puede leer.`);
    throw new NoSeGuarda<LecturaAutoservicio<EstadoAutoservicio>>({ ok: false, codigo: "GENERICO" });
  }
  return { ok: true, datos: estado };
}

export const autoservicioDeGestion: ProveedorAutoservicio = {
  async estado(alumnoId) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE" };
    return conCache<LecturaAutoservicio<EstadoAutoservicio>>(
      ["autoservicio-estado", alumnoId],
      SEGUNDOS_ALUMNO,
      [etiquetaAlumno(alumnoId)],
      () => estadoDeGestion(alumnoId),
      { ok: false, codigo: "GENERICO" }
    );
  },

  async huecos(alumnoId, modo, sesionId, fecha) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE" };
    // URLSearchParams codifica en UTF-8: «Miércoles_15:00» sale como
    // «Mi%C3%A9rcoles_15%3A00», que es lo que pide el contrato.
    const consulta = new URLSearchParams({ alumno_id: alumnoId, modo, sesion: sesionId });
    if (modo === "puntual" && fecha) consulta.set("fecha", fecha);
    const r = await llamarGestion(PREFIJO, `${BASE}/huecos?${consulta}`, { method: "GET" });
    if (!r.ok) return { ok: false, codigo: leerError(r.cuerpo).codigo };
    const huecos = leerHuecos(r.cuerpo, modo);
    if (!huecos) {
      console.error(`[${PREFIJO}] Gestión devolvió huecos sin la lista \`huecos\`.`);
      return { ok: false, codigo: "GENERICO" };
    }
    return { ok: true, datos: huecos };
  },

  async cambiarHorario(alumnoId, p) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE", mensaje: null };
    const cuerpo: CuerpoCambiarHorario = {
      alumno_id: alumnoId,
      modo: p.modo,
      sesion_origen: { dia: p.sesionOrigen.dia, hora: p.sesionOrigen.hora, duracion: p.sesionOrigen.duracion },
      ...(p.modo === "puntual" && p.fechaOrigen ? { fecha_origen: p.fechaOrigen } : {}),
      destino: aHuecoGestion(p.destino),
      idempotency_key: p.idempotencyKey,
    };
    const r = await llamarGestion(PREFIJO, `${BASE}/cambiar-horario`, { method: "POST", cuerpo });
    const resultado = leerResultadoCambio(r.ok ? r.cuerpo : r.cuerpo ?? null);
    if (!resultado.ok && resultado.codigo === "A_MEDIAS") {
      console.error(`[${PREFIJO}] Cambio a medias para ${alumnoId} (clave ${p.idempotencyKey}): ${resultado.mensaje ?? ""}`);
    }
    return resultado;
  },

  // --- v2: cambio de profesor. Sin caché: se piden al abrir el flujo. ---

  async huecosProfesores(alumnoId) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE" };
    const r = await llamarGestion(PREFIJO, `${BASE}/huecos-profesores?${new URLSearchParams({ alumno_id: alumnoId })}`, { method: "GET" });
    if (!r.ok) return { ok: false, codigo: leerError(r.cuerpo).codigo };
    const lista = leerListaProfesores(r.cuerpo);
    if (!lista) {
      console.error(`[${PREFIJO}] Gestión devolvió una lista de profesores que no se puede leer.`);
      return { ok: false, codigo: "GENERICO" };
    }
    return { ok: true, datos: lista };
  },

  async huecosDeProfesor(alumnoId, profesorId) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE" };
    const consulta = new URLSearchParams({ alumno_id: alumnoId, profesor_id: profesorId });
    const r = await llamarGestion(PREFIJO, `${BASE}/huecos-profesores?${consulta}`, { method: "GET" });
    if (!r.ok) return { ok: false, codigo: leerError(r.cuerpo).codigo };
    const huecos = leerHuecosDeProfesor(r.cuerpo);
    if (!huecos) {
      console.error(`[${PREFIJO}] Gestión devolvió los huecos de un profesor que no se pueden leer.`);
      return { ok: false, codigo: "GENERICO" };
    }
    return { ok: true, datos: huecos };
  },

  async cambiarProfesor(alumnoId, p) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE", mensaje: null, disponibleDesde: null };
    const cuerpo: CuerpoCambiarProfesor = {
      alumno_id: alumnoId,
      profesor_id: p.profesorId,
      destinos: p.destinos.map((d) => ({ dia: d.dia, hora: d.hora, duracion: d.duracion })),
      idempotency_key: p.idempotencyKey,
    };
    const r = await llamarGestion(PREFIJO, `${BASE}/cambiar-profesor`, { method: "POST", cuerpo });
    const resultado = leerResultadoCambioProfesor(r.cuerpo ?? null);
    if (!resultado.ok && resultado.codigo === "A_MEDIAS") {
      console.error(`[${PREFIJO}] Cambio de profesor a medias para ${alumnoId} (clave ${p.idempotencyKey}): ${resultado.mensaje ?? ""}`);
    }
    return resultado;
  },
};
