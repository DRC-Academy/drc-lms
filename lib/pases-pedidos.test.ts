import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PedidoWoo } from "@/lib/pases-reglas";

const rpc = vi.fn<(nombre: string, p: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>>();
const paseExistente = vi.fn<() => { id: string; estado: string } | null>();
const fichaPorEmail = vi.fn<(email: string) => Promise<{ alumnoId: string } | null>>();
const fichaPorUsuario = vi.fn<(id: number) => Promise<string | null>>();
const productoDe = vi.fn<(id: number) => Promise<unknown>>();
const cola = vi.fn();

vi.mock("@/lib/supabase-lms", () => ({
  baseLms: () => ({
    rpc: (n: string, p: Record<string, unknown>) => rpc(n, p),
    from: () => {
      const cadena = {
        select: () => cadena,
        eq: () => cadena,
        limit: () => cadena,
        returns: () => {
          const fila = paseExistente();
          return Promise.resolve({ data: fila ? [fila] : [], error: null });
        },
      };
      return cadena;
    },
  }),
}));
vi.mock("@/lib/gestion", () => ({ buscarAlumnoPorEmail: (e: string) => fichaPorEmail(e) }));
vi.mock("@/lib/vinculos", () => ({ resolverPorWooUserId: (id: number) => fichaPorUsuario(id) }));
vi.mock("@/lib/segundo-plano", () => ({ enSegundoPlano: (_: string, tarea: () => unknown) => tarea() }));
vi.mock("@/lib/pases-cola", () => ({ procesarCola: (o: unknown) => cola(o) }));
vi.mock("@/lib/woo-api", () => ({
  paseDelPedido: async (p: PedidoWoo) => {
    for (const l of p.lineas) {
      const r = await productoDe(l.productoId);
      if (r) return r;
    }
    return null;
  },
}));

import { procesarPedido } from "@/lib/pases-pedidos";

const pedido = (extra: Partial<PedidoWoo> = {}): PedidoWoo => ({
  id: 1001,
  estado: "processing",
  email: "ana@correo.com",
  nombre: "Ana Ruiz",
  usuarioId: 77,
  pagadoEn: "2026-11-19T10:00:00Z",
  creadoEn: "2026-11-19T09:59:00Z",
  modificadoEn: "2026-11-19T10:00:05Z",
  lineas: [{ productoId: 36964 }],
  reembolsos: 0,
  ...extra,
});

const llamadas = (nombre: string) => rpc.mock.calls.filter(([n]) => n === nombre).map(([, p]) => p);

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (nombre) => {
    if (nombre === "conceder_pase_pedido") return { data: [{ accion: "concedido", pase_id: "p1", alumno_id: "pase-1" }], error: null };
    if (nombre === "revocar_pase") return { data: [{ accion: "revocado", sesiones_revocadas: 1 }], error: null };
    return { data: true, error: null };
  });
  paseExistente.mockReset();
  paseExistente.mockReturnValue(null);
  fichaPorEmail.mockReset();
  fichaPorEmail.mockResolvedValue(null);
  fichaPorUsuario.mockReset();
  fichaPorUsuario.mockResolvedValue(null);
  productoDe.mockReset();
  productoDe.mockResolvedValue({ productoId: 36964, meses: 12, esPrueba: false });
  cola.mockReset();
  cola.mockResolvedValue({ enviados: 1, fallidos: 0 });
});
afterEach(() => vi.restoreAllMocks());

describe("procesar un pedido", () => {
  it("un pedido de otro producto no toca nada", async () => {
    productoDe.mockResolvedValue(null);
    expect((await procesarPedido(pedido(), "webhook")).accion).toBe("no_es_pase");
    expect(rpc).not.toHaveBeenCalled();
    expect(fichaPorEmail).not.toHaveBeenCalled();
  });

  it("pagado: concede, lo apunta y lanza el correo", async () => {
    await procesarPedido(pedido(), "webhook");
    const [p] = llamadas("conceder_pase_pedido");
    expect(p).toMatchObject({ p_wc_order_id: 1001, p_email: "ana@correo.com", p_woo_user_id: 77, p_ficha_id: null, p_meses: 12, p_pagado_en: "2026-11-19T10:00:00Z" });
    expect(llamadas("registrar_pase_log")[0]).toMatchObject({ p_accion: "concedido", p_origen: "webhook", p_estado_wc: "processing" });
    expect(cola).toHaveBeenCalledOnce();
  });

  it("con ficha por email: el pase va a la ficha", async () => {
    fichaPorEmail.mockResolvedValue({ alumnoId: "s_9" });
    await procesarPedido(pedido(), "webhook");
    expect(llamadas("conceder_pase_pedido")[0].p_ficha_id).toBe("s_9");
  });

  it("con otro email de facturación: la encuentra por su usuario de WordPress", async () => {
    fichaPorUsuario.mockResolvedValue("s_7");
    await procesarPedido(pedido(), "webhook");
    expect(fichaPorUsuario).toHaveBeenCalledWith(77);
    expect(llamadas("conceder_pase_pedido")[0].p_ficha_id).toBe("s_7");
  });

  it("repetido: no vuelve a preguntar a Gestión ni a lanzar el correo", async () => {
    paseExistente.mockReturnValue({ id: "p1", estado: "activo" });
    rpc.mockImplementation(async (nombre) =>
      nombre === "conceder_pase_pedido"
        ? { data: [{ accion: "ya_activo", pase_id: "p1", alumno_id: "pase-1" }], error: null }
        : { data: true, error: null }
    );
    expect((await procesarPedido(pedido(), "conciliacion")).accion).toBe("ya_activo");
    expect(fichaPorEmail).not.toHaveBeenCalled();
    expect(cola).not.toHaveBeenCalled();
  });

  it("sin fecha de pago: quien ha pagado entra igual, con alerta", async () => {
    await procesarPedido(pedido({ pagadoEn: null }), "webhook");
    expect(llamadas("conceder_pase_pedido")[0].p_pagado_en).toBe("2026-11-19T09:59:00Z");
    expect(llamadas("registrar_pase_log").some((l) => l.p_alerta === "pedido_sin_fecha_pago")).toBe(true);
  });

  it("reembolso total: quita, sin bloquear", async () => {
    paseExistente.mockReturnValue({ id: "p1", estado: "activo" });
    expect((await procesarPedido(pedido({ estado: "refunded" }), "webhook")).accion).toBe("revocado");
    expect(llamadas("revocar_pase")[0]).toMatchObject({ p_pase_id: "p1", p_por: "woocommerce", p_bloquear: false });
  });

  it("cancelado sin pase: nada que quitar, y se apunta", async () => {
    expect((await procesarPedido(pedido({ estado: "cancelled" }), "webhook")).accion).toBe("sin_accion");
    expect(llamadas("revocar_pase")).toEqual([]);
  });

  it("reembolso parcial: no quita, solo se anota", async () => {
    paseExistente.mockReturnValue({ id: "p1", estado: "activo" });
    rpc.mockImplementation(async (nombre) =>
      nombre === "conceder_pase_pedido"
        ? { data: [{ accion: "ya_activo", pase_id: "p1", alumno_id: "pase-1" }], error: null }
        : { data: true, error: null }
    );
    await procesarPedido(pedido({ estado: "completed", reembolsos: 1 }), "webhook");
    expect(llamadas("revocar_pase")).toEqual([]);
    expect(llamadas("registrar_pase_log")[0].p_accion).toBe("reembolso_parcial");
  });

  it.each(["pending", "failed", "on-hold"])("%s sin pase: no concede, y se apunta para el panel", async (estado) => {
    expect((await procesarPedido(pedido({ estado }), "webhook")).accion).toBe("sin_accion");
    expect(llamadas("conceder_pase_pedido")).toEqual([]);
    expect(llamadas("registrar_pase_log")[0]).toMatchObject({ p_accion: "sin_accion", p_estado_wc: estado });
  });

  it("en espera tras conceder (posible disputa): alerta, no quita", async () => {
    paseExistente.mockReturnValue({ id: "p1", estado: "activo" });
    await procesarPedido(pedido({ estado: "on-hold" }), "conciliacion");
    expect(llamadas("revocar_pase")).toEqual([]);
    expect(llamadas("registrar_pase_log")[0].p_alerta).toBe("espera_tras_conceder");
  });

  it("sin email: no concede, y lo dice", async () => {
    expect((await procesarPedido(pedido({ email: "" }), "webhook")).accion).toBe("error");
    expect(llamadas("conceder_pase_pedido")).toEqual([]);
  });

  it("si la base falla al conceder lanza, para que la conciliación lo repita", async () => {
    rpc.mockImplementation(async (nombre) =>
      nombre === "conceder_pase_pedido" ? { data: null, error: { message: "caída" } } : { data: true, error: null }
    );
    await expect(procesarPedido(pedido(), "webhook")).rejects.toThrow(/caída/);
  });
});
