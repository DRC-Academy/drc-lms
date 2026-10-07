// ---------------------------------------------------------------
// EL AUTOSERVICIO SIMULADO
//
// Para construir las pantallas antes de que existan los endpoints. Solo
// se usa con AUTOSERVICIO_SIMULADO, y nunca en producción (lo decide
// `index.ts`).
//
// LOS DATOS SALEN EN LA FORMA DE GESTIÓN y pasan por `leer.ts`, igual
// que los de verdad: así la simulación también prueba la lectura.
//
// EL ALUMNO SIMULADO: clase con Laura los martes a las 18:00 (una hora)
// y los jueves a las 9:00 (dos horas). Huecos libres en las cuatro
// franjas del día.
//
// UN CASO DE CADA ERROR:
//   · Por escenario (AUTOSERVICIO_SIMULADO=<código>), el estado entero:
//     NO_ELEGIBLE, RECUPERACION_PENDIENTE, CALENDARIO_SIN_ACTUALIZAR.
//   · En el escenario normal (AUTOSERVICIO_SIMULADO=1), al tocar:
//       ANTELACION_INSUFICIENTE  la primera de sus próximas clases
//       MARCA_PUNTUAL_EXISTENTE  la tercera (ya se movió una vez)
//       HUECO_YA_OCUPADO         el hueco del sábado a las 10:00
//       (genérico)               el hueco del viernes a las 18:00, que
//                                contesta un código que no conocemos
// ---------------------------------------------------------------

import "server-only";
import { DIAS } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { comoCodigo, leerEstado, leerHuecos, leerResultadoCambio } from "@/lib/autoservicio/leer";
import type {
  EstadoGestion,
  HuecoConProfesor,
  HuecoGestion,
  ProveedorAutoservicio,
  SesionGestion,
} from "@/lib/autoservicio/tipos";

/** El escenario normal, o uno de los tres que dejan al alumno sin poder cambiar nada. */
export type EscenarioSimulado = "normal" | "NO_ELEGIBLE" | "RECUPERACION_PENDIENTE" | "CALENDARIO_SIN_ACTUALIZAR";

/** El valor de AUTOSERVICIO_SIMULADO como escenario. «1» es el normal. */
export function escenarioDe(valor: string | undefined): EscenarioSimulado | null {
  const v = valor?.trim() ?? "";
  if (v === "1") return "normal";
  if (v === "NO_ELEGIBLE" || v === "RECUPERACION_PENDIENTE" || v === "CALENDARIO_SIN_ACTUALIZAR") return v;
  return null;
}

const PROFESOR = "Laura";

const SESIONES: SesionGestion[] = [
  { id: "ses-martes", dia: "Martes", hora: "18:00", duracion: 1 },
  { id: "ses-jueves", dia: "Jueves", hora: "09:00", duracion: 2 },
];

/** Los huecos libres de Laura en una semana: mañana, mediodía, tarde y noche. */
const LIBRES: { dia: string; hora: string }[] = [
  { dia: "Lunes", hora: "09:00" },
  { dia: "Lunes", hora: "13:00" },
  { dia: "Lunes", hora: "17:00" },
  { dia: "Martes", hora: "08:00" },
  { dia: "Martes", hora: "19:00" },
  { dia: "Miércoles", hora: "10:00" },
  { dia: "Miércoles", hora: "14:00" },
  { dia: "Miércoles", hora: "20:00" },
  { dia: "Jueves", hora: "16:00" },
  { dia: "Jueves", hora: "21:00" },
  { dia: "Viernes", hora: "11:00" },
  { dia: "Viernes", hora: "18:00" },
  { dia: "Sábado", hora: "10:00" },
];

const OCUPADO = { dia: "Sábado", hora: "10:00" };
const RARO = { dia: "Viernes", hora: "18:00" };

const SEMANAS = 4;
/** Lo mínimo para mover una clase puntual, en días. Solo para que los huecos sean creíbles. */
const DIAS_ANTELACION = 2;

function diaDeLaSemana(fecha: string): string {
  return DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
}

/** Las próximas clases de las dos sesiones, en las cuatro semanas siguientes. */
function proximas(hoy: string): EstadoGestion["proximas_clases"] {
  const clases: EstadoGestion["proximas_clases"] = [];
  for (let i = 1; i <= SEMANAS * 7; i++) {
    const fecha = sumarDias(hoy, i);
    for (const s of SESIONES) {
      if (diaDeLaSemana(fecha) === s.dia) {
        clases.push({ fecha, hora: s.hora, duracion: s.duracion, sesion_id: s.id, movible: true });
      }
    }
  }
  clases.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  if (clases[0]) Object.assign(clases[0], { movible: false, motivo_no_movible: "ANTELACION_INSUFICIENTE" });
  if (clases[2]) Object.assign(clases[2], { movible: false, motivo_no_movible: "MARCA_PUNTUAL_EXISTENTE" });
  return clases;
}

export function estadoSimulado(escenario: EscenarioSimulado, ahora: Date = new Date()): unknown {
  const bloqueado = escenario !== "normal";
  const estado: EstadoGestion = {
    elegible: !bloqueado,
    ...(bloqueado ? { motivo_no_elegible: escenario } : {}),
    profesor: PROFESOR,
    sesiones: SESIONES,
    proximas_clases: proximas(diaLocal(ahora)),
  };
  return estado;
}

export function huecosSimulados(modo: "fijo" | "puntual", sesionId: string, ahora: Date = new Date()): unknown {
  const sesion = SESIONES.find((s) => s.id === sesionId);
  if (!sesion) return { huecos: [] };
  // Dos horas seguidas no caben a las 21:00.
  const libres = LIBRES.filter((l) => sesion.duracion === 1 || l.hora < "21:00");

  if (modo === "fijo") {
    return { huecos: libres.map((l): HuecoGestion => ({ ...l, duracion: sesion.duracion })) };
  }

  const hoy = diaLocal(ahora);
  const huecos: HuecoGestion[] = [];
  for (let i = DIAS_ANTELACION; i < DIAS_ANTELACION + 14; i++) {
    const fecha = sumarDias(hoy, i);
    for (const l of libres) {
      if (diaDeLaSemana(fecha) === l.dia) huecos.push({ ...l, duracion: sesion.duracion, fecha });
    }
  }
  return { huecos };
}

/** La respuesta del POST simulado, en la forma de Gestión. */
export function cambioSimulado(
  modo: "fijo" | "puntual",
  fechaOrigen: string | null,
  destino: { dia: string; hora: string },
  ahora: Date = new Date()
): unknown {
  if (destino.dia === OCUPADO.dia && destino.hora === OCUPADO.hora) {
    return { ok: false, codigo: "HUECO_YA_OCUPADO", mensaje: "Ese hueco se acaba de ocupar." };
  }
  if (destino.dia === RARO.dia && destino.hora === RARO.hora) {
    return { ok: false, codigo: "CONFLICTO_INTERNO", mensaje: "Error interno del calendario." };
  }
  if (modo === "puntual" && fechaOrigen) {
    const clase = proximas(diaLocal(ahora)).find((c) => c.fecha === fechaOrigen);
    if (clase && !clase.movible) return { ok: false, codigo: clase.motivo_no_movible, mensaje: null };
  }
  return { ok: true, cambio_id: `sim-${Date.now()}` };
}

/** Una espera corta, para ver los estados de «enviando» como con Gestión. */
function esperar(): Promise<void> {
  return new Promise((r) => setTimeout(r, 350));
}

export function autoservicioSimulado(escenario: EscenarioSimulado): ProveedorAutoservicio {
  return {
    async estado() {
      await esperar();
      const estado = leerEstado(estadoSimulado(escenario));
      return estado ? { ok: true, datos: estado } : { ok: false, codigo: "GENERICO" };
    },
    async huecos(_alumnoId, modo, sesionId) {
      await esperar();
      if (escenario !== "normal") return { ok: false, codigo: comoCodigo(escenario) };
      const huecos = leerHuecos(huecosSimulados(modo, sesionId));
      return huecos ? { ok: true, datos: huecos } : { ok: false, codigo: "GENERICO" };
    },
    async cambiarHorario(_alumnoId, p) {
      await esperar();
      if (escenario !== "normal") return { ok: false, codigo: comoCodigo(escenario), mensaje: null };
      return leerResultadoCambio(cambioSimulado(p.modo, p.fechaOrigen, p.destino));
    },
  };
}

// ---------------------------------------------------------------
// CAMBIO DE PROFESOR (FASE 2): solo simulado
// ---------------------------------------------------------------

const OTROS: { profesor: string; dia: string; hora: string }[] = [
  { profesor: "Daniela", dia: "Lunes", hora: "08:00" },
  { profesor: "Ignacio", dia: "Lunes", hora: "19:00" },
  { profesor: "Sol", dia: "Martes", hora: "12:00" },
  { profesor: "Daniela", dia: "Martes", hora: "20:00" },
  { profesor: "Maribel", dia: "Miércoles", hora: "09:00" },
  { profesor: "Ignacio", dia: "Miércoles", hora: "17:00" },
  { profesor: "Sol", dia: "Jueves", hora: "13:00" },
  { profesor: "Maribel", dia: "Jueves", hora: "21:00" },
  { profesor: "Daniela", dia: "Viernes", hora: "10:00" },
  { profesor: "Ignacio", dia: "Sábado", hora: "11:00" },
];

/** Huecos fijos de otros profesores, para el esqueleto de «Cambiar de profesor». */
export function huecosDeOtrosProfesores(duracion: number): HuecoConProfesor[] {
  return OTROS.flatMap((o) =>
    (leerHuecos({ huecos: [{ dia: o.dia, hora: o.hora, duracion }] }) ?? []).map((h) => ({ ...h, profesor: o.profesor }))
  );
}
