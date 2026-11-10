// ---------------------------------------------------------------
// LOS AUDIOS DEL CURSO, DE PODBEAN A SUPABASE STORAGE
//
// Todo el audio del curso (los 98 ejercicios de listening) eran iframes
// de Podbean dentro de `lecciones.contenido`, importados tal cual de
// LearnDash. Podbean cuesta un plan mensual solo para eso. Este script
// copia cada mp3 a un bucket público de Supabase Storage del proyecto
// del LMS y cambia cada iframe por un `<audio controls>` propio.
//
// Se ejecuta a mano, como `importar-learndash.ts`, con las claves del
// LMS en `.env.local` (LMS_SUPABASE_URL y LMS_SUPABASE_SERVICE_KEY):
//
//   node scripts/audios-podbean.ts listar        → qué lecciones llevan Podbean y el mp3 de cada una
//   node scripts/audios-podbean.ts subir         → descarga los mp3 y los sube al bucket
//   node scripts/audios-podbean.ts sustituir     → ensayo: enseña qué cambiaría, no escribe
//   node scripts/audios-podbean.ts sustituir --escribir
//   node scripts/audios-podbean.ts comprobar     → nada de Podbean y cada audio responde 200
//   node scripts/audios-podbean.ts deshacer <copia.json> [--escribir]
//
// Todo lo que genera va a `import/audios-podbean/`, que no se versiona.
//
// `sustituir --escribir` guarda antes una copia con el `contenido`
// original de cada lección que va a tocar, y `deshacer` lo devuelve tal
// cual. PODBEAN SE CANCELÓ EL 10/11/2026: `deshacer` ya no sirve (dejaría
// iframes que no suenan) y `listar`/`subir` ya no tienen de dónde leer.
// Lo que sigue vivo es `comprobar` y `cambiarIframesPorAudio`, que usa
// también `importar-learndash.ts`.
//
// Ver `docs/audios-curso.md`.
// ---------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { leerEnv } from "./learndash-zip.ts";
import { BUCKET_AUDIOS, sanearHtml } from "../lib/sanear-html.ts";

const RUTA_ENV = ".env.local";
const CARPETA = "import/audios-podbean";
export const MANIFIESTO = join(CARPETA, "manifiesto.json");
const CARPETA_MP3 = join(CARPETA, "mp3");

/** El iframe entero, con su cierre o sin él. */
const IFRAME_PODBEAN = /<iframe\b[^>]*podbean\.com[^>]*>(?:[\s\S]*?<\/iframe\s*>)?/gi;

export type Audio = {
  /** El `i=` del reproductor de Podbean, p. ej. `abc12-3def45-pb`. */
  episodio: string;
  /** El mp3 original en el CDN de Podbean. */
  mp3: string;
  /** Ruta dentro del bucket. */
  ruta: string;
};

type Entrada = {
  leccionId: string;
  titulo: string;
  iframes: { html: string; episodio: string | null }[];
};

export type Manifiesto = {
  generado: string;
  lecciones: Entrada[];
  audios: Record<string, Audio>;
  errores: string[];
};

// ---------------------------------------------------------------

function base(): { cliente: SupabaseClient; url: string } {
  const env = leerEnv(RUTA_ENV);
  const url = env.LMS_SUPABASE_URL?.replace(/\/+$/, "");
  const clave = env.LMS_SUPABASE_SERVICE_KEY;
  if (!url || !clave) throw new Error("Faltan LMS_SUPABASE_URL o LMS_SUPABASE_SERVICE_KEY en .env.local");
  const cliente = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  return { cliente, url };
}

export const urlPublica = (url: string, ruta: string): string =>
  `${url}/storage/v1/object/public/${BUCKET_AUDIOS}/${ruta}`;

/** El `<audio>` que sustituye al iframe. Debe pasar `sanearHtml` intacto. */
export function etiquetaAudio(src: string): string {
  return `<audio class="audio-ejercicio" controls preload="metadata" src="${src}"></audio>`;
}

/**
 * El episodio sale del `src` del iframe. Hay dos formas de reproductor:
 *   https://www.podbean.com/player-v2/?i=abc12-3def45-pb&...
 *   https://www.podbean.com/media/player/abc12-3def45?...
 */
export function episodioDe(iframe: string): string | null {
  const src = iframe.match(/\ssrc\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.replace(/&amp;/g, "&");
  if (!src) return null;
  const i = src.match(/[?&]i=([a-z0-9-]+)/i)?.[1];
  if (i) return i;
  const ruta = src.match(/\/media\/player\/([a-z0-9-]+)/i)?.[1];
  return ruta ?? null;
}

/**
 * Cambia cada iframe de Podbean por el `<audio>` de su episodio en el
 * bucket. Un iframe cuyo episodio no esté en `audios` se deja tal cual y
 * se devuelve en `sinAudio`: quien llama decide si eso basta para parar.
 * Lo usan `sustituir` y `importar-learndash.ts`, para que el importador
 * escriba exactamente lo mismo que dejó este script.
 */
export function cambiarIframesPorAudio(
  html: string,
  audios: Record<string, Pick<Audio, "ruta">>,
  url: string
): { html: string; sinAudio: string[] } {
  const sinAudio: string[] = [];
  const salida = html.replace(IFRAME_PODBEAN, (iframe) => {
    const ep = episodioDe(iframe);
    const a = ep ? audios[ep] : undefined;
    if (!a) {
      sinAudio.push(ep ?? `iframe sin episodio reconocible: ${iframe.slice(0, 120)}`);
      return iframe;
    }
    return etiquetaAudio(urlPublica(url, a.ruta));
  });
  return { html: salida, sinAudio };
}

/**
 * El reproductor de Podbean pide su configuración a
 * `https://www.podbean.com/player/<episodio>` y esa respuesta es un JSON
 * con `episodes[0].resource`: el mp3. Se prueba con el id tal cual y
 * con el sufijo `-pb`, que unos reproductores llevan y otros no.
 */
async function mp3De(episodio: string): Promise<string> {
  const candidatos = episodio.endsWith("-pb") ? [episodio] : [episodio, `${episodio}-pb`];
  for (const id of candidatos) {
    const r = await fetch(`https://www.podbean.com/player/${id}`, {
      headers: { "user-agent": "Mozilla/5.0 (drc-lms audios-podbean)" },
    });
    if (!r.ok) continue;
    try {
      const datos = (await r.json()) as { episodes?: { resource?: string }[] };
      const mp3 = datos.episodes?.[0]?.resource;
      if (mp3 && /^https:\/\/[a-z0-9.-]*podbean\.com\//i.test(mp3)) return mp3;
    } catch {
      // No era JSON: se prueba el siguiente.
    }
  }
  throw new Error(`Podbean no devuelve el mp3 de ${episodio}`);
}

export const leerManifiesto = (): Manifiesto => {
  if (!existsSync(MANIFIESTO)) throw new Error(`No existe ${MANIFIESTO}: corre antes "listar"`);
  return JSON.parse(readFileSync(MANIFIESTO, "utf8")) as Manifiesto;
};

async function leccionesConPodbean(cliente: SupabaseClient): Promise<{ id: string; titulo: string; contenido: string }[]> {
  const salida: { id: string; titulo: string; contenido: string }[] = [];
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await cliente
      .from("lecciones")
      .select("id, titulo, contenido")
      .ilike("contenido", "%podbean.com%")
      .order("id")
      .range(desde, desde + 499);
    if (error) throw new Error(`lecciones: ${error.message}`);
    salida.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return salida;
}

/** Los ejercicios no deberían llevar audio, pero se comprueba. */
async function ejerciciosConPodbean(cliente: SupabaseClient): Promise<number> {
  const { count, error } = await cliente
    .from("ejercicios_leccion")
    .select("id", { count: "exact", head: true })
    .or("enunciado.ilike.%podbean.com%,explicacion.ilike.%podbean.com%");
  if (error) throw new Error(`ejercicios_leccion: ${error.message}`);
  return count ?? 0;
}

/**
 * Cambia el `contenido` de una lección solo si sigue siendo `esperado`.
 * Se compara aquí y no con un filtro de la API porque el contenido entero
 * en la URL de la petición puede pasar del tamaño que acepta.
 */
async function cambiarSiSigueIgual(
  cliente: SupabaseClient,
  id: string,
  esperado: string,
  nuevo: string
): Promise<boolean> {
  const { data, error } = await cliente.from("lecciones").select("contenido").eq("id", id).single();
  if (error) throw new Error(`leer ${id}: ${error.message}`);
  if (data.contenido !== esperado) return false;
  const { error: errUpdate } = await cliente.from("lecciones").update({ contenido: nuevo }).eq("id", id);
  if (errUpdate) throw new Error(`update ${id}: ${errUpdate.message}`);
  return true;
}

// ---------------------------------------------------------------

async function listar(): Promise<void> {
  const { cliente } = base();
  mkdirSync(CARPETA, { recursive: true });

  const filas = await leccionesConPodbean(cliente);
  const enEjercicios = await ejerciciosConPodbean(cliente);
  const manifiesto: Manifiesto = { generado: new Date().toISOString(), lecciones: [], audios: {}, errores: [] };

  for (const f of filas) {
    const iframes = (f.contenido.match(IFRAME_PODBEAN) ?? []).map((html) => ({ html, episodio: episodioDe(html) }));
    manifiesto.lecciones.push({ leccionId: f.id, titulo: f.titulo, iframes });
    for (const i of iframes) {
      if (!i.episodio) {
        manifiesto.errores.push(`${f.id} (${f.titulo}): iframe sin episodio reconocible: ${i.html.slice(0, 160)}`);
        continue;
      }
      if (manifiesto.audios[i.episodio]) continue;
      try {
        const mp3 = await mp3De(i.episodio);
        const extension = mp3.match(/\.(mp3|m4a)(?:\?|$)/i)?.[1]?.toLowerCase() ?? "mp3";
        manifiesto.audios[i.episodio] = { episodio: i.episodio, mp3, ruta: `podbean/${i.episodio}.${extension}` };
      } catch (e) {
        manifiesto.errores.push(`${f.id} (${f.titulo}): ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  if (enEjercicios > 0) manifiesto.errores.push(`${enEjercicios} ejercicios llevan Podbean en el enunciado o la explicación: revisar a mano`);
  writeFileSync(MANIFIESTO, JSON.stringify(manifiesto, null, 1));

  const totalIframes = manifiesto.lecciones.reduce((n, l) => n + l.iframes.length, 0);
  console.log(`Lecciones con Podbean : ${manifiesto.lecciones.length}`);
  console.log(`Iframes               : ${totalIframes}`);
  console.log(`Episodios distintos   : ${Object.keys(manifiesto.audios).length}`);
  console.log(`Errores               : ${manifiesto.errores.length}`);
  for (const e of manifiesto.errores) console.log(`  - ${e}`);
  console.log(`Manifiesto en ${MANIFIESTO}`);
}

async function subir(): Promise<void> {
  const { cliente, url } = base();
  const manifiesto = leerManifiesto();
  mkdirSync(CARPETA_MP3, { recursive: true });

  // El bucket, público y solo para audio. Si ya existe, se deja.
  const { data: buckets, error: errBuckets } = await cliente.storage.listBuckets();
  if (errBuckets) throw new Error(`listBuckets: ${errBuckets.message}`);
  if (!buckets?.some((b) => b.name === BUCKET_AUDIOS)) {
    const { error } = await cliente.storage.createBucket(BUCKET_AUDIOS, {
      public: true,
      allowedMimeTypes: ["audio/mpeg", "audio/mp4", "audio/x-m4a"],
      fileSizeLimit: "50MB",
    });
    if (error) throw new Error(`createBucket: ${error.message}`);
    console.log(`Bucket ${BUCKET_AUDIOS} creado (público)`);
  }

  let subidos = 0;
  let yaEstaban = 0;
  const fallos: string[] = [];
  for (const a of Object.values(manifiesto.audios)) {
    const local = join(CARPETA_MP3, a.ruta.replace(/^podbean\//, ""));
    try {
      if (!existsSync(local) || statSync(local).size === 0) {
        const r = await fetch(a.mp3);
        if (!r.ok) throw new Error(`descarga ${r.status}`);
        const tipo = r.headers.get("content-type") ?? "";
        if (!/audio|octet-stream/i.test(tipo)) throw new Error(`descarga con content-type ${tipo}`);
        writeFileSync(local, Buffer.from(await r.arrayBuffer()));
      }
      const cuerpo = readFileSync(local);
      const tipo = a.ruta.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
      const { error } = await cliente.storage.from(BUCKET_AUDIOS).upload(a.ruta, cuerpo, {
        contentType: tipo,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error && !/exists|duplicate/i.test(error.message)) throw new Error(`subida: ${error.message}`);
      if (error) yaEstaban++;
      else subidos++;

      const cabeza = await fetch(urlPublica(url, a.ruta), { method: "HEAD" });
      if (!cabeza.ok) throw new Error(`la URL pública responde ${cabeza.status}`);
    } catch (e) {
      fallos.push(`${a.episodio}: ${(e as Error).message}`);
    }
  }

  console.log(`Subidos ${subidos}, ya estaban ${yaEstaban}, fallos ${fallos.length}`);
  for (const f of fallos) console.log(`  - ${f}`);
  if (fallos.length > 0) process.exitCode = 1;
}

async function sustituir(escribir: boolean): Promise<void> {
  const { cliente, url } = base();
  const manifiesto = leerManifiesto();

  // Se relee la base: el manifiesto dice qué mp3 es cada episodio, pero el
  // contenido que se cambia es el de ahora, no el del día de "listar".
  const filas = await leccionesConPodbean(cliente);
  const cambios: { id: string; titulo: string; antes: string; despues: string }[] = [];
  const sinAudio: string[] = [];

  for (const f of filas) {
    const { html: despues, sinAudio: faltan } = cambiarIframesPorAudio(f.contenido, manifiesto.audios, url);
    if (faltan.length > 0) sinAudio.push(`${f.id} (${f.titulo})`);
    if (despues === f.contenido) continue;

    // La red de seguridad: el `<audio>` tiene que sobrevivir al saneador
    // tal cual. Si la URL de Supabase no fuera la que espera (un dominio
    // propio, otro bucket), el alumno se quedaría sin audio.
    const audios = despues.match(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi) ?? [];
    const saneado = sanearHtml(despues);
    if (audios.some((t) => !saneado.includes(t))) {
      throw new Error(`El saneador quita el <audio> de ${f.id}: revisa LMS_SUPABASE_URL y BUCKET_AUDIOS`);
    }
    cambios.push({ id: f.id, titulo: f.titulo, antes: f.contenido, despues });
  }

  console.log(`Lecciones a cambiar        : ${cambios.length}`);
  console.log(`Lecciones con algún iframe sin mp3 subido: ${sinAudio.length}`);
  for (const s of sinAudio) console.log(`  - ${s}`);
  if (cambios[0]) {
    console.log(`\nEjemplo, ${cambios[0].titulo}:`);
    console.log(`  antes  : ${(cambios[0].antes.match(IFRAME_PODBEAN) ?? [""])[0].slice(0, 200)}`);
    console.log(`  después: ${(cambios[0].despues.match(/<audio\b[^>]*><\/audio>/i) ?? [""])[0]}`);
  }

  if (!escribir) {
    console.log("\nEnsayo: no se ha escrito nada. Para aplicarlo, añade --escribir.");
    return;
  }

  mkdirSync(CARPETA, { recursive: true });
  const copia = join(CARPETA, `copia-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(copia, JSON.stringify(cambios.map(({ id, titulo, antes, despues }) => ({ id, titulo, antes, despues })), null, 1));
  console.log(`\nCopia del contenido original en ${copia}`);

  let escritas = 0;
  for (const c of cambios) {
    // Solo si nadie lo ha cambiado desde que se leyó.
    if (!(await cambiarSiSigueIgual(cliente, c.id, c.antes, c.despues))) console.log(`  - ${c.id} (${c.titulo}) cambió mientras tanto: no se toca`);
    else escritas++;
  }
  console.log(`Escritas ${escritas} de ${cambios.length}. Para volver atrás: node scripts/audios-podbean.ts deshacer ${copia} --escribir`);
}

async function deshacer(ruta: string | undefined, escribir: boolean): Promise<void> {
  if (!ruta || !existsSync(ruta)) throw new Error("Falta la ruta de la copia: deshacer import/audios-podbean/copia-….json");
  const { cliente } = base();
  const copia = JSON.parse(readFileSync(ruta, "utf8")) as { id: string; titulo: string; antes: string; despues: string }[];
  console.log(`${copia.length} lecciones en la copia`);
  if (!escribir) {
    console.log("Ensayo: no se ha escrito nada. Para aplicarlo, añade --escribir.");
    return;
  }
  let devueltas = 0;
  for (const c of copia) {
    if (!(await cambiarSiSigueIgual(cliente, c.id, c.despues, c.antes))) console.log(`  - ${c.id} (${c.titulo}) ya no tiene el contenido que dejó el script: no se toca`);
    else devueltas++;
  }
  console.log(`Devueltas ${devueltas} de ${copia.length}`);
}

async function comprobar(): Promise<void> {
  const { cliente } = base();
  const conPodbean = await leccionesConPodbean(cliente);
  const enEjercicios = await ejerciciosConPodbean(cliente);

  const srcs = new Set<string>();
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await cliente
      .from("lecciones")
      .select("contenido")
      .ilike("contenido", `%/${BUCKET_AUDIOS}/%`)
      .order("id")
      .range(desde, desde + 499);
    if (error) throw new Error(`lecciones: ${error.message}`);
    for (const f of data ?? []) {
      for (const m of f.contenido.matchAll(/<audio\b[^>]*\ssrc="([^"]+)"/gi)) srcs.add(m[1]);
    }
    if (!data || data.length < 500) break;
  }

  const rotos: string[] = [];
  for (const src of Array.from(srcs)) {
    const r = await fetch(src, { method: "HEAD" });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !/audio/i.test(tipo)) rotos.push(`${r.status} ${tipo} ${src}`);
  }

  console.log(`Lecciones que aún cargan Podbean : ${conPodbean.length}`);
  for (const l of conPodbean) console.log(`  - ${l.id} (${l.titulo})`);
  console.log(`Ejercicios con Podbean           : ${enEjercicios}`);
  console.log(`Audios en Supabase               : ${srcs.size}`);
  console.log(`Audios que no responden          : ${rotos.length}`);
  for (const r of rotos) console.log(`  - ${r}`);
  if (conPodbean.length > 0 || enEjercicios > 0 || rotos.length > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------

const [orden, ...resto] = process.argv.slice(2);
const escribir = resto.includes("--escribir");
const argumento = resto.find((a) => !a.startsWith("--"));

const acciones: Record<string, () => Promise<void>> = {
  listar,
  subir,
  sustituir: () => sustituir(escribir),
  comprobar,
  deshacer: () => deshacer(argumento, escribir),
};

// Solo se ejecuta como script, no al importarlo desde un test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const accion = orden ? acciones[orden] : undefined;
  if (!accion) {
    console.log("Uso: node scripts/audios-podbean.ts listar | subir | sustituir [--escribir] | comprobar | deshacer <copia.json> [--escribir]");
    process.exitCode = 1;
  } else {
    accion().catch((e) => {
      console.error((e as Error).message);
      process.exitCode = 1;
    });
  }
}
