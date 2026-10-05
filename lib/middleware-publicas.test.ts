import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// La puerta de la calle (`middleware.ts`) con lo que manda un servidor:
// un POST sin cookie, sin `Sec-Fetch-Mode` y sin pedir HTML.
//
// Existe porque los tests de una ruta la llaman directamente y no pasan
// por aquí: `/api/wp/progreso-diploma` tenía todos en verde y en
// producción habría recibido el 401 de «tu sesión ha caducado» en cada
// llamada de WordPress.

function postDeServidor(ruta: string) {
  return new NextRequest(`http://localhost:3001${ruta}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: "{}",
  });
}

/** `NextResponse.next()` deja esta cabecera: la petición sigue hacia la ruta. */
const pasa = (r: Response) => r.headers.get("x-middleware-next") === "1";

describe("middleware: lo que llega de servidor a servidor sin cookie", () => {
  it("deja pasar /api/wp/progreso-diploma", async () => {
    const r = await middleware(postDeServidor("/api/wp/progreso-diploma"));
    expect(r.status).toBe(200);
    expect(pasa(r)).toBe(true);
  });

  it("deja pasar /api/externo, que va por el mismo motivo", async () => {
    expect(pasa(await middleware(postDeServidor("/api/externo/diploma")))).toBe(true);
  });

  it("el resto de la API sigue detrás de la cookie: 401", async () => {
    const r = await middleware(postDeServidor("/api/progreso"));
    expect(r.status).toBe(401);
    expect(pasa(r)).toBe(false);
  });

  it("abrir /api/wp no abre lo que solo empieza igual", async () => {
    const r = await middleware(postDeServidor("/api/wpx"));
    expect(r.status).toBe(401);
  });
});
