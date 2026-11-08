import { describe, expect, it } from "vitest";
import { sanearHtml, tieneContenido } from "./sanear-html";

const BUENO =
  "https://abcdefghijklmnop.supabase.co/storage/v1/object/public/audios-curso/podbean/abc12-3def45.mp3";

describe("sanearHtml y los audios del curso", () => {
  it("deja pasar el <audio> del bucket del curso", () => {
    const html = `<p>Listen:</p><audio class="audio-ejercicio" controls preload="metadata" src="${BUENO}"></audio>`;
    expect(sanearHtml(html)).toBe(html);
  });

  it("quita un <audio> de cualquier otro sitio, con su contenido", () => {
    const html = `<p>a</p><audio controls src="https://malo.example.com/x.mp3">texto</audio><p>b</p>`;
    expect(sanearHtml(html)).toBe("<p>a</p><p>b</p>");
  });

  it("quita un <audio> de otro bucket del mismo proyecto", () => {
    const html = `<audio controls src="https://abcdefghijklmnop.supabase.co/storage/v1/object/public/otro/x.mp3"></audio>`;
    expect(sanearHtml(html)).toBe("");
  });

  it("quita los <source> y los <audio> sin cerrar", () => {
    expect(sanearHtml(`<source src="https://malo.example.com/x.mp3">`)).toBe("");
    expect(sanearHtml(`<p>a</p><audio src="https://malo.example.com/x.mp3"><p>b</p>`)).toBe("<p>a</p><p>b</p>");
  });

  it("quita los manejadores también en el <audio> bueno", () => {
    const html = `<audio controls src="${BUENO}" onplay="alert(1)"></audio>`;
    expect(sanearHtml(html)).toBe(`<audio controls src="${BUENO}"></audio>`);
  });

  it("mientras dura el cambio, el iframe de Podbean sigue pasando", () => {
    const html = `<iframe src="https://www.podbean.com/player-v2/?i=abc12-3def45-pb" height="150"></iframe>`;
    expect(sanearHtml(html)).toBe(html);
  });

  it("una lección que solo tiene el audio tiene contenido", () => {
    expect(tieneContenido(`<audio controls src="${BUENO}"></audio>`)).toBe(true);
  });
});
