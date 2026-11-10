// ---------------------------------------------------------------
// EL BANCO DE LA PRUEBA DE NIVEL, DESDE GESTIÓN
//
//   node scripts/banco-prueba-nivel.mjs "<ruta al repo de Gestión>"            → escribe
//   node scripts/banco-prueba-nivel.mjs "<ruta al repo de Gestión>" --comparar → solo compara
//
// Lee las preguntas ACTIVAS de `level_test_questions` en la base de Gestión
// (SOLO LECTURA: una consulta GET a PostgREST con la clave anónima de su
// `.env.local`) y las deja en `lib/prueba-nivel/banco.json`, ordenadas y con
// las mismas columnas que usa Gestión (`PUBLIC_COLS` + `correct_answer`).
//
// Con --comparar no escribe nada: dice si el banco de Gestión sigue siendo el
// mismo que el del LMS (huella sha256 y diferencias por id). Es lo que hay que
// correr para saber si Gestión cambió alguna pregunta. Sale con código 1 si
// hay diferencias.
// ---------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "lib", "prueba-nivel", "banco.json");

const [repoGestion, modo] = process.argv.slice(2);
if (!repoGestion) {
  console.error('Falta la ruta al repo de Gestión: node scripts/banco-prueba-nivel.mjs "C:/…/academy-scheduler"');
  process.exit(2);
}

const env = {};
for (const linea of readFileSync(join(repoGestion, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const clave = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !clave) {
  console.error("No están NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el .env.local de Gestión.");
  process.exit(2);
}

const COLUMNAS =
  "id,section,cefr_level,difficulty,prompt_text,question_text,options,correct_answer,writing_prompt,writing_min_words";

const respuesta = await fetch(
  `${url}/rest/v1/level_test_questions?select=${COLUMNAS}&is_active=eq.true&order=section.asc,difficulty.asc,id.asc`,
  { headers: { apikey: clave, Authorization: `Bearer ${clave}` } }
);
if (!respuesta.ok) {
  console.error(`Gestión respondió ${respuesta.status}: ${await respuesta.text()}`);
  process.exit(1);
}
const preguntas = await respuesta.json();

// Tal cual llegan, sin normalizar nada (tampoco los CRLF que el editor SQL de
// Supabase mete en los emails): es la copia exacta de lo que sirve Gestión.
const banco = preguntas;

const texto = `${JSON.stringify(banco, null, 2)}\n`;
const huella = createHash("sha256").update(texto).digest("hex");

const porSeccion = {};
for (const p of banco) porSeccion[p.section] = (porSeccion[p.section] ?? 0) + 1;

// `exitCode` y no `process.exit()`: en Windows, salir de golpe con la conexión
// de `fetch` abierta revienta libuv (lo mismo avisa Gestión en check-bank).
if (modo === "--comparar") {
  let actual = null;
  try {
    actual = JSON.parse(readFileSync(destino, "utf8"));
  } catch {
    console.error("No hay lib/prueba-nivel/banco.json que comparar.");
    process.exitCode = 1;
  }
  if (actual) {
    const huellaActual = createHash("sha256").update(readFileSync(destino, "utf8")).digest("hex");
    if (huellaActual === huella) {
      console.log(`✔ Igual que Gestión: ${banco.length} preguntas, sha256 ${huella}`);
    } else {
      const porId = (lista) => new Map(lista.map((p) => [p.id, JSON.stringify(p)]));
      const a = porId(actual);
      const g = porId(banco);
      for (const [id] of g) if (!a.has(id)) console.log(`+ nueva en Gestión: ${id}`);
      for (const [id] of a) if (!g.has(id)) console.log(`- ya no está (o inactiva) en Gestión: ${id}`);
      for (const [id, p] of g) if (a.has(id) && a.get(id) !== p) console.log(`~ cambió: ${id}`);
      console.log(`✘ Distinto. LMS ${huellaActual} · Gestión ${huella}`);
      process.exitCode = 1;
    }
  }
} else {
  writeFileSync(destino, texto);
  console.log(`Escrito lib/prueba-nivel/banco.json: ${banco.length} preguntas`, porSeccion);
  console.log(`sha256 ${huella}`);
}
