import { describe, expect, it } from "vitest";
import { montar, motivosParaNoEscribir, restosDeFuera, type FuenteAudios } from "./importar-learndash.ts";
import { etiquetaAudio, urlPublica } from "./audios-podbean.ts";
import { sanearHtml } from "../lib/sanear-html.ts";
import type { Zip } from "./learndash-zip.ts";

const URL_BASE = "https://abcdefghijklmnop.supabase.co";
const EPISODIO = "abc12-3def45-pb";

/** El iframe tal como viene en el `post_content` de los quizzes del export. */
const IFRAME = `<iframe title="Listening" allowtransparency="true" height="150" width="100%" style="border: none; min-width: min(100%, 430px);height:150px;" scrolling="no" data-name="pb-iframe-player" src="https://www.podbean.com/player-v2/?i=${EPISODIO}&amp;from=pb6admin&amp;share=1&amp;download=1&amp;rtl=0&amp;fonts=Arial&amp;skin=1&amp;font-color=&amp;logo_link=episode_page&amp;btn-skin=7" loading="lazy" allowfullscreen=""></iframe>`;

/**
 * Un export mínimo: un curso con un módulo, y en el módulo un quiz suelto
 * (lección sintética 30) y, si se pide, un topic (lección 20).
 */
function zipCon(contenidoQuiz: string, contenidoTopic?: string): Zip {
  const jsonl = (filas: unknown[]) => filas.map((f) => JSON.stringify(f)).join("\n");
  const topics = contenidoTopic === undefined ? [] : { "20": { "sfwd-quiz": [] } };
  const archivos: Record<string, string> = {
    "post_type_course.ld": jsonl([
      {
        wp_post: { ID: 1, post_title: "B1 General English", post_excerpt: "" },
        wp_post_meta: { ld_course_steps: [{ steps: { h: { "sfwd-lessons": { "10": { "sfwd-topic": topics, "sfwd-quiz": { "30": {} } } } } } }] },
      },
    ]),
    "post_type_lesson.ld": jsonl([{ wp_post: { ID: 10, post_title: "Week 1" }, wp_post_meta: {} }]),
    "post_type_topic.ld":
      contenidoTopic === undefined ? "" : jsonl([{ wp_post: { ID: 20, post_title: "Roleplay", post_content: contenidoTopic }, wp_post_meta: {} }]),
    "post_type_quiz.ld": jsonl([{ wp_post: { ID: 30, post_title: "Listening task", post_content: contenidoQuiz } }]),
    "proquiz.ld": "",
  };
  return new Map(Object.entries(archivos).map(([nombre, cuerpo]) => [nombre, () => Buffer.from(cuerpo, "utf8")]));
}

const FUENTE: FuenteAudios = { audios: { [EPISODIO]: { ruta: `podbean/${EPISODIO}.mp3` } }, urlBase: URL_BASE };

describe("importar-learndash y los audios", () => {
  it("un iframe de Podbean del zip sale como el <audio> del bucket", () => {
    const datos = montar(zipCon(`<p>Listen and answer.</p>\n${IFRAME}`), FUENTE);
    const [leccion] = datos.filasLeccion;
    const audio = etiquetaAudio(urlPublica(URL_BASE, `podbean/${EPISODIO}.mp3`));

    expect(leccion.contenido).toBe(`<p>Listen and answer.</p>\n${audio}`);
    expect(leccion.contenido).not.toMatch(/podbean\.com|<iframe/i);
    // Y el saneador lo deja pasar tal cual, como en la base.
    expect(sanearHtml(leccion.contenido)).toContain(audio);
    expect(datos.resumen.audios).toBe(1);
    expect(restosDeFuera(datos).podbean).toEqual([]);
    expect(motivosParaNoEscribir(datos, null)).toEqual([]);
  });

  it("también el iframe que viene en el propio topic, no en su quiz", () => {
    const datos = montar(zipCon("", `<p>Listen to the message.</p>\n${IFRAME}`), FUENTE);
    const topic = datos.filasLeccion.find((l) => l.learndash_id === 20);

    expect(topic?.contenido).toBe(`<p>Listen to the message.</p>\n${etiquetaAudio(urlPublica(URL_BASE, `podbean/${EPISODIO}.mp3`))}`);
    expect(motivosParaNoEscribir(datos, null)).toEqual([]);
  });

  it("un episodio que no está en el manifiesto impide escribir", () => {
    const datos = montar(zipCon(IFRAME), { ...FUENTE, audios: {} });

    expect(datos.resumen.audiosSinManifiesto).toEqual([`lección 30: ${EPISODIO}`]);
    const motivos = motivosParaNoEscribir(datos, null);
    expect(motivos).toContain(`episodio sin mp3 en el manifiesto: lección 30: ${EPISODIO}`);
    // El iframe se queda, y la comprobación de restos también lo ve.
    expect(motivos).toContain("queda podbean.com en lección 30 (contenido)");
  });

  it("sin manifiesto tampoco se escribe", () => {
    const datos = montar(zipCon(IFRAME), null);
    const motivos = motivosParaNoEscribir(datos, "Falta import/audios-podbean/manifiesto.json");

    expect(motivos[0]).toBe("Falta import/audios-podbean/manifiesto.json");
    expect(motivos).toContain(`episodio sin mp3 en el manifiesto: lección 30: ${EPISODIO}`);
  });

  it("la carpeta podbean/ de la URL del bucket no cuenta como resto", () => {
    const datos = montar(zipCon(IFRAME), FUENTE);
    expect(datos.filasLeccion[0].contenido).toContain("/audios-curso/podbean/");
    expect(restosDeFuera(datos).podbean).toEqual([]);
  });
});
