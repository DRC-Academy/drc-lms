// ---------------------------------------------------------------
// EL AUTOSERVICIO CONTRA GESTIÓN DE VERDAD
//
// Los tres endpoints de `tipos.ts`, por `llamarGestion` (el mismo
// cliente, secreto y tope de espera que las recuperaciones). Lo que
// llega pasa por `leer.ts`; lo que no se puede leer es `GENERICO`.
//
// LA DEMO NO PREGUNTA: Diego Ruiz no existe en Gestión. Sale como no
// elegible y ve el WhatsApp, que es lo que vería cualquier alumno al que
// Gestión no deja cambiar nada. Para enseñar el flujo, la simulación.
// ---------------------------------------------------------------

import "server-only";
import { esIdDemo } from "@/lib/demo/cuenta";
import { llamarGestion } from "@/lib/gestion-api";
import { aHuecoGestion, leerEstado, leerHuecos, leerResultadoCambio } from "@/lib/autoservicio/leer";
import type { CuerpoCambiarHorario, ProveedorAutoservicio } from "@/lib/autoservicio/tipos";

const PREFIJO = "autoservicio";
const BASE = "/api/lms/autoservicio";

export const autoservicioDeGestion: ProveedorAutoservicio = {
  async estado(alumnoId) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE" };
    const r = await llamarGestion(PREFIJO, `${BASE}/estado?alumno_id=${encodeURIComponent(alumnoId)}`, { method: "GET" });
    if (!r.ok) return { ok: false, codigo: "GENERICO" };
    const estado = leerEstado(r.cuerpo);
    if (!estado) {
      console.error(`[${PREFIJO}] Gestión devolvió un estado que no se puede leer.`);
      return { ok: false, codigo: "GENERICO" };
    }
    return { ok: true, datos: estado };
  },

  async huecos(alumnoId, modo, sesionId) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE" };
    const consulta = new URLSearchParams({ alumno_id: alumnoId, modo, sesion: sesionId });
    const r = await llamarGestion(PREFIJO, `${BASE}/huecos?${consulta}`, { method: "GET" });
    if (!r.ok) return { ok: false, codigo: "GENERICO" };
    const huecos = leerHuecos(r.cuerpo);
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
      sesion_origen: p.sesionOrigen,
      ...(p.fechaOrigen ? { fecha_origen: p.fechaOrigen } : {}),
      destino: aHuecoGestion(p.destino),
      idempotency_key: p.idempotencyKey,
    };
    const r = await llamarGestion(PREFIJO, `${BASE}/cambiar-horario`, { method: "POST", cuerpo });
    // Con error HTTP, el código viene en el cuerpo (`{ ok: false, codigo }`);
    // sin cuerpo —un 503, que no contestó—, `leerResultadoCambio` da GENERICO.
    return leerResultadoCambio(r.ok ? r.cuerpo : r.cuerpo ?? null);
  },
};
