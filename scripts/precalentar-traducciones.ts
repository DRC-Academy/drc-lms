// ---------------------------------------------------------------
// TRADUCIR EL CATÁLOGO POR ADELANTADO
//
//   npx tsx --require ./scripts/sin-server-only.cjs scripts/precalentar-traducciones.ts
//   npx tsx --require ./scripts/sin-server-only.cjs scripts/precalentar-traducciones.ts --escribir
//
// Sin `--escribir` es un ensayo: dice qué haría y no llama al modelo ni
// toca la base.
//
// ---------------------------------------------------------------
// POR QUÉ ESTOS BLOQUES SÍ Y LOS DEMÁS NO
//
// Los del catálogo (`BLOQUES`, en `lib/data.ts`) son los ÚNICOS que se
// comparten: viven en el código, conservan su clave —'conditionals-2-3'
// y no un 'gen-…'— y se los sirve `app/practica/page.tsx` a todos los
// alumnos de su nivel. Como `traducciones_bloque` va por clave y sin
// alumno, traducirlos una vez aquí significa que NINGÚN alumno espera
// nunca en ellos.
//
// Lo generado no entra, y no es un olvido: cada bloque generado es de un
// alumno y casi de un solo uso, así que precalentarlo es pagar por un
// botón que probablemente nadie pulse. Ese se traduce cuando se pide,
// que es todo el diseño de `app/api/traducir-bloque`.
//
// Y el BANCO tampoco, aunque también viva en el código: `conIdPropio` le
// da una clave nueva en cada entrega, así que la copia que recibe un
// alumno no comparte fila con la que recibe otro. Precalentarlo por su
// clave de código no serviría de nada porque esa clave no llega a
// guardarse en ningún sitio.
//
// SE PUEDE EJECUTAR LAS VECES QUE HAGA FALTA: salta lo que ya está
// traducido. Vuelve a hacer falta al añadir un bloque al catálogo, y al
// cambiar el prompt del traductor si se quiere rehacer lo viejo (para
// eso, borrar antes las filas de `traducciones_bloque`).
// ---------------------------------------------------------------

import { readFileSync } from "node:fs";
import { BLOQUES } from "../lib/data.ts";
import { idiomaDe } from "../lib/traduccion-bloque.ts";
import { MODELO_TRADUCTOR, traducirBloque } from "../lib/traductor.ts";
import { guardarTraduccion, leerTraduccion } from "../lib/traducciones-servidor.ts";

const RUTA_ENV = ".env.local";
const PLAZO_MS = 40_000;

function leerEnv(ruta: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const l = linea.trim();
    if (l === "" || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i === -1) continue;
    salida[l.slice(0, i).trim()] = l
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return salida;
}

async function principal(): Promise<void> {
  const escribir = process.argv.includes("--escribir");
  const env = leerEnv(RUTA_ENV);

  // `lib/supabase-lms.ts` las lee del entorno la primera vez que se pide
  // el cliente, así que basta con dejarlas puestas antes de llamar.
  process.env.LMS_SUPABASE_URL = env.LMS_SUPABASE_URL;
  process.env.LMS_SUPABASE_SERVICE_KEY = env.LMS_SUPABASE_SERVICE_KEY;

  const clave = env.ANTHROPIC_API_KEY;
  if (!clave) throw new Error(`Falta ANTHROPIC_API_KEY en ${RUTA_ENV}`);

  console.log(`${BLOQUES.length} bloques en el catálogo${escribir ? "" : " · ENSAYO, no escribe"}\n`);

  let hechos = 0;
  let saltados = 0;
  let fallados = 0;
  let msTotal = 0;

  for (const bloque of BLOQUES) {
    const destino = idiomaDe(bloque) === "en" ? "es" : "en";
    const etiqueta = `${bloque.id} (${bloque.nivel}, ${bloque.ejercicios.length} ej.) ${idiomaDe(bloque)}→${destino}`;

    const ya = await leerTraduccion(bloque.id, destino);
    if (ya) {
      console.log(`  ·  ${etiqueta} — ya estaba`);
      saltados++;
      continue;
    }

    if (!escribir) {
      console.log(`  →  ${etiqueta} — se traduciría`);
      continue;
    }

    const resultado = await traducirBloque(clave, bloque, destino, PLAZO_MS);

    if (resultado.estado !== "lista") {
      console.log(`  ✗  ${etiqueta} — ${resultado.motivo}`);
      fallados++;
      continue;
    }

    const guardado = await guardarTraduccion(bloque.id, resultado.traduccion, MODELO_TRADUCTOR);
    msTotal += resultado.ms;

    if (!guardado) {
      console.log(`  ✗  ${etiqueta} — traducido pero NO guardado`);
      fallados++;
      continue;
    }

    console.log(
      `  ✓  ${etiqueta} — ${resultado.cadenas} cadenas · ` +
        `${resultado.tandas.buenas}/${resultado.tandas.pedidas} tandas · ${(resultado.ms / 1000).toFixed(1)}s`
    );
    hechos++;
  }

  console.log();
  if (escribir) {
    console.log(
      `traducidos ${hechos} · ya estaban ${saltados} · fallados ${fallados}` +
        (hechos > 0 ? ` · ${(msTotal / 1000).toFixed(1)}s de modelo` : "")
    );
  } else {
    console.log(
      `se traducirían ${BLOQUES.length - saltados}, ya estaban ${saltados}. ` +
        `Repite con --escribir para hacerlo.`
    );
  }
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
