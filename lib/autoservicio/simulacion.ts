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
//     ERROR_LECTURA (Gestión no pudo leer la ficha). Con
//     CALENDARIO_SIN_ACTUALIZAR no puede cambiar de horario pero SÍ de
//     profesor, como dice el contrato v2. Y PROFESOR_ANTELACION: el
//     horario normal, y el cambio de profesor bloqueado hasta que acabe
//     su próxima clase.
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
//
// EL CAMBIO DE PROFESOR (v2): Daniela, Ignacio, Sol, Maribel, Bruno y
// Elena, en un orden que cambia cada día y no entre recargas, como en
// Gestión. Los mismos destinos de arriba dan los mismos errores, y además:
//       PROFESOR_ARCHIVADO       pedir los huecos de Maribel
//       ASIGNACION_CAMBIADA      un destino el jueves a las 17:00
//       sin hueco de 2 h         Bruno: solo tiene huecos a las 21:00
//       no caben las dos         Elena: solo el lunes a las 10:00, que
//                                vale para las dos clases y las pisa
// ---------------------------------------------------------------

import "server-only";
import { DIAS } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { horaFin } from "@/lib/autoservicio/franjas";
import { leerError, leerEstado, leerHuecos, leerResultadoCambio } from "@/lib/autoservicio/leer";
import { seSolapan } from "@/lib/autoservicio/profesor";
import {
  leerHuecosDeProfesor,
  leerListaProfesores,
  leerResultadoCambioProfesor,
} from "@/lib/autoservicio/leer";
import type {
  ClaseProximaGestion,
  EstadoGestion,
  HuecoGestion,
  HuecoProfesorGestion,
  ModoCambio,
  MovilidadGestion,
  ProveedorAutoservicio,
  PuedeCambiarProfesorGestion,
  SesionGestion,
  SesionOrigen,
} from "@/lib/autoservicio/tipos";

/** El escenario normal, o uno de los que dejan al alumno sin poder cambiar nada. */
export type EscenarioSimulado =
  | "normal"
  | "NO_ELEGIBLE"
  | "RECUPERACION_PENDIENTE"
  | "CALENDARIO_SIN_ACTUALIZAR"
  | "ERROR_LECTURA"
  | "PROFESOR_ANTELACION";

const BLOQUEOS = ["NO_ELEGIBLE", "RECUPERACION_PENDIENTE", "CALENDARIO_SIN_ACTUALIZAR", "ERROR_LECTURA", "PROFESOR_ANTELACION"] as const;

/** Si el escenario deja cambiar de HORARIO: el normal, y el que solo bloquea el de profesor. */
const conHorario = (e: EscenarioSimulado) => e === "normal" || e === "PROFESOR_ANTELACION";

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
  const bloqueado = !conHorario(escenario);
  const lasSesiones = sesiones(diaLocal(ahora));
  const estado: EstadoGestion = {
    ok: true,
    elegible: !bloqueado,
    motivo_no_elegible: bloqueado ? escenario : null,
    detalle_no_elegible: escenario === "NO_ELEGIBLE" ? "PLAN_DOS_ALUMNOS" : null,
    profesor: { nombre: PROFESOR },
    sesiones: bloqueado ? [] : lasSesiones,
    puede_cambiar_profesor: puedeCambiarProfesor(escenario, lasSesiones),
  };
  return estado;
}

/** v2. Con el calendario de su profesor sin actualizar, SÍ puede: es el de otro el que usará. */
function puedeCambiarProfesor(escenario: EscenarioSimulado, ses: SesionGestion[]): PuedeCambiarProfesorGestion {
  if (escenario === "normal" || escenario === "CALENDARIO_SIN_ACTUALIZAR") {
    return { puede: true, motivo: null, detalle_no_elegible: null, disponible_desde: null };
  }
  if (escenario === "PROFESOR_ANTELACION") {
    // El final de su próxima clase, la más cercana de todas sus sesiones.
    const proxima = ses.flatMap((x) => x.proximas_clases).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
    return {
      puede: false,
      motivo: "ANTELACION_INSUFICIENTE",
      detalle_no_elegible: null,
      disponible_desde: proxima ? { fecha: proxima.fecha, hora: horaFin(proxima.hora, proxima.duracion) } : null,
    };
  }
  return {
    puede: false,
    motivo: escenario,
    detalle_no_elegible: escenario === "NO_ELEGIBLE" ? "PLAN_DOS_ALUMNOS" : null,
    disponible_desde: null,
  };
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
  /** Lo que diría Gestión del cambio de profesor en este escenario, o null si puede. */
  const bloqueoProfesor = () => {
    const p = puedeCambiarProfesor(escenario, sesiones(diaLocal(new Date())));
    return p.puede ? null : { ok: false as const, codigo: p.motivo, mensaje: "Ahora no se puede.", disponible_desde: p.disponible_desde };
  };
  return {
    async estado() {
      await esperar();
      const cuerpo = estadoSimulado(escenario);
      const estado = leerEstado(cuerpo);
      return estado ? { ok: true, datos: estado } : { ok: false, codigo: leerError(cuerpo).codigo };
    },
    async huecos(_alumnoId, modo, sesionId) {
      await esperar();
      if (!conHorario(escenario)) return bloqueo;
      const cuerpo = huecosSimulados(modo, sesionId);
      const huecos = leerHuecos(cuerpo, modo);
      return huecos ? { ok: true, datos: huecos } : { ok: false, codigo: leerError(cuerpo).codigo };
    },
    async cambiarHorario(_alumnoId, p) {
      await esperar();
      if (!conHorario(escenario)) return { ...bloqueo, mensaje: null };
      return leerResultadoCambio(cambioSimulado(p.modo, p.fechaOrigen, { ...p.destino, fecha: p.destino.fecha ?? p.destino.primeraClase }));
    },
    async huecosProfesores() {
      await esperar();
      const cuerpo = bloqueoProfesor() ?? listaProfesoresSimulada();
      const lista = leerListaProfesores(cuerpo);
      return lista ? { ok: true, datos: lista } : { ok: false, codigo: leerError(cuerpo).codigo };
    },
    async huecosDeProfesor(_alumnoId, profesorId) {
      await esperar();
      const cuerpo = bloqueoProfesor() ?? huecosDeProfesorSimulados(profesorId);
      const huecos = leerHuecosDeProfesor(cuerpo);
      return huecos ? { ok: true, datos: huecos } : { ok: false, codigo: leerError(cuerpo).codigo };
    },
    async cambiarProfesor(_alumnoId, p) {
      await esperar();
      return leerResultadoCambioProfesor(bloqueoProfesor() ?? cambioProfesorSimulado(p.profesorId, p.destinos));
    },
  };
}

// ---------------------------------------------------------------
// CAMBIO DE PROFESOR (v2), EN LA FORMA DEL CONTRATO
// ---------------------------------------------------------------

const OTROS: { id: string; nombre: string; libres: { dia: string; hora: string }[] }[] = [
  {
    id: "t21",
    nombre: "Daniela",
    libres: [
      { dia: "Lunes", hora: "08:00" },
      { dia: "Martes", hora: "20:00" },
      { dia: "Jueves", hora: "17:00" },
      { dia: "Viernes", hora: "10:00" },
    ],
  },
  {
    id: "t22",
    nombre: "Ignacio",
    libres: [
      { dia: "Lunes", hora: "19:00" },
      { dia: "Miércoles", hora: "17:00" },
      { dia: "Viernes", hora: "18:00" },
      { dia: "Sábado", hora: "11:00" },
    ],
  },
  {
    id: "t23",
    nombre: "Sol",
    libres: [
      { dia: "Martes", hora: "12:00" },
      { dia: "Miércoles", hora: "20:00" },
      { dia: "Jueves", hora: "13:00" },
      { dia: "Sábado", hora: "10:00" },
    ],
  },
  {
    id: "t25",
    nombre: "Bruno",
    libres: [
      { dia: "Lunes", hora: "21:00" },
      { dia: "Miércoles", hora: "21:00" },
    ],
  },
  {
    id: "t26",
    nombre: "Elena",
    libres: [{ dia: "Lunes", hora: "10:00" }],
  },
  {
    id: "t24",
    nombre: "Maribel",
    libres: [
      { dia: "Lunes", hora: "13:00" },
      { dia: "Miércoles", hora: "09:00" },
      { dia: "Jueves", hora: "21:00" },
    ],
  },
];

/** La primera fecha de ese día de la semana con más de 24 h de antelación. */
function primeraFecha(dia: string, hoy: string): string {
  for (let i = DIAS_ANTELACION; i < DIAS_ANTELACION + 7; i++) {
    const fecha = sumarDias(hoy, i);
    if (diaDeLaSemana(fecha) === dia) return fecha;
  }
  return sumarDias(hoy, DIAS_ANTELACION);
}

/** Los huecos de un profesor para una duración. Dos horas seguidas no caben a las 21:00. */
function huecosDe(o: (typeof OTROS)[number], duracion: number, hoy: string): HuecoProfesorGestion[] {
  return o.libres
    .filter((l) => duracion === 1 || l.hora < "21:00")
    .map((l) => ({ profesor: { id: o.id, nombre: o.nombre }, ...l, duracion, fecha_primera_clase: primeraFecha(l.dia, hoy) }));
}

/** Un orden que cambia cada día y no entre recargas, como el de Gestión. */
function ordenDelDia(hoy: string): (typeof OTROS)[number][] {
  const giro = Number(hoy.replaceAll("-", "")) % OTROS.length;
  return [...OTROS.slice(giro), ...OTROS.slice(0, giro)];
}

const SESIONES_ORIGEN = SESIONES.map(({ dia, hora, duracion }) => ({ dia, hora, duracion }));

export function listaProfesoresSimulada(ahora: Date = new Date()): unknown {
  const hoy = diaLocal(ahora);
  const primera = SESIONES_ORIGEN[0];
  return {
    ok: true,
    tipo: "lista",
    sesiones: SESIONES_ORIGEN,
    huecos: ordenDelDia(hoy).flatMap((o) => huecosDe(o, primera.duracion, hoy)),
  };
}

export function huecosDeProfesorSimulados(profesorId: string, ahora: Date = new Date()): unknown {
  const o = OTROS.find((x) => x.id === profesorId);
  if (!o) return { ok: false, codigo: "PROFESOR_NO_EXISTE", mensaje: "No existe ese profesor." };
  if (o.id === "t24") return { ok: false, codigo: "PROFESOR_ARCHIVADO", mensaje: "Ese profesor ya no está en la academia." };
  const hoy = diaLocal(ahora);
  return {
    ok: true,
    tipo: "profesor",
    profesor: { id: o.id, nombre: o.nombre },
    sesiones: SESIONES_ORIGEN.map((s, indice) => ({ indice, ...s, huecos: huecosDe(o, s.duracion, hoy) })),
  };
}

/** La respuesta del POST simulado de cambiar de profesor. */
export function cambioProfesorSimulado(profesorId: string, destinos: { dia: string; hora: string; duracion: number }[]): unknown {
  const o = OTROS.find((x) => x.id === profesorId);
  if (!o) return { ok: false, codigo: "PROFESOR_NO_EXISTE", mensaje: "No existe ese profesor." };
  if (o.id === "t24") return { ok: false, codigo: "PROFESOR_ARCHIVADO", mensaje: "Ese profesor ya no está en la academia." };
  if (destinos.length !== SESIONES_ORIGEN.length) return { ok: false, codigo: "DATOS_INVALIDOS", mensaje: "Faltan destinos." };
  if (destinos.some((d, i) => destinos.some((e, j) => i !== j && seSolapan(d as SesionOrigen, e as SesionOrigen)))) {
    return { ok: false, codigo: "DATOS_INVALIDOS", mensaje: "Dos destinos se solapan." };
  }
  for (const d of destinos) {
    const r = cambioSimulado("fijo", null, d);
    if (typeof r === "object" && r !== null && (r as { ok?: unknown }).ok === false) {
      const e = r as { codigo: string; mensaje: string };
      return { ...e, ...(/no lo intentes de nuevo/i.test(e.mensaje) ? { a_medias: true } : {}) };
    }
    if (es(d, "Jueves", "17:00")) {
      return { ok: false, codigo: "ASIGNACION_CAMBIADA", mensaje: "Tu asignación ha cambiado mientras guardábamos. No se ha cambiado nada." };
    }
  }
  return {
    ok: true,
    profesor_anterior: { nombre: PROFESOR },
    profesor_nuevo: { id: o.id, nombre: o.nombre },
    sesiones_antes: SESIONES_ORIGEN,
    sesiones_despues: destinos,
  };
}
