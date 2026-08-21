// ---------------------------------------------------------------
// LO QUE EL CRON DE AVISOS LEE Y ESCRIBE
//
// TODO EN BLOQUE, Y ESA ES LA REGLA DE ESTE ARCHIVO. La pantalla de un
// alumno puede permitirse cuatro consultas; el cron recorre a los 172 y
// con cuatro por cabeza serían casi setecientos viajes, que en el plan
// Hobby —60 segundos de techo— no caben. Así que se trae siete veces
// todo y cruza en memoria.
//
// PAGINADO SIEMPRE. Supabase corta las respuestas a 1.000 filas, y aquí
// hay lecturas que las pasan de sobra: 1.300 lecciones entre los siete
// cursos y más de 4.000 filas de progreso. Sin `leerPaginado` el cron
// no fallaría: dejaría de avisar a los alumnos que caen fuera de la
// primera página, en silencio.
//
// LO ÚNICO QUE SE ESCRIBE ES `avisos_modulo` Y `avisos_preferencias`.
// Gestión sigue siendo de solo lectura y el contenido de los cursos no
// se toca.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { claveCoincide, cursosDelAlumno } from "@/lib/cursos";
import type { CursoFila } from "@/lib/cursos-servidor";
import { partirModulo } from "@/lib/modulo";
import type { ModuloDelCurso } from "@/lib/avisos";

/** `${alumnoId}|${moduloId}`, que es la clave de deduplicación. */
export type ClaveAviso = string;

export function claveAviso(alumnoId: string, moduloId: string): ClaveAviso {
  return `${alumnoId}|${moduloId}`;
}

// ---------------------------------------------------------------
// LECTURA
// ---------------------------------------------------------------

const PAGINA = 1000;

/**
 * Una tabla entera, en páginas de mil.
 *
 * Quien llama pasa una función que pide UN tramo, en vez del constructor
 * de Supabase: así este módulo no depende de los tipos internos del
 * cliente —que son otro paquete— y sigue siendo estricto.
 */
type Pagina<T> = { data: T[] | null; error: { message: string } | null };

async function leerPaginado<T>(
  donde: string,
  pedir: (desde: number, hasta: number) => PromiseLike<Pagina<T>>
): Promise<T[]> {
  const salida: T[] = [];

  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pedir(desde, desde + PAGINA - 1);

    if (error) {
      console.error(`[avisos] No se pudo leer ${donde}:`, error.message);
      return salida;
    }

    const pagina = data ?? [];
    salida.push(...pagina);
    if (pagina.length < PAGINA) return salida;
  }
}

type FilaModulo = { id: string; curso_id: string; titulo: string; orden: number; visible_after: number | null };
type FilaLeccion = { id: string; modulo_id: string; orden: number };

export type ContenidoCursos = {
  cursos: CursoFila[];
  /** curso_id → sus módulos, en orden. */
  modulos: Map<string, FilaModulo[]>;
  /** modulo_id → sus lecciones, en orden. */
  lecciones: Map<string, FilaLeccion[]>;
  /** leccion_id → curso_id. Para contar el progreso por curso. */
  cursoDeLeccion: Map<string, string>;
  /** curso_id → cuántas lecciones tiene. Es el denominador del diploma. */
  totalPorCurso: Map<string, number>;
};

/** Los siete cursos activos con sus módulos y sus lecciones. Sin contenido. */
export async function leerContenido(): Promise<ContenidoCursos> {
  const cliente = baseLms();

  const { data: cursos, error } = await cliente
    .from("cursos")
    .select("id, slug, titulo, nivel, tipo, examen")
    .eq("activo", true)
    .order("orden")
    .returns<CursoFila[]>();

  if (error) {
    console.error("[avisos] No se pudieron leer los cursos:", error.message);
  }

  const listaCursos = cursos ?? [];

  const filasModulo = await leerPaginado<FilaModulo>("los módulos", (desde, hasta) =>
    cliente
      .from("modulos")
      .select("id, curso_id, titulo, orden, visible_after")
      .order("orden")
      .range(desde, hasta)
      .returns<FilaModulo[]>()
  );

  const filasLeccion = await leerPaginado<FilaLeccion>("las lecciones", (desde, hasta) =>
    cliente
      .from("lecciones")
      .select("id, modulo_id, orden")
      .order("orden")
      .range(desde, hasta)
      .returns<FilaLeccion[]>()
  );

  const modulos = new Map<string, FilaModulo[]>();
  const moduloACurso = new Map<string, string>();
  for (const fila of filasModulo) {
    const lista = modulos.get(fila.curso_id);
    if (lista) lista.push(fila);
    else modulos.set(fila.curso_id, [fila]);
    moduloACurso.set(fila.id, fila.curso_id);
  }
  // `forEach` y no `for…of`: el proyecto compila sin `downlevelIteration`
  // y recorrer un Map directamente no pasa el `tsc`.
  modulos.forEach((lista) => lista.sort((a, b) => a.orden - b.orden));

  const lecciones = new Map<string, FilaLeccion[]>();
  const cursoDeLeccion = new Map<string, string>();
  const totalPorCurso = new Map<string, number>();

  for (const fila of filasLeccion) {
    const lista = lecciones.get(fila.modulo_id);
    if (lista) lista.push(fila);
    else lecciones.set(fila.modulo_id, [fila]);

    const cursoId = moduloACurso.get(fila.modulo_id);
    if (cursoId === undefined) continue;
    cursoDeLeccion.set(fila.id, cursoId);
    totalPorCurso.set(cursoId, (totalPorCurso.get(cursoId) ?? 0) + 1);
  }
  lecciones.forEach((lista) => lista.sort((a, b) => a.orden - b.orden));

  return { cursos: listaCursos, modulos, lecciones, cursoDeLeccion, totalPorCurso };
}

export type EstadoAlumnos = {
  /** alumno_id → lecciones que lleva hechas. */
  progreso: Map<string, Set<string>>;
  /** alumno_id → cursos con el drip desactivado a mano. */
  sinDrip: Map<string, Set<string>>;
  /** alumno_id → cursos concedidos a mano, que se suman a los del plan. */
  manuales: Map<string, Set<string>>;
  /** Quién ha pedido no recibir avisos. */
  bajas: Set<string>;
  /** De qué módulos ya se ha avisado, sea cual sea el estado de la fila. */
  avisados: Set<ClaveAviso>;
};

type FilaProgreso = { alumno_id: string; leccion_id: string };
type FilaAccesoManual = { alumno_id: string; curso_id: string; sin_drip: boolean };
type FilaPreferencia = { alumno_id: string };
type FilaAvisada = { alumno_id: string; modulo_id: string };

/** Todo lo que hay que saber de los alumnos, en cuatro consultas. */
export async function leerEstado(): Promise<EstadoAlumnos> {
  const cliente = baseLms();

  const filasProgreso = await leerPaginado<FilaProgreso>("el progreso de lecciones", (desde, hasta) =>
    cliente
      .from("progreso_lecciones")
      .select("alumno_id, leccion_id")
      .order("alumno_id")
      .range(desde, hasta)
      .returns<FilaProgreso[]>()
  );

  const filasManuales = await leerPaginado<FilaAccesoManual>("los accesos manuales", (desde, hasta) =>
    cliente
      .from("accesos_manuales")
      .select("alumno_id, curso_id, sin_drip")
      .is("revocada_en", null)
      .order("alumno_id")
      .range(desde, hasta)
      .returns<FilaAccesoManual[]>()
  );

  const filasBaja = await leerPaginado<FilaPreferencia>("las preferencias de aviso", (desde, hasta) =>
    cliente
      .from("avisos_preferencias")
      .select("alumno_id")
      .eq("avisos_email", false)
      .order("alumno_id")
      .range(desde, hasta)
      .returns<FilaPreferencia[]>()
  );

  const filasAvisadas = await leerPaginado<FilaAvisada>("los avisos ya registrados", (desde, hasta) =>
    cliente
      .from("avisos_modulo")
      .select("alumno_id, modulo_id")
      .order("alumno_id")
      .range(desde, hasta)
      .returns<FilaAvisada[]>()
  );

  const progreso = new Map<string, Set<string>>();
  for (const fila of filasProgreso) {
    const suyas = progreso.get(fila.alumno_id);
    if (suyas) suyas.add(fila.leccion_id);
    else progreso.set(fila.alumno_id, new Set([fila.leccion_id]));
  }

  const sinDrip = new Map<string, Set<string>>();
  const manuales = new Map<string, Set<string>>();
  for (const fila of filasManuales) {
    const suyos = manuales.get(fila.alumno_id) ?? new Set<string>();
    suyos.add(fila.curso_id);
    manuales.set(fila.alumno_id, suyos);

    if (fila.sin_drip !== true) continue;
    const abiertos = sinDrip.get(fila.alumno_id) ?? new Set<string>();
    abiertos.add(fila.curso_id);
    sinDrip.set(fila.alumno_id, abiertos);
  }

  return {
    progreso,
    sinDrip,
    manuales,
    bajas: new Set(filasBaja.map((f) => f.alumno_id)),
    avisados: new Set(filasAvisadas.map((f) => claveAviso(f.alumno_id, f.modulo_id))),
  };
}

// ---------------------------------------------------------------
// LOS CURSOS DE UN ALUMNO, SIN CONSULTAR
//
// Es `cursosAsignados` de `lib/cursos-servidor.ts` con los datos ya en
// memoria: mismas reglas, mismo orden —el curso del examen primero, lo
// concedido a mano al final— pero sin un viaje por alumno. Si algún día
// cambian las reglas de asignación, cambian en `lib/cursos.ts` y las dos
// se enteran; lo único duplicado aquí es el bucle.
// ---------------------------------------------------------------
export function cursosDeAlumno(
  contenido: ContenidoCursos,
  plan: string,
  nivel: string,
  manuales: Set<string>
): CursoFila[] {
  const salida: CursoFila[] = [];

  for (const clave of cursosDelAlumno(plan, nivel)) {
    const encontrado = contenido.cursos.find((curso) => claveCoincide(clave, curso));
    if (encontrado && !salida.some((c) => c.id === encontrado.id)) salida.push(encontrado);
  }

  for (const curso of contenido.cursos) {
    if (!manuales.has(curso.id)) continue;
    if (salida.some((c) => c.id === curso.id)) continue;
    salida.push(curso);
  }

  return salida;
}

/**
 * Los módulos de un curso en la forma que espera `repartirModulos`.
 *
 * El destino de cada módulo es su primera lección SIN HACER, y si están
 * todas hechas, la primera: el botón del correo tiene que abrir algo
 * aunque el alumno se haya adelantado.
 */
export function modulosParaReparto(
  contenido: ContenidoCursos,
  cursoId: string,
  hechas: Set<string>
): ModuloDelCurso[] {
  const suyos = contenido.modulos.get(cursoId) ?? [];

  return suyos.map((modulo, i) => {
    const lecciones = contenido.lecciones.get(modulo.id) ?? [];
    const pendiente = lecciones.find((leccion) => !hechas.has(leccion.id));

    return {
      id: modulo.id,
      titulo: partirModulo(modulo.titulo, i).titulo,
      orden: i,
      visibleAfter: modulo.visible_after ?? 0,
      totalLecciones: lecciones.length,
      destino: (pendiente ?? lecciones[0])?.id ?? null,
    };
  });
}

// ---------------------------------------------------------------
// ESCRITURA
// ---------------------------------------------------------------

type FilaAviso = { alumno_id: string; modulo_id: string; estado: string };

/**
 * Reserva los avisos ANTES de enviarlos, y devuelve solo los que ha
 * conseguido reservar.
 *
 * Aquí está toda la deduplicación: el `unique (alumno_id, modulo_id)`
 * hace que una segunda ejecución —del cron, de una mano, de un doble
 * disparo de Vercel— no se lleve ninguna fila, y `ignoreDuplicates`
 * hace que eso no sea un error sino una lista más corta. Lo que vuelve
 * es exactamente lo que ESTA ejecución tiene que enviar.
 */
export async function reservarAvisos(
  filas: { alumnoId: string; moduloId: string }[]
): Promise<Set<ClaveAviso>> {
  if (filas.length === 0) return new Set();

  const nuevas: FilaAviso[] = filas.map((fila) => ({
    alumno_id: fila.alumnoId,
    modulo_id: fila.moduloId,
    estado: "reservado",
  }));

  const { data, error } = await baseLms()
    .from("avisos_modulo")
    .upsert(nuevas, { onConflict: "alumno_id,modulo_id", ignoreDuplicates: true })
    .select("alumno_id, modulo_id")
    .returns<FilaAvisada[]>();

  if (error) {
    console.error("[avisos] No se pudieron reservar los avisos:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((f) => claveAviso(f.alumno_id, f.modulo_id)));
}

/** El envío salió: la reserva pasa a enviada, con el id de Resend. */
export async function confirmarAvisos(
  alumnoId: string,
  moduloIds: string[],
  resendId: string | null
): Promise<void> {
  if (moduloIds.length === 0) return;

  const { error } = await baseLms()
    .from("avisos_modulo")
    .update({ estado: "enviado", enviado_en: new Date().toISOString(), resend_id: resendId })
    .eq("alumno_id", alumnoId)
    .in("modulo_id", moduloIds);

  if (error) console.error("[avisos] No se pudo confirmar el envío:", error.message);
}

/**
 * El envío falló: se sueltan las reservas para que el día siguiente lo
 * reintente. Siguen dentro de la ventana de dos días, así que no se
 * pierde el aviso.
 */
export async function soltarAvisos(alumnoId: string, moduloIds: string[]): Promise<void> {
  if (moduloIds.length === 0) return;

  const { error } = await baseLms()
    .from("avisos_modulo")
    .delete()
    .eq("alumno_id", alumnoId)
    .eq("estado", "reservado")
    .in("modulo_id", moduloIds);

  if (error) console.error("[avisos] No se pudieron soltar las reservas:", error.message);
}

/**
 * La primera pasada: marca como sembrado todo lo que ya estaba abierto.
 *
 * No envía nada y no pisa lo que ya hubiera: `ignoreDuplicates` deja
 * intacto un aviso ya enviado si esto se ejecuta dos veces.
 *
 * EN LOTES DE 500 porque esto es la única escritura grande de todo el
 * sistema: 172 alumnos por unos 25 módulos abiertos de media son más de
 * cuatro mil filas, y mandarlas en una sola petición es medio mega de
 * cuerpo y un tiempo de respuesta que puede comerse el techo de 60
 * segundos. Partido, si algo falla se pierde un lote y el resto queda
 * escrito: volver a sembrar completa lo que falte.
 */
const LOTE_SIEMBRA = 500;

export async function sembrarAvisos(
  filas: { alumnoId: string; moduloId: string }[]
): Promise<number> {
  let marcados = 0;

  for (let desde = 0; desde < filas.length; desde += LOTE_SIEMBRA) {
    const lote: FilaAviso[] = filas.slice(desde, desde + LOTE_SIEMBRA).map((fila) => ({
      alumno_id: fila.alumnoId,
      modulo_id: fila.moduloId,
      estado: "sembrado",
    }));

    const { data, error } = await baseLms()
      .from("avisos_modulo")
      .upsert(lote, { onConflict: "alumno_id,modulo_id", ignoreDuplicates: true })
      .select("modulo_id")
      .returns<{ modulo_id: string }[]>();

    if (error) {
      console.error("[avisos] No se pudo sembrar un lote:", error.message);
      continue;
    }

    marcados += (data ?? []).length;
  }

  return marcados;
}

// ---------------------------------------------------------------
// LA BAJA
// ---------------------------------------------------------------

/** ¿Este alumno recibe avisos? Sin fila, sí: la baja es lo excepcional. */
export async function recibeAvisos(alumnoId: string): Promise<boolean> {
  const { data, error } = await baseLms()
    .from("avisos_preferencias")
    .select("avisos_email")
    .eq("alumno_id", alumnoId)
    .limit(1)
    .returns<{ avisos_email: boolean }[]>();

  if (error) {
    console.error("[avisos] No se pudo leer la preferencia:", error.message);
    // Ante la duda, que los reciba: es lo que ya estaba pasando.
    return true;
  }

  return (data ?? [])[0]?.avisos_email ?? true;
}

export async function guardarPreferenciaAvisos(
  alumnoId: string,
  avisosEmail: boolean,
  origen: string
): Promise<boolean> {
  const { error } = await baseLms().from("avisos_preferencias").upsert(
    {
      alumno_id: alumnoId,
      avisos_email: avisosEmail,
      actualizado_en: new Date().toISOString(),
      origen,
    },
    { onConflict: "alumno_id" }
  );

  if (error) {
    console.error("[avisos] No se pudo guardar la preferencia:", error.message);
    return false;
  }

  return true;
}
