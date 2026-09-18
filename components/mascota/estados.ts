/**
 * Los estados de la mascota y qué piezas enseña cada uno.
 *
 * Módulo puro, sin React: lo importan el componente, el hook y la
 * página de pruebas. Cada estado decide qué ojos, qué boca y qué brazo
 * derecho van puestos, y qué adornos aparecen; el movimiento de cada
 * pieza vive en el componente, que es donde está Framer Motion.
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

export type Ojos = "ojos_normal" | "ojos_feliz" | "ojos_guino" | "ojos_triste" | "ojos_brillante";
export type Boca = "boca_sonrisa" | "boca_abierta" | "boca_o" | "boca_triste";
export type BrazoDerecho = "brazo_der" | "brazo_pulgar" | "brazo_diploma";
export type Adorno = "anteojos" | "estrellas" | "gotita" | "signo";

export type Cara = {
  ojos: Ojos;
  boca: Boca;
  brazoDer: BrazoDerecho;
  adornos: readonly Adorno[];
};

export const CARA: Record<EstadoMascota, Cara> = {
  idle: { ojos: "ojos_normal", boca: "boca_sonrisa", brazoDer: "brazo_der", adornos: [] },
  estudiando: { ojos: "ojos_normal", boca: "boca_sonrisa", brazoDer: "brazo_der", adornos: ["anteojos"] },
  exito: { ojos: "ojos_feliz", boca: "boca_abierta", brazoDer: "brazo_der", adornos: ["estrellas"] },
  duda: { ojos: "ojos_normal", boca: "boca_o", brazoDer: "brazo_der", adornos: ["signo"] },
  animo: { ojos: "ojos_guino", boca: "boca_sonrisa", brazoDer: "brazo_pulgar", adornos: [] },
  racha_perdida: { ojos: "ojos_triste", boca: "boca_triste", brazoDer: "brazo_der", adornos: ["gotita"] },
  nivel_superado: { ojos: "ojos_brillante", boca: "boca_abierta", brazoDer: "brazo_diploma", adornos: ["estrellas"] },
};

/** Los ojos que parpadean: los abiertos. Los cerrados o guiñando, no. */
export const OJOS_QUE_PARPADEAN: readonly Ojos[] = ["ojos_normal", "ojos_brillante"];
