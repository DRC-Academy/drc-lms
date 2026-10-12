// ---------------------------------------------------------------
// EL AUTOSERVICIO DE HORARIOS: EL CONTRATO, EN UN SOLO SITIO
//
// Contrato v2 (octubre de 2026): `docs/autoservicio-contrato.md` de
// academy-scheduler, rama `fase2-cambio-profesor`. Si cambia, se cambia
// AQUÍ (las formas «de Gestión», en snake_case) y en `leer.ts` (cómo se
// pasan a las nuestras). Las pantallas solo ven los tipos de dominio.
//
// Los cinco endpoints, con el alumno por `alumno_id` (= `students.id`)
// sacado siempre de la sesión del LMS:
//
//   GET  /api/lms/autoservicio/estado?alumno_id=
//   GET  /api/lms/autoservicio/huecos?alumno_id=&modo=fijo|puntual&sesion=[&fecha=]
//   POST /api/lms/autoservicio/cambiar-horario
//   GET  /api/lms/autoservicio/huecos-profesores?alumno_id=[&profesor_id=]   (v2)
//   POST /api/lms/autoservicio/cambiar-profesor                               (v2)
//
// Con Gestión todavía en v1 el estado no trae `puede_cambiar_profesor`:
// entonces «Cambiar de profesor» no sale (`cambioProfesor: null`).
//
// FORMATOS (los del contrato): `dia` como en el calendario, con tilde
// («Miércoles»); `hora` «HH:MM» peninsular y en punto; `duracion` en
// horas, de 1 a 4; `fecha` «YYYY-MM-DD» peninsular. El id de una sesión
// es «<dia>_<HH:MM>» («Miércoles_15:00»).
//
// UN CAMBIO SOLO ESTÁ HECHO CON `ok: true`. Ante cualquier otra cosa no
// se da por hecho, y el reintento lleva la misma `idempotency_key`.
//
// Sin `server-only`: solo hay tipos y constantes, y los componentes de
// cliente los necesitan para pintar. Lo que llama a Gestión está en
// `gestion.ts`, que sí lo es.
// ---------------------------------------------------------------

import type { DiaSemana } from "@/lib/clases";

// ---------------------------------------------------------------
// LOS CÓDIGOS DE ERROR
// ---------------------------------------------------------------

/**
 * Los códigos de Gestión con los que el alumno puede hacer algo
 * distinto, y por eso tienen texto propio. El resto del contrato
 * —NO_AUTORIZADO, NO_CONFIGURADO, DATOS_INVALIDOS, ALUMNO_NO_ENCONTRADO,
 * ERROR_ESCRITURA, ERROR_INTERNO— y cualquiera que se invente mañana son
 * `GENERICO`: ahora no se puede, prueba luego o escríbenos.
 */
export const CODIGOS_AUTOSERVICIO = [
  // Nada que cambiar desde aquí (estado)
  "NO_ELEGIBLE",
  "RECUPERACION_PENDIENTE",
  "CALENDARIO_SIN_ACTUALIZAR",
  // Esta sesión o esta clase, no (o todavía no)
  "ANTELACION_INSUFICIENTE",
  "MARCA_PUNTUAL_EXISTENTE",
  "FUERA_DE_VENTANA",
  // El destino elegido, no: se elige otro
  "MISMO_HORARIO",
  "SLOT_NO_DISPONIBLE",
  "HUECO_YA_OCUPADO",
  // El horario cambió por otro lado: hay que recargar
  "SESION_NO_ENCONTRADA",
  // Se está guardando: esperar y repetir con la misma clave
  "EN_CURSO",
  // Gestión no pudo leer: probar en unos minutos
  "ERROR_LECTURA",
  "CALENDARIO_ILEGIBLE",
  // Cambio de profesor (v2): el profesor elegido no vale, se elige otro
  "MISMO_PROFESOR",
  "PROFESOR_NO_EXISTE",
  "PROFESOR_ARCHIVADO",
  "PROFESOR_DE_PRUEBA",
  // Cambio de profesor (v2): su asignación, o su plan, no cuadran
  "HORAS_NO_COINCIDEN",
  "ASIGNACION_CAMBIADA",
  "ASIGNACION_INACTIVA",
  "ASIGNACION_NO_EXISTE",
] as const;

/**
 * Un código conocido; `A_MEDIAS`, el cambio que falló al guardar y no se
 * pudo deshacer (no se reintenta: el equipo ya está avisado), y
 * `GENERICO` para todo lo demás.
 */
export type CodigoAutoservicio = (typeof CODIGOS_AUTOSERVICIO)[number] | "A_MEDIAS" | "GENERICO";

/** Los motivos con los que Gestión dice que una sesión o una clase no se puede mover. */
export type MotivoNoMovible = "ANTELACION_INSUFICIENTE" | "MARCA_PUNTUAL_EXISTENTE";

// ---------------------------------------------------------------
// LO QUE DEVUELVE GESTIÓN (formas del contrato, snake_case)
// ---------------------------------------------------------------

/** Un momento de España peninsular: `{ fecha: "2026-10-13", hora: "17:00" }`. */
export type MomentoGestion = { fecha: string; hora: string };

/** Si algo se puede mover y, si no, por qué y desde cuándo. */
export type MovilidadGestion = {
  movible: boolean;
  motivo_no_movible: string | null;
  /** Cuándo deja de aplicar ESE motivo; null si no aplica o no se sabe. */
  disponible_desde: MomentoGestion | null;
};

export type ClaseProximaGestion = { fecha: string; hora: string; duracion: number } & MovilidadGestion;

export type SesionGestion = {
  id: string;
  dia: string;
  hora: string;
  duracion: number;
  fijo: MovilidadGestion;
  proximas_clases: ClaseProximaGestion[];
};

/** v2: si puede cambiar de profesor y, si no, por qué y desde cuándo. */
export type PuedeCambiarProfesorGestion = {
  puede: boolean;
  /** NO_ELEGIBLE, RECUPERACION_PENDIENTE, SESION_NO_ENCONTRADA o ANTELACION_INSUFICIENTE. */
  motivo: string | null;
  detalle_no_elegible: string | null;
  /** Con ANTELACION_INSUFICIENTE: el final de la clase que lo impide. */
  disponible_desde: MomentoGestion | null;
};

export type EstadoGestion = {
  ok: true;
  elegible: boolean;
  motivo_no_elegible: string | null;
  /** SIN_ASIGNACION_ACTIVA, VARIAS_ASIGNACIONES, PLAN_DOS_ALUMNOS, EMPRESA, ORITALK… (abierto). */
  detalle_no_elegible: string | null;
  profesor: { nombre: string } | null;
  sesiones: SesionGestion[];
  /** v2. Ausente con Gestión en v1. */
  puede_cambiar_profesor?: PuedeCambiarProfesorGestion;
};

/** En `puntual`, `fecha` es el día del hueco; en `fijo`, la primera clase con el horario nuevo. */
export type HuecoGestion = { dia: string; hora: string; duracion: number; fecha: string };

export type HuecosGestion = {
  ok: true;
  modo: ModoCambio;
  sesion: { id: string; dia: string; hora: string; duracion: number };
  fecha_origen: string | null;
  huecos: HuecoGestion[];
};

/** La sesión que se mueve, por lo que es y no por su id. */
export type SesionOrigenGestion = { dia: string; hora: string; duracion: number };

export type CuerpoCambiarHorario = {
  alumno_id: string;
  modo: ModoCambio;
  sesion_origen: SesionOrigenGestion;
  /** Obligatoria en `puntual`; en `fijo` no se manda. */
  fecha_origen?: string;
  /** Un hueco tal cual llegó de GET huecos. */
  destino: HuecoGestion | Omit<HuecoGestion, "fecha">;
  idempotency_key: string;
};

export type RespuestaCambiarHorario =
  | {
      ok: true;
      modo: ModoCambio;
      profesor: { nombre: string } | null;
      sesion_antes: SesionOrigenGestion;
      sesion_despues: SesionOrigenGestion;
      fecha_original: string | null;
      fecha_nueva: string | null;
    }
  | { ok: false; codigo: string; mensaje: string; detalle_no_elegible?: string };

// --- v2: cambio de profesor ---

export type ProfesorGestion = { id: string; nombre: string };

/** Un hueco fijo semanal de otro profesor; `fecha_primera_clase`, la primera con él. */
export type HuecoProfesorGestion = {
  profesor: ProfesorGestion;
  dia: string;
  hora: string;
  duracion: number;
  fecha_primera_clase: string;
};

/** Sin `profesor_id`: todos los profesores disponibles, para la duración de su primera sesión. */
export type ListaProfesoresGestion = {
  ok: true;
  tipo: "lista";
  /** Sus sesiones actuales, en orden: el cambio tiene que darles destino a TODAS. */
  sesiones: SesionOrigenGestion[];
  /** En el orden que manda Gestión: aleatorio, estable durante el día, por profesor. */
  huecos: HuecoProfesorGestion[];
};

/** Con `profesor_id`: los huecos de ese profesor para CADA sesión. */
export type HuecosDeProfesorGestion = {
  ok: true;
  tipo: "profesor";
  profesor: ProfesorGestion;
  sesiones: (SesionOrigenGestion & { indice: number; huecos: HuecoProfesorGestion[] })[];
};

export type CuerpoCambiarProfesor = {
  alumno_id: string;
  profesor_id: string;
  /** Uno por sesión, con las mismas duraciones, sin solaparse. */
  destinos: SesionOrigenGestion[];
  idempotency_key: string;
};

// ---------------------------------------------------------------
// LO QUE VEN LAS PANTALLAS (dominio, ya validado)
// ---------------------------------------------------------------

/** «Solo esta clase» o «desde ahora, todas mis clases». */
export type ModoCambio = "puntual" | "fijo";

/** Un momento de España peninsular. «00:00» es «ese día», sin hora. */
export type Momento = { fecha: string; hora: string };

/** Si se puede mover y, si no, por qué y —cuando Gestión lo sabe— desde cuándo sí. */
export type Movilidad =
  | { movible: true; motivo: null; disponibleDesde: null }
  | { movible: false; motivo: CodigoAutoservicio; disponibleDesde: Momento | null };

/** Una de sus próximas clases, y si se puede mover suelta. */
export type ClaseProxima = { fecha: string; hora: string; duracion: number } & Movilidad;

/** Una clase semanal del alumno: «los jueves a las 9:00, dos horas». */
export type Sesion = {
  /** «Jueves_09:00»: lo que se pasa a GET huecos. */
  id: string;
  dia: DiaSemana;
  hora: string;
  duracion: number;
  /** Si se puede cambiar su horario fijo. */
  fijo: Movilidad;
  /** Las de las próximas 6 semanas que aún no empezaron, por fecha. */
  proximasClases: ClaseProxima[];
};

/** v2: si puede cambiar de profesor; si no, por qué y —si se sabe— desde cuándo. */
export type CambioProfesorPosible =
  | { puede: true; motivo: null; disponibleDesde: null }
  | { puede: false; motivo: CodigoAutoservicio; disponibleDesde: Momento | null };

export type EstadoAutoservicio = {
  /** Si puede cambiar de HORARIO con su profesor. */
  elegible: boolean;
  /** Por qué no, cuando `elegible` es false. */
  motivoNoElegible: CodigoAutoservicio | null;
  /** Su nombre, o «» si Gestión no lo dio. */
  profesor: string;
  sesiones: Sesion[];
  /**
   * Si puede cambiar de PROFESOR. Va aparte de `elegible`: con el
   * calendario de su profesor sin actualizar no puede cambiar de horario
   * pero sí de profesor. Null con Gestión en v1: no se ofrece.
   */
  cambioProfesor: CambioProfesorPosible | null;
};

/**
 * Un hueco libre del profesor. En `puntual`, `fecha` es su día. En
 * `fijo` es semanal (`fecha` null) y `primeraClase` dice cuándo sería la
 * primera clase con ese horario.
 */
export type HuecoLibre = { dia: DiaSemana; hora: string; duracion: number; fecha: string | null; primeraClase?: string | null };

/** La sesión que se mueve, como la pide el POST. */
export type SesionOrigen = { dia: DiaSemana; hora: string; duracion: number };

/** Lo que pide el alumno al confirmar. */
export type PeticionCambio = {
  modo: ModoCambio;
  sesionOrigen: SesionOrigen;
  /** Solo en el modo puntual: la clase que se mueve. */
  fechaOrigen: string | null;
  destino: HuecoLibre;
  /** La misma en cada reintento del mismo cambio: Gestión no lo aplica dos veces. */
  idempotencyKey: string;
};

/** Una lectura: los datos, o el código con el que explicárselo al alumno. */
export type LecturaAutoservicio<T> = { ok: true; datos: T } | { ok: false; codigo: CodigoAutoservicio };

/**
 * El resultado del cambio. Hecho: la primera clase con el horario nuevo,
 * si Gestión la dice. No hecho: el código, y el `mensaje` de Gestión
 * (en español) para el log.
 */
export type ResultadoCambio = { ok: true; fechaNueva: string | null } | { ok: false; codigo: CodigoAutoservicio; mensaje: string | null };

// --- v2: cambio de profesor ---

export type Profesor = { id: string; nombre: string };

/**
 * Un hueco fijo semanal de otro profesor. Es un `HuecoLibre` semanal
 * (`fecha` null, `primeraClase` la primera con él), así que lo filtran y
 * pintan las mismas piezas que los de «Cambiar de horario».
 */
export type HuecoProfesor = HuecoLibre & { fecha: null; profesor: Profesor };

/** La lista de todos los profesores: sus sesiones y los huecos, en el orden de Gestión. */
export type ListaProfesores = { sesiones: SesionOrigen[]; huecos: HuecoProfesor[] };

/** Los huecos de UN profesor para cada una de sus sesiones. */
export type HuecosDeProfesor = {
  profesor: Profesor;
  sesiones: { sesion: SesionOrigen; huecos: HuecoProfesor[] }[];
};

/** Lo que pide el alumno al confirmar el cambio de profesor. */
export type PeticionCambioProfesor = {
  profesorId: string;
  /** Uno por sesión actual, en el mismo orden y con las mismas duraciones. */
  destinos: SesionOrigen[];
  /** La misma en cada reintento del mismo cambio. */
  idempotencyKey: string;
};

/**
 * El resultado del cambio de profesor. Hecho: el profesor nuevo y sus
 * sesiones. No hecho: el código, el `mensaje` para el log y, con
 * ANTELACION_INSUFICIENTE, desde cuándo podrá.
 */
export type ResultadoCambioProfesor =
  | { ok: true; profesorNuevo: string; sesionesDespues: SesionOrigen[] }
  | { ok: false; codigo: CodigoAutoservicio; mensaje: string | null; disponibleDesde: Momento | null };

/** Lo que tiene que saber hacer cualquier implementación: la de Gestión y la simulada. */
export type ProveedorAutoservicio = {
  estado(alumnoId: string): Promise<LecturaAutoservicio<EstadoAutoservicio>>;
  /** `fecha`: en puntual, la clase que se quiere mover (así Gestión no ofrece la propia clase). */
  huecos(alumnoId: string, modo: ModoCambio, sesionId: string, fecha: string | null): Promise<LecturaAutoservicio<HuecoLibre[]>>;
  cambiarHorario(alumnoId: string, peticion: PeticionCambio): Promise<ResultadoCambio>;
  /** v2: todos los profesores disponibles, para la duración de su primera sesión. */
  huecosProfesores(alumnoId: string): Promise<LecturaAutoservicio<ListaProfesores>>;
  /** v2: los huecos de ese profesor para cada sesión. */
  huecosDeProfesor(alumnoId: string, profesorId: string): Promise<LecturaAutoservicio<HuecosDeProfesor>>;
  /** v2: el cambio. Todas las sesiones a la vez. */
  cambiarProfesor(alumnoId: string, peticion: PeticionCambioProfesor): Promise<ResultadoCambioProfesor>;
};
