import { describe, expect, it } from "vitest";
import { episodioDe, etiquetaAudio } from "./audios-podbean.ts";
import { sanearHtml } from "../lib/sanear-html.ts";
import { prepararLeccion, partesDeLeccion } from "../lib/leccion-html.ts";

const SRC = "https://abcdefghijklmnop.supabase.co/storage/v1/object/public/audios-curso/podbean/abc12-3def45-pb.mp3";

describe("audios-podbean", () => {
  it("saca el episodio de los dos reproductores de Podbean", () => {
    expect(
      episodioDe(
        `<iframe title="X" src="https://www.podbean.com/player-v2/?i=abc12-3def45-pb&amp;from=pb6admin&amp;share=1" height="150"></iframe>`
      )
    ).toBe("abc12-3def45-pb");
    expect(episodioDe(`<iframe src="https://www.podbean.com/media/player/abc12-3def45?from=yiiadmin"></iframe>`)).toBe(
      "abc12-3def45"
    );
    expect(episodioDe(`<iframe src="https://www.podbean.com/"></iframe>`)).toBeNull();
  });

  it("el <audio> que pone el script pasa el saneador y la preparación intacto", () => {
    const html = `<p>Listen and answer.</p>\n\n${etiquetaAudio(SRC)}\n\n<p>What is the name?</p>`;
    const saneado = sanearHtml(html);
    expect(saneado).toContain(etiquetaAudio(SRC));
    const { html: preparado } = prepararLeccion(saneado);
    expect(preparado).toContain(etiquetaAudio(SRC));
    const partes = partesDeLeccion(preparado, "Lección");
    expect(partes.map((p) => JSON.stringify(p)).join("")).toContain("audio-ejercicio");
  });

  it("una lección que es solo el audio sigue teniendo su audio", () => {
    const { html } = prepararLeccion(sanearHtml(etiquetaAudio(SRC)));
    expect(html).toContain("<audio");
  });
});
