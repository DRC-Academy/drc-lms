// ---------------------------------------------------------------
// ATRIBUIR SU CLASE A LOS BLOQUES QUE YA ESTÁN GENERADOS
//
//   npx tsx scripts/atribuir-clase-origen.ts              → ensayo, no escribe
//   npx tsx scripts/atribuir-clase-origen.ts --escribir   → escribe `claseOrigen`
//
// ---------------------------------------------------------------
// POR QUÉ HACE FALTA
//
// Cada parada de «Para ti» dice ahora de qué clase viene —«Generada a
// partir de tu clase del 20 de septiembre con Laura»— y para eso el
// bloque lleva `claseOrigen`, que `app/api/generar-bloque` estampa al
// generar. Los bloques de antes de ese cambio no lo tienen.
//
// La clase se recupera de Gestión: de `class_analyses`, la clase
// analizada del alumno más reciente ANTES de que se generara el bloque
// (`analyzed_at <= generado_en`). Es exactamente la que mandó en el
// prompt cuando se generó —la generación pide «la última clase
// analizada» en ese momento—, así que no es una estimación: es la
// misma lectura, hecha después.
//
// El profesor sale de la ficha actual del alumno (`vista_perfil_alumno`).
// Si cambió de profesor desde entonces, esto pone el de ahora; Gestión
// no guarda con quién fue cada clase, y el nombre de ahora es mejor que
// ninguno.
//
// SOLO LOS BLOQUES DE IA. Los del banco (`origen = 'banco'`) no salen de
// ninguna clase y se dejan sin atribución a propósito. Y se puede
// volver a correr sin miedo: salta los que ya la tienen.
// ---------------------------------------------------------------

import { resolve } from "node:path";
import { leerEnv } from "./learndash-zip.ts";

const env = { ...leerEnv(resolve(process.cwd(), ".env.local")), ...process.env };

const URL_LMS = env.LMS_SUPABASE_URL ?? "";
const CLAVE_LMS = env.LMS_SUPABASE_SERVICE_KEY ?? "";
const URL_GESTION = env.SUPABASE_URL ?? "";
const CLAVE_GESTION = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const ESCRIBE = process.argv.includes("--escribir");

function cabeceras(clave: string): Record<string, string> {
  return { apikey: clave, Authorization: `Bearer ${clave}`, "content-type": "application/json" };
}

async function pedir<T>(base: string, clave: string, ruta: string): Promise<T> {
  const respuesta = await fetch(`${base}/rest/v1/${ruta}`, { headers: cabeceras(clave) });
  if (!respuesta.ok) {
    throw new Error(`${respuesta.status} en ${ruta}: ${(await respuesta.text()).slice(0, 200)}`);
  }
  return (await respuesta.json()) as T;
}

type FilaBloque = {
  bloque_clave: string;
  alumno_id: string;
  origen: string;
  generado_en: string;
  contenido: Record<string, unknown>;
};
type FilaClase = { student_id: string; class_date: string; analyzed_at: string };
type FilaPerfil = { alumno_id: string; profesor: string | null };

async function main() {
  if (!URL_LMS || !CLAVE_LMS || !URL_GESTION || !CLAVE_GESTION) {
    console.error("Faltan LMS_SUPABASE_URL/LMS_SUPABASE_SERVICE_KEY o SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  console.log(ESCRIBE ? "MODO ESCRITURA\n" : "ENSAYO: no se escribe nada. Usa --escribir.\n");

  const bloques = await pedir<FilaBloque[]>(
    URL_LMS,
    CLAVE_LMS,
    "bloques_generados?select=bloque_clave,alumno_id,origen,generado_en,contenido&order=generado_en.asc"
  );

  const pendientes = bloques.filter((b) => b.origen === "ia" && !b.contenido.claseOrigen);
  const saltados = bloques.length - pendientes.length;
  console.log(`${bloques.length} bloques en la base; ${pendientes.length} de IA sin clase de origen; ${saltados} se saltan.\n`);
  if (pendientes.length === 0) return;

  const alumnos = Array.from(new Set(pendientes.map((b) => b.alumno_id)));
  const lista = alumnos.map((a) => `"${a}"`).join(",");

  const [clases, perfiles] = await Promise.all([
    pedir<FilaClase[]>(
      URL_GESTION,
      CLAVE_GESTION,
      `class_analyses?select=student_id,class_date,analyzed_at&analysis_status=eq.ready&student_id=in.(${lista})&order=analyzed_at.desc`
    ),
    pedir<FilaPerfil[]>(URL_GESTION, CLAVE_GESTION, `vista_perfil_alumno?select=alumno_id,profesor&alumno_id=in.(${lista})`),
  ]);

  const profesorDe = new Map(perfiles.map((p) => [p.alumno_id, (p.profesor ?? "").trim()]));

  let escritos = 0;
  let sinClase = 0;

  for (const bloque of pendientes) {
    const generadoEn = Date.parse(bloque.generado_en);
    // La más reciente analizada antes de generar: `clases` viene de la
    // más nueva a la más vieja, así que la primera que cumpla es esa.
    const clase = clases.find(
      (c) => c.student_id === bloque.alumno_id && Date.parse(c.analyzed_at) <= generadoEn
    );

    const titulo = typeof bloque.contenido.titulo === "string" ? bloque.contenido.titulo : "(sin título)";

    if (!clase) {
      sinClase++;
      console.log(`  — ${bloque.bloque_clave}  «${titulo}»  sin clase analizada antes de ${bloque.generado_en.slice(0, 10)}: se deja sin atribución`);
      continue;
    }

    const claseOrigen = { fecha: clase.class_date.slice(0, 10), profesor: profesorDe.get(bloque.alumno_id) ?? "" };
    console.log(
      `  ✓ ${bloque.bloque_clave}  «${titulo}»  generado ${bloque.generado_en.slice(0, 10)}  ← clase del ${claseOrigen.fecha}${
        claseOrigen.profesor ? ` con ${claseOrigen.profesor}` : " (ficha sin profesor)"
      }`
    );

    if (!ESCRIBE) continue;

    const respuesta = await fetch(
      `${URL_LMS}/rest/v1/bloques_generados?bloque_clave=eq.${encodeURIComponent(bloque.bloque_clave)}`,
      {
        method: "PATCH",
        headers: { ...cabeceras(CLAVE_LMS), Prefer: "return=minimal" },
        body: JSON.stringify({ contenido: { ...bloque.contenido, claseOrigen } }),
      }
    );
    if (!respuesta.ok) {
      throw new Error(`${respuesta.status} al escribir ${bloque.bloque_clave}: ${(await respuesta.text()).slice(0, 200)}`);
    }
    escritos++;
  }

  console.log(
    `\n${ESCRIBE ? `${escritos} bloques escritos` : `${pendientes.length - sinClase} bloques se escribirían`}; ${sinClase} sin clase que atribuir.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
