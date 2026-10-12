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
