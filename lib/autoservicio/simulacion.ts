// ---------------------------------------------------------------
// EL AUTOSERVICIO SIMULADO
//
// Para ver y probar las pantallas sin tocar el calendario de nadie. Solo
// se usa con AUTOSERVICIO_SIMULADO, y nunca en producción (lo decide
// `index.ts`).
//
// LOS DATOS SALEN EN LA FORMA DEL CONTRATO y pasan por `leer.ts`, igual
// que los de verdad: así la simulación también prueba la lectura.
//
// EL ALUMNO SIMULADO: clase con Laura los martes a las 18:00 (una hora)
// y los jueves a las 9:00 (dos horas). Huecos libres en las cuatro
// franjas del día.
//
// UN CASO DE CADA ERROR:
//   · Por escenario (AUTOSERVICIO_SIMULADO=<código>), el estado entero:
//     NO_ELEGIBLE, RECUPERACION_PENDIENTE, CALENDARIO_SIN_ACTUALIZAR, y
//     ERROR_LECTURA (Gestión no pudo leer la ficha).
//   · En el escenario normal (AUTOSERVICIO_SIMULADO=1):
//       ANTELACION_INSUFICIENTE  la primera de sus próximas clases (sin
//                                fecha: esa ya no se podrá mover), y el
//                                horario fijo de su sesión, que se podrá
//                                cambiar cuando acabe esa clase
//       MARCA_PUNTUAL_EXISTENTE  la tercera, hasta el lunes siguiente a
//                                su semana
//       HUECO_YA_OCUPADO         el hueco del sábado a las 10:00
//       EN_CURSO                 el del lunes a las 13:00
//       (a medias)               el del miércoles a las 20:00
//       (genérico)               el del viernes a las 18:00 (ERROR_INTERNO)
// ---------------------------------------------------------------

import "server-only";
import { DIAS } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { horaFin } from "@/lib/autoservicio/franjas";
import { leerError, leerEstado, leerHuecos, leerResultadoCambio } from "@/lib/autoservicio/leer";
import type {
  ClaseProximaGestion,
  EstadoGestion,
  HuecoConProfesor,
  HuecoGestion,
  ModoCambio,
  MovilidadGestion,
  ProveedorAutoservicio,
  SesionGestion,
} from "@/lib/autoservicio/tipos";

/** El escenario normal, o uno de los que dejan al alumno sin poder cambiar nada. */
export type EscenarioSimulado = "normal" | "NO_ELEGIBLE" | "RECUPERACION_PENDIENTE" | "CALENDARIO_SIN_ACTUALIZAR" | "ERROR_LECTURA";

const BLOQUEOS = ["NO_ELEGIBLE", "RECUPERACION_PENDIENTE", "CALENDARIO_SIN_ACTUALIZAR", "ERROR_LECTURA"] as const;

/** El valor de AUTOSERVICIO_SIMULADO como escenario. «1» es el normal. */
export function escenarioDe(valor: string | undefined): EscenarioSimulado | null {
  const v = valor?.trim() ?? "";
  if (v === "1") return "normal";
  return (BLOQUEOS as readonly string[]).includes(v) ? (v as EscenarioSimulado) : null;
}

const PROFESOR = "Laura";

const SESIONES = [
  { dia: "Martes", hora: "18:00", duracion: 1 },
  { dia: "Jueves", hora: "09:00", duracion: 2 },
].map((s) => ({ id: `${s.dia}_${s.hora}`, ...s }));

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

const es = (d: { dia: string; hora: string }, dia: string, hora: string) => d.dia === dia && d.hora === hora;

/** Seis semanas, como la ventana del contrato. */
const SEMANAS = 6;
/** Lo mínimo para mover una clase, en días: el contrato pide más de 24 h. */
const DIAS_ANTELACION = 2;

function diaDeLaSemana(fecha: string): string {
  return DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
}

/** El lunes de la semana siguiente a la de `fecha`. */
function lunesSiguiente(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return sumarDias(fecha, d === 0 ? 1 : 8 - d);
}

const MOVIBLE: MovilidadGestion = { movible: true, motivo_no_movible: null, disponible_desde: null };

/** Las sesiones con sus próximas clases y lo que se puede mover de cada una. */
function sesiones(hoy: string): SesionGestion[] {
  const todas: (ClaseProximaGestion & { sesion: string })[] = [];
  for (let i = 1; i <= SEMANAS * 7; i++) {
    const fecha = sumarDias(hoy, i);
    for (const s of SESIONES) {
      if (diaDeLaSemana(fecha) === s.dia) todas.push({ sesion: s.id, fecha, hora: s.hora, duracion: s.duracion, ...MOVIBLE });
    }
  }
  todas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const [primera, , tercera] = todas;
  if (primera) Object.assign(primera, { movible: false, motivo_no_movible: "ANTELACION_INSUFICIENTE", disponible_desde: null });
  if (tercera) {
    Object.assign(tercera, {
      movible: false,
      motivo_no_movible: "MARCA_PUNTUAL_EXISTENTE",
      disponible_desde: { fecha: lunesSiguiente(tercera.fecha), hora: "00:00" },
    });
  }

  return SESIONES.map((s) => ({
    ...s,
    // El horario fijo de la sesión de la primera clase: cuando acabe esa clase.
    fijo:
      primera && primera.sesion === s.id
        ? {
            movible: false,
            motivo_no_movible: "ANTELACION_INSUFICIENTE",
            disponible_desde: { fecha: primera.fecha, hora: horaFin(primera.hora, primera.duracion) },
          }
        : MOVIBLE,
    proximas_clases: todas.filter((c) => c.sesion === s.id).map(({ sesion: _sesion, ...c }) => c),
  }));
}

export function estadoSimulado(escenario: EscenarioSimulado, ahora: Date = new Date()): unknown {
  if (escenario === "ERROR_LECTURA") {
    return { ok: false, codigo: "ERROR_LECTURA", mensaje: "No hemos podido consultar tus datos. Inténtalo de nuevo en unos minutos." };
  }
  const bloqueado = escenario !== "normal";
  const estado: EstadoGestion = {
    ok: true,
    elegible: !bloqueado,
    motivo_no_elegible: bloqueado ? escenario : null,
    detalle_no_elegible: escenario === "NO_ELEGIBLE" ? "PLAN_DOS_ALUMNOS" : null,
    profesor: { nombre: PROFESOR },
    sesiones: bloqueado ? [] : sesiones(diaLocal(ahora)),
  };
  return estado;
}

export function huecosSimulados(modo: ModoCambio, sesionId: string, ahora: Date = new Date()): unknown {
  const sesion = SESIONES.find((s) => s.id === sesionId);
  if (!sesion) return { ok: false, codigo: "SESION_NO_ENCONTRADA", mensaje: "Esa clase ya no está en tu horario." };
  // Dos horas seguidas no caben a las 21:00.
  const libres = LIBRES.filter((l) => sesion.duracion === 1 || l.hora < "21:00");
  const hoy = diaLocal(ahora);
  // En fijo, una semana: `fecha` es la primera clase con ese horario.
  const dias = modo === "fijo" ? 7 : SEMANAS * 7 - DIAS_ANTELACION;

  const huecos: HuecoGestion[] = [];
  for (let i = DIAS_ANTELACION; i < DIAS_ANTELACION + dias; i++) {
    const fecha = sumarDias(hoy, i);
    for (const l of libres) {
      if (diaDeLaSemana(fecha) === l.dia) huecos.push({ ...l, duracion: sesion.duracion, fecha });
    }
  }
  return { ok: true, modo, sesion, fecha_origen: null, huecos };
}

/** La respuesta del POST simulado, en la forma del contrato. */
export function cambioSimulado(
  modo: ModoCambio,
  fechaOrigen: string | null,
  destino: { dia: string; hora: string; fecha?: string | null },
  ahora: Date = new Date()
): unknown {
  if (es(destino, "Sábado", "10:00")) {
    return { ok: false, codigo: "HUECO_YA_OCUPADO", mensaje: "Alguien acaba de ocupar ese hueco. Elige otro." };
  }
  if (es(destino, "Lunes", "13:00")) {
    return { ok: false, codigo: "EN_CURSO", mensaje: "Tu cambio se está procesando. Espera unos segundos y recarga la página." };
  }
  if (es(destino, "Miércoles", "20:00")) {
    return {
      ok: false,
      codigo: "ERROR_ESCRITURA",
      mensaje: "Ha habido un problema al guardar el cambio y el equipo ya está avisado. No lo intentes de nuevo: te escribiremos.",
    };
  }
  if (es(destino, "Viernes", "18:00")) {
    return { ok: false, codigo: "ERROR_INTERNO", mensaje: "Ha habido un problema. Inténtalo de nuevo en unos minutos." };
  }
  if (modo === "puntual" && fechaOrigen) {
    const clase = sesiones(diaLocal(ahora))
      .flatMap((s) => s.proximas_clases)
      .find((c) => c.fecha === fechaOrigen);
    if (clase && !clase.movible) return { ok: false, codigo: clase.motivo_no_movible, mensaje: "No se puede mover." };
  }
  return {
    ok: true,
    modo,
    profesor: { nombre: PROFESOR },
    fecha_original: modo === "puntual" ? fechaOrigen : null,
    fecha_nueva: destino.fecha ?? null,
  };
}

/** Una espera corta, para ver los estados de «enviando» como con Gestión. */
function esperar(): Promise<void> {
  return new Promise((r) => setTimeout(r, 350));
}

export function autoservicioSimulado(escenario: EscenarioSimulado): ProveedorAutoservicio {
  const bloqueo = { ok: false as const, codigo: leerError({ codigo: escenario }).codigo };
  return {
    async estado() {
      await esperar();
      const cuerpo = estadoSimulado(escenario);
      const estado = leerEstado(cuerpo);
      return estado ? { ok: true, datos: estado } : { ok: false, codigo: leerError(cuerpo).codigo };
    },
    async huecos(_alumnoId, modo, sesionId) {
      await esperar();
      if (escenario !== "normal") return bloqueo;
      const cuerpo = huecosSimulados(modo, sesionId);
      const huecos = leerHuecos(cuerpo, modo);
      return huecos ? { ok: true, datos: huecos } : { ok: false, codigo: leerError(cuerpo).codigo };
    },
    async cambiarHorario(_alumnoId, p) {
      await esperar();
      if (escenario !== "normal") return { ...bloqueo, mensaje: null };
      return leerResultadoCambio(cambioSimulado(p.modo, p.fechaOrigen, { ...p.destino, fecha: p.destino.fecha ?? p.destino.primeraClase }));
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
    (leerHuecos({ huecos: [{ dia: o.dia, hora: o.hora, duracion }] }, "fijo") ?? []).map((h) => ({ ...h, profesor: o.profesor }))
  );
}
