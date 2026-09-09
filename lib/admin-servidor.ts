// ---------------------------------------------------------------
// LOS DATOS DEL PANEL DEL EQUIPO
//
// Responde a tres preguntas que hoy no se pueden contestar: si alguien
// usa la plataforma, qué modo de generación tira y de cuál, y a quién
// hay que ir a buscar.
//
// SOBRE LA AGREGACIÓN. Los totales puros salen de la base con
// `count=exact`, que no trae ni una fila. Lo que sí se trae son las
// COLUMNAS MÍNIMAS de los conjuntos que el panel deja abrir: el equipo
// quiere ver a los alumnos concretos detrás de cada número, así que esas
// identidades hacen falta igual y contarlas aparte sería una consulta de
// más. Nunca se trae una tabla entera ni una columna ancha.
//
// CUÁNDO SE QUEDA CORTO. `sesiones` crece sin techo, y con el periodo
// "todo" acabará trayendo demasiadas filas. El día que pase de unas
// decenas de miles, esto quiere una vista materializada con
// `count(distinct alumno_id)` por periodo; el resto del módulo no se
// entera porque solo cambia de dónde sale el conjunto.
//
// Se cachea cinco minutos: el panel se mira, no se vigila, y así varias
// recargas seguidas no repiten seis consultas.
// ---------------------------------------------------------------

import "server-only";
import { unstable_cache } from "next/cache";
import { baseLms } from "@/lib/supabase-lms";
import { alumnosDelPanel, clasesDelPanel, type AlumnoPanel } from "@/lib/gestion";
import { detectarExamen } from "@/lib/perfil";
import { calcularApertura } from "@/lib/drip";
import { comoFecha } from "@/lib/fechas";
import { cursosDelPlan } from "@/lib/cursos";
import { MODOS_HISTORICOS, type ModoHistorico } from "@/lib/modos";
import type { TipoExamen } from "@/lib/data";

export type { AlumnoPanel };

export const PERIODOS = ["7", "30", "todo"] as const;
export type Periodo = (typeof PERIODOS)[number];

export function esPeriodo(valor: unknown): valor is Periodo {
  return typeof valor === "string" && (PERIODOS as readonly string[]).includes(valor);
}

export const ETIQUETA_PERIODO: Record<Periodo, string> = {
  "7": "Últimos 7 días",
  "30": "Últimos 30 días",
  todo: "Desde el principio",
};

/** El corte del periodo en ISO, o null para "todo". */
function desdeDe(periodo: Periodo): string | null {
  if (periodo === "todo") return null;
  const dias = Number(periodo);
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}

// ---------------------------------------------------------------
// LO QUE DEVUELVE
// ---------------------------------------------------------------

/** Un alumno con lo que el panel necesita saber de él. */
export type FichaPanel = AlumnoPanel & {
  examen: TipoExamen | null;
  /** Tiene clase analizada CON contenido: es lo que habilita repaso. */
  conTranscript: boolean;
  /** Tiene fila de última clase, aunque venga vacía. */
  conClase: boolean;
  /** Ocupación u objetivo: es lo que habilita contexto. */
  conContexto: boolean;
};

export type Adopcion = {
  totalActivos: number;
  entraron: FichaPanel[];
  generaron: FichaPanel[];
  /**
   * Completó TODO lo que el drip le tiene abierto.
   *
   * Es la cifra principal, y no "avanzaron", porque con la apertura
   * progresiva contar lecciones sueltas engaña en las dos direcciones:
   * un alumno de tres días con dos módulos abiertos que los termina va
   * perfecto y sumaría poquísimo, y una subida general puede ser solo
   * que se ha desbloqueado más contenido, no más interés.
   *
   * Solo cuenta a quien tiene algo abierto: sin nada disponible no se
   * está al día, se está esperando.
   */
  alDia: FichaPanel[];
  /** Cuántos tienen contenido abierto: el denominador honesto de `alDia`. */
  conContenidoAbierto: number;
  /** Secundaria: completó alguna lección aquí, esté o no al día. */
  avanzaron: FichaPanel[];
  nuncaEntraron: FichaPanel[];
  /**
   * La última vez que entró cada uno, por id. Solo la traen los que han
   * entrado; el resto no está en el mapa.
   */
  ultimaSesion: Record<string, string>;
};

export type UsoDeModo = {
  modo: ModoHistorico;
  bloques: number;
  /** Quién lo usó y cuánto, del que más al que menos. */
  usuarios: { alumno: FichaPanel; bloques: number }[];
  /** Cuántos alumnos PODRÍAN usarlo. Sin esto el porcentaje no dice nada. */
  elegibles: number;
  /** Ya no se genera: es histórico y solo sale si tiene bloques detrás. */
  retirado: boolean;
};

export type Atencion = {
  sinTranscript: FichaPanel[];
  sinPerfil: FichaPanel[];
  nuncaEntraron: FichaPanel[];
  generaronSinCompletar: FichaPanel[];
};

export type DatosPanel = {
  periodo: Periodo;
  /**
   * Todos los alumnos con ficha.
   *
   * El panel ya los lee para calcular las métricas, así que servir la
   * vista «todos» desde aquí no cuesta una consulta: la ahorra. Antes
   * la página pedía además `listarAlumnos` a Gestión para su propio
   * buscador, y eran los mismos.
   */
  alumnos: FichaPanel[];
  /** Cuándo se calculó. El panel está cacheado y conviene decirlo. */
  calculadoEn: string;
  adopcion: Adopcion;
  modos: UsoDeModo[];
  atencion: Atencion;
  /** Si alguna lectura falló: el panel lo dice en vez de enseñar ceros. */
  incompleto: boolean;
};

// ---------------------------------------------------------------
// LECTURAS DEL LMS
// ---------------------------------------------------------------

type FilaAlumno = { alumno_id: string };
type FilaBloque = { alumno_id: string; modo: string };
type FilaSesion = { alumno_id: string | null; creada_en: string };
type FilaModuloPanel = { id: string; curso_id: string; visible_after: number };
type FilaLeccionPanel = { id: string; modulo_id: string };
type FilaProgresoPanel = { alumno_id: string; leccion_id: string };
type FilaCursoPanel = { id: string; slug: string; titulo: string; nivel: string; tipo: string; examen: string | null };

/**
 * Los alumnos distintos que tienen fila en una tabla dentro del periodo.
 *
 * Se pide solo `alumno_id` —una columna de texto— y se reduce a conjunto
 * aquí. Es el precio de poder abrir cada número y ver quién hay detrás.
 */
async function alumnosCon(
  tabla: "sesiones" | "bloques_generados" | "progreso_lecciones" | "progreso_bloques",
  columnaFecha: string,
  desde: string | null,
  /** Un `eq` opcional, como `["origen", "lms"]`. */
  igual?: readonly [string, string | boolean]
): Promise<Set<string> | null> {
  let consulta = baseLms().from(tabla).select("alumno_id");
  if (igual) consulta = consulta.eq(igual[0], igual[1]);
  if (desde) consulta = consulta.gte(columnaFecha, desde);

  const { data, error } = await consulta.returns<FilaAlumno[]>();

  if (error) {
    console.error(`[panel] No se pudo leer ${tabla}:`, error.message);
    return null;
  }

  const salida = new Set<string>();
  for (const fila of data ?? []) if (fila.alumno_id) salida.add(fila.alumno_id);
  return salida;
}

/**
 * Los bloques generados en el periodo, con su modo.
 *
 * Sin los del equipo: los que se generan revisando una ficha son
 * nuestros, no del alumno, y contarlos aquí inflaría el uso por modo con
 * el trabajo de mirar el producto.
 */
async function bloquesDelPeriodo(desde: string | null): Promise<FilaBloque[] | null> {
  let consulta = baseLms()
    .from("bloques_generados")
    .select("alumno_id, modo")
    .eq("generado_por_equipo", false);
  if (desde) consulta = consulta.gte("generado_en", desde);

  const { data, error } = await consulta.returns<FilaBloque[]>();

  if (error) {
    console.error("[panel] No se pudo leer bloques_generados:", error.message);
    return null;
  }
  return data ?? [];
}

/**
 * Sesiones del periodo con su fecha.
 *
 * Antes se pedía el ORIGEN —enlace mágico o WooCommerce— para partir la
 * cifra de acceso en dos. Esa partición se fue del panel: al equipo no
 * le cambia nada por dónde entró alguien. En su sitio va la FECHA, que
 * sí decide algo: quién entró una vez hace dos meses y no ha vuelto.
 */
async function sesionesDelPeriodo(desde: string | null): Promise<FilaSesion[] | null> {
  let consulta = baseLms().from("sesiones").select("alumno_id, creada_en").eq("rol", "alumno");
  if (desde) consulta = consulta.gte("creada_en", desde);

  const { data, error } = await consulta.returns<FilaSesion[]>();
  if (error) {
    console.error("[panel] No se pudieron leer las sesiones:", error.message);
    return null;
  }
  return data ?? [];
}

/**
 * Quién ha completado todo lo que tiene abierto.
 *
 * Es la lectura más pesada del panel —tres tablas del curso más el
 * progreso— y por eso va detrás del caché de cinco minutos. Se trae solo
 * lo imprescindible: ids y `visible_after`, ningún título ni contenido.
 *
 * Cuando `progreso_lecciones` pase de unas decenas de miles de filas,
 * esto quiere una vista que devuelva ya el par (alumno, al día).
 */
async function calcularAlDia(
  fichas: FichaPanel[]
): Promise<{ alDia: Set<string>; conAbierto: Set<string> } | null> {
  const cliente = baseLms();

  const [cursos, modulos, lecciones, progreso] = await Promise.all([
    cliente
      .from("cursos")
      .select("id, slug, titulo, nivel, tipo, examen")
      .eq("activo", true)
      .returns<FilaCursoPanel[]>(),
    cliente.from("modulos").select("id, curso_id, visible_after").returns<FilaModuloPanel[]>(),
    cliente.from("lecciones").select("id, modulo_id").returns<FilaLeccionPanel[]>(),
    cliente
      .from("progreso_lecciones")
      .select("alumno_id, leccion_id")
      .returns<FilaProgresoPanel[]>(),
  ]);

  if (cursos.error || modulos.error || lecciones.error || progreso.error) {
    console.error("[panel] No se pudo calcular quién está al día.");
    return null;
  }

  // Lecciones agrupadas por módulo, y módulos por curso.
  const leccionesDe = new Map<string, string[]>();
  for (const l of lecciones.data ?? []) {
    const lista = leccionesDe.get(l.modulo_id);
    if (lista) lista.push(l.id);
    else leccionesDe.set(l.modulo_id, [l.id]);
  }

  const modulosDe = new Map<string, FilaModuloPanel[]>();
  for (const m of modulos.data ?? []) {
    const lista = modulosDe.get(m.curso_id);
    if (lista) lista.push(m);
    else modulosDe.set(m.curso_id, [m]);
  }

  const hechasDe = new Map<string, Set<string>>();
  for (const p of progreso.data ?? []) {
    let set = hechasDe.get(p.alumno_id);
    if (!set) hechasDe.set(p.alumno_id, (set = new Set()));
    set.add(p.leccion_id);
  }

  const ahora = new Date();
  const disponibles = cursos.data ?? [];
  const alDia = new Set<string>();
  const conAbierto = new Set<string>();

  for (const ficha of fichas) {
    const inicio = comoFecha(ficha.fechaInicio);
    const hechas = hechasDe.get(ficha.alumnoId) ?? new Set<string>();

    // Sus cursos, con las mismas reglas que usa el alumno al entrar.
    const suyos = cursosDelPlan(ficha.plan, ficha.nivel, disponibles);

    let abiertas = 0;
    let pendientes = 0;

    for (const curso of suyos) {
      for (const modulo of modulosDe.get(curso.id) ?? []) {
        if (!calcularApertura(modulo.visible_after ?? 0, inicio, ahora).abierto) continue;
        for (const leccionId of leccionesDe.get(modulo.id) ?? []) {
          abiertas++;
          if (!hechas.has(leccionId)) pendientes++;
        }
      }
    }

    // Sin nada abierto no se está al día: se está esperando. Contarlo
    // como al día inflaría la cifra justo con quien menos ha hecho.
    if (abiertas === 0) continue;
    conAbierto.add(ficha.alumnoId);
    if (pendientes === 0) alDia.add(ficha.alumnoId);
  }

  return { alDia, conAbierto };
}

// ---------------------------------------------------------------
// EL CÁLCULO
// ---------------------------------------------------------------

async function calcular(periodo: Periodo): Promise<DatosPanel> {
  const desde = desdeDe(periodo);

  const [alumnos, clases, sesiones, bloques, avanzaron, completaron, generaronNunca, filasSesion] =
    await Promise.all([
      alumnosDelPanel(),
      clasesDelPanel(),
      // Solo sesiones de alumno: las del equipo ensuciarían la adopción.
      alumnosCon("sesiones", "creada_en", desde, ["rol", "alumno"]),
      bloquesDelPeriodo(desde),
      // `learndash_migrado` es historial importado, no uso: se excluye.
      alumnosCon("progreso_lecciones", "completada_en", desde, ["origen", "lms"]),
      // Sin periodo: "nunca ha completado" es un estado, no una ventana.
      alumnosCon("progreso_bloques", "completado_en", null),
      // Sin los del equipo, por lo mismo que en `bloquesDelPeriodo`: un
      // alumno al que le generamos un bloque para revisar no ha generado
      // nada, y aparecería como que sí.
      alumnosCon("bloques_generados", "generado_en", null, ["generado_por_equipo", false]),
      sesionesDelPeriodo(desde),
    ]);

  // TODAS LAS LECTURAS CUENTAN AQUÍ, sin excepciones. La lección viene
  // de una que se quedó fuera: con su tabla sin crear, la lectura
  // fallaba, el bloque que dependía de ella enseñaba ceros y el panel no
  // avisaba de nada. Un cero y un "no lo sé" se leen igual en pantalla y
  // no significan lo mismo.
  const incompleto =
    sesiones === null ||
    bloques === null ||
    avanzaron === null ||
    completaron === null ||
    generaronNunca === null ||
    filasSesion === null ||
    alumnos.length === 0;

  // Las fichas: el perfil de Gestión más lo que decide elegibilidad.
  const claseDe = new Map(clases.map((c) => [c.alumnoId, c]));

  const fichas: FichaPanel[] = alumnos.map((alumno) => {
    const clase = claseDe.get(alumno.alumnoId);
    return {
      ...alumno,
      examen: detectarExamen(alumno.plan),
      conClase: clase !== undefined,
      conTranscript: clase?.conTranscript ?? false,
      conContexto: alumno.ocupacion !== null || alumno.objetivoPerfil !== null,
    };
  });

  const puntual = await calcularAlDia(fichas);

  const porId = new Map(fichas.map((f) => [f.alumnoId, f]));
  const de = (ids: Set<string> | null): FichaPanel[] =>
    ids === null ? [] : fichas.filter((f) => ids.has(f.alumnoId));

  // --- Bloque 1: adopción ---
  const idsSesion = sesiones ?? new Set<string>();
  const generaronEnPeriodo = new Set((bloques ?? []).map((b) => b.alumno_id));

  // --- La última vez que entró cada uno ---
  // Se queda la más reciente de sus sesiones. La tabla trae una fila por
  // sesión, así que sin este paso un alumno que entra a diario saldría
  // tantas veces como días.
  const ultimaSesion: Record<string, string> = {};
  for (const fila of filasSesion ?? []) {
    if (!fila.alumno_id) continue;
    const previa = ultimaSesion[fila.alumno_id];
    if (previa === undefined || fila.creada_en > previa) ultimaSesion[fila.alumno_id] = fila.creada_en;
  }

  const adopcion: Adopcion = {
    totalActivos: fichas.length,
    entraron: de(sesiones),
    generaron: de(generaronEnPeriodo),
    alDia: puntual === null ? [] : fichas.filter((f) => puntual.alDia.has(f.alumnoId)),
    conContenidoAbierto: puntual === null ? 0 : puntual.conAbierto.size,
    avanzaron: de(avanzaron),
    // "Nunca" es siempre desde el principio, aunque el periodo sea de 7
    // días: un alumno que entró hace un mes no es alguien a quien
    // invitar, y mezclarlos convertiría la lista en ruido.
    nuncaEntraron: sesiones === null ? [] : fichas.filter((f) => !idsSesion.has(f.alumnoId)),
    ultimaSesion,
  };

  // ---------------------------------------------------------------
  // Bloque 2: uso por modo
  //
  // Los tres modos antiguos SIGUEN AQUÍ aunque ya no se generen. Esta
  // sección es el histórico de generación, y borrar de golpe las columnas
  // de repaso, examen y contexto haría desaparecer del panel todos los
  // bloques anteriores al cambio, que es precisamente contra lo que se
  // mira un panel.
  //
  // Lo que se hace es no enseñar los vacíos: un modo retirado sin un solo
  // bloque en el periodo no aporta nada y se cae solo cuando el periodo
  // elegido queda por completo después del cambio. `practica` no se cae
  // nunca, aunque marque cero: ahí el cero es el dato.
  //
  // El de hoy es elegible para cualquiera que tenga ALGUNA fuente, que es
  // la misma condición con la que se le ofrece la tarjeta.
  // ---------------------------------------------------------------
  const elegiblePara: Record<ModoHistorico, (f: FichaPanel) => boolean> = {
    repaso: (f) => f.conTranscript,
    examen: (f) => f.examen !== null,
    contexto: (f) => f.conContexto,
    practica: (f) => f.conTranscript || f.examen !== null || f.conContexto,
  };

  const modos: UsoDeModo[] = MODOS_HISTORICOS.map((modo) => {
    const suyos = (bloques ?? []).filter((b) => b.modo === modo);

    const cuenta = new Map<string, number>();
    for (const b of suyos) cuenta.set(b.alumno_id, (cuenta.get(b.alumno_id) ?? 0) + 1);

    const usuarios = Array.from(cuenta.entries())
      .map(([alumnoId, n]) => ({ alumno: porId.get(alumnoId), bloques: n }))
      .filter((u): u is { alumno: FichaPanel; bloques: number } => u.alumno !== undefined)
      .sort((a, b) => b.bloques - a.bloques);

    return {
      modo,
      bloques: suyos.length,
      usuarios,
      elegibles: fichas.filter(elegiblePara[modo]).length,
      retirado: modo !== "practica",
    };
  }).filter((m) => m.modo === "practica" || m.bloques > 0);

  // --- Bloque 5: requieren atención ---
  const idsCompletaron = completaron ?? new Set<string>();
  const idsGeneraron = generaronNunca ?? new Set<string>();

  const atencion: Atencion = {
    // Sin fila de clase o con la fila vacía: en los dos casos el modo
    // repaso no tiene de dónde tirar, que es lo que importa aquí.
    sinTranscript: fichas.filter((f) => !f.conTranscript),
    sinPerfil: fichas.filter((f) => !f.conContexto),
    nuncaEntraron: adopcion.nuncaEntraron,
    generaronSinCompletar:
      completaron === null || generaronNunca === null
        ? []
        : fichas.filter((f) => idsGeneraron.has(f.alumnoId) && !idsCompletaron.has(f.alumnoId)),
  };



  return {
    periodo,
    calculadoEn: new Date().toISOString(),
    alumnos: fichas,
    adopcion,
    modos,
    atencion,
    incompleto,
  };
}

/**
 * Los datos del panel, cacheados cinco minutos.
 *
 * La clave lleva el periodo: los tres se cachean por separado y cambiar
 * de pestaña no invalida el anterior.
 */
export function cargarPanel(periodo: Periodo): Promise<DatosPanel> {
  return unstable_cache(() => calcular(periodo), ["panel-admin", periodo], {
    revalidate: 300,
    tags: ["panel-admin"],
  })();
}

// ---------------------------------------------------------------
// LAS VISTAS: DE UNA MÉTRICA A SUS ALUMNOS
//
// Cada métrica del panel es un filtro de la única lista que hay debajo,
// y esta tabla es la traducción entre las dos. Vive aquí y no en el
// componente porque la vista viaja en la URL —`?ver=`— y quien la lee
// es la página, que es de servidor.
//
// POR QUÉ EN LA URL Y NO EN ESTADO DE CLIENTE. Porque el periodo y el
// buscador ya viajan ahí, así que las tres cosas que definen lo que
// estás mirando se guardan igual: el enlace que le pasas a alguien
// abre lo que tú estabas viendo, y el botón de atrás deshace el filtro.
// Con estado de cliente ninguna de las dos cosas es verdad.
// ---------------------------------------------------------------

export const VISTAS = [
  "todos",
  "entraron",
  "generaron",
  "alDia",
  "nuncaEntraron",
  "sinPerfil",
  "sinCompletar",
] as const;

export type Vista = (typeof VISTAS)[number];

/** La que trae puesta el panel al abrirse. */
export const VISTA_POR_DEFECTO: Vista = "entraron";

export function esVista(valor: unknown): valor is Vista {
  return typeof valor === "string" && (VISTAS as readonly string[]).includes(valor);
}

export type DetalleVista = {
  titulo: string;
  alumnos: FichaPanel[];
  /** Ámbar en las que son trabajo pendiente; verde en las demás. */
  urge: boolean;
  /**
   * Si la fila enseña la última vez que entró.
   *
   * Solo en `entraron`, y no por ahorro: en las demás o no han entrado
   * —y la columna saldría vacía— o el dato no decide nada. Aquí sí:
   * separa a quien entró ayer de quien entró una vez hace dos meses.
   */
  conUltimaVez: boolean;
};

export function detalleDeVista(datos: DatosPanel, vista: Vista): DetalleVista {
  const { adopcion, atencion } = datos;

  switch (vista) {
    case "todos":
      return { titulo: "Todos los alumnos", alumnos: datos.alumnos, urge: false, conUltimaVez: false };
    case "entraron":
      return { titulo: "Entraron", alumnos: adopcion.entraron, urge: false, conUltimaVez: true };
    case "generaron":
      return { titulo: "Generaron práctica", alumnos: adopcion.generaron, urge: false, conUltimaVez: false };
    case "alDia":
      return { titulo: "Al día con lo abierto", alumnos: adopcion.alDia, urge: false, conUltimaVez: false };
    case "nuncaEntraron":
      return { titulo: "Nunca han entrado", alumnos: adopcion.nuncaEntraron, urge: true, conUltimaVez: false };
    case "sinPerfil":
      return { titulo: "Sin perfil completado", alumnos: atencion.sinPerfil, urge: false, conUltimaVez: false };
    case "sinCompletar":
      return {
        titulo: "Generaron y no completaron",
        alumnos: atencion.generaronSinCompletar,
        urge: false,
        conUltimaVez: false,
      };
  }
}
