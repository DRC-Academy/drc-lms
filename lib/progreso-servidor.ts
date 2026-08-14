// ---------------------------------------------------------------
// PROGRESO Y BLOQUES, CONTRA LA BASE PROPIA DEL LMS
//
// Sustituye a los tres almacenes de localStorage que había en
// `lib/progreso.ts`. Todo pasa por `baseLms()`, nunca por el cliente de
// Gestión: aquí se escribe, y en Gestión no se escribe nunca.
//
// Sobre los identificadores de bloque: la columna se llama
// `bloque_clave` y guarda el `Bloque.id` del JSON. Vale tanto para los
// bloques del catálogo de `lib/data.ts` como para los generados, que es
// justo por lo que no hay clave ajena (ver supabase/lms-esquema.sql).
//
// Ninguna función de aquí lanza: una lectura que falla devuelve vacío y
// una escritura que falla devuelve false. El progreso es importante,
// pero no lo bastante como para dejar a un alumno sin ficha si la base
// tiene un mal minuto. Lo que sí hace siempre es dejarlo en el log.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { validarBloque } from "@/lib/validarBloque";
import type { Bloque } from "@/lib/data";
import type { ModoGeneracion } from "@/lib/modos";
import type { ProgresoLocal, RegistroAvance, RegistroProgreso } from "@/lib/progreso";

export type { ProgresoLocal };

/** De dónde salió un bloque generado. Lo fija `app/api/generar-bloque`. */
export type OrigenBloque = "ia" | "banco";

// ---------------------------------------------------------------
// TIPADO DE LAS FILAS
//
// El cliente se crea sin los tipos generados del esquema, así que
// `data` llegaría sin forma. Se ancla con `.returns<T>()`, que es el
// mismo recurso que usa `lib/gestion.ts` contra las vistas de Gestión.
// ---------------------------------------------------------------

type FilaProgreso = {
  bloque_clave: string;
  aciertos: number;
  total: number;
  completado_en: string;
};

type FilaAvance = {
  bloque_clave: string;
  indice: number;
  total: number;
  actualizado_en: string;
};

type FilaBloque = {
  bloque_clave: string;
  contenido: unknown;
  generado_en: string;
};

function registrar(donde: string, error: { message: string } | null): boolean {
  if (!error) return true;
  console.error(`[progreso] ${donde}:`, error.message);
  return false;
}

// ---------------------------------------------------------------
// LECTURAS
// ---------------------------------------------------------------

/**
 * El mejor intento de cada bloque que el alumno ha terminado.
 *
 * `progreso_bloques` es append-only —cada intento es una fila— así que
 * aquí se reduce a uno por bloque. Se compara por porcentaje y no por
 * aciertos en bruto: si un bloque cambiara de número de ejercicios, 4
 * de 5 tiene que ganarle a 4 de 10.
 *
 * La reducción se hace en TypeScript y no en SQL porque PostgREST no
 * expone `distinct on`. Traer los intentos de un alumno es barato: son
 * decenas de filas, no miles. Si algún día deja de serlo, la salida es
 * una función en la base y una llamada `rpc`.
 */
export async function leerProgresoAlumno(
  alumnoId: string
): Promise<Record<string, RegistroProgreso>> {
  const { data, error } = await baseLms()
    .from("progreso_bloques")
    .select("bloque_clave, aciertos, total, completado_en")
    .eq("alumno_id", alumnoId)
    .returns<FilaProgreso[]>();

  if (!registrar("No se pudo leer progreso_bloques", error)) return {};

  const mejor: Record<string, RegistroProgreso> = {};

  for (const fila of data ?? []) {
    if (fila.total <= 0) continue;

    const actual = mejor[fila.bloque_clave];
    const candidato = fila.aciertos / fila.total;

    if (actual && actual.aciertos / actual.total >= candidato) continue;

    mejor[fila.bloque_clave] = {
      aciertos: fila.aciertos,
      total: fila.total,
      fecha: fila.completado_en,
    };
  }

  return mejor;
}

/** Por dónde va cada bloque empezado y sin terminar. */
export async function leerAvanceAlumno(
  alumnoId: string
): Promise<Record<string, RegistroAvance>> {
  const { data, error } = await baseLms()
    .from("avance_bloques")
    .select("bloque_clave, indice, total, actualizado_en")
    .eq("alumno_id", alumnoId)
    .returns<FilaAvance[]>();

  if (!registrar("No se pudo leer avance_bloques", error)) return {};

  const salida: Record<string, RegistroAvance> = {};
  for (const fila of data ?? []) {
    salida[fila.bloque_clave] = {
      indice: fila.indice,
      total: fila.total,
      fecha: fila.actualizado_en,
    };
  }
  return salida;
}

/**
 * Bloques generados para este alumno, del más reciente al más antiguo.
 *
 * Se validan al leerlos, igual que se hacía al sacarlos de localStorage:
 * lo guardado pudo escribirse con otra versión del validador y un bloque
 * con la forma cambiada rompería la práctica a mitad.
 *
 * Por defecto se dejan fuera los que generó el equipo revisando: el
 * alumno no pidió esos ejercicios y encontrárselos en su práctica sería
 * material que no le toca. Se piden con `incluirEquipo` desde la ficha
 * cuando quien mira es el equipo, que sí necesita verlos para abrirlos.
 */
export async function leerBloquesGenerados(
  alumnoId: string,
  incluirEquipo = false
): Promise<Bloque[]> {
  let consulta = baseLms()
    .from("bloques_generados")
    .select("bloque_clave, contenido, generado_en")
    .eq("alumno_id", alumnoId);

  if (!incluirEquipo) consulta = consulta.eq("generado_por_equipo", false);

  const { data, error } = await consulta
    .order("generado_en", { ascending: false })
    .limit(20)
    .returns<FilaBloque[]>();

  if (!registrar("No se pudo leer bloques_generados", error)) return [];

  const salida: Bloque[] = [];
  for (const fila of data ?? []) {
    const bloque = validarBloque(fila.contenido);
    if (bloque) salida.push(bloque);
  }
  return salida;
}

/**
 * Cuándo generó por última vez un bloque de cada modo.
 *
 * Es lo que necesitan las reglas de `lib/limites.ts`: no hace falta
 * contar cuántos lleva, solo cuándo fue el último de cada clase. Los
 * modos sin ningún bloque salen como null, que es lo que las reglas
 * leen como "primera vez, adelante".
 *
 * Cuenta los dos orígenes, `ia` y `banco`: si la generación falló y se
 * sirvió un bloque del banco, el alumno tiene cinco minutos de práctica
 * delante igual. Descontarlo solo cuando la IA acierta sería cargarle
 * nuestra tasa de fallo como si fuera suya.
 *
 * Lo que generó el equipo NO cuenta, y esto no es un detalle: sin el
 * filtro, alguien del equipo revisando una ficha le gastaría al alumno
 * el repaso del día sin que ninguno de los dos se enterara.
 *
 * Va sobre `idx_bloques_generados_alumno (alumno_id, generado_en desc)`,
 * que ya estaba creado justo para esto.
 */
export async function leerUltimaGeneracionPorModo(
  alumnoId: string
): Promise<Record<ModoGeneracion, string | null>> {
  const salida: Record<ModoGeneracion, string | null> = {
    repaso: null,
    examen: null,
    contexto: null,
  };

  const { data, error } = await baseLms()
    .from("bloques_generados")
    .select("modo, generado_en")
    .eq("alumno_id", alumnoId)
    .eq("generado_por_equipo", false)
    .order("generado_en", { ascending: false })
    .returns<{ modo: string; generado_en: string }[]>();

  if (!registrar("No se pudo leer la última generación por modo", error)) return salida;

  // Vienen del más reciente al más antiguo, así que el primero de cada
  // modo es el bueno y los siguientes se ignoran.
  for (const fila of data ?? []) {
    if (fila.modo in salida && salida[fila.modo as ModoGeneracion] === null) {
      salida[fila.modo as ModoGeneracion] = fila.generado_en;
    }
  }

  return salida;
}

/**
 * Un bloque generado concreto. Filtra por alumno además de por clave:
 * la clave es única, pero sin el `eq` de alumno bastaría con adivinarla
 * para leer el bloque de otro.
 *
 * `incluirEquipo` mantiene la simetría con la lista: lo que el alumno no
 * ve entre sus bloques tampoco se le abre escribiendo la dirección.
 */
export async function buscarBloqueGenerado(
  alumnoId: string,
  bloqueClave: string,
  incluirEquipo = false
): Promise<Bloque | null> {
  let consulta = baseLms()
    .from("bloques_generados")
    .select("bloque_clave, contenido, generado_en")
    .eq("alumno_id", alumnoId)
    .eq("bloque_clave", bloqueClave);

  if (!incluirEquipo) consulta = consulta.eq("generado_por_equipo", false);

  const { data, error } = await consulta.limit(1).returns<FilaBloque[]>();

  if (!registrar("No se pudo buscar el bloque generado", error)) return null;

  const fila = (data ?? [])[0];
  return fila ? validarBloque(fila.contenido) : null;
}

// ---------------------------------------------------------------
// ESCRITURAS
// ---------------------------------------------------------------

/** Un intento terminado. Nunca pisa el anterior: cada uno es una fila. */
export async function guardarProgreso(
  alumnoId: string,
  bloqueClave: string,
  aciertos: number,
  total: number
): Promise<boolean> {
  // El CHECK de la tabla rechazaría un recuento imposible con un error
  // de base. Se filtra aquí para que un fallo de la interfaz no acabe
  // pareciendo un problema de conexión en el log.
  if (total <= 0 || aciertos < 0 || aciertos > total) {
    console.error(`[progreso] Recuento incoherente (${aciertos}/${total}); no se guarda.`);
    return false;
  }

  const { error } = await baseLms()
    .from("progreso_bloques")
    .insert({ alumno_id: alumnoId, bloque_clave: bloqueClave, aciertos, total });

  return registrar("No se pudo guardar el intento", error);
}

/**
 * Por qué ejercicio va un bloque empezado. A diferencia del progreso,
 * esto sí se sobrescribe: solo interesa la posición actual.
 */
export async function guardarAvance(
  alumnoId: string,
  bloqueClave: string,
  indice: number,
  total: number
): Promise<boolean> {
  if (total <= 0 || indice < 0 || indice >= total) {
    console.error(`[progreso] Avance incoherente (${indice}/${total}); no se guarda.`);
    return false;
  }

  const { error } = await baseLms()
    .from("avance_bloques")
    .upsert(
      {
        alumno_id: alumnoId,
        bloque_clave: bloqueClave,
        indice,
        total,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "alumno_id,bloque_clave" }
    );

  return registrar("No se pudo guardar el avance", error);
}

/** Al terminar el bloque, la posición parcial deja de tener sentido. */
export async function borrarAvance(alumnoId: string, bloqueClave: string): Promise<boolean> {
  const { error } = await baseLms()
    .from("avance_bloques")
    .delete()
    .eq("alumno_id", alumnoId)
    .eq("bloque_clave", bloqueClave);

  return registrar("No se pudo borrar el avance", error);
}

/**
 * Guarda un bloque recién generado.
 *
 * `bloque_clave` es único en la tabla, así que un reintento con el mismo
 * id no duplica: se ignora el conflicto. La generación produce un
 * sufijo aleatorio por bloque, de modo que esto solo salta si la misma
 * respuesta se guarda dos veces.
 *
 * `porEquipo` marca los que se generan revisando desde el panel. Se
 * guardan igual —hay que poder abrirlos— pero quedan fuera de la
 * práctica del alumno y de las cuentas que se hacen sobre ella.
 */
export async function guardarBloqueGenerado(
  alumnoId: string,
  bloque: Bloque,
  modo: ModoGeneracion,
  origen: OrigenBloque,
  revision: unknown = null,
  porEquipo = false
): Promise<boolean> {
  const { error } = await baseLms()
    .from("bloques_generados")
    .upsert(
      {
        bloque_clave: bloque.id,
        alumno_id: alumnoId,
        modo,
        nivel: bloque.nivel,
        contenido: bloque,
        revision,
        origen,
        generado_por_equipo: porEquipo,
      },
      { onConflict: "bloque_clave", ignoreDuplicates: true }
    );

  return registrar("No se pudo guardar el bloque generado", error);
}

/**
 * El texto libre de la fase de producir.
 *
 * Hasta ahora se escribía, se comparaba con el modelo y se perdía. Es la
 * materia prima del bucle de vuelta al profesor.
 */
export async function guardarRespuestaProduccion(
  alumnoId: string,
  bloqueClave: string,
  ejercicioId: string,
  texto: string
): Promise<boolean> {
  const limpio = texto.trim();
  // El CHECK de la tabla acota a 20.000. Se recorta antes de enviarlo
  // para no convertir un pegado largo en un error de base.
  if (limpio === "") return false;

  const { error } = await baseLms().from("respuestas_produccion").insert({
    alumno_id: alumnoId,
    bloque_clave: bloqueClave,
    ejercicio_id: ejercicioId,
    texto: limpio.slice(0, 20000),
  });

  return registrar("No se pudo guardar la respuesta de producción", error);
}

// ---------------------------------------------------------------
// MIGRACIÓN DESDE LOCALSTORAGE
//
// Lo que ya practicaron los alumnos está en el navegador de cada uno.
// Se vuelca una sola vez, cuando entran después del despliegue.
//
// Todo lo de aquí es tolerante a lo que venga: son datos que llevan
// meses en un localStorage y pueden estar a medias, de otra versión o
// manipulados a mano. Nada de esto puede dejar a nadie sin entrar.
// ---------------------------------------------------------------

/**
 * Vuelca a la base lo que traiga el navegador. Devuelve cuántas filas
 * entraron de cada cosa.
 *
 * Se hace en tres inserciones en bloque y no fila a fila: son hasta un
 * par de decenas de registros y así el alumno no espera tres viajes por
 * cada bloque que practicó.
 *
 * Los conflictos se ignoran en vez de fallar. Si alguien abre el LMS en
 * dos pestañas a la vez, la segunda migración se encuentra lo de la
 * primera y no debe romper por ello.
 */
export async function migrarProgresoLocal(
  alumnoId: string,
  datos: ProgresoLocal
): Promise<{ progreso: number; avance: number; bloques: number }> {
  const cliente = baseLms();
  const contados = { progreso: 0, avance: 0, bloques: 0 };

  // --- bloques generados ---
  // Van primero: si algo falla después, al menos los ejercicios que el
  // alumno tenía guardados siguen estando.
  const bloques = datos.bloques
    .map((entrada) => ({ bloque: validarBloque(entrada.bloque), creado: entrada.creado }))
    .filter((entrada): entrada is { bloque: Bloque; creado: string } => entrada.bloque !== null);

  if (bloques.length > 0) {
    const { error } = await cliente.from("bloques_generados").upsert(
      bloques.map((entrada) => ({
        bloque_clave: entrada.bloque.id,
        alumno_id: alumnoId,
        // El localStorage no guardaba ni el modo ni el origen. "repaso"
        // e "ia" son lo que fue la inmensa mayoría; marcarlos como otra
        // cosa sería inventarse un dato que no tenemos.
        modo: "repaso",
        nivel: entrada.bloque.nivel,
        contenido: entrada.bloque,
        origen: "ia",
        generado_en: fechaValida(entrada.creado),
      })),
      { onConflict: "bloque_clave", ignoreDuplicates: true }
    );
    if (registrar("Migración: no se pudieron volcar los bloques", error)) {
      contados.bloques = bloques.length;
    }
  }

  // --- progreso ---
  const progreso = datos.progreso.filter(
    (fila) => fila.total > 0 && fila.aciertos >= 0 && fila.aciertos <= fila.total
  );

  if (progreso.length > 0) {
    const { error } = await cliente.from("progreso_bloques").insert(
      progreso.map((fila) => ({
        alumno_id: alumnoId,
        bloque_clave: fila.bloqueClave,
        aciertos: fila.aciertos,
        total: fila.total,
        completado_en: fechaValida(fila.fecha),
      }))
    );
    if (registrar("Migración: no se pudo volcar el progreso", error)) {
      contados.progreso = progreso.length;
    }
  }

  // --- avance ---
  const avance = datos.avance.filter(
    (fila) => fila.total > 0 && fila.indice >= 0 && fila.indice < fila.total
  );

  if (avance.length > 0) {
    const { error } = await cliente.from("avance_bloques").upsert(
      avance.map((fila) => ({
        alumno_id: alumnoId,
        bloque_clave: fila.bloqueClave,
        indice: fila.indice,
        total: fila.total,
        actualizado_en: fechaValida(fila.fecha),
      })),
      { onConflict: "alumno_id,bloque_clave", ignoreDuplicates: true }
    );
    if (registrar("Migración: no se pudo volcar el avance", error)) {
      contados.avance = avance.length;
    }
  }

  return contados;
}

/**
 * Una fecha que Postgres acepte. Lo que venga del navegador puede ser
 * cualquier cosa, y una cadena rara haría fallar la inserción entera y
 * con ella la migración de todo lo demás.
 */
function fechaValida(valor: string): string {
  const momento = Date.parse(valor);
  return Number.isFinite(momento) ? new Date(momento).toISOString() : new Date().toISOString();
}
