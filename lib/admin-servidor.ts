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
import { origenDelNivel, nivelEsFiable, type OrigenNivel } from "@/lib/estimacion";
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
  /** Ocupación **o** objetivo: es lo que habilita contexto. */
  conContexto: boolean;
  /**
   * Ocupación **y** objetivo: la ficha de Gestión está entera.
   *
   * NO ES LO MISMO QUE `conContexto`, aunque hoy dé el mismo número.
   * Aquel pregunta «¿hay algo con lo que personalizar?» y por eso es un
   * O; este pregunta «¿está la ficha hecha?» y por eso es un Y. Hoy los
   * 94 que tienen una tienen la otra —y los 83 restantes no tienen
   * ninguna—, así que las dos cifras coinciden; el día que la IA de
   * Gestión escriba una sola de las dos, dejan de coincidir y cada
   * pregunta seguirá teniendo su respuesta.
   */
  fichaAlDia: boolean;
  /**
   * De dónde sale su nivel: profesor, ficha, prueba o la casilla del
   * alta. Misma regla que usa el resto de la aplicación.
   */
  origenNivel: OrigenNivel;
  /**
   * Su nivel lo ha MEDIDO alguien —el profesor, la ficha de IA o la
   * prueba— en vez de teclearlo quien le dio de alta.
   *
   * No mira `NIVEL_CONGELADO`: un alumno congelado tiene su medición
   * hecha, lo que pasa es que todavía no se le aplica. «Tener el nivel
   * medido» y «estar dando el curso de ese nivel» son dos preguntas, y
   * esta es la primera.
   */
  nivelMedido: boolean;
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
  /**
   * Tiene la ficha de Gestión entera: ocupación y objetivo.
   *
   * Es lo que separa una práctica escrita para esa persona de una
   * genérica, y va contra el total: aquí no hay denominador honesto que
   * valga —la ficha se le puede pedir a cualquiera—.
   */
  fichaAlDia: FichaPanel[];
  /**
   * Tiene un nivel MEDIDO, no tecleado en el alta.
   *
   * La distinción importa porque del nivel salen el curso que ve, los
   * ejercicios que recibe y su estimación, y la casilla del alta trae un
   * valor por defecto: de los que solo tienen esa casilla, más de la
   * mitad están en B1 porque nadie tocó el desplegable.
   */
  nivelMedido: FichaPanel[];
  /**
   * El desglose de `nivelMedido`: quién hizo la medición. Los tres
   * suman exactamente `nivelMedido.length`, y por eso está `porFicha`
   * aunque hoy sea cero: sin él, el día que la columna histórica de la
   * ficha de IA vuelva a rellenarse el desglose dejaría de cuadrar con
   * su propio total y nadie lo notaría.
   */
  nivelPorProfesor: number;
  nivelPorFicha: number;
  nivelPorPrueba: number;
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
  /** El complemento exacto de `adopcion.fichaAlDia`: a estos hay que pedírsela. */
  sinPerfil: FichaPanel[];
  /** El complemento exacto de `adopcion.nivelMedido`: nadie ha medido su nivel. */
  sinNivelMedido: FichaPanel[];
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

    // La misma regla que usa el alumno al entrar. Se llama a
    // `origenDelNivel` en vez de mirar si las columnas están rellenas
    // porque son texto libre: `nivel` dice cosas como "B1 Exámenes" o
    // "Inglés general", y una columna rellena sin MCER dentro no es un
    // nivel. Contarla lo sería inflaría la cifra con lo que menos
    // sabemos.
    const origen = origenDelNivel(
      alumno.nivelProfesor,
      alumno.nivelFicha,
      alumno.nivelPrueba,
      alumno.nivel
    );

    return {
      ...alumno,
      examen: detectarExamen(alumno.plan),
      conClase: clase !== undefined,
      conTranscript: clase?.conTranscript ?? false,
      conContexto: alumno.ocupacion !== null || alumno.objetivoPerfil !== null,
      fichaAlDia: alumno.ocupacion !== null && alumno.objetivoPerfil !== null,
      origenNivel: origen,
      nivelMedido: nivelEsFiable(origen),
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
    // Estas dos no dependen de ninguna lectura del LMS: salen de la
    // ficha de Gestión, que ya está en `fichas`. Por eso no pueden
    // quedarse a medias ni marcar el panel como incompleto.
    fichaAlDia: fichas.filter((f) => f.fichaAlDia),
    nivelMedido: fichas.filter((f) => f.nivelMedido),
    nivelPorProfesor: fichas.filter((f) => f.origenNivel === "profesor").length,
    nivelPorFicha: fichas.filter((f) => f.origenNivel === "ficha").length,
    nivelPorPrueba: fichas.filter((f) => f.origenNivel === "prueba").length,
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
    // COMPLEMENTO DE `fichaAlDia`, no negación de `conContexto`.
    //
    // Hoy las dos formas dan los mismos 83, pero solo esta se sostiene:
    // con la negación del O, un alumno con la ocupación puesta y el
    // objetivo vacío no saldría ni en «ficha al día» ni aquí, y se
    // quedaría en un hueco entre las dos cifras que nadie mira. El
    // complemento no deja huecos por construcción.
    sinPerfil: fichas.filter((f) => !f.fichaAlDia),
    sinNivelMedido: fichas.filter((f) => !f.nivelMedido),
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
  "fichaAlDia",
  "nivelMedido",
  "nuncaEntraron",
  "sinPerfil",
  "sinNivelMedido",
  "sinCompletar",
] as const;

export type Vista = (typeof VISTAS)[number];

/** La que trae puesta el panel al abrirse. */
export const VISTA_POR_DEFECTO: Vista = "entraron";

export function esVista(valor: unknown): valor is Vista {
  return typeof valor === "string" && (VISTAS as readonly string[]).includes(valor);
}

// ---------------------------------------------------------------
// EL ORDEN DE LAS LISTAS DE LO QUE FALTA
//
// La cuarta cosa que viaja en la URL, junto al periodo, la vista y el
// buscador, y por el mismo motivo que las otras tres: así el enlace que
// le pasas a alguien abre la lista ordenada como tú la estabas viendo,
// y el botón de atrás deshace el cambio de orden.
//
// SOLO APLICA A LAS LISTAS QUE LLEVAN COLUMNA DE ESPERA. En las demás
// no hay tiempo que ordenar y el parámetro se ignora: la lista sigue
// llegando por nombre, que es el orden con el que se busca a alguien.
// ---------------------------------------------------------------

export const ORDENES = ["antiguos", "nuevos"] as const;

export type Orden = (typeof ORDENES)[number];

/**
 * Los que llevan más esperando primero.
 *
 * Es el que trae puesto porque es el que responde a la pregunta con la
 * que se abre esa lista —a quién llamo hoy—: quien lleva veinticinco
 * meses sin ficha va antes que quien lleva doce días.
 */
export const ORDEN_POR_DEFECTO: Orden = "antiguos";

export function esOrden(valor: unknown): valor is Orden {
  return typeof valor === "string" && (ORDENES as readonly string[]).includes(valor);
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
  /**
   * El rótulo de la columna de espera, o null si esta lista no la lleva.
   *
   * Va SOLO en las listas de los que FALTAN, que es donde el tiempo
   * decide a quién llamas primero: un alumno de tres días sin ficha no
   * es un problema y uno de catorce meses sí. En las listas de los que
   * ya lo tienen no hay espera que contar.
   *
   * El texto cambia con la lista —«sin ficha», «sin medir»— porque una
   * columna que dijera «Espera» en las dos obligaría a mirar el título
   * de arriba para saber espera de qué.
   */
  etiquetaEspera: string | null;
  /**
   * Si la lista cambia con el periodo.
   *
   * Solo las tres del recorrido: entraron, generaron y al día se miden
   * dentro de la ventana elegida. Las pilas cuentan desde el principio
   * —«nunca» es siempre desde el principio, y la ficha o el nivel sin
   * medir son estados, no ventanas—. Lo lee la cabecera de móvil, que
   * dice al lado de la cuenta desde cuándo cuenta.
   */
  dePeriodo: boolean;
};

export function detalleDeVista(
  datos: DatosPanel,
  vista: Vista,
  /** Solo lo miran las listas con columna de espera; las demás lo ignoran. */
  orden: Orden = ORDEN_POR_DEFECTO
): DetalleVista {
  const { adopcion, atencion } = datos;

  /** Casi todas las vistas comparten estos tres. */
  const llana = { urge: false, conUltimaVez: false, etiquetaEspera: null, dePeriodo: false };

  /**
   * Copia ordenada por tiempo esperando, en el sentido que se pida.
   *
   * Las listas llegan por nombre, que es el orden con el que se BUSCA a
   * alguien. En las de lo que falta no se busca: se reparte trabajo, y
   * entonces el orden alfabético esconde justo lo que la columna de
   * tiempo acaba de sacar a la luz. Quien lleva veinticinco meses sin
   * ficha tiene que salir el primero, no por la letra de su apellido.
   *
   * LOS DOS SENTIDOS SIRVEN PARA COSAS DISTINTAS, y por eso la cabecera
   * de la columna los alterna en vez de fijar uno:
   *
   *   antiguos  a quién llamo hoy. El atasco viejo, el que lleva ahí
   *             tanto que ya nadie lo ve.
   *   nuevos    quién acaba de entrar sin completarlo. Ahí todavía se
   *             llega a tiempo, y es la lista con la que se evita que
   *             el atasco de arriba crezca.
   *
   * SIN FECHA O CON FECHA FUTURA VAN AL FINAL EN LOS DOS SENTIDOS, que
   * es la única asimetría a propósito. Por calendario, quien empieza la
   * semana que viene es el más nuevo de todos y encabezaría «nuevos»;
   * pero de él no se puede decir que lleve esperando nada, así que
   * abriría la lista accionable con las únicas filas sobre las que no
   * hay nada que hacer.
   *
   * Los empates —dos alumnos que empezaron el mismo día— se deshacen
   * solos por nombre: `sort` es estable y la lista ya venía alfabética.
   *
   * Copia, sin tocar el original: los arrays vienen del panel cacheado y
   * ordenar en el sitio se lo llevaría por delante para las demás
   * vistas.
   */
  const porEspera = (lista: FichaPanel[], orden: Orden): FichaPanel[] => {
    /** Cuándo empezó, o null si de ese no se puede contar espera. */
    const inicio = (f: FichaPanel): number | null => {
      const t = f.fechaInicio ? new Date(f.fechaInicio).getTime() : NaN;
      return Number.isFinite(t) && t <= Date.now() ? t : null;
    };

    return [...lista].sort((a, b) => {
      const ta = inicio(a);
      const tb = inicio(b);
      if (ta === null || tb === null) return ta === tb ? 0 : ta === null ? 1 : -1;
      return orden === "antiguos" ? ta - tb : tb - ta;
    });
  };

  switch (vista) {
    case "todos":
      return { titulo: "Todos los alumnos", alumnos: datos.alumnos, ...llana };
    case "entraron":
      return {
        titulo: "Entraron",
        alumnos: adopcion.entraron,
        ...llana,
        conUltimaVez: true,
        dePeriodo: true,
      };
    case "generaron":
      return { titulo: "Generaron práctica", alumnos: adopcion.generaron, ...llana, dePeriodo: true };
    case "alDia":
      return { titulo: "Al día con lo abierto", alumnos: adopcion.alDia, ...llana, dePeriodo: true };
    case "fichaAlDia":
      return { titulo: "Con la ficha al día", alumnos: adopcion.fichaAlDia, ...llana };
    case "nivelMedido":
      return { titulo: "Con el nivel medido", alumnos: adopcion.nivelMedido, ...llana };
    case "nuncaEntraron":
      return { titulo: "Nunca han entrado", alumnos: adopcion.nuncaEntraron, ...llana, urge: true };
    case "sinPerfil":
      return {
        titulo: "Sin perfil completado",
        alumnos: porEspera(atencion.sinPerfil, orden),
        ...llana,
        etiquetaEspera: "Sin ficha",
      };
    case "sinNivelMedido":
      return {
        titulo: "Sin el nivel medido",
        alumnos: porEspera(atencion.sinNivelMedido, orden),
        ...llana,
        etiquetaEspera: "Sin medir",
      };
    case "sinCompletar":
      return { titulo: "Generaron y no completaron", alumnos: atencion.generaronSinCompletar, ...llana };
  }
}
