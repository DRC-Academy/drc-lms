// ---------------------------------------------------------------
// LA PRUEBA DE NIVEL EN LA BARRA (Y EN LA HOJA DEL PERFIL EN MÓVIL)
//
// Lo que se enseña sale del MISMO estado que pinta el bloque del inicio
// (`estadoDelBloque`, que llega con los datos del marco): aquí solo se
// decide qué versión corta toca. Puro, para la barra y para los tests.
//
//   · sin hacer   botón «Haz tu prueba de nivel» y «Unos 30–40 min»;
//   · a medias    botón «Continuar mi prueba» y «Llevas X de 17»;
//   · terminada   sin botón: «Tu nivel: B2». Repetir, solo en el inicio.
//
// Nada en la propia prueba (`/prueba-nivel`): ya se está en ella.
// ---------------------------------------------------------------

import type { EstadoBloque } from "@/lib/prueba-nivel/servidor";
import type { Cefr } from "@/lib/prueba-nivel/gestion/types";

export type PruebaEnBarra =
  | { tipo: "nueva" }
  | { tipo: "en_curso"; respondidas: number; total: number }
  | { tipo: "nivel"; nivel: Cefr };

/** Null: no se pinta nada (interruptor apagado, sin pase, o ya en la prueba). */
export function pruebaEnBarra(estado: EstadoBloque | null | undefined, ruta: string): PruebaEnBarra | null {
  if (!estado) return null;
  if (ruta === "/prueba-nivel" || ruta.startsWith("/prueba-nivel/")) return null;
  if (estado.tipo === "terminada") return { tipo: "nivel", nivel: estado.resultado.nivel };
  return estado;
}
