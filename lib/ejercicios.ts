// ---------------------------------------------------------------
// LOS EJERCICIOS DE UNA LECCIÓN
//
// La forma con la que viajan del servidor a la pantalla, y las dos
// lecturas de `correcta`, que es JSONB y guarda cosas distintas según
// el tipo. Ver la nota del esquema en `supabase/lms-cursos.sql`:
//
//   single   → [2]                un índice sobre `opciones`
//   multiple → [0, 3]             varios índices
//   cloze    → ["was", "were"]    respuestas aceptadas, por hueco
//   essay    → null               no hay respuesta automática
// ---------------------------------------------------------------

export type EjercicioVista = {
  id: string;
  tipo: "single" | "multiple" | "cloze" | "essay";
  enunciado: string;
  opciones: string[];
  correcta: unknown;
  orden: number;
};

/** Los índices correctos de un single o un multiple. */
export function indicesCorrectos(correcta: unknown): number[] {
  if (!Array.isArray(correcta)) return [];
  return correcta.filter((v): v is number => typeof v === "number" && Number.isInteger(v));
}

/** Las respuestas aceptadas por hueco de un cloze. */
export function huecosAceptados(correcta: unknown): string[][] {
  if (!Array.isArray(correcta)) return [];
  return correcta.map((hueco) =>
    Array.isArray(hueco) ? hueco.filter((v): v is string => typeof v === "string") : []
  );
}
