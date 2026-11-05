// ---------------------------------------------------------------
// ¿LA COLUMNA `examen` DICE LO MISMO QUE `detectarExamen`?
//
//   npm run profesores:examen
//
// `vista_alumnos_profesor.examen` es una copia en SQL de la regla de
// `detectarExamen` (`lib/perfil.ts`): es lo que deja elegir el curso de un
// alumno en el panel del profesor sin que el plan llegue a él. Dos copias
// de una regla se separan, y esto lo detecta.
//
// Compara todos los alumnos con asignación activa. Sale con código 1 si
// alguno no coincide. Solo lee, por `soloLectura()`. Escribe ids, no planes.
// ---------------------------------------------------------------

import { readFileSync } from "node:fs";
import { soloLectura } from "@/lib/supabase-server";
import { detectarExamen } from "@/lib/perfil";

for (const linea of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(linea.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

type Fila = Record<string, unknown>;

/** Lo que devuelve `detectarExamen`, traducido a la palabra de la vista. */
const PALABRA: Record<string, string> = {
  b2_first: "first",
  b1_preliminary: "preliminary",
  c1_advanced: "advanced",
  ielts: "ielts",
};

async function todas(vista: "vista_perfil_alumno" | "vista_alumnos_profesor", columnas: string): Promise<Fila[]> {
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await soloLectura(vista)
      .select(columnas)
      .order("alumno_id", { ascending: true })
      .range(desde, desde + 999)
      .returns<Fila[]>();
    if (error) throw new Error(`${vista}: ${error.message}`);
    filas.push(...(data ?? []));
    if ((data ?? []).length < 1000) return filas;
  }
}

async function main() {
  const perfiles = await todas("vista_perfil_alumno", "alumno_id, plan, estado_asignacion");
  const asignados = await todas("vista_alumnos_profesor", "alumno_id, examen");
  const examenDe = new Map(asignados.map((a) => [String(a.alumno_id), a.examen ?? null]));

  const activos = perfiles.filter((p) => p.estado_asignacion === "active");
  const distintos: string[] = [];
  const faltan: string[] = [];
  const reparto = new Map<string, number>();

  for (const perfil of activos) {
    const id = String(perfil.alumno_id);
    if (!examenDe.has(id)) {
      faltan.push(id);
      continue;
    }
    const detectado = detectarExamen(String(perfil.plan ?? ""));
    const esperado = detectado ? PALABRA[detectado] : null;
    const enLaVista = examenDe.get(id) ?? null;
    reparto.set(String(enLaVista), (reparto.get(String(enLaVista)) ?? 0) + 1);
    if (enLaVista !== esperado) distintos.push(`${id}: vista=${enLaVista} detectarExamen=${esperado}`);
  }

  console.log(`Alumnos activos: ${activos.length} · filas en la vista: ${asignados.length}`);
  console.log("Reparto:", Object.fromEntries(reparto));
  console.log(`Sin fila en la vista: ${faltan.length}${faltan.length ? ` (${faltan.join(", ")})` : ""}`);
  console.log(`Distintos: ${distintos.length}`);
  distintos.forEach((d) => console.log(`  ${d}`));

  if (distintos.length > 0 || faltan.length > 0) process.exit(1);
  console.log("OK: la columna coincide con detectarExamen en todos.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
