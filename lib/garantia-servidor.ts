// ---------------------------------------------------------------
// LA GARANTÍA DEL PLAN: LEER, GUARDAR Y AVISAR
//
// El veredicto lo da `lib/garantia.ts`, que no lee nada. Aquí se juntan
// sus datos, se guarda lo que diga `estadoVigente` y se avisa al equipo
// cuando alguien pasa a «Perdida».
//
// DE DÓNDE SALE CADA COSA:
//
//   · asistencia      Gestión: `vista_partes_clase` y
//                     `vista_clases_programadas`. NUNCA `entradas_clase`:
//                     esos clics solo se enseñan en el detalle, aparte.
//   · fin del plan    Gestión: `vista_fin_plan`.
//   · contenido       LMS: cursos, módulos con su drip, lecciones y
//                     `progreso_lecciones.completada_en`.
//
// LECTURAS ESTRICTAS. Si falla una lectura, no se calcula nada: un
// progreso leído a medias haría «Perdida» a quien sí hizo sus lecciones,
// y una pérdida no se deshace. Por eso aquí no se usa `leerPaginado` de
// los avisos, que sigue con lo que tenga.
//
// La demo y la cuenta de pruebas no tienen garantía.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import {
  alumnosParaGarantia,
  clasesProgramadas,
  finesDePlan,
  obtenerNombresProfesor,
  partesDeClase,
  type AlumnoGarantia,
  type FilaParteGestion,
  type FilaProgramadaGestion,
} from "@/lib/gestion";
import { cursosDelPlan } from "@/lib/cursos";
import { nivelDelAlumno } from "@/lib/estimacion";
import { partirModulo } from "@/lib/modulo";
import { esCuentaDeEquipo } from "@/lib/entradas-clase-servidor";
import { urlPublica } from "@/lib/url-publica";
import { REMITENTE } from "@/lib/correo";
import { Resend } from "resend";
import {
  calcularGarantia,
  esIntensivo,
  estadoVigente,
  type Autor,
  type ClaseProgramada,
  type Estado,
  type Evidencia,
  type Guardado,
  type ModuloDrip,
  type Motivo,
  type ParteClase,
  type Veredicto,
  type Vigente,
} from "@/lib/garantia";

// ---------------------------------------------------------------
// LECTURA DEL LMS
// ---------------------------------------------------------------

const PAGINA = 1000;
type Pagina<T> = { data: T[] | null; error: { message: string } | null };

/** Una tabla entera en tramos de mil. Null si falla cualquiera. */
async function todo<T>(donde: string, pedir: (desde: number, hasta: number) => PromiseLike<Pagina<T>>): Promise<T[] | null> {
  const salida: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pedir(desde, desde + PAGINA - 1);
    if (error) {
      console.error(`[garantia] No se pudo leer ${donde}:`, error.message);
      return null;
    }
    const pagina = data ?? [];
    salida.push(...pagina);
    if (pagina.length < PAGINA) return salida;
  }
}

type FilaCurso = { id: string; slug: string; titulo: string; nivel: string; tipo: string; examen: string | null };
type FilaModulo = { id: string; curso_id: string; titulo: string; orden: number; visible_after: number | null };
type FilaLeccion = { id: string; modulo_id: string; titulo: string; orden: number };
type FilaProgreso = { alumno_id: string; leccion_id: string; completada_en: string };
type FilaAcceso = { alumno_id: string; curso_id: string; sin_drip: boolean };

export type Contenido = {
  cursos: FilaCurso[];
  modulos: Map<string, FilaModulo[]>;
  lecciones: Map<string, FilaLeccion[]>;
  /** alumno_id → (leccion_id → completada_en) */
  completadas: Map<string, Map<string, string>>;
  /** alumno_id → curso_id → sin_drip */
  manuales: Map<string, Map<string, boolean>>;
};

export async function leerContenido(alumnoId?: string): Promise<Contenido | null> {
  const cliente = baseLms();

  const [cursos, modulos, lecciones, progreso, accesos] = await Promise.all([
    todo<FilaCurso>("los cursos", (d, h) =>
      cliente.from("cursos").select("id, slug, titulo, nivel, tipo, examen").eq("activo", true).order("orden").range(d, h).returns<FilaCurso[]>()
    ),
    todo<FilaModulo>("los módulos", (d, h) =>
      cliente.from("modulos").select("id, curso_id, titulo, orden, visible_after").order("id").range(d, h).returns<FilaModulo[]>()
    ),
    todo<FilaLeccion>("las lecciones", (d, h) =>
      cliente.from("lecciones").select("id, modulo_id, titulo, orden").order("id").range(d, h).returns<FilaLeccion[]>()
    ),
    todo<FilaProgreso>("el progreso", (d, h) => {
      const q = cliente.from("progreso_lecciones").select("alumno_id, leccion_id, completada_en");
      return (alumnoId ? q.eq("alumno_id", alumnoId) : q).order("id").range(d, h).returns<FilaProgreso[]>();
    }),
    todo<FilaAcceso>("los accesos manuales", (d, h) => {
      const q = cliente.from("accesos_manuales").select("alumno_id, curso_id, sin_drip").is("revocada_en", null);
      return (alumnoId ? q.eq("alumno_id", alumnoId) : q).order("id").range(d, h).returns<FilaAcceso[]>();
    }),
  ]);

  if (!cursos || !modulos || !lecciones || !progreso || !accesos) return null;

  const porCurso = new Map<string, FilaModulo[]>();
  for (const m of modulos) porCurso.set(m.curso_id, [...(porCurso.get(m.curso_id) ?? []), m]);
  porCurso.forEach((lista) => lista.sort((a, b) => a.orden - b.orden));

  const porModulo = new Map<string, FilaLeccion[]>();
  for (const l of lecciones) porModulo.set(l.modulo_id, [...(porModulo.get(l.modulo_id) ?? []), l]);
  porModulo.forEach((lista) => lista.sort((a, b) => a.orden - b.orden));

  const completadas = new Map<string, Map<string, string>>();
  for (const p of progreso) {
    const suyas = completadas.get(p.alumno_id) ?? new Map<string, string>();
    suyas.set(p.leccion_id, p.completada_en);
    completadas.set(p.alumno_id, suyas);
  }

  const manuales = new Map<string, Map<string, boolean>>();
  for (const a of accesos) {
    const suyos = manuales.get(a.alumno_id) ?? new Map<string, boolean>();
    suyos.set(a.curso_id, a.sin_drip === true);
    manuales.set(a.alumno_id, suyos);
  }

  return { cursos, modulos: porCurso, lecciones: porModulo, completadas, manuales };
}

/**
 * Sus cursos con drip, como módulos para el cálculo. Mismas reglas que
 * `cursosAsignados`: los del plan y nivel, más los concedidos a mano.
 */
export function modulosDelAlumno(contenido: Contenido, alumno: AlumnoGarantia): { modulos: ModuloDrip[]; cursosSinDrip: number } {
  const manuales = contenido.manuales.get(alumno.alumnoId) ?? new Map<string, boolean>();
  const nivel = nivelDelAlumno(alumno.alumnoId, alumno);
  const suyos = [...cursosDelPlan(alumno.plan, nivel, contenido.cursos)];
  for (const curso of contenido.cursos) {
    if (manuales.has(curso.id) && !suyos.some((c) => c.id === curso.id)) suyos.push(curso);
  }

  const modulos: ModuloDrip[] = [];
  let cursosSinDrip = 0;
  for (const curso of suyos) {
    if (manuales.get(curso.id) === true) {
      cursosSinDrip++;
      continue;
    }
    (contenido.modulos.get(curso.id) ?? []).forEach((m, i) => {
      modulos.push({
        titulo: partirModulo(m.titulo, i).titulo,
        curso: curso.titulo,
        visibleAfter: m.visible_after ?? 0,
        lecciones: (contenido.lecciones.get(m.id) ?? []).map((l) => ({ id: l.id, titulo: l.titulo })),
      });
    });
  }
  return { modulos, cursosSinDrip };
}

// ---------------------------------------------------------------
// DE GESTIÓN AL CÁLCULO
// ---------------------------------------------------------------

const MOTIVOS: readonly string[] = ["alumno_antelacion", "alumno_sobre_hora", "profesor", "autoservicio"];
const AUTORES: readonly string[] = ["alumno", "profesor", "academia"];

function aParte(f: FilaParteGestion): ParteClase {
  return {
    parteId: f.parteId,
    fecha: f.fecha.slice(0, 10),
    hora: f.hora,
    tipo: f.tipo,
    profesor: f.profesor,
    motivo: f.motivo && MOTIVOS.includes(f.motivo) ? (f.motivo as Motivo) : null,
    rescheduledTo: f.rescheduledTo,
    registradoEn: f.registradoEn,
    avisadoEn: f.avisadoEn,
    canceladoPor: f.canceladoPor && AUTORES.includes(f.canceladoPor) ? (f.canceladoPor as Autor) : null,
  };
}

function agrupar<T extends { alumnoId: string }>(filas: T[]): Map<string, T[]> {
  const salida = new Map<string, T[]>();
  for (const f of filas) salida.set(f.alumnoId, [...(salida.get(f.alumnoId) ?? []), f]);
  return salida;
}

export type CalculoAlumno = {
  alumno: AlumnoGarantia;
  fin: string | null;
  intensivo: boolean;
  veredicto: Veredicto;
};

/**
 * El veredicto de hoy de todos los alumnos activos, o de uno (activo o
 * no). Null si falla cualquier lectura: entonces no se calcula nada.
 */
export async function calcularTodos(ahora: Date, soloAlumno?: string): Promise<CalculoAlumno[] | null> {
  const [alumnos, partes, programadas, fines, contenido, profesores] = await Promise.all([
    alumnosParaGarantia(),
    partesDeClase(soloAlumno),
    clasesProgramadas(soloAlumno),
    finesDePlan(),
    leerContenido(soloAlumno),
    obtenerNombresProfesor(),
  ]);
  if (!alumnos || !partes || !programadas || !fines || !contenido) return null;

  const partesDe = agrupar(partes);
  const programadasDe = agrupar<FilaProgramadaGestion>(programadas);

  return alumnos
    .filter((a) => !esCuentaDeEquipo(a.alumnoId))
    .filter((a) => (soloAlumno ? a.alumnoId === soloAlumno : a.activo))
    .map((alumno) => {
      const fin = fines.get(alumno.alumnoId) ?? null;
      const intensivo = esIntensivo(alumno.producto, alumno.planContratado, alumno.plan);
      const { modulos, cursosSinDrip } = modulosDelAlumno(contenido, alumno);
      const veredicto = calcularGarantia({
        inicio: alumno.fechaInicio,
        fin,
        intensivo,
        partes: (partesDe.get(alumno.alumnoId) ?? []).map(aParte),
        programadas: (programadasDe.get(alumno.alumnoId) ?? []).map(
          (c): ClaseProgramada => ({ fecha: c.fecha.slice(0, 10), hora: c.hora, profesor: c.teacherId ? profesores.get(c.teacherId) ?? null : null })
        ),
        modulos,
        cursosSinDrip,
        completadas: contenido.completadas.get(alumno.alumnoId) ?? new Map(),
        ahora,
      });
      return { alumno, fin, intensivo, veredicto };
    });
}

// ---------------------------------------------------------------
// LO GUARDADO
// ---------------------------------------------------------------

export type FilaEstado = {
  alumno_id: string;
  estado: Estado;
  motivo: string;
  fecha_perdida: string | null;
  evidencia: Evidencia | null;
  calculado_en: string;
  estado_calculado: Estado | null;
  motivo_calculado: string | null;
  corregido: boolean;
  corregido_por: string | null;
  corregido_en: string | null;
  nota_correccion: string | null;
};

export type FilaHistorial = {
  id: number;
  alumno_id: string;
  estado_anterior: Estado | null;
  estado: Estado;
  motivo: string;
  fecha_perdida: string | null;
  origen: "calculo" | "correccion" | "fin_correccion";
  autor: string | null;
  nota: string | null;
  creado_en: string;
  aviso_enviado_en: string | null;
};

const COLUMNAS_ESTADO =
  "alumno_id, estado, motivo, fecha_perdida, evidencia, calculado_en, estado_calculado, motivo_calculado, corregido, corregido_por, corregido_en, nota_correccion";

/** Lo guardado de todos, o null si la tabla no se puede leer (o aún no existe). */
export async function leerEstados(alumnoId?: string): Promise<Map<string, FilaEstado> | null> {
  const filas = await todo<FilaEstado>("garantia_estado", (d, h) => {
    const q = baseLms().from("garantia_estado").select(COLUMNAS_ESTADO);
    return (alumnoId ? q.eq("alumno_id", alumnoId) : q).order("alumno_id").range(d, h).returns<FilaEstado[]>();
  });
  return filas ? new Map(filas.map((f) => [f.alumno_id, f])) : null;
}

export async function leerHistorial(alumnoId: string): Promise<FilaHistorial[] | null> {
  const { data, error } = await baseLms()
    .from("garantia_historial")
    .select("id, alumno_id, estado_anterior, estado, motivo, fecha_perdida, origen, autor, nota, creado_en, aviso_enviado_en")
    .eq("alumno_id", alumnoId)
    .order("creado_en", { ascending: false })
    .limit(50)
    .returns<FilaHistorial[]>();
  if (error) {
    console.error("[garantia] No se pudo leer el historial:", error.message);
    return null;
  }
  return data ?? [];
}

export function comoGuardado(fila: FilaEstado | undefined): Guardado | null {
  if (!fila) return null;
  return {
    estado: fila.estado,
    motivo: fila.motivo,
    fechaPerdida: fila.fecha_perdida,
    evidencia: fila.evidencia,
    corregido: fila.corregido,
  };
}

// ---------------------------------------------------------------
// EL RECÁLCULO DIARIO
// ---------------------------------------------------------------

export type ResumenRecalculo = {
  alumnos: number;
  porEstado: Record<Estado, number>;
  cambios: { alumnoId: string; nombre: string; de: Estado | null; a: Estado }[];
  avisos: { enviados: number; fallidos: number };
  /** En seco no escribe ni manda nada. */
  seco: boolean;
};

/**
 * Recalcula y guarda. Por alumno: actualiza su fila (siempre: el motivo
 * y lo calculado cambian aunque el estado no), y si el estado cambia,
 * apunta el cambio en el historial. Después manda los avisos pendientes.
 *
 * Null si no se pudo calcular: entonces no se ha escrito nada.
 */
export async function recalcular(ahora: Date, opciones: { seco?: boolean; alumno?: string } = {}): Promise<ResumenRecalculo | null> {
  const [calculos, guardados] = await Promise.all([calcularTodos(ahora, opciones.alumno), leerEstados(opciones.alumno)]);
  if (!calculos || !guardados) return null;

  const porEstado: Record<Estado, number> = { en_curso: 0, perdida: 0, cumplida: 0, sin_datos: 0 };
  const cambios: ResumenRecalculo["cambios"] = [];
  const cliente = baseLms();
  const calculadoEn = ahora.toISOString();

  for (const { alumno, veredicto } of calculos) {
    const fila = guardados.get(alumno.alumnoId);
    const previo = comoGuardado(fila);
    const vigente = estadoVigente(previo, veredicto);
    porEstado[vigente.estado]++;
    if (vigente.cambia) cambios.push({ alumnoId: alumno.alumnoId, nombre: alumno.nombre, de: previo?.estado ?? null, a: vigente.estado });
    if (opciones.seco) continue;

    const { error } = await cliente.from("garantia_estado").upsert(
      {
        alumno_id: alumno.alumnoId,
        estado: vigente.estado,
        motivo: vigente.motivo,
        fecha_perdida: vigente.fechaPerdida,
        evidencia: vigente.evidencia,
        calculado_en: calculadoEn,
        estado_calculado: veredicto.estado,
        motivo_calculado: veredicto.motivo,
      },
      { onConflict: "alumno_id" }
    );
    if (error) {
      console.error(`[garantia] No se pudo guardar ${alumno.alumnoId}:`, error.message);
      continue;
    }

    if (vigente.cambia) await apuntarCambio(alumno.alumnoId, previo?.estado ?? null, vigente);
  }

  const avisos = opciones.seco ? { enviados: 0, fallidos: 0 } : await enviarAvisosPendientes();
  return { alumnos: calculos.length, porEstado, cambios, avisos, seco: opciones.seco === true };
}

async function apuntarCambio(alumnoId: string, anterior: Estado | null, vigente: Vigente): Promise<void> {
  const { error } = await baseLms().from("garantia_historial").insert({
    alumno_id: alumnoId,
    estado_anterior: anterior,
    estado: vigente.estado,
    motivo: vigente.motivo,
    fecha_perdida: vigente.fechaPerdida,
    evidencia: vigente.evidencia,
    origen: "calculo",
  });
  if (error) console.error(`[garantia] No se pudo apuntar el cambio de ${alumnoId}:`, error.message);
}

// ---------------------------------------------------------------
// EL AVISO AL EQUIPO
//
// Un correo por cada paso a «Perdida» del cálculo DESDE OTRO ESTADO. La
// primera vez que se guarda a un alumno (`estado_anterior` null) no se
// avisa: no es un cambio, es el punto de partida, y la primera pasada
// mandaría un correo por cada alumno que ya la tenía perdida.
//
// La fila del historial
// se RESERVA antes de enviar —`aviso_enviado_en` de null a ahora, solo
// si sigue en null— y se suelta si Resend falla: así dos ejecuciones a
// la vez no mandan dos correos, y un fallo se reintenta mañana.
// ---------------------------------------------------------------

type AvisoPendiente = { id: number; alumno_id: string; motivo: string; fecha_perdida: string | null };

function destinatarios(): string[] {
  return (process.env.EMAILS_ADMIN ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== "");
}

async function enviarAvisosPendientes(): Promise<{ enviados: number; fallidos: number }> {
  const resultado = { enviados: 0, fallidos: 0 };
  const cliente = baseLms();

  const { data, error } = await cliente
    .from("garantia_historial")
    .select("id, alumno_id, motivo, fecha_perdida")
    .eq("estado", "perdida")
    .eq("origen", "calculo")
    .not("estado_anterior", "is", null)
    .is("aviso_enviado_en", null)
    .order("creado_en", { ascending: true })
    .limit(100)
    .returns<AvisoPendiente[]>();
  if (error) {
    console.error("[garantia] No se pudieron leer los avisos pendientes:", error.message);
    return resultado;
  }
  if (!data || data.length === 0) return resultado;

  const para = destinatarios();
  const clave = process.env.RESEND_API_KEY;
  if (para.length === 0 || !clave) {
    console.error("[garantia] Falta EMAILS_ADMIN o RESEND_API_KEY: los avisos quedan pendientes.");
    return { enviados: 0, fallidos: data.length };
  }

  let base: string;
  try {
    base = urlPublica();
  } catch (e) {
    console.error(`[garantia] Sin URL pública no hay enlace que mandar. ${(e as Error).message}`);
    return { enviados: 0, fallidos: data.length };
  }

  const alumnos = await alumnosParaGarantia();
  const nombreDe = new Map((alumnos ?? []).map((a) => [a.alumnoId, a.nombre]));

  for (const aviso of data) {
    const { data: reservada } = await cliente
      .from("garantia_historial")
      .update({ aviso_enviado_en: new Date().toISOString() })
      .eq("id", aviso.id)
      .is("aviso_enviado_en", null)
      .select("id")
      .returns<{ id: number }[]>();
    if (!reservada || reservada.length === 0) continue;

    const nombre = nombreDe.get(aviso.alumno_id) || aviso.alumno_id;
    const enlace = `${base}/garantia?alumno=${encodeURIComponent(aviso.alumno_id)}`;

    let ok = false;
    try {
      const { error: fallo } = await new Resend(clave).emails.send({
        from: REMITENTE,
        to: para,
        subject: `Garantía perdida: ${nombre}`,
        text: [
          `${nombre} ha perdido la garantía de su plan.`,
          "",
          `Motivo: ${aviso.motivo}`,
          "",
          `Detalle: ${enlace}`,
        ].join("\n"),
        html: htmlAviso(nombre, aviso.motivo, enlace),
      });
      ok = !fallo;
      if (fallo) console.error(`[garantia] Resend rechazó el aviso ${aviso.id}: ${fallo.message}`);
    } catch (e) {
      console.error("[garantia] No se pudo hablar con Resend:", e);
    }

    if (ok) {
      resultado.enviados++;
    } else {
      resultado.fallidos++;
      await cliente.from("garantia_historial").update({ aviso_enviado_en: null }).eq("id", aviso.id);
    }
  }

  return resultado;
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlAviso(nombre: string, motivo: string, enlace: string): string {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0E2A19">
<p><strong>${escapar(nombre)}</strong> ha perdido la garantía de su plan.</p>
<p style="color:#5A655E">${escapar(motivo)}</p>
<p><a href="${escapar(enlace)}" style="color:#037A36;font-weight:bold">Ver el detalle</a></p>
</div>`;
}

// ---------------------------------------------------------------
// LA CORRECCIÓN A MANO
// ---------------------------------------------------------------

export const LARGO_MAXIMO_NOTA = 1000;

/**
 * Fija el estado de un alumno a mano. La nota es obligatoria y el autor
 * es quien tenga la sesión, nunca lo que diga el formulario.
 */
export async function corregir(alumnoId: string, estado: Estado, nota: string, autor: string): Promise<boolean> {
  const cliente = baseLms();
  const ahora = new Date().toISOString();
  const previo = (await leerEstados(alumnoId))?.get(alumnoId) ?? null;
  const motivo = `Corregido a mano: ${nota}`;

  const { error } = await cliente.from("garantia_estado").upsert(
    {
      alumno_id: alumnoId,
      estado,
      motivo,
      // La fecha de la pérdida, la que hubiera; la prueba guardada se
      // conserva para que se vea qué se corrigió.
      fecha_perdida: estado === "perdida" ? previo?.fecha_perdida ?? null : null,
      evidencia: previo?.evidencia ?? null,
      calculado_en: previo?.calculado_en ?? ahora,
      corregido: true,
      corregido_por: autor,
      corregido_en: ahora,
      nota_correccion: nota,
    },
    { onConflict: "alumno_id" }
  );
  if (error) {
    console.error(`[garantia] No se pudo corregir ${alumnoId}:`, error.message);
    return false;
  }

  const { error: errorHistorial } = await cliente.from("garantia_historial").insert({
    alumno_id: alumnoId,
    estado_anterior: previo?.estado ?? null,
    estado,
    motivo,
    fecha_perdida: estado === "perdida" ? previo?.fecha_perdida ?? null : null,
    origen: "correccion",
    autor,
    nota,
  });
  if (errorHistorial) console.error(`[garantia] No se pudo apuntar la corrección de ${alumnoId}:`, errorHistorial.message);
  return true;
}

/**
 * Devuelve al alumno al cálculo automático: deja de estar corregido y
 * toma el veredicto de hoy. También con nota: deshacer una corrección
 * es otra decisión.
 */
export async function quitarCorreccion(alumnoId: string, nota: string, autor: string): Promise<boolean> {
  const ahora = new Date();
  const [calculos, guardados] = await Promise.all([calcularTodos(ahora, alumnoId), leerEstados(alumnoId)]);
  const calculo = calculos?.[0];
  const previo = guardados?.get(alumnoId);
  if (!calculo || !previo) return false;

  const v = calculo.veredicto;
  const cliente = baseLms();
  const { error } = await cliente
    .from("garantia_estado")
    .update({
      estado: v.estado,
      motivo: v.motivo,
      fecha_perdida: v.fechaPerdida,
      evidencia: v.evidencia,
      calculado_en: ahora.toISOString(),
      estado_calculado: v.estado,
      motivo_calculado: v.motivo,
      corregido: false,
      corregido_por: null,
      corregido_en: null,
      nota_correccion: null,
    })
    .eq("alumno_id", alumnoId);
  if (error) {
    console.error(`[garantia] No se pudo quitar la corrección de ${alumnoId}:`, error.message);
    return false;
  }

  const { error: errorHistorial } = await cliente.from("garantia_historial").insert({
    alumno_id: alumnoId,
    estado_anterior: previo.estado,
    estado: v.estado,
    motivo: v.motivo,
    fecha_perdida: v.fechaPerdida,
    evidencia: v.evidencia,
    origen: "fin_correccion",
    autor,
    nota,
  });
  if (errorHistorial) console.error(`[garantia] No se pudo apuntar el fin de la corrección de ${alumnoId}:`, errorHistorial.message);
  return true;
}


// ---------------------------------------------------------------
// LA PANTALLA
//
// `/garantia` calcula en el momento —para que se vea lo de hoy aunque el
// cron no haya pasado— y le aplica lo guardado con la misma regla que el
// cron (`estadoVigente`): una pérdida guardada o una corrección mandan.
// La pantalla no escribe nada.
// ---------------------------------------------------------------

export type FilaGarantia = {
  alumnoId: string;
  nombre: string;
  profesor: string;
  /** El nombre del producto, o el plan si no hay producto. */
  plan: string;
  inicio: string | null;
  fin: string | null;
  intensivo: boolean;
  estado: Estado;
  motivo: string;
  fechaPerdida: string | null;
  corregido: boolean;
};

export type DetalleGarantia = {
  fila: FilaGarantia;
  veredicto: Veredicto;
  guardado: FilaEstado | null;
  /** La prueba guardada al perderla; puede no coincidir con lo de hoy. */
  evidencia: Evidencia | null;
  historial: FilaHistorial[] | null;
};

export type DatosGarantia = {
  /** Null si no se pudo calcular. */
  filas: FilaGarantia[] | null;
  /** False si `garantia_estado` no se puede leer (¿falta el SQL?). */
  conTabla: boolean;
  detalle: DetalleGarantia | null;
};

function aFila(c: CalculoAlumno, guardado: FilaEstado | undefined): { fila: FilaGarantia; vigente: Vigente } {
  const vigente = estadoVigente(comoGuardado(guardado), c.veredicto);
  return {
    vigente,
    fila: {
      alumnoId: c.alumno.alumnoId,
      nombre: c.alumno.nombre,
      profesor: c.alumno.profesor,
      plan: c.alumno.producto || c.alumno.planContratado || c.alumno.plan,
      inicio: c.alumno.fechaInicio,
      fin: c.fin,
      intensivo: c.intensivo,
      estado: vigente.estado,
      motivo: vigente.motivo,
      fechaPerdida: vigente.fechaPerdida,
      corregido: guardado?.corregido === true,
    },
  };
}

export async function cargarGarantia(elegido: string | null): Promise<DatosGarantia> {
  const ahora = new Date();
  const [calculos, estados] = await Promise.all([calcularTodos(ahora), leerEstados()]);
  const guardados = estados ?? new Map<string, FilaEstado>();

  const filas = calculos ? calculos.map((c) => aFila(c, guardados.get(c.alumno.alumnoId)).fila) : null;

  let detalle: DetalleGarantia | null = null;
  if (elegido) {
    // Quien no está en la lista (de baja, o pedido por id) se calcula aparte.
    const calculo = calculos?.find((c) => c.alumno.alumnoId === elegido) ?? (await calcularTodos(ahora, elegido))?.[0];
    if (calculo) {
      const guardado = guardados.get(elegido);
      const { fila, vigente } = aFila(calculo, guardado);
      detalle = {
        fila,
        veredicto: calculo.veredicto,
        guardado: guardado ?? null,
        evidencia: vigente.evidencia,
        historial: await leerHistorial(elegido),
      };
    }
  }

  return { filas, conTabla: estados !== null, detalle };
}
