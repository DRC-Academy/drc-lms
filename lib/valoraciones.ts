// ---------------------------------------------------------------
// LA VALORACIÓN DE CLASES: QUÉ CLASE SE PUEDE VALORAR
//
// El alumno valora con estrellas una clase que tuvo, desde «Mis clases»
// o desde el pop-up que sale al entrar cuando la clase acaba de pasar.
// Aquí está la regla de qué clases son esas, y nada más: MÓDULO PURO, sin
// lecturas. Lo que lee y guarda está en `lib/valoraciones-servidor.ts`.
//
// UNA CLASE ES UN PARTE DE GESTIÓN (`vista_partes_clase`). La valoración
// se ata a su `parte_id`, que es el único dato que dice qué pasó con esa
// clase. El historial de «Mis clases», en cambio, son análisis de
// transcript (`class_analyses`); para poner el botón en él, cada análisis
// se empareja con su parte.
//
// ---------------------------------------------------------------
// CUÁNDO CUENTA COMO DADA (decisión de producto, 21/10/2026)
//
//   a) Tiene un análisis que casa —mismo alumno, día y `teacher_id`—,
//      sea cual sea el tipo del parte. El transcript prueba que la clase
//      ocurrió y manda sobre el parte.
//   b) Su parte es `normal` y en ese mismo hueco (día y hora) no hay
//      ningún parte de falta ni de cancelación, de ningún profesor.
//
// Una `recuperacion` sin análisis NO se puede valorar: su parte se crea
// al agendarla, no al darla (el 52 % se registra antes de la clase).
//
// `reprogramada` marca el hueco ORIGINAL, que ya no se da: queda fuera
// del emparejamiento —si no, se quedaría el análisis de la clase de
// verdad— y quita su hueco como una cancelación. Pendiente de que el
// usuario lo confirme: es una línea en `QUITAN_EL_HUECO` y otra en
// `FUERA_DEL_EMPAREJAMIENTO`.
//
// ---------------------------------------------------------------
// EL EMPAREJAMIENTO, CUANDO HAY VARIAS CLASES EL MISMO DÍA
//
// `class_analyses` no trae la hora, así que con dos clases del mismo
// profesor el mismo día se empareja por orden: la de hora más temprana
// con el análisis de `analyzed_at` más temprano. Dos ajustes, porque hay
// más partes que análisis en 121 de los 2484 días con los dos:
//
//   · los partes de un MISMO HUECO son una sola clase (un `normal` y la
//     `recuperacion` que se agendó en su hora, casi siempre), y la clase
//     se queda con el `parte_id` del `normal` si lo hay;
//   · los análisis van primero, por orden, a las clases con parte
//     `normal` o `recuperacion`, y solo los que sobren a las faltas y
//     cancelaciones. Con tantos partes como análisis da lo mismo.
//
// ---------------------------------------------------------------
// CUÁNDO TERMINÓ
//
// Inicio: `fecha` + `hora` del parte, en hora de Madrid. Duración: la de
// `vista_clases_programadas` (alumno + fecha + hora); si no casa, una
// hora. Sin hora no se sabe cuándo terminó: esa clase no dispara el
// pop-up, pero se puede valorar desde el historial si tiene análisis.
// ---------------------------------------------------------------

import { instanteEnMadrid } from "@/lib/clases";

// ---------------------------------------------------------------
// LAS CONSTANTES DE LA REGLA
// ---------------------------------------------------------------

/** Las estrellas: de 1 a 5. */
export const ESTRELLAS_MIN = 1;
export const ESTRELLAS_MAX = 5;

/** El tope del comentario, el mismo que el CHECK de la tabla. */
export const MAX_COMENTARIO = 1000;

/** El pop-up sale para una clase que terminó hace menos que esto. */
export const HORAS_DEL_POPUP = 48;

/** Lo que dura una clase de la que no se sabe la duración. */
const HORAS_POR_DEFECTO = 1;

/** Los partes que, en su hueco, impiden que un `normal` cuente como dada. */
const QUITAN_EL_HUECO: ReadonlySet<string> = new Set([
  "falta_sin_aviso",
  "falta_con_aviso",
  "cancelacion_hora",
  "cancelada_por_profesor",
  "cancelada_con_preaviso",
  "reprogramada",
]);

/** Los partes que no son una clase y no se emparejan con ningún análisis. */
const FUERA_DEL_EMPAREJAMIENTO: ReadonlySet<string> = new Set(["reprogramada"]);

/** Los que se agendan o se registran como clase: van primero al emparejar. */
const TIPOS_DE_CLASE: ReadonlySet<string> = new Set(["normal", "recuperacion"]);

// ---------------------------------------------------------------
// LO QUE ENTRA
// ---------------------------------------------------------------

/** Un parte de `vista_partes_clase`, de un solo alumno. */
export type ParteParaValorar = {
  parteId: string;
  fecha: string;
  /** "HH:MM", o null si el parte no la trae. */
  hora: string | null;
  tipo: string;
  teacherId: string | null;
  /** El nombre que quedó en el parte. */
  profesor: string | null;
};

/** Un análisis de `class_analyses`, del mismo alumno. */
export type AnalisisParaValorar = {
  id: string;
  fecha: string;
  teacherId: string | null;
  analizadoEn: string | null;
};

/** Una fila de `vista_clases_programadas`, del mismo alumno. */
export type ProgramadaParaValorar = { fecha: string; hora: string; horas: number | null };

// ---------------------------------------------------------------
// LO QUE SALE
// ---------------------------------------------------------------

export type ClaseValorable = {
  /** El `parte_id`: lo que se guarda en `valoraciones_clase.clase_id`. */
  claseId: string;
  fecha: string;
  hora: string | null;
  teacherId: string | null;
  profesorDelParte: string | null;
  /** El análisis con el que casa, o null. */
  analisisId: string | null;
  /** Null sin hora. */
  inicio: Date | null;
  fin: Date | null;
};

/** Un hueco de clase: los partes de un mismo día, hora y profesor. */
type Hueco = { partes: ParteParaValorar[]; hora: string | null; deClase: boolean };

function representante(partes: ParteParaValorar[]): ParteParaValorar {
  return partes.find((p) => p.tipo === "normal") ?? partes.find((p) => p.tipo === "recuperacion") ?? partes[0];
}

/** "HH:MM" primero, de menor a mayor; sin hora, al final. */
function porHora(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

function porAnalizado(a: AnalisisParaValorar, b: AnalisisParaValorar): number {
  const x = a.analizadoEn ?? "";
  const y = b.analizadoEn ?? "";
  if (x !== y) return x === "" ? 1 : y === "" ? -1 : x < y ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Las clases DADAS Y TERMINADAS de un alumno, de la más reciente a la
 * más antigua. Es la lista de lo que se puede valorar: el servidor la
 * vuelve a calcular antes de guardar nada.
 */
export function clasesValorables({
  partes,
  analisis,
  programadas,
  ahora,
}: {
  partes: readonly ParteParaValorar[];
  analisis: readonly AnalisisParaValorar[];
  programadas: readonly ProgramadaParaValorar[];
  ahora: Date;
}): ClaseValorable[] {
  // Los huecos quitados, de cualquier profesor.
  const quitados = new Set<string>();
  for (const p of partes) if (p.hora && QUITAN_EL_HUECO.has(p.tipo)) quitados.add(`${p.fecha}|${p.hora}`);

  const duracion = new Map<string, number>();
  for (const c of programadas) if (c.horas && c.horas > 0) duracion.set(`${c.fecha}|${c.hora}`, c.horas);

  // Los huecos de cada día y profesor.
  const huecosDelDia = new Map<string, Hueco[]>();
  for (const p of partes) {
    if (!p.parteId || FUERA_DEL_EMPAREJAMIENTO.has(p.tipo)) continue;
    const dia = `${p.fecha}|${p.teacherId ?? ""}`;
    const huecos = huecosDelDia.get(dia) ?? [];
    huecosDelDia.set(dia, huecos);
    // Sin hora no se sabe en qué hueco cae: cada uno va aparte.
    const mismo = p.hora === null ? undefined : huecos.find((h) => h.hora === p.hora);
    if (mismo) {
      mismo.partes.push(p);
      mismo.deClase ||= TIPOS_DE_CLASE.has(p.tipo);
    } else {
      huecos.push({ partes: [p], hora: p.hora, deClase: TIPOS_DE_CLASE.has(p.tipo) });
    }
  }

  const analisisDelDia = new Map<string, AnalisisParaValorar[]>();
  for (const a of analisis) {
    const dia = `${a.fecha}|${a.teacherId ?? ""}`;
    analisisDelDia.set(dia, [...(analisisDelDia.get(dia) ?? []), a]);
  }

  const salida: ClaseValorable[] = [];
  huecosDelDia.forEach((huecos, dia) => {
    const ordenados = [...huecos].sort((a, b) => Number(b.deClase) - Number(a.deClase) || porHora(a.hora, b.hora));
    const suyos = [...(analisisDelDia.get(dia) ?? [])].sort(porAnalizado);

    ordenados.forEach((hueco, i) => {
      const parte = representante(hueco.partes);
      const analisisId = suyos[i]?.id ?? null;
      const inicio = hueco.hora ? instanteEnMadrid(parte.fecha, hueco.hora) : null;
      const horas = hueco.hora ? duracion.get(`${parte.fecha}|${hueco.hora}`) ?? HORAS_POR_DEFECTO : HORAS_POR_DEFECTO;
      const fin = inicio ? new Date(inicio.getTime() + horas * 3600_000) : null;

      const normalLimpio =
        hueco.hora !== null && hueco.partes.some((p) => p.tipo === "normal") && !quitados.has(`${parte.fecha}|${hueco.hora}`);
      const dada = analisisId !== null || normalLimpio;
      // Con hora, que haya terminado; sin ella, el análisis prueba que ya pasó.
      const terminada = fin ? fin.getTime() <= ahora.getTime() : analisisId !== null;
      if (!dada || !terminada) return;

      salida.push({
        claseId: parte.parteId,
        fecha: parte.fecha,
        hora: hueco.hora,
        teacherId: parte.teacherId,
        profesorDelParte: parte.profesor,
        analisisId,
        inicio,
        fin,
      });
    });
  });

  return salida.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return -porHora(a.hora, b.hora);
  });
}

/**
 * La clase del pop-up: la más reciente de las que terminaron en las
 * últimas `HORAS_DEL_POPUP` horas y no tienen ninguna fila en
 * `valoraciones_clase`, ni valorada ni descartada. Null si no hay.
 */
export function claseDelPopup(clases: readonly ClaseValorable[], conFila: ReadonlySet<string>, ahora: Date): ClaseValorable | null {
  const desde = ahora.getTime() - HORAS_DEL_POPUP * 3600_000;
  let elegida: ClaseValorable | null = null;
  for (const c of clases) {
    if (!c.fin || conFila.has(c.claseId)) continue;
    const fin = c.fin.getTime();
    if (fin <= desde || fin > ahora.getTime()) continue;
    if (!elegida || fin > elegida.fin!.getTime()) elegida = c;
  }
  return elegida;
}

// ---------------------------------------------------------------
// LO QUE MANDA EL ALUMNO
// ---------------------------------------------------------------

export type Origen = "popup" | "mis_clases";

export function comoOrigen(valor: unknown): Origen | null {
  return valor === "popup" || valor === "mis_clases" ? valor : null;
}

export function comoEstrellas(valor: unknown): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= ESTRELLAS_MIN && valor <= ESTRELLAS_MAX ? valor : null;
}

/**
 * El comentario como se guarda: sin espacios en los bordes y null si
 * queda vacío. `undefined` si no es texto o pasa del tope.
 */
export function comoComentario(valor: unknown): string | null | undefined {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "string") return undefined;
  const limpio = valor.trim();
  if (limpio === "") return null;
  return limpio.length <= MAX_COMENTARIO ? limpio : undefined;
}

// ---------------------------------------------------------------
// EL RESUMEN DEL PANEL
// ---------------------------------------------------------------

/** Una fila de `valoraciones_clase`, como la lee el panel. */
export type FilaValoracion = {
  alumno_id: string;
  clase_id: string;
  profesor_id: string | null;
  profesor_nombre: string | null;
  fecha_clase: string;
  estrellas: number | null;
  comentario: string | null;
  descartada_en: string | null;
  origen: Origen;
  created_at: string;
  updated_at: string;
};

export type MediaProfesor = { profesorId: string; nombre: string; media: number; valoraciones: number };

export type ResumenValoraciones = {
  valoraciones: number;
  media: number | null;
  porProfesor: MediaProfesor[];
  /**
   * Los pop-ups mostrados son las filas con origen `popup`, valoradas o
   * descartadas (la fila se escribe al cerrarlo). Respondidos, los que
   * tienen estrellas, también si las puso después desde «Mis clases».
   */
  popupsMostrados: number;
  popupsRespondidos: number;
};

export function resumirValoraciones(filas: readonly FilaValoracion[]): ResumenValoraciones {
  const valoradas = filas.filter((f) => f.estrellas !== null);
  const porProfesor = new Map<string, { nombre: string; suma: number; n: number }>();
  for (const f of valoradas) {
    const id = f.profesor_id ?? "";
    const actual = porProfesor.get(id) ?? { nombre: f.profesor_nombre ?? "Sin profesor", suma: 0, n: 0 };
    actual.suma += f.estrellas!;
    actual.n += 1;
    porProfesor.set(id, actual);
  }
  const popups = filas.filter((f) => f.origen === "popup");
  const suma = valoradas.reduce((s, f) => s + f.estrellas!, 0);

  return {
    valoraciones: valoradas.length,
    media: valoradas.length > 0 ? suma / valoradas.length : null,
    porProfesor: Array.from(porProfesor)
      .map(([profesorId, p]) => ({ profesorId, nombre: p.nombre, media: p.suma / p.n, valoraciones: p.n }))
      .sort((a, b) => b.valoraciones - a.valoraciones || a.nombre.localeCompare(b.nombre, "es")),
    popupsMostrados: popups.length,
    popupsRespondidos: popups.filter((f) => f.estrellas !== null).length,
  };
}
