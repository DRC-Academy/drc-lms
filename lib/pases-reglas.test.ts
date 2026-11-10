import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decidirPedido,
  esReembolsoParcial,
  firmaValida,
  leerMetaProducto,
  leerPedidoWoo,
  productoEsPase,
  PRODUCTO_RESPALDO,
} from "@/lib/pases-reglas";

const meta = (pares: Record<string, unknown>) => Object.entries(pares).map(([clave, valor]) => ({ clave, valor }));

describe("qué producto es un pase", () => {
  it("por metadato, con su duración", () => {
    expect(productoEsPase(1, meta({ _drc_tipo_acceso: "black_pass", _drc_duracion_meses: "12" }))).toEqual({ productoId: 1, meses: 12, esPrueba: false });
    expect(productoEsPase(1, meta({ _drc_tipo_acceso: "BLACK_PASS", _drc_duracion_meses: "6" }))?.meses).toBe(6);
  });

  it("el producto de respaldo lo es aunque no tenga metadatos, con 12 meses", () => {
    expect(productoEsPase(PRODUCTO_RESPALDO, [])).toEqual({ productoId: PRODUCTO_RESPALDO, meses: 12, esPrueba: false });
    expect(productoEsPase(PRODUCTO_RESPALDO, meta({ _drc_duracion_meses: "" }))?.meses).toBe(12);
  });

  it("cualquier otro producto no lo es", () => {
    expect(productoEsPase(35653, [])).toBeNull();
    expect(productoEsPase(35653, meta({ _drc_duracion_meses: "6", _drc_clases_totales: "24" }))).toBeNull();
  });

  it("el metadato manda sobre el ID: se puede sacar el respaldo sin desplegar", () => {
    expect(productoEsPase(PRODUCTO_RESPALDO, meta({ _drc_tipo_acceso: "otro" }))).toBeNull();
  });

  it("el clon de prueba se marca", () => {
    expect(productoEsPase(2, meta({ _drc_tipo_acceso: "black_pass", _drc_prueba: "1" }))?.esPrueba).toBe(true);
  });

  it("una duración sin sentido cae a 12", () => {
    expect(productoEsPase(1, meta({ _drc_tipo_acceso: "black_pass", _drc_duracion_meses: "0" }))?.meses).toBe(12);
    expect(productoEsPase(1, meta({ _drc_tipo_acceso: "black_pass", _drc_duracion_meses: "x" }))?.meses).toBe(12);
  });

  it("lee el meta_data tal como lo da la API, y aguanta lo raro", () => {
    expect(leerMetaProducto({ meta_data: [{ key: "_drc_tipo_acceso", value: "black_pass" }, null] })).toEqual([{ clave: "_drc_tipo_acceso", valor: "black_pass" }]);
    expect(leerMetaProducto(null)).toEqual([]);
  });
});

describe("qué se hace con cada estado", () => {
  it.each([
    ["processing", false, "conceder"],
    ["completed", true, "conceder"],
    ["refunded", true, "revocar"],
    ["cancelled", true, "revocar"],
    ["on-hold", false, "nada"],
    ["pending", false, "nada"],
    ["failed", false, "nada"],
    ["failed", true, "nada"],
    ["on-hold", true, "alerta_espera"],
    ["trash", true, "alerta_papelera"],
    ["trash", false, "nada"],
    ["checkout-draft", false, "nada"],
  ])("%s (con pase: %s) → %s", (estado, activo, esperado) => {
    expect(decidirPedido(estado, activo)).toBe(esperado);
  });

  it("el reembolso parcial no quita: el pedido sigue pagado", () => {
    expect(esReembolsoParcial({ estado: "completed", reembolsos: 1 })).toBe(true);
    expect(decidirPedido("completed", true)).toBe("conceder");
    expect(esReembolsoParcial({ estado: "refunded", reembolsos: 1 })).toBe(false);
    expect(esReembolsoParcial({ estado: "completed", reembolsos: 0 })).toBe(false);
  });
});

describe("leer un pedido de la API", () => {
  const crudo = {
    id: 1001,
    status: "processing",
    customer_id: 77,
    date_paid_gmt: "2026-11-19T10:00:00",
    date_created_gmt: "2026-11-19T09:59:00",
    date_modified_gmt: "2026-11-19T10:00:05",
    billing: { email: " Ana@Correo.COM ", first_name: "Ana", last_name: "Ruiz" },
    line_items: [{ product_id: 36964 }, { product_id: 0 }, null],
    refunds: [{ id: 1 }],
  };

  it("normaliza el email y pone las fechas en UTC", () => {
    const p = leerPedidoWoo(crudo)!;
    expect(p.email).toBe("ana@correo.com");
    expect(p.nombre).toBe("Ana Ruiz");
    expect(p.usuarioId).toBe(77);
    expect(p.pagadoEn).toBe("2026-11-19T10:00:00Z");
    expect(p.lineas).toEqual([{ productoId: 36964 }]);
    expect(p.reembolsos).toBe(1);
  });

  it("sin fecha de pago es null, no una fecha inventada", () => {
    expect(leerPedidoWoo({ ...crudo, date_paid_gmt: null })!.pagadoEn).toBeNull();
    expect(leerPedidoWoo({ ...crudo, date_paid_gmt: "" })!.pagadoEn).toBeNull();
  });

  it("lo que no es un pedido no se lee", () => {
    expect(leerPedidoWoo(null)).toBeNull();
    expect(leerPedidoWoo({})).toBeNull();
    expect(leerPedidoWoo({ id: "x" })).toBeNull();
    expect(leerPedidoWoo({ id: 5 })!.lineas).toEqual([]);
  });
});

describe("la firma del webhook", () => {
  const firmar = (cuerpo: string, secreto: string) => createHmac("sha256", secreto).update(cuerpo, "utf8").digest("base64");

  it("vale con el cuerpo exacto y el secreto", () => {
    expect(firmaValida('{"id":1}', firmar('{"id":1}', "secreto"), "secreto")).toBe(true);
    expect(firmaValida('{"ñ":"é"}', firmar('{"ñ":"é"}', "secreto"), "secreto")).toBe(true);
  });

  it("no vale con otro cuerpo, otro secreto o sin firma", () => {
    expect(firmaValida('{"id":2}', firmar('{"id":1}', "secreto"), "secreto")).toBe(false);
    expect(firmaValida('{"id":1}', firmar('{"id":1}', "otro"), "secreto")).toBe(false);
    expect(firmaValida('{"id":1}', "", "secreto")).toBe(false);
  });
});
