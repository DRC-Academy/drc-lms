// ---------------------------------------------------------------
// LO QUE LEE EL PANEL /black-pass
//
// Solo del equipo: el guard está en la página. Los emails salen aquí porque
// esta pantalla existe para resolver incidencias de un pedido concreto.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";

export type FilaPanelPase = {
  wc_order_id: number | null;
  pase_id: string | null;
  email: string | null;
  nombre: string | null;
  alumno_id: string | null;
  origen_pase: string | null;
  estado: string | null;
  inicio: string | null;
  acceso_hasta: string | null;
  bloqueado_manual: boolean | null;
  es_prueba: boolean;
  concedido_por: string | null;
  motivo: string | null;
  revocado_en: string | null;
  revocado_por: string | null;
  estado_wc: string | null;
  ultima_accion: string | null;
  ultima_accion_en: string | null;
  ultima_accion_origen: string | null;
  ultimo_error: string | null;
  correo_estado: string | null;
  correo_enviado_en: string | null;
  correo_intentos: number | null;
};

export type AlertaPase = {
  id: number;
  en: string;
  wc_order_id: number | null;
  pase_id: string | null;
  email: string | null;
  estado_wc: string | null;
  alerta: string;
  error: string | null;
};

export type EstadoConciliacion = {
  cursor_en: string;
  ultima_ok_en: string | null;
  ultimo_error: string | null;
  webhook_estado: string | null;
  webhook_visto_en: string | null;
};

export type DatosPanelPases = {
  filas: FilaPanelPase[];
  alertas: AlertaPase[];
  conciliacion: EstadoConciliacion | null;
  correosPendientes: number | null;
};

/** Hasta aquí se enseñan: la venta son unos cientos, y hay buscador. */
const TOPE = 500;

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_,()"]/g, " ").trim();
}

export async function cargarPanelPases(busqueda: string): Promise<DatosPanelPases | null> {
  const cliente = baseLms();
  const termino = escaparLike(busqueda);

  let filas = cliente
    .from("vista_pases_panel")
    .select("*")
    .order("ultima_accion_en", { ascending: false, nullsFirst: false })
    .limit(TOPE);

  if (termino !== "") {
    filas = /^\d+$/.test(termino)
      ? filas.eq("wc_order_id", Number(termino))
      : filas.or(`email.ilike.%${termino}%,nombre.ilike.%${termino}%`);
  }

  const [lista, alertas, conciliacion, cola] = await Promise.all([
    filas.returns<FilaPanelPase[]>(),
    cliente
      .from("pases_log")
      .select("id, en, wc_order_id, pase_id, email, estado_wc, alerta, error")
      .not("alerta", "is", null)
      .is("resuelta_en", null)
      .order("en", { ascending: false })
      .limit(100)
      .returns<AlertaPase[]>(),
    cliente
      .from("pases_conciliacion")
      .select("cursor_en, ultima_ok_en, ultimo_error, webhook_estado, webhook_visto_en")
      .limit(1)
      .returns<EstadoConciliacion[]>(),
    cliente.from("correos_cola").select("id", { count: "exact", head: true }).in("estado", ["pendiente", "enviando"]),
  ]);

  if (lista.error) {
    console.error("[pases-panel] No se pudo leer la lista:", lista.error.message);
    return null;
  }

  return {
    filas: lista.data ?? [],
    alertas: alertas.data ?? [],
    conciliacion: conciliacion.data?.[0] ?? null,
    correosPendientes: cola.count ?? null,
  };
}
