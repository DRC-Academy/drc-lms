import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envio = vi.hoisted(() => ({
  respuesta: { data: { id: "re_1" }, error: null, headers: null } as unknown,
  llamadas: [] as { datos: Record<string, string>; opciones: { idempotencyKey?: string } }[],
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (datos: Record<string, string>, opciones: { idempotencyKey?: string }) => {
        envio.llamadas.push({ datos, opciones });
        return envio.respuesta;
      },
    };
  },
}));

const cola = vi.hoisted(() => ({ filas: [] as { id: string; clave: string; pase_id: string; destinatario: string }[] }));
const pase = vi.hoisted(() => ({ fila: { nombre: "Ana Ruiz", acceso_hasta: "2027-11-19T22:59:59Z", estado: "activo" } as unknown }));
const rpc = vi.fn<(nombre: string, p: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>>();

vi.mock("@/lib/supabase-lms", () => ({
  baseLms: () => ({
    rpc: (n: string, p: Record<string, unknown>) => rpc(n, p),
    from: () => {
      const cadena = {
        select: () => cadena,
        eq: () => cadena,
        limit: () => cadena,
        returns: async () => ({ data: [pase.fila], error: null }),
      };
      return cadena;
    },
  }),
}));

import { procesarCola } from "@/lib/pases-cola";
import { correoAccesoBlackPass } from "@/lib/correo-black-pass";

const llamadas = (nombre: string) => rpc.mock.calls.filter(([n]) => n === nombre).map(([, p]) => p);

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_prueba");
  vi.stubEnv("URL_BASE", "https://drc-lms.vercel.app");
  envio.respuesta = { data: { id: "re_1" }, error: null, headers: null };
  envio.llamadas.length = 0;
  cola.filas = [{ id: "c1", clave: "pase:p1:acceso", pase_id: "p1", destinatario: "ana@correo.com" }];
  pase.fila = { nombre: "Ana Ruiz", acceso_hasta: "2027-11-19T22:59:59Z", estado: "activo" };
  rpc.mockReset();
  rpc.mockImplementation(async (nombre) => {
    if (nombre === "reclamar_correos") return { data: cola.filas.splice(0, 1), error: null };
    if (nombre === "reservar_envio_resend") return { data: 0, error: null };
    return { data: null, error: null };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("la cola", () => {
  it("envía con la clave de idempotencia de la fila y lo confirma", async () => {
    expect(await procesarCola({ limite: 5, plazoMs: 5000 })).toEqual({ enviados: 1, fallidos: 0 });
    expect(envio.llamadas[0].opciones.idempotencyKey).toBe("pase:p1:acceso");
    expect(envio.llamadas[0].datos.to).toBe("ana@correo.com");
    expect(llamadas("correo_enviado")[0]).toEqual({ p_id: "c1", p_resend_id: "re_1" });
  });

  it("respeta el ritmo compartido antes de cada envío", async () => {
    await procesarCola({ limite: 5, plazoMs: 5000 });
    expect(llamadas("reservar_envio_resend")).toHaveLength(1);
  });

  it("ante un 429 vuelve a la cola con el plazo que diga Resend, sin darlo por fallido", async () => {
    envio.respuesta = { data: null, error: { name: "rate_limit_exceeded", message: "demasiado" }, headers: { "retry-after": "7" } };
    expect(await procesarCola({ limite: 5, plazoMs: 5000 })).toEqual({ enviados: 0, fallidos: 1 });
    expect(llamadas("correo_fallido")[0]).toMatchObject({ p_id: "c1", p_espera_segundos: 7, p_definitivo: false });
  });

  it("una dirección rechazada no se reintenta", async () => {
    envio.respuesta = { data: null, error: { name: "validation_error", message: "email malo" }, headers: null };
    await procesarCola({ limite: 5, plazoMs: 5000 });
    expect(llamadas("correo_fallido")[0]).toMatchObject({ p_definitivo: true });
  });

  it("reembolsado mientras esperaba: no se envía", async () => {
    pase.fila = { nombre: "Ana", acceso_hasta: "2027-11-19T22:59:59Z", estado: "revocado" };
    await procesarCola({ limite: 5, plazoMs: 5000 });
    expect(envio.llamadas).toHaveLength(0);
    expect(llamadas("correo_fallido")[0]).toMatchObject({ p_definitivo: true });
  });

  it("sin clave de Resend no se pierde: vuelve a la cola", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await procesarCola({ limite: 5, plazoMs: 5000 });
    expect(llamadas("correo_fallido")[0]).toMatchObject({ p_definitivo: false });
  });

  it("no pasa del límite ni sigue con la cola vacía", async () => {
    cola.filas = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, clave: `k${i}`, pase_id: "p1", destinatario: "a@b.c" }));
    expect((await procesarCola({ limite: 2, plazoMs: 5000 })).enviados).toBe(2);
    cola.filas = [];
    expect((await procesarCola({ limite: 2, plazoMs: 5000 })).enviados).toBe(0);
  });
});

describe("el correo de acceso", () => {
  const correo = () => correoAccesoBlackPass({ nombre: "Ana Ruiz", hasta: new Date("2027-11-19T22:59:59Z") });

  it("no lleva enlace de entrada: lleva a la pantalla donde se pide", () => {
    const { html, text } = correo();
    expect(html).toContain("https://drc-lms.vercel.app/acceso");
    expect(html).not.toContain("/entrar?token");
    expect(text).not.toContain("token");
  });

  it("explica cómo se entra, sin contraseña, y menciona Mi cuenta", () => {
    const { html, text } = correo();
    expect(text).toContain("no necesitas contraseña");
    expect(html).toContain("https://drcacademy.com/mi-cuenta/mis-cursos/");
    expect(text).toContain("Mi cuenta en drcacademy.com");
  });

  it("la fecha es la de Madrid", () => {
    expect(correo().text).toContain("19 de noviembre de 2027");
  });

  it("escapa el nombre, que viene de la facturación", () => {
    expect(correoAccesoBlackPass({ nombre: "<b>Ana</b>", hasta: new Date() }).html).not.toContain("<b>Ana");
  });

  it("sin nombre, el titular sigue teniendo sentido", () => {
    expect(correoAccesoBlackPass({ nombre: null, hasta: new Date() }).subject).toContain("Black Pass");
    expect(correoAccesoBlackPass({ nombre: null, hasta: new Date() }).text).toContain("Ya tienes tu Black Pass");
  });
});
