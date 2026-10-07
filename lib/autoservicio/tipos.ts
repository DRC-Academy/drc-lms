// ---------------------------------------------------------------
// EL AUTOSERVICIO DE HORARIOS: EL CONTRATO, EN UN SOLO SITIO
//
// ⚠ CONTRATO PROVISIONAL. Gestión está construyendo los endpoints a la
// vez que esto; el definitivo será `docs/autoservicio-contrato.md` de
// academy-scheduler. Cuando llegue, lo que cambie se cambia AQUÍ (las
// formas «de Gestión», en snake_case) y en `leer.ts` (cómo se pasan a
// las nuestras). Las pantallas solo ven los tipos de dominio de abajo.
//
// Los tres endpoints, con el alumno por `alumno_id` como en las
// recuperaciones (no por email):
//
//   GET  /api/lms/autoservicio/estado?alumno_id=
//   GET  /api/lms/autoservicio/huecos?alumno_id=&modo=fijo|puntual&sesion=
//   POST /api/lms/autoservicio/cambiar-horario
//
// SUPUESTOS NUESTROS, a confirmar con el contrato definitivo:
//   · `dia` es el día como lo escribe Gestión en `slots`: «Miércoles»,
//     con tilde y mayúscula (ver `DIAS` en `lib/clases.ts`).
//   · `hora` es «HH:MM», hora peninsular, como en todo Gestión.
//   · `duracion` son HORAS (1, 2…), como un slot es una hora.
//   · `destino` del POST es un hueco tal y como llegó de `huecos`.
//   · `motivo_no_elegible` y `motivo_no_movible` son códigos de la lista
//     de abajo, no texto libre.
//
// Sin `server-only`: solo hay tipos y constantes, y los componentes de
// cliente los necesitan para pintar. Lo que llama a Gestión está en
// `gestion.ts`, que sí lo es.
// ---------------------------------------------------------------

import type { DiaSemana } from "@/lib/clases";

// ---------------------------------------------------------------
// LOS CÓDIGOS DE ERROR
// ---------------------------------------------------------------

/** Los que Gestión puede devolver y tienen texto propio. */
export const CODIGOS_AUTOSERVICIO = [
  "NO_ELEGIBLE",
  "RECUPERACION_PENDIENTE",
  "CALENDARIO_SIN_ACTUALIZAR",
  "ANTELACION_INSUFICIENTE",
  "MARCA_PUNTUAL_EXISTENTE",
  "HUECO_YA_OCUPADO",
] as const;

/**
 * Un código conocido, o `GENERICO` para todo lo demás: un código que
 * Gestión invente mañana, un 500, que no conteste. El alumno lee lo mismo
 * en todos esos casos: ahora no se puede, y tiene el WhatsApp.
 */
export type CodigoAutoservicio = (typeof CODIGOS_AUTOSERVICIO)[number] | "GENERICO";

// ---------------------------------------------------------------
// LO QUE DEVUELVE GESTIÓN (formas del contrato, snake_case)
// ---------------------------------------------------------------

export type SesionGestion = { id: string; dia: string; hora: string; duracion: number };

export type ClaseProximaGestion = {
  fecha: string;
  hora: string;
  duracion: number;
  sesion_id: string;
  movible: boolean;
  motivo_no_movible?: string;
};

export type EstadoGestion = {
  elegible: boolean;
  motivo_no_elegible?: string;
  profesor: string;
  sesiones: SesionGestion[];
  proximas_clases: ClaseProximaGestion[];
};

export type HuecoGestion = { dia: string; hora: string; duracion: number; fecha?: string };

export type HuecosGestion = { huecos: HuecoGestion[] };

export type CuerpoCambiarHorario = {
  alumno_id: string;
  modo: ModoCambio;
  sesion_origen: string;
  fecha_origen?: string;
  destino: HuecoGestion;
  idempotency_key: string;
};

export type RespuestaCambiarHorario = { ok: true; [extra: string]: unknown } | { ok: false; codigo: string; mensaje?: string };

// ---------------------------------------------------------------
// LO QUE VEN LAS PANTALLAS (dominio, ya validado)
// ---------------------------------------------------------------

/** «Solo esta clase» o «desde ahora, todas mis clases». */
export type ModoCambio = "puntual" | "fijo";

/** Una clase semanal del alumno: «los jueves a las 9:00, dos horas». */
export type Sesion = { id: string; dia: DiaSemana; hora: string; duracion: number };

/** Una de sus próximas clases, y si se puede mover. */
export type ClaseProxima = {
  fecha: string;
  hora: string;
  duracion: number;
  sesionId: string;
  movible: boolean;
  /** Por qué no, cuando `movible` es false. */
  motivoNoMovible: CodigoAutoservicio | null;
};

export type EstadoAutoservicio = {
  elegible: boolean;
  /** Por qué no, cuando `elegible` es false. */
  motivoNoElegible: CodigoAutoservicio | null;
  profesor: string;
  sesiones: Sesion[];
  proximasClases: ClaseProxima[];
};

/** Un hueco libre del profesor. Con `fecha` en el modo puntual; sin ella, semanal. */
export type HuecoLibre = { dia: DiaSemana; hora: string; duracion: number; fecha: string | null };

/** Lo que pide el alumno al confirmar. */
export type PeticionCambio = {
  modo: ModoCambio;
  sesionOrigen: string;
  /** Solo en el modo puntual: la clase que se mueve. */
  fechaOrigen: string | null;
  destino: HuecoLibre;
  /** La misma en cada reintento del mismo cambio: Gestión no lo aplica dos veces. */
  idempotencyKey: string;
};

/** Una lectura: los datos, o el código con el que explicárselo al alumno. */
export type LecturaAutoservicio<T> = { ok: true; datos: T } | { ok: false; codigo: CodigoAutoservicio };

/** El resultado del cambio. `mensaje` es el de Gestión, en español, si lo trae. */
export type ResultadoCambio = { ok: true } | { ok: false; codigo: CodigoAutoservicio; mensaje: string | null };

/** Lo que tiene que saber hacer cualquier implementación: la de Gestión y la simulada. */
export type ProveedorAutoservicio = {
  estado(alumnoId: string): Promise<LecturaAutoservicio<EstadoAutoservicio>>;
  huecos(alumnoId: string, modo: ModoCambio, sesionId: string): Promise<LecturaAutoservicio<HuecoLibre[]>>;
  cambiarHorario(alumnoId: string, peticion: PeticionCambio): Promise<ResultadoCambio>;
};

// ---------------------------------------------------------------
// CAMBIO DE PROFESOR (FASE 2)
//
// Sin contrato todavía: solo existe la simulación, para el esqueleto de
// la pantalla. Cuando Gestión lo publique, sus formas van aquí arriba.
// ---------------------------------------------------------------

/** Un hueco libre de otro profesor. */
export type HuecoConProfesor = HuecoLibre & { profesor: string };
