// ---------------------------------------------------------------
// QUIÉN ES EL PROFESOR Y QUÉ ALUMNOS PUEDE VER
//
// La autorización entera del panel vive aquí:
//
//   exigirProfesor           quién es, con cada comprobación hecha.
//   alumnosDelProfesor       sus alumnos. La única lista.
//   exigirAlumnoDelProfesor  el guard de un alumno. El id que llega de la
//                            URL o de un formulario solo pasa por aquí.
//
// `AlumnoAutorizado` y `ProfesorAutorizado` solo se crean en este módulo.
// Lo que lea datos de un alumno para el panel los pide como argumento, así
// que saltarse el guard no compila. Un test comprueba que nadie fuera de
// aquí los fabrique con un `as`.
//
// TRES REGLAS, DISTINTAS DE LAS DEL RESTO DEL LMS:
//
//   1. SIN MEMO NI CACHÉ. Desactivar a un profesor, cambiar su email en
//      Gestión o cambiar a un alumno de profesor se nota en la petición
//      siguiente. Son unas pocas lecturas por página para unas decenas
//      de personas.
//   2. LA DUDA ES QUE NO. Si una lectura falla, no se entra. El resto del
//      LMS falla abierto para no dejar fuera a 174 alumnos; esto enseña
//      datos de otras personas.
//   3. MISMA RESPUESTA PARA LO AJENO Y LO INEXISTENTE. Un 404 en los dos
//      casos: probar ids no enseña qué alumnos existen.
//
// SOLO LECTURA EN «VER COMO». Un admin puede mirar el panel de un
// profesor con `?como=<teacher_id>`. Lo decide `exigirProfesor`: a un
// profesor ese parámetro se le ignora entero, y con `comoAdmin` nada del
// panel puede escribir.
// ---------------------------------------------------------------

import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { NOMBRE_COOKIE_PROFESOR, abrirSesionProfesor, type SesionProfesor } from "@/lib/sesion";
import { sesionActual } from "@/lib/sesion-servidor";
import { sesionProfesorViva } from "@/lib/sesiones-lms";
import { baseLms } from "@/lib/supabase-lms";
import {
  leerAlumnoAsignado,
  leerAlumnosAsignados,
  leerProfesorDeGestion,
  type FilaAlumnoAsignado,
} from "@/lib/gestion";
import { nombreVisibleProfesor } from "@/lib/profesor";
import { situacionDelProfesor } from "@/lib/panel-profesor-reglas";

declare const marcaProfesor: unique symbol;
declare const marcaAlumno: unique symbol;

export type ProfesorAutorizado = {
  readonly teacherId: string;
  /** El nombre visible. */
  readonly nombre: string;
  /** Un admin mirando con «Ver como»: solo lectura. */
  readonly comoAdmin: boolean;
  readonly [marcaProfesor]: true;
};

export type AlumnoAutorizado = Readonly<FilaAlumnoAsignado> & { readonly [marcaAlumno]: true };

export type FilaAccesoProfesor = {
  emailNormalizado: string;
  activo: boolean;
};

/** La fila de `profesores_acceso` de un profesor. LANZA si la lectura falla. */
async function leerAcceso(teacherId: string): Promise<FilaAccesoProfesor | null> {
  const { data, error } = await baseLms()
    .from("profesores_acceso")
    .select("email_normalizado, activo")
    .eq("teacher_id", teacherId)
    .limit(1)
    .returns<{ email_normalizado: string; activo: boolean }[]>();
  if (error) throw new Error(`No se pudo leer profesores_acceso: ${error.message}`);
  const fila = (data ?? [])[0];
  return fila ? { emailNormalizado: fila.email_normalizado, activo: fila.activo } : null;
}

/** El profesor de un sobre válido, si todo sigue en regla. Null ante cualquier duda. */
async function profesorVigente(sobre: SesionProfesor): Promise<ProfesorAutorizado | null> {
  try {
    const [viva, acceso, gestion] = await Promise.all([
      sesionProfesorViva(sobre.sesionId, sobre.teacherId),
      leerAcceso(sobre.teacherId),
      leerProfesorDeGestion(sobre.teacherId),
    ]);
    if (!viva || !gestion || !acceso) return null;
    if (situacionDelProfesor(acceso, gestion) !== "activo") return null;
    // El sobre lleva el email con el que se entró. Tras aprobar otro, las
    // sesiones se revocan; esto cubre el caso de que la revocación fallara.
    if (sobre.email !== acceso.emailNormalizado) return null;

    return {
      teacherId: sobre.teacherId,
      nombre: nombreVisibleProfesor(null, gestion.profesor),
      comoAdmin: false,
    } as ProfesorAutorizado;
  } catch (error) {
    console.error("[panel-profesor] No se pudo autorizar al profesor:", error);
    return null;
  }
}

async function sobreDeLaPeticion(): Promise<SesionProfesor | null> {
  return abrirSesionProfesor(cookies().get(NOMBRE_COOKIE_PROFESOR)?.value);
}

/** El profesor con sesión en regla, sin redirigir: para las pantallas de entrar. */
export async function profesorConectado(): Promise<ProfesorAutorizado | null> {
  const sobre = await sobreDeLaPeticion();
  return sobre ? profesorVigente(sobre) : null;
}

/**
 * Quién mira el panel. `como` es el `?como=` de la página; solo cuenta si
 * quien pregunta es admin.
 */
export async function exigirProfesor(como?: string): Promise<ProfesorAutorizado> {
  const sobre = await sobreDeLaPeticion();
  if (sobre) {
    const profesor = await profesorVigente(sobre);
    if (profesor) return profesor;
    // Un solo destino para revocado, desactivado, bloqueado o caído: la
    // pantalla de entrada no le cuenta a nadie cuál de ellos ha sido.
    redirect("/profes?motivo=sesion");
  }

  const sesion = await sesionActual();
  if (!sesion) redirect("/profes");
  if (sesion.rol === "alumno") redirect(`/alumno/${sesion.alumnoId}`);

  // A partir de aquí, un admin: es la única forma de llegar sin el sobre.
  const id = typeof como === "string" ? como.trim() : "";
  if (id === "") redirect("/accesos-profesores");

  // Si Gestión falla, esto lanza y sale la pantalla de error.
  const gestion = await leerProfesorDeGestion(id);
  if (!gestion) notFound();

  return {
    teacherId: gestion.teacherId,
    nombre: nombreVisibleProfesor(null, gestion.profesor),
    comoAdmin: true,
  } as ProfesorAutorizado;
}

/**
 * LA ÚNICA LISTA de los alumnos de un profesor: los de asignación activa,
 * leídos sin caché. Lanza si la lectura falla: un error no puede parecer
 * un profesor sin alumnos.
 */
export async function alumnosDelProfesor(profesor: ProfesorAutorizado): Promise<AlumnoAutorizado[]> {
  const filas = await leerAlumnosAsignados(profesor.teacherId);
  return filas as AlumnoAutorizado[];
}

/**
 * EL GUARD DE UN ALUMNO. Todo lo del panel que reciba un id de alumno pasa
 * por aquí antes de leer nada de él. Ajeno, inexistente o con la
 * asignación ya inactiva: el mismo 404.
 */
export async function exigirAlumnoDelProfesor(
  alumnoId: unknown,
  como?: string
): Promise<{ profesor: ProfesorAutorizado; alumno: AlumnoAutorizado }> {
  const profesor = await exigirProfesor(como);

  if (typeof alumnoId !== "string" || alumnoId === "" || alumnoId.length > 200) notFound();

  const fila = await leerAlumnoAsignado(profesor.teacherId, alumnoId);
  if (!fila) notFound();

  return { profesor, alumno: fila as AlumnoAutorizado };
}

/**
 * La ruta de una pantalla del panel. En «Ver como» conserva el `?como=`:
 * sin él, el admin volvería a su pestaña al primer clic.
 */
export function rutaDelPanel(profesor: ProfesorAutorizado, ruta: string): string {
  return profesor.comoAdmin ? `${ruta}?como=${encodeURIComponent(profesor.teacherId)}` : ruta;
}

/**
 * Cuándo pasó cada alumno por última vez por la plataforma. Pide alumnos
 * ya autorizados. Solo esa columna: nada de IP ni de navegador. Null si
 * falla: la lista se enseña igual, sin este dato.
 */
export async function ultimosAccesos(alumnos: readonly AlumnoAutorizado[]): Promise<Map<string, string> | null> {
  const salida = new Map<string, string>();
  if (alumnos.length === 0) return salida;

  const { data, error } = await baseLms()
    .from("sesiones")
    .select("alumno_id, ultimo_uso_en")
    .eq("rol", "alumno")
    .in("alumno_id", alumnos.map((a) => a.alumnoId))
    .order("ultimo_uso_en", { ascending: false })
    .limit(1000)
    .returns<{ alumno_id: string; ultimo_uso_en: string }[]>();

  if (error) {
    console.error("[panel-profesor] No se pudieron leer los últimos accesos:", error.message);
    return null;
  }

  // Vienen de la más reciente a la más antigua: la primera de cada uno gana.
  for (const fila of data ?? []) if (!salida.has(fila.alumno_id)) salida.set(fila.alumno_id, fila.ultimo_uso_en);
  return salida;
}

/**
 * ¿Con este email se entra como profesor? Lo pregunta el login.
 *
 * SE BUSCA EN LA COPIA DEL LMS, NUNCA EN GESTIÓN. Quien cambie un
 * `teachers.email` a su dirección no encuentra aquí ninguna fila. Y la
 * dirección aprobada solo vale si Gestión sigue diciendo lo mismo.
 *
 * Null también si algo falla: entonces esa persona entra como lo que sea
 * además (alumno, si tiene ficha) o no entra.
 */
export async function profesorParaEntrar(email: string): Promise<{ email: string; teacherId: string } | null> {
  try {
    const { data, error } = await baseLms()
      .from("profesores_acceso")
      .select("teacher_id, email_normalizado, activo")
      .eq("email_normalizado", email)
      .eq("activo", true)
      .limit(1)
      .returns<{ teacher_id: string; email_normalizado: string; activo: boolean }[]>();
    if (error) throw new Error(error.message);

    const fila = (data ?? [])[0];
    if (!fila) return null;

    const gestion = await leerProfesorDeGestion(fila.teacher_id);
    const situacion = situacionDelProfesor({ emailNormalizado: fila.email_normalizado, activo: fila.activo }, gestion);
    return situacion === "activo" ? { email: fila.email_normalizado, teacherId: fila.teacher_id } : null;
  } catch (error) {
    console.error("[panel-profesor] No se pudo comprobar el acceso del profesor:", error);
    return null;
  }
}
