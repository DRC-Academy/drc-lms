/**
 * Los estados de la mascota.
 *
 * Módulo puro, sin React: lo importan el componente, el hook y la
 * página de pruebas. Qué se ve en cada estado lo dice parches.json (lo
 * escribe mascota/scripts/parches.py); cómo se mueve, el componente.
 */

export type EstadoMascota =
  | "idle"
  | "estudiando"
  | "exito"
  | "duda"
  | "animo"
  | "racha_perdida"
  | "nivel_superado";

export const ESTADOS_MASCOTA: readonly EstadoMascota[] = [
  "idle",
  "estudiando",
  "exito",
  "duda",
  "animo",
  "racha_perdida",
  "nivel_superado",
];

/** Cuánto dura un estado que no es idle antes de volver solo. */
export const DURACION_ESTADO_MS = 2500;
