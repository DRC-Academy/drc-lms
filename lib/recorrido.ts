// ---------------------------------------------------------------
// LAS REGLAS DE LA PANTALLA DE PROGRESO
//
// Módulo puro: ni `server-only` ni Supabase. Aquí viven la escalera del
// MCER y los hitos de clase, que son constantes del negocio, no datos.
// Las lecturas están en `lib/gestion.ts`.
//
// LO QUE TODAVÍA NO ESTÁ, Y POR QUÉ NO ES UN OLVIDO
//
// Faltan tres cosas de la ficha de Gestión: las horas semanales, el
// nivel meta y la estimación de cuánto queda para el siguiente nivel.
// Las tres salen de `assignments`, que NO está en el contrato de
// `lib/supabase-server.ts` —el LMS solo puede leer dos vistas y
// `class_analyses`—, así que el LMS no puede calcularlas sin que antes
// se amplíe `vista_perfil_alumno` en la base de Gestión.
//
// El cálculo en sí vive en `lib/progressEstimate.ts` de Gestión, y ese
// archivo dice de sí mismo que es la única fuente de verdad. Copiarlo
// aquí duplicaría una cifra sobre el futuro del alumno: el día que allí
// se ajuste el multiplicador de práctica, las dos pantallas le
// prometerían fechas distintas. Cuando se exponga, lo que cruce el
// contrato debería ser el RESULTADO (nivel meta y horas que faltan), no
// la fórmula.
// ---------------------------------------------------------------

/** Los seis peldaños, de menos a más. Es la escala oficial. */
export const ESCALERA_MCER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type NivelMcer = (typeof ESCALERA_MCER)[number];

/**
 * El nivel que hay dentro de un texto libre, o null si no hay ninguno.
 *
 * `vista_perfil_alumno.nivel` no es un código limpio: es lo que tecleó
 * quien dio de alta al alumno, y en producción dice cosas como "B1
 * Exámenes" o "Inglés general". Misma regla que `parseCefr` en Gestión,
 * para que las dos pantallas coloquen al alumno en el mismo peldaño.
 *
 * Hoy los 174 alumnos de la vista traen un código reconocible, pero eso
 * es un hecho de los datos de hoy y no una garantía del formato.
 */
export function nivelMcer(texto: string | null | undefined): NivelMcer | null {
  const encontrado = (texto ?? "").toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
  return encontrado ? (encontrado[1] as NivelMcer) : null;
}

export type EstadoPeldano = "superado" | "actual" | "pendiente";

export type Peldano = {
  nivel: NivelMcer;
  estado: EstadoPeldano;
};

/**
 * La escalera con el alumno colocado. Sin nivel reconocible devuelve los
 * seis peldaños en "pendiente", y quien llama decide si vale la pena
 * pintar una escalera en la que el alumno no está en ningún sitio.
 */
export function peldanos(nivel: NivelMcer | null): Peldano[] {
  const actual = nivel ? ESCALERA_MCER.indexOf(nivel) : -1;

  return ESCALERA_MCER.map((peldano, i) => ({
    nivel: peldano,
    estado:
      actual < 0 ? "pendiente" : i < actual ? "superado" : i === actual ? "actual" : "pendiente",
  }));
}

// ---------------------------------------------------------------
// LOS HITOS
//
// Los mismos cuatro que celebra el equipo en Gestión
// (`lib/milestones.ts`): la clase 1, la 15, la 30 y la 50. Se replican
// porque son una constante de cuatro números, no una fórmula, y porque
// el alumno tiene que ver el mismo próximo hito que su profesor.
//
// SE CUENTAN CLASES, NO NÚMEROS DE CLASE. `class_analyses.class_number`
// está vacío en 858 de las 867 filas, así que la columna que nombra el
// hito no sirve para encontrarlo. Se cuenta cuántas clases tiene
// registradas el alumno, que es lo que hace también la ficha de Gestión.
// ---------------------------------------------------------------

export const HITOS = [1, 15, 30, 50] as const;

/** El primer hito que el alumno todavía no ha alcanzado, o null si ya pasó todos. */
export function proximoHito(clases: number): number | null {
  return (HITOS as readonly number[]).find((hito) => hito > clases) ?? null;
}

/** Si esa clase es una de las cuatro señaladas. */
export function esHito(numero: number): boolean {
  return (HITOS as readonly number[]).includes(numero);
}
