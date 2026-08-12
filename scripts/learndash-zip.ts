// ---------------------------------------------------------------
// LECTURA DEL EXPORT DE LEARNDASH
//
// Lo que comparten `importar-learndash.ts` (contenido) y
// `migrar-progreso.ts` (progreso): abrir el ZIP y leer sus `.ld`.
//
// SIN DEPENDENCIAS NUEVAS. El ZIP se lee con `node:zlib`, que trae Node:
// un ZIP es un directorio central y una ristra de deflate crudo, y son
// setenta líneas. Añadir un paquete al package.json de la aplicación
// para dos scripts que se ejecutan tres veces en la vida no compensa.
//
// Node 24 ejecuta TypeScript directamente quitando los tipos, así que
// no hace falta ni compilar ni un runner. A cambio, estos archivos solo
// pueden usar sintaxis borrable: nada de `enum`, `namespace` ni
// propiedades de parámetro en constructores. Y los imports entre ellos
// llevan la extensión `.ts` a la vista, que es lo que Node necesita para
// resolverlos; de ahí `allowImportingTsExtensions` en el tsconfig.
// ---------------------------------------------------------------

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

export type Zip = Map<string, () => Buffer>;
export type Registro = Record<string, unknown>;

const FIRMA_EOCD = 0x06054b50;
const FIRMA_CENTRAL = 0x02014b50;

export function abrirZip(ruta: string): Zip {
  const buf = readFileSync(ruta);

  // El fin del directorio central está al final, detrás de un comentario
  // de longitud variable: hay que buscarlo hacia atrás.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === FIRMA_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("ZIP corrupto: no se encontró el directorio central");

  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (p === 0xffffffff) throw new Error("ZIP64 no soportado por este lector");

  const entradas: Zip = new Map();

  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== FIRMA_CENTRAL) throw new Error(`ZIP corrupto en la entrada ${n}`);

    const metodo = buf.readUInt16LE(p + 10);
    const comprimido = buf.readUInt32LE(p + 20);
    const nombreLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comentLen = buf.readUInt16LE(p + 32);
    const offsetLocal = buf.readUInt32LE(p + 42);
    const nombre = buf.toString("utf8", p + 46, p + 46 + nombreLen);

    entradas.set(nombre, () => {
      // La cabecera local tiene su propio campo `extra`, que NO tiene por
      // qué medir lo mismo que el del directorio central. Leerlo del
      // sitio equivocado desplaza el inicio de los datos.
      const nl = buf.readUInt16LE(offsetLocal + 26);
      const el = buf.readUInt16LE(offsetLocal + 28);
      const inicio = offsetLocal + 30 + nl + el;
      const crudo = buf.subarray(inicio, inicio + comprimido);
      return metodo === 0 ? Buffer.from(crudo) : inflateRawSync(crudo);
    });

    p += 46 + nombreLen + extraLen + comentLen;
  }

  return entradas;
}

/** Cada `.ld` es JSONL: un objeto por línea, no un array. */
export function leerJsonl(zip: Zip, archivo: string): Registro[] {
  const leer = zip.get(archivo);
  if (!leer) throw new Error(`Falta ${archivo} en el ZIP`);

  const salida: Registro[] = [];
  const lineas = leer().toString("utf8").split(/\r?\n/);

  for (const linea of lineas) {
    if (linea.trim() === "") continue;
    try {
      salida.push(JSON.parse(linea) as Registro);
    } catch {
      // Una línea ilegible no puede tirar el import entero.
      console.warn(`  aviso: línea no parseable en ${archivo}`);
    }
  }

  return salida;
}

export function leerEnv(ruta: string): Record<string, string> {
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

export const texto = (v: unknown): string => (typeof v === "string" ? v : "");

export const entero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
