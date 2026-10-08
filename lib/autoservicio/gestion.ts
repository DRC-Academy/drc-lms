// ---------------------------------------------------------------
// EL AUTOSERVICIO CONTRA GESTIÓN DE VERDAD
//
// Los tres endpoints de `tipos.ts`, por `llamarGestion` (el mismo
// cliente, secreto y tope de espera que las recuperaciones). Lo que
// llega pasa por `leer.ts`. Un error trae su código en el cuerpo
// (`{ ok: false, codigo, mensaje }`) también al leer; sin cuerpo —no
// contestó, o no está configurado— es `GENERICO`.
//
// LA DEMO NO PREGUNTA: Diego Ruiz no existe en Gestión. Sale como no
// elegible y ve el WhatsApp, que es lo que vería cualquier alumno al que
// Gestión no deja cambiar nada. Para enseñar el flujo, la simulación.
// ---------------------------------------------------------------

import "server-only";
import { esIdDemo } from "@/lib/demo/cuenta";
import { llamarGestion } from "@/lib/gestion-api";
import { aHuecoGestion, leerError, leerEstado, leerHuecos, leerResultadoCambio } from "@/lib/autoservicio/leer";
import type { CuerpoCambiarHorario, ProveedorAutoservicio } from "@/lib/autoservicio/tipos";

const PREFIJO = "autoservicio";
const BASE = "/api/lms/autoservicio";

export const autoservicioDeGestion: ProveedorAutoservicio = {
  async estado(alumnoId) {
    if (esIdDemo(alumnoId)) return { ok: false, codigo: "NO_ELEGIBLE" };
    const r = await llamarGestion(PREFIJO, `${BASE}/estado?${new URLSearchParams({ alumno_id: alumnoId })}`, { method: "GET" });
    if (!r.ok) return { ok: false, codigo: leerError(r.cuerpo).codigo };
    const estado = leerEstado(r.cuerpo);
    if (!estado) {
      console.error(`[${PREFIJO}] Gestión devolvió un estado que no se puede leer.`);
      return { ok: false, codigo: "GENERICO" };
    }
    return { ok: true, datos: estado };
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
};
