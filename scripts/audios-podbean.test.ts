import { describe, expect, it } from "vitest";
import { episodioDe, etiquetaAudio, IFRAME_PODBEAN } from "./audios-podbean.ts";
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

describe("IFRAME_PODBEAN", () => {
  const cambiar = (html: string) => html.replace(IFRAME_PODBEAN, "[AUDIO]");

  it("cambia el iframe con su cierre", () => {
    expect(cambiar(`<p>a</p><iframe src="https://www.podbean.com/player-v2/?i=x-pb"></iframe><p>b</p>`)).toBe(
      "<p>a</p>[AUDIO]<p>b</p>"
    );
  });

  it("un iframe sin cerrar no se come el texto hasta el siguiente", () => {
    const html =
      `<iframe src="https://www.podbean.com/player-v2/?i=x-pb"><p>Pregunta 1</p>` +
      `<iframe src="https://www.podbean.com/player-v2/?i=y-pb"></iframe><p>Pregunta 2</p>`;
    expect(cambiar(html)).toBe("[AUDIO]<p>Pregunta 1</p>[AUDIO]<p>Pregunta 2</p>");
  });

  it("no toca los iframes de YouTube", () => {
    const html = `<iframe src="https://www.youtube-nocookie.com/embed/x"></iframe>`;
    expect(cambiar(html)).toBe(html);
  });
});
