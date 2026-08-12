// ---------------------------------------------------------------
// MIGRACIÓN DEL PROGRESO DE LEARNDASH
//
// Vuelca `user_activity.ld` a `progreso_lecciones` con
// `origen = 'learndash_migrado'`. El contenido lo trae
// `importar-learndash.ts`; esto es el segundo paso y NECESITA que aquel
// se haya ejecutado, porque resuelve las lecciones por `learndash_id`.
//
//   node scripts/migrar-progreso.ts              → ensayo, no escribe
//   node scripts/migrar-progreso.ts --escribir   → escribe de verdad
//
// El ensayo SÍ lee la base (lecciones, vínculos, progreso ya existente y
// la vista de Gestión): sin eso no se puede decir cuántos alumnos se
// resuelven ni cuántas filas entrarían. Lee, no escribe.
//
// ---------------------------------------------------------------
// CÓMO SE PASA DE UN USUARIO DE WORDPRESS A UN ALUMNO
//
// LearnDash guarda `user_id` de WordPress. Gestión identifica a la
// persona por `alumno_id`. Entre los dos hay dos puentes, y se usan en
// este orden:
//
//   1. `alumno_vinculos.woo_user_id` → es el puente explícito, el que se
//      creó al entrar por el botón de WooCommerce. Si existe, manda:
//      alguien decidió que esa cuenta es ese alumno.
//
//   2. El email de WordPress contra el de Gestión. Es una heurística:
//      empareja a quien nunca entró por el botón, que hoy son todos.
//      Se compara en minúsculas y sin espacios, la misma forma canónica
//      que produce `normalizarEmail()` en lib/sesion.ts.
//
// Lo que no case por ninguno de los dos NO se inventa. Se cuenta, se
// lista por `user_id` y se deja fuera.
//
// SOBRE LOS EMAILS EN EL INFORME: no se imprime ninguno. El informe se
// pega en un chat, se guarda en un log o se comparte con quien esté
// mirando el despliegue, y la lista de direcciones de los alumnos de la
// academia no tiene por qué acabar ahí. Con el `user_id` se busca en
// WordPress quien tenga que buscarlo.
//
// ---------------------------------------------------------------
// QUÉ CUENTA COMO "LECCIÓN COMPLETADA"
//
// En `lecciones` hay dos clases de fila, y las dos tienen su reflejo en
// la actividad de LearnDash:
//
//   · las que vienen de un topic  → `activity_type = 'topic'`
//   · las sintéticas de un quiz   → `activity_type = 'quiz'`
//
// Las de tipo `lesson` (los módulos de LearnDash) NO entran: aquí un
// módulo es un contenedor, no algo que se complete. Y las de tipo
// `course` y `access` tampoco: no hay dónde ponerlas.
//
// NO SE PISA NADA. `progreso_lecciones` tiene UNIQUE (alumno_id,
// leccion_id) y un alumno que ya hizo la lección en el LMS tiene la
// fecha buena, la de verdad. Se filtran antes de escribir y además se
// escribe con `ignoreDuplicates`, que en Postgres es ON CONFLICT DO
// NOTHING: si entre el filtro y la escritura alguien completa esa misma
// lección, gana quien estaba.
// ---------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { abrirZip, entero, leerEnv, leerJsonl, texto, type Registro } from "./learndash-zip.ts";

const RUTA_ZIP = "import/learndash-export-20260811-6a7b8548cf750.zip";
const RUTA_ENV = ".env.local";

const TANDA = 400;
const PAGINA = 1000;

const ORIGEN = "learndash_migrado";

// ---------------------------------------------------------------
// LECTURA DE LA BASE
// ---------------------------------------------------------------

/**
 * PostgREST devuelve como mucho 1000 filas por consulta, y `lecciones`
 * ya son 1164. Sin paginar, la migración resolvería solo las primeras
 * mil lecciones y daría por inexistentes las demás, en silencio.
 */
async function leerTodo<T>(cliente: SupabaseClient, tabla: string, columnas: string): Promise<T[]> {
  const salida: T[] = [];

  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await cliente
      .from(tabla)
      .select(columnas)
      .range(desde, desde + PAGINA - 1)
      .returns<T[]>();

    if (error) throw new Error(`${tabla}: ${error.message}`);

    const trozo = data ?? [];
    salida.push(...trozo);
    if (trozo.length < PAGINA) return salida;
  }
}

const normalizarEmail = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

// ---------------------------------------------------------------
// ACTIVIDAD DEL EXPORT
// ---------------------------------------------------------------

type Completada = { usuario: number; learndashId: number; cuando: string };

/** Epoch en segundos, como cadena, a ISO. */
function fecha(valor: unknown): string | null {
  const n = entero(valor);
  if (n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

function leerActividad(actividad: Registro[]): { completadas: Completada[]; porTipo: Map<string, number> } {
  const completadas: Completada[] = [];
  const porTipo = new Map<string, number>();

  for (const fila of actividad) {
    if (texto(fila.activity_status) !== "1") continue;

    const tipo = texto(fila.activity_type);
    porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1);
    if (tipo !== "topic" && tipo !== "quiz") continue;

    const cuando = fecha(fila.activity_completed) ?? fecha(fila.activity_updated);
    if (cuando === null) continue;

    completadas.push({
      usuario: entero(fila.user_id),
      learndashId: entero(fila.post_id),
      cuando,
    });
  }

  return { completadas, porTipo };
}

// ---------------------------------------------------------------
// PRINCIPAL
// ---------------------------------------------------------------

type FilaProgreso = { alumno_id: string; leccion_id: string; completada_en: string; origen: string };

async function principal(): Promise<void> {
  const escribirDeVerdad = process.argv.includes("--escribir");

  console.log("");
  console.log(escribirDeVerdad ? "MODO ESCRITURA" : "MODO ENSAYO (no se escribe nada; usa --escribir)");
  console.log("");

  const env = leerEnv(RUTA_ENV);
  for (const clave of ["LMS_SUPABASE_URL", "LMS_SUPABASE_SERVICE_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env[clave]) throw new Error(`Falta ${clave} en ${RUTA_ENV}`);
  }

  const lms = createClient(env.LMS_SUPABASE_URL, env.LMS_SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const gestion = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- el export ---
  const zip = abrirZip(RUTA_ZIP);
  const { completadas, porTipo } = leerActividad(leerJsonl(zip, "user_activity.ld"));

  const emailDeUsuario = new Map<number, string>();
  const rolDeUsuario = new Map<number, string>();
  for (const u of leerJsonl(zip, "user.ld")) {
    const wp = (u.wp_user ?? {}) as Registro;
    const id = entero(wp.ID);
    const email = normalizarEmail(wp.user_email);
    if (email !== "") emailDeUsuario.set(id, email);
    rolDeUsuario.set(id, texto(wp.role) || "(sin rol)");
  }

  // --- la base ---
  const lecciones = await leerTodo<{ id: string; learndash_id: number | null }>(
    lms,
    "lecciones",
    "id, learndash_id"
  );
  const vinculos = await leerTodo<{ alumno_id: string; woo_user_id: number | null; email_normalizado: string }>(
    lms,
    "alumno_vinculos",
    "alumno_id, woo_user_id, email_normalizado"
  );
  const yaHecho = await leerTodo<{ alumno_id: string; leccion_id: string }>(
    lms,
    "progreso_lecciones",
    "alumno_id, leccion_id"
  );
  const alumnos = await leerTodo<{ alumno_id: string; email: string | null }>(
    gestion,
    "vista_perfil_alumno",
    "alumno_id, email"
  );

  const idLeccion = new Map<number, string>();
  for (const l of lecciones) if (l.learndash_id !== null) idLeccion.set(Number(l.learndash_id), l.id);

  const porWoo = new Map<number, string>();
  const porEmail = new Map<string, string>();
  for (const v of vinculos) {
    if (v.woo_user_id !== null) porWoo.set(Number(v.woo_user_id), v.alumno_id);
    if (v.email_normalizado) porEmail.set(v.email_normalizado, v.alumno_id);
  }
  // Gestión manda sobre el email: es la lista de alumnos de verdad, y
  // `alumno_vinculos` solo tiene a quien ya entró alguna vez.
  for (const a of alumnos) {
    const email = normalizarEmail(a.email);
    if (email !== "") porEmail.set(email, a.alumno_id);
  }

  const hecho = new Set(yaHecho.map((p) => `${p.alumno_id}|${p.leccion_id}`));

  // --- resolución ---
  const usuarios = Array.from(new Set(completadas.map((c) => c.usuario)));
  const pasosPorUsuario = new Map<number, number>();
  for (const c of completadas) pasosPorUsuario.set(c.usuario, (pasosPorUsuario.get(c.usuario) ?? 0) + 1);

  const alumnoDe = new Map<number, string>();
  const viaVinculo = new Set<number>();
  const viaEmail = new Set<number>();
  const sinResolver: number[] = [];

  for (const usuario of usuarios) {
    const porVinculo = porWoo.get(usuario);
    if (porVinculo !== undefined) {
      alumnoDe.set(usuario, porVinculo);
      viaVinculo.add(usuario);
      continue;
    }

    const email = emailDeUsuario.get(usuario);
    const porCorreo = email === undefined ? undefined : porEmail.get(email);
    if (porCorreo !== undefined) {
      alumnoDe.set(usuario, porCorreo);
      viaEmail.add(usuario);
      continue;
    }

    sinResolver.push(usuario);
  }

  // --- filas ---
  // La clave es (alumno, lección) y no (usuario, lección): dos cuentas de
  // WordPress pueden acabar en el mismo alumno, y ahí la fecha buena es
  // la primera vez que lo hizo, no la última que se apuntó.
  const filas = new Map<string, FilaProgreso>();
  let sinLeccion = 0;
  let yaEstaba = 0;
  let deAlumnosSinResolver = 0;

  for (const c of completadas) {
    const alumnoId = alumnoDe.get(c.usuario);
    if (alumnoId === undefined) {
      deAlumnosSinResolver++;
      continue;
    }

    const leccionId = idLeccion.get(c.learndashId);
    if (leccionId === undefined) {
      // El topic o el quiz no llegó a ser lección: se descartó por vacío
      // o se quedó fuera de `ld_course_steps`. Ver el importador.
      sinLeccion++;
      continue;
    }

    const clave = `${alumnoId}|${leccionId}`;
    if (hecho.has(clave)) {
      yaEstaba++;
      continue;
    }

    const previa = filas.get(clave);
    if (previa === undefined || c.cuando < previa.completada_en) {
      filas.set(clave, {
        alumno_id: alumnoId,
        leccion_id: leccionId,
        completada_en: c.cuando,
        origen: ORIGEN,
      });
    }
  }

  const aEscribir = Array.from(filas.values());
  const alumnosTocados = new Set(aEscribir.map((f) => f.alumno_id));

  // ---------------------------------------------------------------
  // INFORME
  // ---------------------------------------------------------------

  console.log("=== EL EXPORT ===");
  console.log(`  filas de actividad completada, por tipo:`);
  for (const [tipo, n] of Array.from(porTipo.entries()).sort((a, b) => b[1] - a[1])) {
    const usa = tipo === "topic" || tipo === "quiz";
    console.log(`    ${tipo.padEnd(8)} ${String(n).padStart(6)}   ${usa ? "→ se migra" : "→ no aplica"}`);
  }
  console.log(`  usuarios de WordPress con algo completado: ${usuarios.length}`);
  console.log("");

  console.log("=== RESOLUCIÓN A ALUMNO ===");
  console.log(`  por alumno_vinculos.woo_user_id : ${viaVinculo.size}`);
  console.log(`  por email                       : ${viaEmail.size}`);
  console.log(`  sin resolver                    : ${sinResolver.length}`);
  console.log(`  alumnos distintos alcanzados    : ${new Set(Array.from(alumnoDe.values())).size} (de ${alumnos.length} en Gestión)`);
  if (porWoo.size === 0) {
    console.log("");
    console.log("  Nota: `alumno_vinculos` está vacía, así que hoy no hay ni un");
    console.log("  vínculo explícito y todo lo que se resuelve es por email. En");
    console.log("  cuanto los alumnos entren por el botón, la vía 1 irá ganando");
    console.log("  peso y esta migración no habrá que repetirla.");
  }
  console.log("");

  console.log("=== LO QUE ENTRARÍA ===");
  console.log(`  filas en progreso_lecciones     : ${aEscribir.length}`);
  console.log(`  alumnos con progreso            : ${alumnosTocados.size}`);
  console.log(`  lecciones distintas             : ${new Set(aEscribir.map((f) => f.leccion_id)).size}`);
  console.log("");

  console.log("=== LO QUE NO ENTRA ===");
  console.log(`  actividad de usuarios sin resolver     : ${deAlumnosSinResolver}`);
  console.log(`  actividad de topics/quizzes que ya no`);
  console.log(`  son lección (vacíos o fuera del árbol) : ${sinLeccion}`);
  console.log(`  ya estaba en progreso_lecciones        : ${yaEstaba}`);
  console.log("");

  if (sinResolver.length > 0) {
    // ---------------------------------------------------------------
    // NO TODO LO QUE NO CASA ES UN ALUMNO PERDIDO
    //
    // Los que más pasos acumulan son cuentas del equipo: `group_leader`
    // y `administrator` de @drcacademy.com recorriendo el curso. Su
    // "progreso" no es de nadie y no debería contarse como pérdida, así
    // que el informe separa por rol de WordPress antes de dar un total.
    // ---------------------------------------------------------------
    const DEL_EQUIPO = new Set(["administrator", "group_leader", "editor", "author"]);

    console.log("=== USUARIOS DE WORDPRESS QUE NO SE PUEDEN UBICAR ===");
    console.log("  Sin vínculo y sin email que case con una ficha de Gestión. Se");
    console.log("  listan por user_id de WordPress, su rol y cuántos pasos");
    console.log("  completados quedan fuera. No se imprime ningún email: con el");
    console.log("  user_id se mira en WordPress quien tenga que mirarlo.");
    console.log("");

    const ordenados = sinResolver
      .map((u) => ({ usuario: u, pasos: pasosPorUsuario.get(u) ?? 0, rol: rolDeUsuario.get(u) ?? "(no está en user.ld)" }))
      .sort((a, b) => b.pasos - a.pasos);

    const equipo = ordenados.filter((u) => DEL_EQUIPO.has(u.rol));
    const alumnado = ordenados.filter((u) => !DEL_EQUIPO.has(u.rol));
    const suma = (lista: typeof ordenados) => lista.reduce((a, u) => a + u.pasos, 0);

    console.log(`  --- cuentas del equipo: ${equipo.length} usuarios, ${suma(equipo)} pasos ---`);
    console.log("  No son alumnos: es el equipo recorriendo el curso. Nada que migrar.");
    console.log("    user_id    pasos  rol");
    for (const u of equipo) {
      console.log(`    ${String(u.usuario).padStart(7)}  ${String(u.pasos).padStart(7)}  ${u.rol}`);
    }
    console.log("");

    console.log(`  --- cuentas de alumno: ${alumnado.length} usuarios, ${suma(alumnado)} pasos ---`);
    console.log("  Estos SÍ son progreso de alguien que estudió. No tienen ficha en");
    console.log("  Gestión: o se dieron de baja, o su email allí es otro.");
    console.log("    user_id    pasos  rol");
    for (const u of alumnado) {
      console.log(`    ${String(u.usuario).padStart(7)}  ${String(u.pasos).padStart(7)}  ${u.rol}`);
    }
    console.log("");

    const conEmail = alumnado.filter((u) => emailDeUsuario.has(u.usuario)).length;
    console.log(`  de las cuentas de alumno, con email en WordPress: ${conEmail} de ${alumnado.length}`);
    console.log("  (si alguna es de un alumno activo, lo que falla es que su email");
    console.log("   en Gestión no es el mismo que en WordPress: se arregla en Gestión");
    console.log("   o creando la fila en alumno_vinculos, y se vuelve a correr esto)");
    console.log("");
  }

  if (!escribirDeVerdad) {
    console.log("Ensayo terminado. Nada se ha escrito.");
    return;
  }

  if (aEscribir.length === 0) {
    console.log("No hay nada que escribir.");
    return;
  }

  console.log("=== ESCRIBIENDO ===");
  let escritas = 0;
  for (let i = 0; i < aEscribir.length; i += TANDA) {
    const tanda = aEscribir.slice(i, i + TANDA);
    const { error } = await lms
      .from("progreso_lecciones")
      .upsert(tanda, { onConflict: "alumno_id,leccion_id", ignoreDuplicates: true });
    if (error) throw new Error(`progreso_lecciones: ${error.message}`);
    escritas += tanda.length;
  }
  console.log(`  filas enviadas: ${escritas}`);

  const total = await leerTodo<{ alumno_id: string }>(lms, "progreso_lecciones", "alumno_id");
  console.log(`  progreso_lecciones tiene ahora: ${total.length} filas`);
  console.log("");
  console.log("Migración terminada.");
}

principal().catch((error: unknown) => {
  console.error("");
  console.error("FALLÓ: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
