// ---------------------------------------------------------------
// APLICAR LAS CORRECCIONES PUNTUALES A LA BASE DE HOY
//
//   node scripts/corregir-ejercicios.ts              → ensayo, no escribe
//   node scripts/corregir-ejercicios.ts --escribir   → escribe de verdad
//
// Los arreglos NO están aquí: están en `correcciones-ejercicios.ts`, que
// es el mismo archivo que lee el importador. Esto solo los lleva a las
// filas que ya existen, para no tener que esperar a la próxima
// reimportación. Ver la cabecera de aquel para por qué hacen falta los
// dos caminos.
//
// SE PUEDE EJECUTAR LAS VECES QUE HAGA FALTA. Las correcciones son
// idempotentes —"no dejes opciones repetidas", "cambia este texto por
// este otro"—, así que la segunda vez no encuentra nada que cambiar y no
// escribe. El ensayo lo dice antes de tocar nada.
//
// ESCRIBE CON `update` Y NO CON `upsert`, a propósito: `update` sobre un
// `learndash_id` que no existe no hace nada, mientras que un `upsert` con
// la fila incompleta crearía un ejercicio suelto, sin lección y sin
// tipo. Aquí no hay nada que crear; solo hay tres filas que retocar.
//
// LO QUE ESTO NO TOCA: `orden`, `tipo`, `explicacion`, `leccion_id` ni
// `learndash_id`. Solo salen los tres campos que las correcciones
// cambian —enunciado, opciones y correcta—, y solo en las filas donde
// de verdad cambia algo.
// ---------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import { leerEnv } from "./learndash-zip.ts";
import { corregir, CORRECCIONES } from "./correcciones-ejercicios.ts";

const RUTA_ENV = ".env.local";

type Fila = {
  id: string;
  learndash_id: number;
  tipo: string;
  enunciado: string;
  opciones: unknown;
  correcta: unknown;
};

const leerOpciones = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : String(x))) : [];

/** Para enseñar un texto largo en una línea del informe. */
const recortar = (t: string, n: number): string =>
  (t.length <= n ? t : t.slice(0, n - 1) + "…").replace(/\n/g, "⏎");

async function principal(): Promise<void> {
  const escribirDeVerdad = process.argv.includes("--escribir");

  console.log("");
  console.log(escribirDeVerdad ? "MODO ESCRITURA" : "MODO ENSAYO (no se escribe nada; usa --escribir)");
  console.log("");

  const env = leerEnv(RUTA_ENV);
  const url = env.LMS_SUPABASE_URL;
  const clave = env.LMS_SUPABASE_SERVICE_KEY;
  if (!url || !clave) throw new Error(`Faltan LMS_SUPABASE_URL o LMS_SUPABASE_SERVICE_KEY en ${RUTA_ENV}`);

  const lms = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });

  const ids = Object.keys(CORRECCIONES).map(Number);
  console.log(`Correcciones en el archivo: ${ids.length}  (learndash_id ${ids.join(", ")})`);
  console.log("");

  const { data, error } = await lms
    .from("ejercicios_leccion")
    .select("id, learndash_id, tipo, enunciado, opciones, correcta")
    .in("learndash_id", ids)
    .returns<Fila[]>();
  if (error) throw new Error(`ejercicios_leccion: ${error.message}`);

  const filas = data ?? [];
  const encontrados = new Set(filas.map((f) => Number(f.learndash_id)));

  // UN PARCHE SIN EJERCICIO ES UN PARCHE MUERTO, y hay que decirlo: o el
  // learndash_id está mal escrito, o ese ejercicio ya no se importa.
  const perdidos = ids.filter((id) => !encontrados.has(id));
  if (perdidos.length > 0) {
    console.log(`⚠ ${perdidos.length} corrección(es) no tienen ejercicio en la base: ${perdidos.join(", ")}`);
    console.log("  O el learndash_id está mal, o ese ejercicio ya no se importa. Revisar.");
    console.log("");
  }

  const aEscribir: { id: string; learndash_id: number; enunciado: string; opciones: string[]; correcta: unknown }[] = [];
  const yaEstaban: number[] = [];
  const avisos: string[] = [];

  for (const f of filas) {
    const learndashId = Number(f.learndash_id);
    const antes = {
      enunciado: f.enunciado,
      opciones: leerOpciones(f.opciones),
      correcta: f.correcta,
    };

    const r = corregir(learndashId, antes);
    avisos.push(...r.avisos);

    if (!r.cambiado) {
      yaEstaban.push(learndashId);
      continue;
    }

    console.log(`--- ${learndashId} (${f.tipo}) ---`);
    for (const h of r.hechas) console.log(`  ${h}`);

    if (r.enunciado !== antes.enunciado) {
      console.log(`    enunciado antes : ${recortar(antes.enunciado, 150)}`);
      console.log(`    enunciado ahora : ${recortar(r.enunciado, 150)}`);
    }
    if (r.opciones.length !== antes.opciones.length) {
      console.log(`    opciones antes  : ${JSON.stringify(antes.opciones.map((o) => recortar(o, 45)))}`);
      console.log(`    opciones ahora  : ${JSON.stringify(r.opciones.map((o) => recortar(o, 45)))}`);
      console.log(`    correcta antes  : ${JSON.stringify(antes.correcta)}`);
      console.log(`    correcta ahora  : ${JSON.stringify(r.correcta)}`);

      // La comprobación que de verdad importa: que la correcta siga
      // señalando el MISMO TEXTO que señalaba antes. Los índices cambian
      // al quitar una opción; la respuesta buena, no.
      const textoDe = (opciones: string[], correcta: unknown): string[] =>
        Array.isArray(correcta)
          ? correcta.filter((v): v is number => typeof v === "number").map((i) => opciones[i] ?? "(fuera de rango)")
          : [];
      const textoAntes = textoDe(antes.opciones, antes.correcta);
      const textoAhora = textoDe(r.opciones, r.correcta);
      const igual = JSON.stringify(textoAntes) === JSON.stringify(textoAhora);
      console.log(`    la correcta sigue siendo la misma respuesta: ${igual ? "sí" : "NO ⚠"}`);
      console.log(`      ${JSON.stringify(textoAhora.map((t) => recortar(t, 60)))}`);
      if (!igual) {
        throw new Error(
          `${learndashId}: la corrección cambiaría cuál es la respuesta correcta ` +
            `(antes ${JSON.stringify(textoAntes)}, ahora ${JSON.stringify(textoAhora)}). ` +
            `No se escribe nada.`
        );
      }
    }
    console.log("");

    aEscribir.push({
      id: f.id,
      learndash_id: learndashId,
      enunciado: r.enunciado,
      opciones: r.opciones,
      correcta: r.correcta,
    });
  }

  for (const a of avisos) console.log(`⚠ ${a}`);
  if (avisos.length > 0) console.log("");

  console.log("=== RESUMEN ===");
  console.log(`  ejercicios encontrados : ${filas.length} de ${ids.length}`);
  console.log(`  ya estaban corregidos  : ${yaEstaban.length}${yaEstaban.length > 0 ? `  (${yaEstaban.join(", ")})` : ""}`);
  console.log(`  por escribir           : ${aEscribir.length}`);
  console.log("");

  if (aEscribir.length === 0) {
    console.log("No hay nada que escribir: la base ya está como dice el archivo de correcciones.");
    console.log("");
    return;
  }

  if (!escribirDeVerdad) {
    console.log("Ensayo terminado. Nada se ha escrito.");
    console.log("");
    return;
  }

  console.log("=== ESCRIBIENDO ===");
  for (const e of aEscribir) {
    const { error: fallo } = await lms
      .from("ejercicios_leccion")
      .update({ enunciado: e.enunciado, opciones: e.opciones, correcta: e.correcta })
      .eq("id", e.id);
    if (fallo) throw new Error(`${e.learndash_id}: ${fallo.message}`);
    console.log(`  ✓ ${e.learndash_id}`);
  }

  console.log("");
  console.log(`Corregidos ${aEscribir.length}. Vuelve a ejecutar esto para comprobar que dice cero.`);
  console.log("");
}

principal().catch((error: unknown) => {
  console.error("");
  console.error("FALLÓ: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
