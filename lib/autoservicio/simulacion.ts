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
// EL CAMBIO DE PROFESOR (v3): el alumno elige horarios y la simulación
// le asigna a Daniela, Ignacio, Sol, Bruno o Maribel, sin decir a quién
// hasta el final. Los mismos destinos de arriba dan los mismos errores,
// y además:
//       ASIGNACION_CAMBIADA      un destino el jueves a las 17:00
//       nadie para la otra       el lunes a las 21:00 solo lo tiene Bruno,
//                                que no tiene dos horas seguidas para la
//                                clase del jueves
// ---------------------------------------------------------------

import "server-only";
import { DIAS } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { horaFin } from "@/lib/autoservicio/franjas";
import { leerError, leerEstado, leerHorariosProfesor, leerHuecos, leerResultadoCambio, leerResultadoCambioProfesor } from "@/lib/autoservicio/leer";
import { chocan } from "@/lib/autoservicio/profesor";
import type {
  ClaseProximaGestion,
  EstadoGestion,
  HorarioProfesorGestion,
  HuecoGestion,
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
    async horariosProfesor(_alumnoId, elegidos) {
      await esperar();
      const cuerpo = bloqueoProfesor() ?? horariosProfesorSimulados(elegidos);
      const horarios = leerHorariosProfesor(cuerpo);
      return horarios ? { ok: true, datos: horarios } : { ok: false, codigo: leerError(cuerpo).codigo };
    },
    async cambiarProfesor(_alumnoId, p) {
      await esperar();
      return leerResultadoCambioProfesor(bloqueoProfesor() ?? cambioProfesorSimulado(p.destinos));
    },
  };
}

// ---------------------------------------------------------------
// CAMBIO DE PROFESOR (v3), EN LA FORMA DEL CONTRATO
//
// Como Gestión: el alumno elige horarios y nunca ve un profesor. Los
// horarios de la siguiente clase son los que tiene libres algún profesor
// que además tiene libres TODOS los elegidos, sin chocar con ellos. Al
// confirmar se le asigna el primero que lo cubre todo.
// ---------------------------------------------------------------

/** Un profesor simulado: las horas libres de cada día. */
export type ProfesorSimulado = { nombre: string; libres: Partial<Record<string, number[]>> };

const OTROS: ProfesorSimulado[] = [
  { nombre: "Daniela", libres: { Lunes: [8, 9, 10], Martes: [20, 21], Jueves: [17, 18], Viernes: [10, 11] } },
  { nombre: "Ignacio", libres: { Lunes: [19, 20], Miércoles: [17, 18], Viernes: [18, 19], Sábado: [11, 12] } },
  { nombre: "Sol", libres: { Martes: [12, 13], Miércoles: [20, 21], Jueves: [13, 14], Sábado: [10, 11] } },
  // Solo tiene las 21:00: una hora suelta. Quien elija el lunes a las
  // 21:00 se queda sin nadie para su clase de dos horas.
  { nombre: "Bruno", libres: { Lunes: [21] } },
  { nombre: "Maribel", libres: { Lunes: [13, 14], Miércoles: [9, 10] } },
];

const SESIONES_ORIGEN: SesionOrigen[] = SESIONES.map(({ dia, hora, duracion }) => ({ dia: dia as SesionOrigen["dia"], hora, duracion }));

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Si tiene libre ese bloque entero: todas sus horas. */
function tieneLibre(p: ProfesorSimulado, b: SesionOrigen): boolean {
  const horas = p.libres[b.dia] ?? [];
  const inicio = Number(b.hora.slice(0, 2));
  return Array.from({ length: b.duracion }, (_, k) => inicio + k).every((h) => horas.includes(h));
}

/** Sus bloques libres de una duración. */
function bloquesDe(p: ProfesorSimulado, duracion: number): SesionOrigen[] {
  return Object.entries(p.libres).flatMap(([dia, horas = []]) =>
    horas
      .map((h) => ({ dia: dia as SesionOrigen["dia"], hora: hh(h), duracion }))
      .filter((b) => tieneLibre(p, b))
  );
}

/** La primera fecha de ese día de la semana con más de 24 h de antelación. */
function primeraFecha(dia: string, hoy: string): string {
  for (let i = DIAS_ANTELACION; i < DIAS_ANTELACION + 7; i++) {
    const fecha = sumarDias(hoy, i);
    if (diaDeLaSemana(fecha) === dia) return fecha;
  }
  return sumarDias(hoy, DIAS_ANTELACION);
}

const ORDEN_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type OpcionesSimulacion = { sesiones?: SesionOrigen[]; profesores?: ProfesorSimulado[]; ahora?: Date };

/** GET huecos-profesores simulado: los horarios para la siguiente clase, sin profesor. */
export function horariosProfesorSimulados(elegidos: SesionOrigen[], opciones: OpcionesSimulacion = {}): unknown {
  const { sesiones = SESIONES_ORIGEN, profesores = OTROS, ahora = new Date() } = opciones;
  if (elegidos.length > sesiones.length || elegidos.some((e, i) => e.duracion !== sesiones[i].duracion)) {
    return { ok: false, codigo: "SESIONES_NO_COINCIDEN", mensaje: "Los horarios elegidos no coinciden con tus clases." };
  }
  if (elegidos.some((e, i) => elegidos.some((o, j) => i !== j && chocan(e, o)))) {
    return { ok: false, codigo: "DATOS_INVALIDOS", mensaje: "Dos horarios elegidos chocan." };
  }
  const hoy = diaLocal(ahora);
  const validos = profesores.filter((p) => elegidos.every((e) => tieneLibre(p, e)));
  const i = elegidos.length < sesiones.length ? elegidos.length : null;
  const vistos = new Map<string, HorarioProfesorGestion>();
  if (i !== null) {
    for (const p of validos) {
      for (const b of bloquesDe(p, sesiones[i].duracion)) {
        if (elegidos.some((e) => chocan(e, b))) continue;
        const k = `${b.dia}|${b.hora}`;
        if (!vistos.has(k)) vistos.set(k, { ...b, fecha_primera_clase: primeraFecha(b.dia, hoy) });
      }
    }
  }
  return {
    ok: true,
    sesiones,
    siguiente: i === null ? null : { indice: i, duracion: sesiones[i].duracion },
    elegidos_disponibles: validos.length > 0,
    horarios: Array.from(vistos.values()).sort(
      (a, b) => ORDEN_DIAS.indexOf(a.dia) - ORDEN_DIAS.indexOf(b.dia) || a.hora.localeCompare(b.hora)
    ),
  };
}

/** POST cambiar-profesor simulado: asigna el primer profesor que lo cubre todo. */
export function cambioProfesorSimulado(destinos: SesionOrigen[], opciones: OpcionesSimulacion = {}): unknown {
  const { sesiones = SESIONES_ORIGEN, profesores = OTROS } = opciones;
  if (destinos.length !== sesiones.length || destinos.some((d, i) => d.duracion !== sesiones[i].duracion)) {
    return { ok: false, codigo: "SESIONES_NO_COINCIDEN", mensaje: "Los horarios no coinciden con tus clases." };
  }
  if (destinos.some((d, i) => destinos.some((e, j) => i !== j && chocan(d, e)))) {
    return { ok: false, codigo: "DATOS_INVALIDOS", mensaje: "Dos horarios chocan." };
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
  const asignado = profesores.find((p) => destinos.every((d) => tieneLibre(p, d)));
  if (!asignado) return { ok: false, codigo: "SLOT_NO_DISPONIBLE", mensaje: "Ningún profesor tiene libres a la vez esos horarios." };
  return {
    ok: true,
    profesor: { nombre: asignado.nombre },
    sesiones_antes: sesiones,
    sesiones_despues: destinos,
  };
}
