import { describe, expect, it } from "vitest";
import { leerEventoChat } from "@/lib/eventos-chat";
import { FAQ } from "@/lib/faq";

const UNA = FAQ[0].preguntas[0].id;

describe("leerEventoChat", () => {
  it("acepta los tres eventos del chat", () => {
    expect(leerEventoChat({ tipo: "chat_abierto" })).toEqual({ tipo: "chat_abierto", datos: {} });
    expect(leerEventoChat({ tipo: "chat_pregunta_vista", pregunta: UNA })).toEqual({
      tipo: "chat_pregunta_vista",
      datos: { pregunta: UNA },
    });
    expect(leerEventoChat({ tipo: "chat_a_whatsapp", motivo: "noResuelto", pregunta: UNA })).toEqual({
      tipo: "chat_a_whatsapp",
      datos: { motivo: "noResuelto", pregunta: UNA },
    });
    expect(leerEventoChat({ tipo: "chat_a_whatsapp", motivo: "pedido" })).toEqual({
      tipo: "chat_a_whatsapp",
      datos: { motivo: "pedido" },
    });
  });

  it("no deja pasar texto libre ni ids inventados", () => {
    expect(leerEventoChat({ tipo: "chat_pregunta_vista", pregunta: "no-existe" })).toBeNull();
    expect(leerEventoChat({ tipo: "chat_a_whatsapp", motivo: "otro" })).toBeNull();
    // Lo escrito por el alumno se descarta aunque venga.
    expect(leerEventoChat({ tipo: "chat_a_whatsapp", motivo: "sinRespuesta", escrito: "mi email es…" })).toEqual({
      tipo: "chat_a_whatsapp",
      datos: { motivo: "sinRespuesta" },
    });
  });

  it("los eventos que no son del chat no entran por aquí", () => {
    expect(leerEventoChat({ tipo: "banner_ampliar_clic" })).toBeNull();
    expect(leerEventoChat(null)).toBeNull();
    expect(leerEventoChat("chat_abierto")).toBeNull();
  });
});
