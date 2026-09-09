// ---------------------------------------------------------------
// TRADUCIR DE UNA VEZ LOS BLOQUES QUE YA ESTÁN GENERADOS
//
//   node scripts/traducir-bloques.ts              → ensayo, no escribe
//   node scripts/traducir-bloques.ts --escribir   → traduce y guarda
//
// `lib/traductor.ts` lleva `server-only`, así que hay que arrancarlo con
// el puente de `sin-server-only.cjs`:
//
//   npx tsx --require ./scripts/sin-server-only.cjs scripts/traducir-bloques.ts
//
// ---------------------------------------------------------------
// POR QUÉ HACE FALTA
//
// El título y la intro de un bloque los escribe el modelo, así que no
// están en el diccionario: se traducen con `lib/traductor.ts` y la
// traducción vive en `traducciones_bloque`.
//
// Ese mecanismo es BAJO DEMANDA: lo dispara el visor al abrir un bloque
// en el otro idioma. Y por eso solo cubría lo que alguien había abierto
// — de los 21 bloques en español que había, uno.
//
// Los otros veinte se leen en la tarjeta de la ruta, en «Paradas
// hechas» y en la rejilla de generados, que son LISTAS. Ahí no se puede
// pedir la traducción al pintar sin encadenar una llamada al modelo por
// bloque en pantalla. Así que se pagan una vez, aquí, y las páginas las
// reparten con una sola consulta (`bloquesEnIdioma`).
//
// ES UN ARRASTRE, NO UN PASO DEL FLUJO. Los bloques nuevos nacen ya en
// el idioma del alumno, así que esto es para los de antes. Se puede
// volver a correr sin miedo: salta lo que ya esté traducido.
//
// SOLO EL ANDAMIO, NUNCA EL MATERIAL. La regla la impone
// `lib/traduccion-bloque.ts` y aquí no se toca: el enunciado, las
// opciones y las respuestas ni salen ni vuelven, así que ninguna
// traducción puede cambiar cuál era la respuesta buena.
//
// SOBRE LOS NOMBRES EN EL INFORME: se imprime el título del bloque, que
// es material didáctico, y el id. Ningún dato del alumno.
// ---------------------------------------------------------------

import { resolve } from "node:path";
import { leerEnv } from "./learndash-zip.ts";
import { conTraduccion, idiomaDe, type IdiomaBloque } from "../lib/traduccion-bloque.ts";
import { traducirBloque, MODELO_TRADUCTOR } from "../lib/traductor.ts";
import { BLOQUES, type Bloque } from "../lib/data.ts";
import { BANCO } from "../lib/banco.ts";

const env = { ...leerEnv(resolve(process.cwd(), ".env.local")), ...process.env };

const URL_LMS = env.LMS_SUPABASE_URL ?? "";
const CLAVE_LMS = env.LMS_SUPABASE_SERVICE_KEY ?? "";
const CLAVE_IA = (env.ANTHROPIC_API_KEY ?? "").trim();

/** Lo que se le da al modelo por bloque. Va holgado: aquí nadie espera. */
const PLAZO_MS = 60_000;

const ESCRIBE = process.argv.includes("--escribir");

const cabeceras = (): Record<string, string> => ({
  apikey: CLAVE_LMS,
  Authorization: `Bearer ${CLAVE_LMS}`,
});

async function pedir<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(`${URL_LMS}/rest/v1/${ruta}`, { headers: cabeceras() });
  if (!respuesta.ok) {
    throw new Error(`${respuesta.status} en ${ruta}: ${(await respuesta.text()).slice(0, 200)}`);
  }
  return (await respuesta.json()) as T;
}

type FilaBloque = { bloque_clave: string; contenido: unknown; generado_en: string };
type FilaTraduccion = { bloque_clave: string; idioma: string };

async function main() {
  if (!URL_LMS || !CLAVE_LMS) {
    console.error("Falta LMS_SUPABASE_URL o LMS_SUPABASE_SERVICE_KEY.");
    process.exit(1);
  }

  console.log(ESCRIBE ? "MODO ESCRITURA\n" : "ENSAYO: no se escribe nada. Usa --escribir.\n");

  const filas = await pedir<FilaBloque[]>(
    "bloques_generados?select=bloque_clave,contenido,generado_en&order=generado_en.asc&limit=2000"
  );
  const hechas = await pedir<FilaTraduccion[]>(
    "traducciones_bloque?select=bloque_clave,idioma&limit=5000"
  );

  const yaEsta = new Set(hechas.map((f) => `${f.bloque_clave}|${f.idioma}`));
  const pendientes: { clave: string; bloque: Bloque; destino: IdiomaBloque }[] = [];

  // EL CATÁLOGO Y EL BANCO VAN PRIMERO, y valen para todos: su id es
  // estable —lo pone el código— así que una sola traducción sirve para
  // cualquier alumno que lo abra. Los generados, en cambio, llevan un id
  // propio cada uno y hay que traducirlos de uno en uno.
  for (const bloque of [...BLOQUES, ...BANCO]) {
    const destino: IdiomaBloque = idiomaDe(bloque) === "en" ? "es" : "en";
    if (yaEsta.has(`${bloque.id}|${destino}`)) continue;
    pendientes.push({ clave: bloque.id, bloque, destino });
  }

  for (const fila of filas) {
    const crudo = typeof fila.contenido === "string" ? JSON.parse(fila.contenido) : fila.contenido;
    const bloque = crudo as Bloque | null;
    if (!bloque || !Array.isArray(bloque.ejercicios)) continue;

    // El id que vale es `bloque_clave`: es con el que se guarda y se
    // busca la traducción, y el que trae el JSON puede ser el del banco.
    const conClave: Bloque = { ...bloque, id: fila.bloque_clave };
    const destino: IdiomaBloque = idiomaDe(conClave) === "en" ? "es" : "en";

    if (yaEsta.has(`${fila.bloque_clave}|${destino}`)) continue;
    pendientes.push({ clave: fila.bloque_clave, bloque: conClave, destino });
  }

  console.log(`catálogo y banco:    ${BLOQUES.length + BANCO.length}`);
  console.log(`bloques guardados:   ${filas.length}`);
  console.log(`traducciones hechas: ${hechas.length}`);
  console.log(`pendientes:          ${pendientes.length}\n`);

  if (pendientes.length === 0) {
    console.log("No hay nada que traducir.");
    return;
  }

  for (const p of pendientes) {
    console.log(`  ${p.clave}  ${idiomaDe(p.bloque)} → ${p.destino}  ${p.bloque.titulo}`);
  }

  if (!ESCRIBE) {
    console.log("\nEnsayo terminado. Repite con --escribir para traducir de verdad.");
    return;
  }

  if (!CLAVE_IA) {
    console.error("\nFalta ANTHROPIC_API_KEY: sin ella no hay a quién pedirle la traducción.");
    process.exit(1);
  }

  console.log("");
  let bien = 0;
  let mal = 0;

  // DE UNO EN UNO, a propósito. Cada bloque ya se reparte en tandas
  // paralelas dentro de `traducirBloque`; lanzar además veinte bloques a
  // la vez es la forma de comerse el límite de la API y perder la mitad.
  for (const p of pendientes) {
    const resultado = await traducirBloque(CLAVE_IA, p.bloque, p.destino, PLAZO_MS);

    if (resultado.estado === "no-disponible") {
      console.error(`  ✗ ${p.clave}: ${resultado.motivo} (${resultado.ms}ms)`);
      mal++;
      continue;
    }

    const guardado = await fetch(`${URL_LMS}/rest/v1/traducciones_bloque`, {
      method: "POST",
      headers: {
        ...cabeceras(),
        "content-type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        bloque_clave: p.clave,
        idioma: p.destino,
        contenido: resultado.traduccion,
        modelo: MODELO_TRADUCTOR,
      }),
    });

    if (!guardado.ok) {
      console.error(`  ✗ ${p.clave}: no se pudo guardar (${guardado.status})`);
      mal++;
      continue;
    }

    // Se comprueba LO QUE VA A VER EL ALUMNO, no lo que devolvió el
    // modelo: si el título vuelve igual, la traducción existe pero no
    // sirve, y eso hay que verlo aquí y no en la pantalla.
    const mostrado = conTraduccion(p.bloque, resultado.traduccion, p.destino);
    const cambio = mostrado.titulo !== p.bloque.titulo;

    console.log(
      `  ${cambio ? "✓" : "·"} ${p.clave}: ${resultado.cadenas} cadenas, ${resultado.ms}ms` +
        `  «${mostrado.titulo}»${cambio ? "" : "  ← el título no cambió, revísalo"}`
    );
    bien++;
  }

  console.log(`\nTraducidos ${bien}, fallaron ${mal}.`);
  if (mal > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
