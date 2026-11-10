import Link from "next/link";
import MarcoApp from "@/components/Navegacion";
import Chevron from "@/components/admin/Chevron";
import { AccionesPase, FormularioPanel, ResolverAlerta } from "@/components/admin/AccionesBlackPass";
import { Tarjeta } from "@/components/panel/piezas";
import type { AlertaPase, DatosPanelPases, FilaPanelPase } from "@/lib/pases-panel";

// ---------------------------------------------------------------
// LA PANTALLA DEL PANEL /black-pass
//
// Con los datos ya leídos; el guard y la carga, en `app/black-pass/page.tsx`.
// Primero lo que pide a alguien (alertas, webhook caído), luego la lista.
// ---------------------------------------------------------------

const FECHA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", year: "numeric" });
const MOMENTO = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const fecha = (valor: string | null) => (valor ? FECHA.format(new Date(valor)) : "—");
const momento = (valor: string | null) => (valor ? MOMENTO.format(new Date(valor)) : "—");

const ALERTAS: Record<string, string> = {
  espera_tras_conceder: "El pedido ya tenía acceso y ahora está en espera: puede ser una disputa de Stripe. El acceso sigue dado; decide a mano.",
  pedido_en_papelera: "El pedido ya tenía acceso y lo han llevado a la papelera. El acceso sigue dado; decide a mano.",
  correo_fallido: "El correo de acceso no ha podido salir.",
  compra_duplicada: "Esta persona ya tenía otro pase vivo: quizá haya que devolver una compra.",
  pedido_sin_fecha_pago: "El pedido no traía fecha de pago: se ha contado desde su creación.",
};

const CORREO: Record<string, string> = {
  pendiente: "Correo en cola",
  enviando: "Correo enviándose",
  enviado: "Correo enviado",
  fallido: "Correo fallido",
  cancelado: "Correo cancelado",
};

function etiquetaEstado(fila: FilaPanelPase): { texto: string; clase: string } {
  if (!fila.pase_id) return { texto: "Sin acceso", clase: "border border-marca-borde bg-white text-marca-gris" };
  if (fila.estado === "revocado") return { texto: fila.bloqueado_manual ? "Quitado a mano" : "Quitado", clase: "bg-marca-examen text-marca-amarilloTexto" };
  if (fila.acceso_hasta && new Date(fila.acceso_hasta).getTime() <= Date.now()) {
    return { texto: "Caducado", clase: "border border-marca-borde bg-marca-niebla text-marca-gris" };
  }
  return { texto: "Con acceso", clase: "bg-marca-verdeFondo text-marca-verdeOsc" };
}

export default function PantallaBlackPass({
  datos,
  busqueda,
  activo,
}: {
  datos: DatosPanelPases | null;
  busqueda: string;
  activo: boolean;
}) {
  const webhook = datos?.conciliacion?.webhook_estado ?? null;
  const conAcceso = (datos?.filas ?? []).filter((f) => etiquetaEstado(f).texto === "Con acceso").length;

  return (
    <MarcoApp datos={{ alumnoId: "", nombre: "", miCurso: null, foco: null, revisando: false }}>
      <main className="mx-auto w-full max-w-[860px] px-5 pb-16 lg:px-10 lg:pb-20 lg:pt-9">
        <div className="pt-4 lg:pt-0">
          <Link href="/" className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc lg:min-h-0">
            <Chevron direccion="izquierda" />
            Panel
          </Link>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:mt-3 lg:text-[34px]">
            Black Pass
          </h1>
          <p className="mt-2 max-w-[62ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia">
            Los pedidos del Black Pass y lo que se ha hecho con cada uno.
          </p>
        </div>

        {!activo && (
          <p role="alert" className="mt-6 rounded-[12px] bg-marca-examen px-4 py-3 text-[14px] font-medium leading-[1.45] text-marca-tinta">
            PASES_ACTIVO está apagado: no se procesa ningún pedido y quien solo tiene pase no puede entrar.
          </p>
        )}

        {datos === null ? (
          <p role="alert" className="mt-6 rounded-[12px] bg-marca-examen px-4 py-3 text-[14px] leading-[1.45] text-marca-tinta">
            No se ha podido leer la lista. Recarga la página en un momento.
          </p>
        ) : (
          <>
            {webhook !== null && webhook !== "active" && (
              <p role="alert" className="mt-6 rounded-[12px] bg-marca-examen px-4 py-3 text-[14px] font-medium leading-[1.45] text-marca-tinta">
                {webhook === "no_encontrado"
                  ? "No hay ningún webhook de la tienda apuntando a /api/woo/pedidos."
                  : `El webhook de la tienda está «${webhook}». Los pedidos entran solo por la conciliación: reactívalo en WooCommerce.`}
              </p>
            )}

            {datos.conciliacion?.ultimo_error && (
              <p role="alert" className="mt-6 rounded-[12px] bg-marca-examen px-4 py-3 text-[14px] leading-[1.45] text-marca-tinta [overflow-wrap:anywhere]">
                La última conciliación no terminó: {datos.conciliacion.ultimo_error}
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato titulo="Con acceso" valor={String(conAcceso)} />
              <Dato titulo="Correos por salir" valor={String(datos.correosPendientes ?? "—")} />
              <Dato titulo="Última conciliación" valor={momento(datos.conciliacion?.ultima_ok_en ?? null)} />
              <Dato titulo="Webhook" valor={webhook ?? "Sin dato"} />
            </dl>

            {datos.alertas.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-[20px] font-semibold text-marca-tinta">Por revisar</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {datos.alertas.map((alerta) => (
                    <li key={alerta.id}>
                      <FilaAlerta alerta={alerta} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8">
              <Tarjeta>
                <FormularioPanel />
              </Tarjeta>
            </section>

            <section className="mt-8">
              <h2 className="font-display text-[20px] font-semibold text-marca-tinta">Pedidos y pases</h2>
              <form method="get" className="mt-3 flex gap-2">
                <input
                  type="search"
                  name="q"
                  defaultValue={busqueda}
                  aria-label="Buscar por email, nombre o número de pedido"
                  placeholder="Email, nombre o número de pedido"
                  className="min-h-[44px] w-full min-w-0 rounded-[10px] border border-marca-borde bg-white px-3 text-[16px] text-marca-tinta lg:text-[14px]"
                />
                <button type="submit" className="min-h-[44px] shrink-0 rounded-full border border-marca-borde bg-white px-4 text-[13.5px] font-semibold text-marca-tinta hover:bg-marca-niebla">
                  Buscar
                </button>
              </form>

              {datos.filas.length === 0 ? (
                <p className="mt-4 text-[14.5px] leading-[1.5] text-marca-tintaMedia">
                  {busqueda ? "No hay nada con esa búsqueda." : "Todavía no hay ningún pedido."}
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {datos.filas.map((fila) => (
                    <li key={fila.pase_id ?? `pedido-${fila.wc_order_id}`}>
                      <FilaPase fila={fila} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </MarcoApp>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-[14px] border border-marca-borde bg-white px-4 py-3">
      <dt className="text-[12.5px] leading-[1.3] text-marca-tintaMedia">{titulo}</dt>
      <dd className="mt-1 font-display text-[17px] font-semibold leading-[1.2] text-marca-tinta">{valor}</dd>
    </div>
  );
}

function FilaAlerta({ alerta }: { alerta: AlertaPase }) {
  return (
    <Tarjeta>
      <p className="text-[14.5px] font-medium leading-[1.45] text-marca-tinta">{ALERTAS[alerta.alerta] ?? alerta.alerta}</p>
      <p className="mt-1 [overflow-wrap:anywhere] text-[13.5px] leading-[1.45] text-marca-tintaMedia">
        {alerta.wc_order_id ? `Pedido ${alerta.wc_order_id}` : "Sin pedido"}
        {alerta.email ? ` · ${alerta.email}` : ""}
        {alerta.estado_wc ? ` · ${alerta.estado_wc}` : ""} · {momento(alerta.en)}
      </p>
      {alerta.error && <p className="mt-1 [overflow-wrap:anywhere] text-[13px] text-marca-tintaMedia">{alerta.error}</p>}
      <ResolverAlerta alertaId={alerta.id} />
    </Tarjeta>
  );
}

function FilaPase({ fila }: { fila: FilaPanelPase }) {
  const etiqueta = etiquetaEstado(fila);

  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <h3 className="[overflow-wrap:anywhere] font-display text-[17px] font-semibold leading-[1.25] text-marca-tinta">
          {fila.nombre || fila.email || "Sin datos"}
        </h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${etiqueta.clase}`}>{etiqueta.texto}</span>
        {fila.es_prueba && (
          <span className="rounded-full border border-marca-borde bg-marca-niebla px-2.5 py-0.5 text-[11.5px] font-semibold text-marca-gris">Prueba</span>
        )}
      </div>

      <p className="mt-1.5 [overflow-wrap:anywhere] text-[13.5px] leading-[1.45] text-marca-tintaMedia">
        {fila.email}
        {fila.wc_order_id ? ` · Pedido ${fila.wc_order_id}` : " · A mano"}
        {fila.estado_wc ? ` · ${fila.estado_wc}` : ""}
      </p>

      {fila.pase_id && (
        <p className="mt-1 text-[13.5px] leading-[1.45] text-marca-tintaMedia">
          Desde {fecha(fila.inicio)} hasta {fecha(fila.acceso_hasta)}
          {fila.correo_estado ? ` · ${CORREO[fila.correo_estado] ?? fila.correo_estado}` : ""}
        </p>
      )}

      {fila.motivo && <p className="mt-1 text-[13px] leading-[1.45] text-marca-tintaMedia">Motivo: {fila.motivo}</p>}

      {fila.ultima_accion && (
        <p className="mt-1 text-[13px] leading-[1.45] text-marca-gris">
          Último paso: {fila.ultima_accion} ({fila.ultima_accion_origen}) · {momento(fila.ultima_accion_en)}
        </p>
      )}

      {fila.ultimo_error && <p className="mt-1 [overflow-wrap:anywhere] text-[13px] text-marca-tinta">{fila.ultimo_error}</p>}

      {fila.alumno_id && fila.estado === "activo" && (
        <Link href={`/alumno/${fila.alumno_id}`} className="mt-2 inline-flex min-h-[44px] items-center text-[13.5px] font-semibold text-marca-verdeOsc lg:min-h-0">
          Ver lo que ve
        </Link>
      )}

      <AccionesPase pedidoId={fila.wc_order_id} paseId={fila.pase_id} estado={fila.estado} bloqueado={fila.bloqueado_manual === true} />
    </Tarjeta>
  );
}
