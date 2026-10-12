// ---------------------------------------------------------------
// «CAMBIAR DE PROFESOR»: LAS REGLAS QUE DECIDE EL LMS
//
// Casi todo lo decide Gestión. Aquí solo lo que el contrato v2 deja del
// lado del LMS:
//
//   · NO DEJAR ELEGIR DOS DESTINOS QUE SE SOLAPEN. Gestión calcula los
//     huecos de cada sesión por separado y rechaza el solape en el POST
//     (DATOS_INVALIDOS); la pantalla no debe llegar ahí.
//   · RESPETAR EL ORDEN DE GESTIÓN. La lista de profesores llega en un
//     orden aleatorio y estable durante el día, con los huecos de cada
//     profesor juntos, y no se ordena por puntuación. Aquí se agrupa por
//     profesor sin reordenar.
//
// Puro y sin `server-only`: lo usan la pantalla y las pruebas.
// ---------------------------------------------------------------

import type { HuecoProfesor, Profesor, SesionOrigen } from "@/lib/autoservicio/tipos";

const enHoras = (hora: string): number => Number(hora.slice(0, 2));

/** Si dos bloques del mismo día se pisan. «15–17» y «16–18», sí; «15–16» y «16–17», no. */
export function seSolapan(a: SesionOrigen, b: SesionOrigen): boolean {
  if (a.dia !== b.dia) return false;
  const inicioA = enHoras(a.hora);
  const inicioB = enHoras(b.hora);
  return inicioA < inicioB + b.duracion && inicioB < inicioA + a.duracion;
}

/**
 * Si un hueco se puede elegir para la sesión `indice`, con los destinos
 * ya elegidos para las demás: no puede pisar ninguno.
 */
export function cabe(hueco: SesionOrigen, indice: number, elegidos: (SesionOrigen | null)[]): boolean {
  return elegidos.every((otro, i) => i === indice || otro === null || !seSolapan(hueco, otro));
}

/**
 * Si los destinos están completos y son válidos: uno por sesión, con su
 * misma duración y sin solaparse entre ellos.
 */
export function destinosListos(sesiones: SesionOrigen[], destinos: (SesionOrigen | null)[]): destinos is SesionOrigen[] {
  if (destinos.length !== sesiones.length) return false;
  for (let i = 0; i < destinos.length; i++) {
    const d = destinos[i];
    if (!d || d.duracion !== sesiones[i].duracion) return false;
    if (!cabe(d, i, destinos)) return false;
  }
  return true;
}

/**
 * Si hay alguna forma de dar destino a TODAS las sesiones sin que se
 * pisen, con estos huecos (uno por sesión, de su misma duración).
 *
 * Búsqueda con vuelta atrás, empezando por la sesión con menos huecos.
 * Son cinco sesiones como mucho y unas decenas de huecos cada una, así que
 * acaba enseguida; aun así lleva un tope de pasos y, si lo alcanza, dice
 * que sí: mejor dejar probar al alumno que cerrarle la puerta por una
 * cuenta que no ha terminado.
 */
export function hayCombinacion(sesiones: SesionOrigen[], huecos: SesionOrigen[][], tope = 50_000): boolean {
  const validos = sesiones.map((s, i) => (huecos[i] ?? []).filter((h) => h.duracion === s.duracion));
  if (validos.some((v) => v.length === 0)) return false;
  const orden = validos.map((_, i) => i).sort((a, b) => validos[a].length - validos[b].length);
  const elegidos: (SesionOrigen | null)[] = sesiones.map(() => null);
  let pasos = 0;

  const probar = (k: number): boolean => {
    if (k === orden.length) return true;
    const i = orden[k];
    for (const h of validos[i]) {
      if (++pasos > tope) return true;
      if (!cabe(h, i, elegidos)) continue;
      elegidos[i] = h;
      if (probar(k + 1)) return true;
      elegidos[i] = null;
    }
    return false;
  };
  return probar(0);
}

/** Cómo va el reparto de sus clases con un profesor, para pintarlo. */
export type Reparto = {
  /** Sus clases semanales: todas tienen que pasar al profesor nuevo. */
  total: number;
  /** Las que ya tienen destino. */
  elegidas: number;
  /** Todas elegidas, cada una de su duración y sin pisarse. */
  listo: boolean;
  /** Las sesiones para las que este profesor no tiene ningún hueco de su duración. */
  sinHueco: number[];
  /** Hay huecos para cada una, pero no caben todas sin pisarse. */
  imposible: boolean;
};

export function estadoReparto(sesiones: SesionOrigen[], huecos: SesionOrigen[][], destinos: (SesionOrigen | null)[]): Reparto {
  const sinHueco = sesiones
    .map((s, i) => ((huecos[i] ?? []).some((h) => h.duracion === s.duracion) ? -1 : i))
    .filter((i) => i >= 0);
  return {
    total: sesiones.length,
    elegidas: destinos.filter((d, i) => d !== null && d !== undefined && d.duracion === sesiones[i]?.duracion).length,
    listo: destinosListos(sesiones, destinos),
    sinHueco,
    imposible: sinHueco.length === 0 && !hayCombinacion(sesiones, huecos),
  };
}

export type GrupoProfesor = { profesor: Profesor; huecos: HuecoProfesor[] };

/**
 * Los huecos por profesor, en el orden en que llegaron: el primer
 * profesor que aparece va primero, y los huecos de cada uno, en su orden.
 * Si Gestión mandara los de un profesor separados, se juntan en el sitio
 * de su primera aparición.
 */
export function agruparPorProfesor(huecos: HuecoProfesor[]): GrupoProfesor[] {
  const grupos: GrupoProfesor[] = [];
  const porId = new Map<string, GrupoProfesor>();
  for (const h of huecos) {
    let g = porId.get(h.profesor.id);
    if (!g) {
      g = { profesor: h.profesor, huecos: [] };
      porId.set(h.profesor.id, g);
      grupos.push(g);
    }
    g.huecos.push(h);
  }
  return grupos;
}

/** Un hueco como destino del POST: solo lo que pide el contrato. */
export function aDestino(h: SesionOrigen): SesionOrigen {
  return { dia: h.dia, hora: h.hora, duracion: h.duracion };
}
