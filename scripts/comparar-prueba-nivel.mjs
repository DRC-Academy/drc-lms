// ---------------------------------------------------------------
// ¿SIGUE LA PRUEBA DE NIVEL DEL LMS IGUAL QUE LA DE GESTIÓN?
//
//   node scripts/comparar-prueba-nivel.mjs "<ruta al repo de Gestión>" [commit]
//
// Compara, contra el commit de Gestión que se le diga (por defecto HEAD de
// su rama actual), los archivos copiados en lib/prueba-nivel/gestion/:
//   · los copiados tal cual, byte a byte;
//   · evaluateWriting.ts, sin sus tres líneas de import (cambian las rutas);
//   · server.ts, que es un extracto: que `toPublic` y `pickNext` sigan
//     siendo, letra por letra, los de Gestión.
// El banco de preguntas se compara aparte: scripts/banco-prueba-nivel.mjs
// --comparar. Sale con código 1 si algo difiere.
// ---------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const [repo, commit = "HEAD"] = process.argv.slice(2);
if (!repo) {
  console.error('Falta la ruta al repo de Gestión: node scripts/comparar-prueba-nivel.mjs "C:/…/academy-scheduler"');
  process.exit(2);
}

const deGestion = (ruta) => execFileSync("git", ["-C", repo, "show", `${commit}:${ruta}`], { encoding: "utf8" });
const delLms = (nombre) => readFileSync(join(raiz, "lib", "prueba-nivel", "gestion", nombre), "utf8");

const TAL_CUAL = {
  "types.ts": "lib/levelTest/types.ts",
  "constants.ts": "lib/levelTest/constants.ts",
  "adaptive.ts": "lib/levelTest/adaptive.ts",
  "scoring.ts": "lib/levelTest/scoring.ts",
  "finalResult.ts": "lib/levelTest/finalResult.ts",
  "attemptValidity.ts": "lib/levelTest/attemptValidity.ts",
  "adaptive.test.ts": "lib/levelTest/adaptive.test.ts",
  "attemptValidity.test.ts": "lib/levelTest/attemptValidity.test.ts",
  "constants.test.ts": "lib/levelTest/constants.test.ts",
  "scoring.test.ts": "lib/levelTest/scoring.test.ts",
  "server.test.ts": "lib/levelTest/server.test.ts",
  "textCleanup.ts": "lib/textCleanup.ts",
};

let distintos = 0;
const informe = (ok, que) => {
  console.log(`${ok ? "✔" : "✘"} ${que}`);
  if (!ok) distintos++;
};

for (const [nombre, ruta] of Object.entries(TAL_CUAL)) {
  informe(delLms(nombre) === deGestion(ruta), `${nombre} = ${ruta}`);
}

const sinImports = (texto) => texto.split("\n").filter((l) => !/^import /.test(l)).join("\n");
informe(
  sinImports(delLms("evaluateWriting.ts")) === sinImports(deGestion("lib/evaluateWriting.ts")),
  "evaluateWriting.ts = lib/evaluateWriting.ts (sin los import)"
);

// Las dos funciones del extracto, por su texto: desde su `export function`
// hasta la llave de cierre a principio de línea.
const funcion = (texto, nombre) => {
  const ini = texto.indexOf(`export function ${nombre}(`);
  if (ini === -1) return null;
  const fin = texto.indexOf("\n}\n", ini);
  return texto.slice(ini, fin + 2);
};
const servidorLms = delLms("server.ts");
const servidorGestion = deGestion("lib/levelTest/server.ts");
for (const nombre of ["toPublic", "pickNext"]) {
  const a = funcion(servidorLms, nombre);
  informe(a !== null && a === funcion(servidorGestion, nombre), `server.ts: ${nombre} = el de lib/levelTest/server.ts`);
}

console.log(distintos === 0 ? `\nTodo igual que Gestión (${commit}).` : `\n${distintos} diferencia(s) con Gestión (${commit}).`);
process.exitCode = distintos === 0 ? 0 : 1;
