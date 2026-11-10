import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Las rutas de verdad del Black Pass, con la tienda y la base simuladas.

vi.mock("react", async (original) => ({ ...(await original<object>()), cache: (fn: unknown) => fn }));

const segundoPlano = vi.hoisted(() => ({ pendientes: [] as Promise<unknown>[] }));
vi.mock("@/lib/segundo-plano", () => ({
  enSegundoPlano: (_: string, tarea: () => Promise<unknown>) => {
    segundoPlano.pendientes.push(tarea());
  },
}));

const insertados = vi.hoisted(() => ({ eventos: [] as unknown[] }));
const rpc = vi.fn<(nombre: string, p: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>>();
vi.mock("@/lib/supabase-lms", () => ({
  baseLms: () => ({
    rpc: (n: string, p: Record<string, unknown>) => rpc(n, p),
    from: () => ({
      insert: (fila: unknown) => {
        insertados.eventos.push(fila);
        return { select: () => ({ limit: () => ({ returns: async () => ({ data: [{ id: 7 }], error: null }) }) }) };
      },
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));

const procesarPedido = vi.fn<(pedido: { id: number }, origen: string) => Promise<{ accion: string }>>();
const registrar = vi.fn();
vi.mock("@/lib/pases-pedidos", () => ({
  procesarPedido: (p: { id: number }, o: string) => procesarPedido(p, o),
  registrar: (...a: unknown[]) => registrar(...a),
}));

const leerPedido = vi.fn<(id: number) => Promise<unknown>>();
const paseDelPedido = vi.fn<(p: unknown) => Promise<unknown>>();
const pedidosModificados = vi.fn<(desde: Date, pagina: number) => Promise<unknown[]>>();
vi.mock("@/lib/woo-api", () => ({
  leerPedido: (id: number) => leerPedido(id),
  paseDelPedido: (p: unknown) => paseDelPedido(p),
  traeProductoRespaldo: (p: { lineas: { productoId: number }[] }) => p.lineas.some((l) => l.productoId === 36964),
  pedidosModificados: (d: Date, n: number) => pedidosModificados(d, n),
  estadoDelWebhook: async () => "active",
  PEDIDOS_POR_PAGINA: 100,
}));

const SECRETO = "s".repeat(40);
const firmar = (cuerpo: string) => createHmac("sha256", SECRETO).update(cuerpo, "utf8").digest("base64");

function webhook(cuerpo: string, firma: string | null = firmar(cuerpo)) {
  return new Request("http://localhost/api/woo/pedidos", {
    method: "POST",
    headers: firma === null ? {} : { "x-wc-webhook-signature": firma, "x-wc-webhook-topic": "order.updated" },
    body: cuerpo,
  });
}

const pedidoCrudo = (id = 1001, producto = 36964) => JSON.stringify({ id, status: "processing", billing: { email: "a@b.c" }, line_items: [{ product_id: producto }] });

async function acabarSegundoPlano() {
  await Promise.all(segundoPlano.pendientes);
  segundoPlano.pendientes.length = 0;
}

beforeEach(() => {
  vi.stubEnv("PASES_ACTIVO", "1");
  vi.stubEnv("WOO_WEBHOOK_SECRET", SECRETO);
  vi.stubEnv("CRON_SECRET", "c".repeat(32));
  segundoPlano.pendientes.length = 0;
  insertados.eventos.length = 0;
  rpc.mockReset();
  procesarPedido.mockReset();
  procesarPedido.mockResolvedValue({ accion: "concedido" });
  registrar.mockReset();
  leerPedido.mockReset();
  leerPedido.mockResolvedValue({ id: 1001, estado: "processing" });
  paseDelPedido.mockReset();
  paseDelPedido.mockResolvedValue(null);
  pedidosModificados.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("el webhook de la tienda", () => {
  it("la firma mala es 401 y no toca nada", async () => {
    const { POST } = await import("@/app/api/woo/pedidos/route");
    const r = await POST(webhook(pedidoCrudo(), "firma-mala"));
    expect(r.status).toBe(401);
    expect(insertados.eventos).toEqual([]);
    expect(leerPedido).not.toHaveBeenCalled();
  });

  it("sin firma también", async () => {
    const { POST } = await import("@/app/api/woo/pedidos/route");
    expect((await POST(webhook(pedidoCrudo(), null))).status).toBe(401);
  });

  it("el ping de la tienda es 200, sin firma", async () => {
    const { POST } = await import("@/app/api/woo/pedidos/route");
    expect((await POST(webhook("webhook_id=123", null))).status).toBe(200);
  });

  it("apagado responde 200 sin mirar nada: la tienda no tiene motivo para desactivarlo", async () => {
    vi.stubEnv("PASES_ACTIVO", "0");
    const { POST } = await import("@/app/api/woo/pedidos/route");
    expect((await POST(webhook(pedidoCrudo(), "firma-mala"))).status).toBe(200);
    expect(insertados.eventos).toEqual([]);
  });

  it("del producto: guarda el evento antes de responder y vuelve a leer el pedido de la tienda", async () => {
    const { POST } = await import("@/app/api/woo/pedidos/route");
    const r = await POST(webhook(pedidoCrudo()));
    expect(r.status).toBe(200);
    expect(insertados.eventos).toHaveLength(1);
    await acabarSegundoPlano();
    expect(leerPedido).toHaveBeenCalledWith(1001);
    expect(procesarPedido).toHaveBeenCalledWith({ id: 1001, estado: "processing" }, "webhook");
  });

  it("no se fía del cuerpo: lo que se procesa es lo que dice la tienda", async () => {
    leerPedido.mockResolvedValue({ id: 1001, estado: "refunded" });
    const { POST } = await import("@/app/api/woo/pedidos/route");
    await POST(webhook(pedidoCrudo()));
    await acabarSegundoPlano();
    expect(procesarPedido.mock.calls[0][0]).toMatchObject({ estado: "refunded" });
  });

  it("de otro producto: no se guarda ni un dato suyo", async () => {
    const { POST } = await import("@/app/api/woo/pedidos/route");
    expect((await POST(webhook(pedidoCrudo(2002, 35653)))).status).toBe(200);
    await acabarSegundoPlano();
    expect(insertados.eventos).toEqual([]);
    expect(procesarPedido).not.toHaveBeenCalled();
  });

  it("si la tienda falla al releer sigue siendo 200, y queda apuntado", async () => {
    leerPedido.mockRejectedValue(new Error("sin respuesta"));
    const { POST } = await import("@/app/api/woo/pedidos/route");
    expect((await POST(webhook(pedidoCrudo()))).status).toBe(200);
    await acabarSegundoPlano();
    expect(registrar).toHaveBeenCalledWith("webhook", "error", { pedidoId: 1001, error: "sin respuesta" });
  });

  it("un cuerpo que no es JSON es 200", async () => {
    const { POST } = await import("@/app/api/woo/pedidos/route");
    expect((await POST(webhook("no es json"))).status).toBe(200);
  });
});

describe("la conciliación", () => {
  const cron = (secreto = "c".repeat(32)) =>
    new NextRequest("http://localhost/api/woo/conciliar", { headers: { authorization: `Bearer ${secreto}` } });

  const pedido = (id: number, modificado: string) => ({ id, estado: "processing", modificadoEn: modificado, lineas: [] });

  function conTurno(cursor: string | null) {
    rpc.mockImplementation(async (nombre) =>
      nombre === "tomar_conciliacion" ? { data: cursor ? [{ cursor_en: cursor }] : [], error: null } : { data: null, error: null }
    );
  }
  const cierre = () => rpc.mock.calls.find(([n]) => n === "cerrar_conciliacion")?.[1];

  it("sin el secreto no hace nada", async () => {
    const { GET } = await import("@/app/api/woo/conciliar/route");
    expect((await GET(cron("otro"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("apagada no hace nada", async () => {
    vi.stubEnv("PASES_ACTIVO", "0");
    const { GET } = await import("@/app/api/woo/conciliar/route");
    expect(await (await GET(cron())).json()).toEqual({ apagado: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("si hay otra pasada en marcha, se aparta", async () => {
    conTurno(null);
    const { GET } = await import("@/app/api/woo/conciliar/route");
    expect(await (await GET(cron())).json()).toEqual({ ocupado: true });
    expect(pedidosModificados).not.toHaveBeenCalled();
  });

  it("relee con 15 minutos de solape y avanza el cursor hasta lo último", async () => {
    conTurno("2026-11-19T10:00:00Z");
    pedidosModificados.mockResolvedValue([pedido(1, "2026-11-19T10:01:00Z"), pedido(2, "2026-11-19T10:02:00Z")]);
    const { GET } = await import("@/app/api/woo/conciliar/route");
    await GET(cron());
    expect(pedidosModificados.mock.calls[0][0].toISOString()).toBe("2026-11-19T09:45:00.000Z");
    expect(cierre()).toMatchObject({ p_cursor_en: "2026-11-19T10:02:00.000Z", p_error: null, p_webhook_estado: "active" });
  });

  it("un pedido que falla no se pierde: el cursor se queda antes de él y los demás siguen", async () => {
    conTurno("2026-11-19T10:00:00Z");
    pedidosModificados.mockResolvedValue([pedido(1, "2026-11-19T10:01:00Z"), pedido(2, "2026-11-19T10:02:00Z"), pedido(3, "2026-11-19T10:03:00Z")]);
    procesarPedido.mockImplementation(async (p) => {
      if (p.id === 2) throw new Error("caída");
      return { accion: "concedido" };
    });
    const { GET } = await import("@/app/api/woo/conciliar/route");
    const r = await (await GET(cron())).json();
    expect(procesarPedido).toHaveBeenCalledTimes(3);
    expect(r.fallidos).toBe(1);
    expect(cierre()).toMatchObject({ p_cursor_en: "2026-11-19T10:02:00.000Z", p_error: null });
  });

  it("si la tienda no contesta, el error queda y se cierra el turno", async () => {
    conTurno("2026-11-19T10:00:00Z");
    pedidosModificados.mockRejectedValue(new Error("WooCommerce respondió 503"));
    const { GET } = await import("@/app/api/woo/conciliar/route");
    await GET(cron());
    expect(cierre()).toMatchObject({ p_error: "WooCommerce respondió 503" });
  });

  it("sigue a la página siguiente si la primera viene llena", async () => {
    conTurno("2026-11-19T10:00:00Z");
    const llena = Array.from({ length: 100 }, (_, i) => pedido(i + 1, "2026-11-19T10:01:00Z"));
    pedidosModificados.mockResolvedValueOnce(llena).mockResolvedValueOnce([pedido(101, "2026-11-19T10:05:00Z")]);
    const { GET } = await import("@/app/api/woo/conciliar/route");
    await GET(cron());
    expect(pedidosModificados).toHaveBeenCalledTimes(2);
    expect(procesarPedido).toHaveBeenCalledTimes(101);
  });
});

describe("la puerta de la calle", () => {
  const post = (ruta: string) =>
    new NextRequest(`http://localhost:3001${ruta}`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: "{}" });
  const pasa = (r: Response) => r.headers.get("x-middleware-next") === "1";

  it("deja pasar lo que llega de la tienda y del reloj, sin cookie", async () => {
    expect(pasa(await middleware(post("/api/woo/pedidos")))).toBe(true);
    expect(pasa(await middleware(post("/api/woo/conciliar")))).toBe(true);
    expect(pasa(await middleware(post("/api/woo/cola")))).toBe(true);
  });

  it("no abre lo que solo empieza igual", async () => {
    expect((await middleware(post("/api/wooo"))).status).toBe(401);
  });

  it("el panel y elegir curso siguen detrás de la cookie", async () => {
    const pedir = (ruta: string) => new NextRequest(`http://localhost:3001${ruta}`, { headers: { accept: "text/html" } });
    expect(pasa(await middleware(pedir("/black-pass")))).toBe(false);
    expect(pasa(await middleware(pedir("/elegir-curso")))).toBe(false);
  });
});
