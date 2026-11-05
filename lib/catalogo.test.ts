import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La caché del catálogo (`leerCatalogo`) se comparte entre TODOS los alumnos.
// Esta prueba mira el código y no el resultado porque lo que protege es qué
// se puede meter ahí: si alguien mete una lectura de un alumno, el fallo no
// se ve en una pantalla, sino en que un alumno recibe los datos de otro.

const fuente = readFileSync("lib/cursos-servidor.ts", "utf8");

/** Cada llamada a `leerCatalogo(...)`, con sus paréntesis equilibrados. */
function llamadas(): string[] {
  const salida: string[] = [];
  const buscar = /\bleerCatalogo\(/g;
  let m: RegExpExecArray | null;
  while ((m = buscar.exec(fuente))) {
    let i = m.index + m[0].length;
    for (let abiertos = 1; abiertos > 0 && i < fuente.length; i++) {
      if (fuente[i] === "(") abiertos++;
      if (fuente[i] === ")") abiertos--;
    }
    salida.push(fuente.slice(m.index, i));
  }
  return salida;
}

describe("la caché del catálogo no guarda nada de un alumno", () => {
  it("sigue usándose para cursos, módulos y lecciones", () => {
    const todas = llamadas().join("\n");
    for (const tabla of ['from("cursos")', 'from("modulos")', 'from("lecciones")']) {
      expect(todas).toContain(tabla);
    }
  });

  it("solo lee tablas del catálogo", () => {
    for (const llamada of llamadas()) {
      const tablas = Array.from(llamada.matchAll(/\.from\("([^"]+)"\)/g), (t) => t[1]);
      expect(tablas.length, llamada).toBe(1);
      expect(["cursos", "modulos", "lecciones"], llamada).toContain(tablas[0]);
    }
  });

  it("ni la clave ni la consulta dependen de un alumno", () => {
    for (const llamada of llamadas()) {
      expect(llamada.toLowerCase(), llamada).not.toContain("alumno");
    }
  });
});
