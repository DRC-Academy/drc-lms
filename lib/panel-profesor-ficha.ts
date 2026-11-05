// ---------------------------------------------------------------
// LO QUE VE EL PROFESOR DE SUS ALUMNOS
//
// EL ÚNICO CARGADOR de la ficha, y el de la lista. Los dos piden alumnos
// `AlumnoAutorizado`, que solo crea el guard (`lib/panel-profesor.ts`):
// leer esto sin haber pasado por él no compila.
//
// LO QUE SALE DE AQUÍ YA ES LO QUE SE PUEDE ENSEÑAR. Datos mínimos y ya
// resueltos: ni `meet_link` (no se pide), ni quién dio una clase ajena, ni
// el `profesor` que guarda cada bloque en su `claseOrigen`. Sin
// `obtenerPerfil` ni `select *`: el plan no llega ni a este módulo, y el
// curso se resuelve con la columna `examen` de la vista.
//
// LAS CLASES DE OTRO PROFESOR salen con su fecha y sus temas, sin nombre,
// sin título, sin resumen y sin puntos: es la decisión del 05/11/2026, que
// limita lo que se ve de ellas a temas y fechas.
//
// CADA SECCIÓN FALLA SOLA. La autorización ya se ha decidido en el guard:
// aquí, si una lectura falla, esa sección dice que no se ha podido leer
// (null) y el resto se enseña.
// ---------------------------------------------------------------

import "server-only";
import { proximaDelAlumno, instanteEnMadrid, lunesDe } from "@/lib/clases";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { comoFecha, diaLocal } from "@/lib/fechas";
import { leerCalendariosSinEnlace, leerClasesDeFicha, leerExcepcionesDe } from "@/lib/gestion";
import { nivelDelAlumno, nivelMostrado, type MarcaNivel } from "@/lib/estimacion";
import { leerAvanceAlumno, leerBloquesGenerados, leerProgresoAlumno } from "@/lib/progreso-servidor";
import { nivelMcer, type NivelMcer } from "@/lib/recorrido";
import { baseLms } from "@/lib/supabase-lms";
import { ultimosAccesos, type AlumnoAutorizado, type ProfesorAutorizado } from "@/lib/panel-profesor";
import {
  diaEnTexto,
  enunciadoEnCorto,
  esPuntoDeClase,
  nombreDePila,
  proximaEnCorto,
  semanaDelCurso,
  sinDatosDeCobro,
  textoUltimoAcceso,
} from "@/lib/panel-profesor-reglas";
import type { ClaseParaRecorrido } from "@/components/progreso/Recorrido";

/** Cuántas clases propias se miran para «lo que viene trabajando». */
const CLASES_PARA_PUNTOS = 3;
/** Cuántos ejercicios del curso se enseñan. */
const EJERCICIOS_QUE_COSTARON = 3;

export type BloqueDeFicha = {
  id: string;
  titulo: string;
  area: string;
  /** La clase de la que sale, «lunes, 12 de octubre». */
  deLaClase: string | null;
  estado:
    | { tipo: "terminado"; aciertos: number; total: number; porcentaje: number }
    | { tipo: "a_medias"; indice: number; total: number }
    | { tipo: "sin_empezar" };
};

export type EjercicioQueCosto = {
  id: string;
  leccion: string;
  enunciado: string;
  intentos: number;
  sinAcertar: number;
};

export type CursoDeFicha = {
  id: string;
  titulo: string;
  total: number;
  abiertas: number;
  completadas: number;
  /** Qué día se abre lo siguiente, si ha hecho todo lo que tiene abierto. */
  abreEl: string | null;
};

export type FichaDelAlumno = {
  nombre: string;
  nombrePila: string;
  nivel: NivelMcer | null;
  origenNivel: MarcaNivel;
  enlaceGestion: string | null;
  ultimoAcceso: string | null;
  foco: string | null;
  semana: number | null;
  /** Null: no se ha podido leer. */
  puntos: { id: string; fecha: string; texto: string }[] | null;
  bloques: BloqueDeFicha[];
  ejercicios: EjercicioQueCosto[] | null;
  cursos: CursoDeFicha[] | null;
  /** Null: no se ha podido leer. `clase` null: no tiene ninguna próxima. */
  proxima: { clase: { dia: string; desde: string; hasta: string; enCurso: boolean } | null } | null;
  clases: ClaseParaRecorrido[] | null;
};

async function seguro<T>(donde: string, leer: () => Promise<T>): Promise<T | null> {
  try {
    return await leer();
  } catch (error) {
    console.error(`[panel-profesor] No se pudo leer ${donde}:`, error);
    return null;
  }
}

/** Solo si `GESTION_URL` está configurada. Es un enlace: allí se entra con su propio login. */
function enlaceAGestion(alumnoId: string): string | null {
  const base = process.env.GESTION_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}/mis-alumnos/${encodeURIComponent(alumnoId)}` : null;
}

/** Los bloques de práctica, con su resultado. */
async function bloquesDe(alumno: AlumnoAutorizado): Promise<BloqueDeFicha[]> {
  const [bloques, progreso, avance] = await Promise.all([
    leerBloquesGenerados(alumno.alumnoId, false),
    leerProgresoAlumno(alumno.alumnoId),
    leerAvanceAlumno(alumno.alumnoId),
  ]);

  return bloques.map((bloque) => {
    const hecho = progreso[bloque.id];
    const medias = avance[bloque.id];
    return {
      id: bloque.id,
      titulo: bloque.titulo,
      area: bloque.area,
      deLaClase: bloque.claseOrigen?.fecha ? diaEnTexto(bloque.claseOrigen.fecha) : null,
      estado: hecho
        ? { tipo: "terminado" as const, aciertos: hecho.aciertos, total: hecho.total, porcentaje: Math.round((hecho.aciertos / hecho.total) * 100) }
        : medias
          ? { tipo: "a_medias" as const, indice: medias.indice, total: medias.total }
          : { tipo: "sin_empezar" as const },
    };
  });
}

/**
 * Los ejercicios del CURSO que más intentos le han llevado.
 *
 * SOLO DEL CURSO. La práctica guarda aciertos y total por bloque
 * (`progreso_bloques`), no el resultado de cada ejercicio: de los bloques
 * no se puede saber en cuál le costó más. `intentos_ejercicio` sí guarda
 * cada intento, y es lo único que lo permite. Solo se enseñan aciertos,
 * nunca lo que respondió.
 */
async function ejerciciosQueCostaron(alumnoId: string): Promise<EjercicioQueCosto[]> {
  const { data, error } = await baseLms()
    .from("intentos_ejercicio")
    .select("ejercicio_id, correcto, respondido_en")
    .eq("alumno_id", alumnoId)
    .eq("origen", "lms")
    .order("respondido_en", { ascending: false })
    .limit(1000)
    .returns<{ ejercicio_id: string; correcto: boolean; respondido_en: string }[]>();
  if (error) throw new Error(error.message);

  const cuenta = new Map<string, { intentos: number; sinAcertar: number; ultimo: string }>();
  for (const f of data ?? []) {
    const c = cuenta.get(f.ejercicio_id) ?? { intentos: 0, sinAcertar: 0, ultimo: f.respondido_en };
    c.intentos++;
    if (!f.correcto) c.sinAcertar++;
    cuenta.set(f.ejercicio_id, c);
  }

  const peores = Array.from(cuenta)
    .filter(([, c]) => c.sinAcertar > 0)
    .sort((a, b) => b[1].sinAcertar - a[1].sinAcertar || (a[1].ultimo > b[1].ultimo ? -1 : 1))
    .slice(0, EJERCICIOS_QUE_COSTARON);
  if (peores.length === 0) return [];

  const { data: ejercicios, error: e1 } = await baseLms()
    .from("ejercicios_leccion")
    .select("id, enunciado, leccion_id")
    .in("id", peores.map(([id]) => id))
    .returns<{ id: string; enunciado: string; leccion_id: string }[]>();
  if (e1) throw new Error(e1.message);

  const { data: lecciones, error: e2 } = await baseLms()
    .from("lecciones")
    .select("id, titulo")
    .in("id", (ejercicios ?? []).map((e) => e.leccion_id))
    .returns<{ id: string; titulo: string }[]>();
  if (e2) throw new Error(e2.message);

  const enunciados = new Map((ejercicios ?? []).map((e) => [e.id, e]));
  const titulos = new Map((lecciones ?? []).map((l) => [l.id, l.titulo]));

  return peores.flatMap(([id, c]) => {
    const ejercicio = enunciados.get(id);
    if (!ejercicio) return [];
    return [
      {
        id,
        leccion: titulos.get(ejercicio.leccion_id) ?? "",
        enunciado: enunciadoEnCorto(ejercicio.enunciado),
        intentos: c.intentos,
        sinAcertar: c.sinAcertar,
      },
    ];
  });
}

/** TODO lo de la ficha. Pide al profesor y al alumno que devolvió el guard. */
export async function cargarFichaDelAlumno(
  profesor: ProfesorAutorizado,
  alumno: AlumnoAutorizado,
  ahora: Date = new Date()
): Promise<FichaDelAlumno> {
  // El guard devuelve los dos juntos: esto cuida de que nadie los mezcle.
  if (alumno.teacherId !== profesor.teacherId) throw new Error("Ese alumno no es de este profesor.");

  const id = alumno.alumnoId;
  const inicio = comoFecha(alumno.fechaInicio);
  const mostrado = nivelMostrado(id, alumno, profesor.nombre);

  const [clases, calendario, excepciones, bloques, ejercicios, cursos, accesos] = await Promise.all([
    seguro("las clases", () => leerClasesDeFicha(id)),
    seguro("el calendario", () => leerCalendariosSinEnlace([id])),
    seguro("las excepciones", () => leerExcepcionesDe([id])),
    seguro("la práctica", () => bloquesDe(alumno)),
    seguro("los ejercicios", () => ejerciciosQueCostaron(id)),
    seguro("los cursos", () => cursosDelInicio(id, alumno.examen ?? "", nivelDelAlumno(id, alumno), inicio)),
    seguro("el último acceso", () => ultimosAccesos([alumno])),
  ]);

  const proxima = calendario && excepciones ? proximaDelAlumno(calendario.get(id) ?? [], excepciones.get(id) ?? [], ahora) : null;

  const esPropia = (teacherId: string | null) => teacherId === profesor.teacherId;

  return {
    nombre: alumno.nombre.trim(),
    nombrePila: nombreDePila(alumno.nombre),
    nivel: nivelMcer(mostrado.nivel),
    origenNivel: mostrado.origen,
    enlaceGestion: enlaceAGestion(id),
    ultimoAcceso: accesos ? textoUltimoAcceso(accesos.get(id) ?? null, ahora) : null,
    foco: sinDatosDeCobro(alumno.focoRecomendado) || null,
    semana: semanaDelCurso(inicio, ahora),
    puntos: clases
      ? clases
          .filter((c) => esPropia(c.teacherId) && c.validada && esPuntoDeClase(c.puntos))
          .map((c) => ({ id: c.id, fecha: c.fechaClase, texto: sinDatosDeCobro(c.puntos) }))
          .filter((p) => p.texto !== "")
          .slice(0, CLASES_PARA_PUNTOS)
      : null,
    bloques: bloques ?? [],
    ejercicios,
    cursos: cursos
      ? cursos.map((c) => ({
          id: c.curso.id,
          titulo: c.curso.titulo,
          total: c.total,
          abiertas: c.abiertas,
          completadas: c.completadas,
          abreEl: c.abreEl,
        }))
      : null,
    proxima:
      calendario && excepciones
        ? { clase: proxima ? { dia: proxima.fecha, desde: proxima.desde, hasta: proxima.hasta, enCurso: proxima.enCurso } : null }
        : null,
    clases: clases
      ? clases.map((c) => {
          const temas = sinDatosDeCobro(c.temas);
          if (!esPropia(c.teacherId)) {
            return { id: c.id, numero: null, fechaClase: c.fechaClase, titulo: "", temas, etiqueta: "Con otro profesor" };
          }
          return {
            id: c.id,
            numero: null,
            fechaClase: c.fechaClase,
            titulo: sinDatosDeCobro(c.titulo),
            temas,
            resumen: c.validada ? sinDatosDeCobro(c.resumen) || null : null,
          };
        })
      : null,
  };
}

export type ResumenDeLista = {
  /** «Hoy, 18:00». Null: sin próxima clase, o no se ha podido leer (`calendarioLeido`). */
  proxima: string | null;
  calendarioLeido: boolean;
  /** Para ordenar. */
  empiezaEn: number | null;
  semana: number | null;
  /** Null: no se ha podido leer. */
  practico: boolean | null;
};

/** ¿Ha practicado esta semana (de lunes a hoy, en España)? Bloques y ejercicios del curso. */
async function practicaronEstaSemana(alumnoIds: string[], ahora: Date): Promise<Set<string>> {
  const desde = instanteEnMadrid(lunesDe(diaLocal(ahora)), "00:00").toISOString();
  const [bloques, ejercicios] = await Promise.all([
    baseLms()
      .from("progreso_bloques")
      .select("alumno_id")
      .in("alumno_id", alumnoIds)
      .gte("completado_en", desde)
      .limit(1000)
      .returns<{ alumno_id: string }[]>(),
    baseLms()
      .from("intentos_ejercicio")
      .select("alumno_id")
      .in("alumno_id", alumnoIds)
      .eq("origen", "lms")
      .gte("respondido_en", desde)
      .limit(1000)
      .returns<{ alumno_id: string }[]>(),
  ]);
  if (bloques.error) throw new Error(bloques.error.message);
  if (ejercicios.error) throw new Error(ejercicios.error.message);
  return new Set([...(bloques.data ?? []), ...(ejercicios.data ?? [])].map((f) => f.alumno_id));
}

/**
 * Lo que añade la lista a cada alumno, en CUATRO lecturas para toda la
 * lista, no por alumno: dos a Gestión y dos al LMS. Medido con 18 alumnos
 * (05/11/2026): unos 0,5 s cada lectura de Gestión. La semana no lee nada.
 */
export async function resumenesDeLaLista(
  alumnos: readonly AlumnoAutorizado[],
  ahora: Date = new Date()
): Promise<Map<string, ResumenDeLista>> {
  const ids = alumnos.map((a) => a.alumnoId);

  const [calendarios, excepciones, practicaron] = await Promise.all([
    seguro("los calendarios", () => leerCalendariosSinEnlace(ids)),
    seguro("las excepciones", () => leerExcepcionesDe(ids)),
    seguro("la práctica de la semana", () => (ids.length ? practicaronEstaSemana(ids, ahora) : Promise.resolve(new Set<string>()))),
  ]);

  const salida = new Map<string, ResumenDeLista>();
  for (const alumno of alumnos) {
    const id = alumno.alumnoId;
    const proxima = calendarios && excepciones ? proximaDelAlumno(calendarios.get(id) ?? [], excepciones.get(id) ?? [], ahora) : null;
    salida.set(id, {
      proxima: proxima ? proximaEnCorto(proxima.fecha, proxima.desde, ahora) : null,
      empiezaEn: proxima ? proxima.empiezaEn.getTime() : null,
      calendarioLeido: calendarios !== null && excepciones !== null,
      semana: semanaDelCurso(comoFecha(alumno.fechaInicio), ahora),
      practico: practicaron ? practicaron.has(id) : null,
    });
  }
  return salida;
}
