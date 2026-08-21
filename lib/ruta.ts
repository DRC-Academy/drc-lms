// ---------------------------------------------------------------
// LA RUTA DE «PARA TI»
//
// La pantalla dejó de ser una lista de bloques y pasó a ser un camino
// con paradas. Aquí se decide QUÉ paradas hay y DÓNDE cae cada una; el
// componente solo pinta.
//
// POR QUÉ UN CAMINO Y NO UNA LISTA. La lista contaba lo mismo de todos
// los bloques con el mismo mueble, así que la pregunta que trae al
// alumno —¿por dónde iba?— se respondía contando filas. En un camino la
// respuesta es la posición, y encima se ve de dónde vienes: la línea
// verde llega hasta donde has llegado tú.
//
// LO CERRADO SIGUE SIENDO PARADA. Un bloque hecho no desaparece del
// camino, se convierte en un punto con su marca: es el rastro. El
// detalle —el porcentaje, el botón de repasar— vive en el desplegable de
// «Ya realizados», que es donde el alumno lo busca cuando lo busca.
//
// Módulo puro: sin `server-only`, lo importa un componente de cliente.
// ---------------------------------------------------------------

import type { Bloque } from "@/lib/data";
import { UMBRAL_DOMINADO, type RegistroAvance, type RegistroProgreso } from "@/lib/progreso";

export type ProgresoBloques = Record<string, RegistroProgreso>;
export type AvanceBloques = Record<string, RegistroAvance>;

export type TipoParada =
  /** Cerrada con un intento completo. Es rastro. */
  | "hecha"
  /** La primera sin cerrar: donde está el alumno ahora. */
  | "actual"
  | "pendiente"
  /** El bloque que espera a la próxima clase. */
  | "bloqueada"
  /** Las hechas de más, agrupadas en un solo punto al principio. */
  | "resumen";

export type Parada = {
  /** Estable entre renders. El id del bloque, o una clave sintética. */
  clave: string;
  tipo: TipoParada;
  /** Su número en el camino, empezando en 1. Null en el resumen. */
  numero: number | null;
  titulo: string;
  bloque: Bloque | null;
  /** Solo en las hechas: el mejor intento. */
  porcentaje: number | null;
  /** Solo en el resumen: cuántas agrupa. */
  agrupadas: number;
};

/**
 * Cuántas paradas hechas se dejan a la vista antes de agruparlas.
 *
 * Dos son suficientes para que la línea verde signifique algo y para que
 * el camino no se convierta en un historial: para eso está el
 * desplegable. Sin este tope, un alumno de seis meses abre «Para ti» y
 * se encuentra treinta puntos.
 */
const HECHAS_A_LA_VISTA = 2;

export function estaCerrado(progreso: ProgresoBloques, bloque: Bloque): boolean {
  return (progreso[bloque.id]?.total ?? 0) > 0;
}

export function porcentajeDe(progreso: ProgresoBloques, bloque: Bloque): number | null {
  const registro = progreso[bloque.id];
  if (!registro || registro.total <= 0) return null;
  return Math.round((registro.aciertos / registro.total) * 100);
}

export function estaDominado(progreso: ProgresoBloques, bloque: Bloque): boolean {
  const pct = porcentajeDe(progreso, bloque);
  return pct !== null && pct >= UMBRAL_DOMINADO;
}

/**
 * Las paradas del camino, en orden.
 *
 * @param bloques Todos los del alumno, generados primero.
 * @param indiceBloqueado Posición del que espera a la próxima clase, o -1.
 */
export function construirRuta(
  bloques: Bloque[],
  progreso: ProgresoBloques,
  indiceBloqueado: number
): Parada[] {
  const hechas: Parada[] = [];
  const resto: Parada[] = [];

  // El actual es el primero sin cerrar Y sin bloquear: mandar a una
  // parada que todavía no se abre sería mandar a chocarse con ella.
  const indiceActual = bloques.findIndex(
    (bloque, i) => i !== indiceBloqueado && !estaCerrado(progreso, bloque)
  );

  bloques.forEach((bloque, i) => {
    const cerrado = estaCerrado(progreso, bloque);
    const parada: Parada = {
      clave: bloque.id,
      tipo: cerrado
        ? "hecha"
        : i === indiceBloqueado
          ? "bloqueada"
          : i === indiceActual
            ? "actual"
            : "pendiente",
      numero: null,
      titulo: bloque.titulo,
      bloque,
      porcentaje: cerrado ? porcentajeDe(progreso, bloque) : null,
      agrupadas: 0,
    };

    // El bloqueado nunca cuenta como hecho, pase lo que pase con su
    // progreso: se enseña justamente para decir que todavía no toca.
    if (cerrado && i !== indiceBloqueado) hechas.push(parada);
    else resto.push(parada);
  });

  const visibles: Parada[] = [];

  if (hechas.length > HECHAS_A_LA_VISTA) {
    const agrupadas = hechas.length - HECHAS_A_LA_VISTA;
    visibles.push({
      clave: "resumen",
      tipo: "resumen",
      numero: null,
      titulo: `${agrupadas} ${agrupadas === 1 ? "parada hecha" : "paradas hechas"}`,
      bloque: null,
      porcentaje: null,
      agrupadas,
    });
    visibles.push(...hechas.slice(-HECHAS_A_LA_VISTA));
  } else {
    visibles.push(...hechas);
  }

  visibles.push(...resto);

  // La numeración corre sobre el camino visible y se salta el resumen,
  // que no es una parada sino un montón de ellas.
  let n = 0;
  return visibles.map((parada) => {
    if (parada.tipo === "resumen") return parada;
    n += 1;
    return { ...parada, numero: n };
  });
}

// ---------------------------------------------------------------
// LA GEOMETRÍA
//
// Se calcula en un lienzo de 1000×200 y el componente lo escala entero
// con `width:100%`. Los nodos se colocan en PORCENTAJE de esa misma
// caja, así que camino y paradas siguen cuadrando a cualquier ancho sin
// recalcular nada al redimensionar.
// ---------------------------------------------------------------

export const LIENZO = { ancho: 1000, alto: 200 };

const MARGEN = 62;
/** Las dos alturas por las que va alternando el camino. */
const BANDAS = [140, 62];

export type Geometria = {
  /** Posición de cada parada, en % del lienzo. */
  puntos: { x: number; y: number }[];
  /** Trazo hasta la parada actual: lo andado. */
  recorrido: string;
  /** Trazo desde ahí: lo que queda. */
  pendiente: string;
};

/**
 * El camino que une N paradas.
 *
 * Curvas cúbicas con los tiradores a media distancia: es lo que da la
 * ondulación sin que ninguna se pase de rosca, y funciona igual con dos
 * paradas que con nueve.
 */
export function geometriaRuta(total: number, indiceActual: number): Geometria {
  if (total === 0) return { puntos: [], recorrido: "", pendiente: "" };

  const util = LIENZO.ancho - MARGEN * 2;
  const crudos = Array.from({ length: total }, (_, i) => ({
    x: total === 1 ? LIENZO.ancho / 2 : MARGEN + (i * util) / (total - 1),
    y: BANDAS[i % 2],
  }));

  const trozo = (desde: number, hasta: number): string => {
    if (hasta <= desde) return "";
    let d = `M ${crudos[desde].x} ${crudos[desde].y}`;
    for (let i = desde; i < hasta; i++) {
      const a = crudos[i];
      const b = crudos[i + 1];
      const mitad = (b.x - a.x) / 2;
      d += ` C ${a.x + mitad} ${a.y}, ${b.x - mitad} ${b.y}, ${b.x} ${b.y}`;
    }
    return d;
  };

  // Sin parada actual —todo hecho— lo andado es el camino entero.
  const corte = indiceActual === -1 ? total - 1 : indiceActual;

  return {
    puntos: crudos.map((p) => ({
      x: (p.x / LIENZO.ancho) * 100,
      y: (p.y / LIENZO.alto) * 100,
    })),
    recorrido: trozo(0, corte),
    pendiente: trozo(corte, total - 1),
  };
}
