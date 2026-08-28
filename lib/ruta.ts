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
// detalle —el porcentaje, el botón de repetir— vive en el desplegable de
// «Paradas hechas», que es donde el alumno lo busca cuando lo busca.
//
// LA ÚLTIMA PARADA ES LA GENERACIÓN, y no un bloque escondido. Durante
// un tiempo se retenía el último bloque estático para poder enseñar un
// candado; el candado decía «se abre con tu próxima clase», que es
// exactamente la condición de la generación, así que la pantalla tenía
// dos cosas distintas contando lo mismo —el candado aquí y una tarjeta
// con su botón apagado al pie—. Ahora es una sola parada, la última, y
// tiene los dos estados de verdad: cerrada mientras no haya clase nueva
// que analizar, abierta —con su botón— en cuanto la hay.
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
  /** La que cierra el camino: el bloque que sale de la próxima clase. */
  | "generacion"
  /** Las hechas de más, agrupadas en un solo punto al principio. */
  | "resumen";

/**
 * En qué estado llega la parada de generación.
 *
 * `null` es «no hay ninguna fuente de la que tirar»: sin clase, sin
 * perfil y sin examen no hay parada que enseñar, ni cerrada. A ese
 * alumno se le invita a completar el perfil, que es lo único que puede
 * hacer.
 */
export type EstadoGeneracionRuta = "abierta" | "cerrada" | null;

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
  /** Solo en el resumen: si lo que agrupa está por delante, no detrás. */
  futuro: boolean;
  /** Solo en la de generación: si ya se puede preparar. */
  abierta: boolean;
};

/**
 * Cuántas paradas hechas se dejan a la vista antes de agruparlas.
 *
 * Dos son suficientes para que la línea verde signifique algo y para que
 * el camino no se convierta en un historial: para eso está el
 * desplegable. Sin este tope, un alumno de seis meses abre «Para ti» y
 * se encuentra treinta puntos.
 */
export const HECHAS_A_LA_VISTA = 2;

/**
 * Y cuántas pendientes se dejan por delante antes de agruparlas.
 *
 * Tres bastan para ver que el camino sigue. Sin este tope, un alumno con
 * quince bloques por delante recibe un mapa que no cabe en tres
 * pantallas y en el que todo lo que queda pesa lo mismo.
 */
export const PENDIENTES_A_LA_VISTA = 3;

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
 * Las paradas del camino, en orden y TODAS.
 *
 * Aquí ya no se agrupa nada: la numeración tiene que ser la de verdad
 * —«vas por la 14 de 20», no «por la 3 de 7»— y para eso hay que contar
 * el camino entero. El plegado es cosa de la pantalla, y vive en
 * `plegarRuta`, porque el alumno lo abre y lo cierra.
 *
 * @param bloques Todos los del alumno, generados primero.
 * @param generacion En qué estado va la parada que cierra el camino.
 */
export function construirRuta(
  bloques: Bloque[],
  progreso: ProgresoBloques,
  generacion: EstadoGeneracionRuta
): Parada[] {
  const indiceActual = bloques.findIndex((bloque) => !estaCerrado(progreso, bloque));

  const paradas: Parada[] = bloques.map((bloque, i) => {
    const cerrado = estaCerrado(progreso, bloque);
    return {
      clave: bloque.id,
      tipo: cerrado ? "hecha" : i === indiceActual ? "actual" : "pendiente",
      numero: i + 1,
      titulo: bloque.titulo,
      bloque,
      porcentaje: cerrado ? porcentajeDe(progreso, bloque) : null,
      agrupadas: 0,
      futuro: false,
      abierta: false,
    };
  });

  // Y al final, la de generación. Cierra el camino porque es de donde
  // sale la siguiente: no es un hueco al pie de la pantalla.
  if (generacion !== null) {
    paradas.push({
      clave: "generacion",
      tipo: "generacion",
      numero: paradas.length + 1,
      titulo: generacion === "abierta" ? "Lista para abrir" : "Se abre con tu próxima clase",
      bloque: null,
      porcentaje: null,
      agrupadas: 0,
      futuro: false,
      abierta: generacion === "abierta",
    });
  }

  return paradas;
}

// ---------------------------------------------------------------
// EL PLEGADO
//
// El camino nunca dibuja más de NUEVE nodos:
//
//   grupo · 2 hechas · disponible · 3 pendientes · grupo · candado
//
// Con siete paradas no se pliega nada y salen las siete. Con veinte
// salen nueve. Con doscientas, nueve.
//
// LO AGRUPADO SIGUE ESTANDO EN EL CAMINO. No es un «ver más» al pie ni
// una paginación: es un nodo, y al tocarlo el camino crece ahí mismo.
// Por eso plegar no rompe la sensación de recorrido, que es lo único
// que esta pantalla ha venido a construir.
//
// NUNCA SE PLIEGAN la parada disponible ni el candado: una es adónde
// vas y el otro es la promesa de que la ruta crece.
// ---------------------------------------------------------------

export type Plegado = { atras: boolean; delante: boolean };

function grupo(agrupadas: number, futuro: boolean): Parada {
  return {
    clave: futuro ? "grupo-delante" : "grupo-atras",
    tipo: "resumen",
    numero: null,
    titulo: futuro
      ? `${agrupadas} ${agrupadas === 1 ? "parada más" : "paradas más"}`
      : `${agrupadas} ${agrupadas === 1 ? "parada hecha" : "paradas hechas"}`,
    bloque: null,
    porcentaje: null,
    agrupadas,
    futuro,
    abierta: false,
  };
}

/** Las paradas que se pintan, con sus dos nodos de grupo si hacen falta. */
export function plegarRuta(paradas: Parada[], abierto: Plegado): Parada[] {
  const hechas = paradas.filter((p) => p.tipo === "hecha");
  const actual = paradas.find((p) => p.tipo === "actual") ?? null;
  const pendientes = paradas.filter((p) => p.tipo === "pendiente");
  const cierre = paradas.filter((p) => p.tipo === "generacion");

  const sobranAtras = Math.max(0, hechas.length - HECHAS_A_LA_VISTA);
  const sobranDelante = Math.max(0, pendientes.length - PENDIENTES_A_LA_VISTA);

  const visibles: Parada[] = [];

  if (sobranAtras > 0) {
    visibles.push(grupo(sobranAtras, false));
    if (abierto.atras) visibles.push(...hechas.slice(0, sobranAtras));
    visibles.push(...hechas.slice(sobranAtras));
  } else {
    visibles.push(...hechas);
  }

  if (actual) visibles.push(actual);

  if (sobranDelante > 0) {
    visibles.push(...pendientes.slice(0, PENDIENTES_A_LA_VISTA));
    visibles.push(grupo(sobranDelante, true));
    if (abierto.delante) visibles.push(...pendientes.slice(PENDIENTES_A_LA_VISTA));
  } else {
    visibles.push(...pendientes);
  }

  visibles.push(...cierre);
  return visibles;
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

/**
 * Un solo tramo del camino de escritorio: el que va de `indice` al
 * siguiente.
 *
 * `geometriaRuta` devuelve lo andado y lo que queda como dos trazos
 * enteros, y eso basta para pintar. Pero al cerrar una parada hay que
 * colorear UN tramo —el que acaba de andarse— por encima de lo demás, y
 * para eso hace falta poder pedirlo suelto.
 */
export function tramoRuta(total: number, indice: number): string {
  if (indice < 0 || indice >= total - 1) return "";

  const util = LIENZO.ancho - MARGEN * 2;
  const punto = (i: number) => ({
    x: total === 1 ? LIENZO.ancho / 2 : MARGEN + (i * util) / (total - 1),
    y: BANDAS[i % 2],
  });

  const a = punto(indice);
  const b = punto(indice + 1);
  const mitad = (b.x - a.x) / 2;
  return `M ${a.x} ${a.y} C ${a.x + mitad} ${a.y}, ${b.x - mitad} ${b.y}, ${b.x} ${b.y}`;
}


// ---------------------------------------------------------------
// LA GEOMETRÍA DEL MÓVIL
//
// El mismo camino, de pie. Tres bandas: izquierda y derecha se van
// alternando, y el CENTRO es solo de la parada disponible —esa
// asimetría rota la señala sola, sin color y sin movimiento—.
//
// Las coordenadas van en porcentaje del mismo lienzo de 366 de ancho,
// igual que en el escritorio, así que el trazo y los nodos cuadran a
// 375, a 390 y a 430 sin recalcular nada al redimensionar.
//
// EN EL MAPA NO HAY TEXTO, y es lo que hace que esto no se rompa: el
// trazo barre todo el ancho en cada tramo, así que un rótulo colgado al
// lado acabaría cruzado por la curva en cuanto el título ocupara dos
// líneas. Todo el texto vive en la tarjeta, a todo el ancho y por
// delante del trazo.
// ---------------------------------------------------------------

export const LIENZO_MOVIL = 366;

export type Banda = "izq" | "centro" | "der";

const X_BANDA: Record<Banda, number> = { izq: 57, centro: 183, der: 309 };

export const PCT_BANDA: Record<Banda, string> = {
  izq: "15.5%",
  centro: "50%",
  der: "84.5%",
};

/** A qué lado cuelga cada parada. La disponible siempre al centro. */
export function bandasMovil(paradas: Parada[]): Banda[] {
  let lado: Banda = "izq";
  return paradas.map((parada) => {
    if (parada.tipo === "actual") return "centro";
    const actual = lado;
    lado = lado === "izq" ? "der" : "izq";
    return actual;
  });
}

/**
 * El tramo que baja de una parada a la siguiente.
 *
 * Sale recto del nodo, barre por el medio y entra recto en el de abajo:
 * es lo que da la ondulación de mapa sin que ningún tramo se pase de
 * rosca. Cuando la parada lleva tarjeta, el trazo baja más pegado para
 * que asome por debajo en vez de aparecer de la nada por un lado.
 */
export function curvaMovil(desde: Banda, hasta: Banda, conTarjeta: boolean): string {
  const x1 = X_BANDA[desde];
  const x2 = X_BANDA[hasta];
  return conTarjeta
    ? `M ${x1} 0 C ${x1} 76, ${x2} 80, ${x2} 100`
    : `M ${x1} 0 C ${x1} 52, ${x2} 52, ${x2} 100`;
}
