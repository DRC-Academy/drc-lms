"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  darAccesoManual,
  quitarPase,
  reactivarPase,
  reenviarCorreo,
  reprocesarPedido,
  resolverAlerta,
  type ResultadoPanel,
} from "@/app/acciones-black-pass";

// ---------------------------------------------------------------
// LOS BOTONES DEL PANEL /black-pass
//
// Esto es la pantalla, no el guardia: cada acción comprueba el rol en el
// servidor. Quitar pide una segunda pulsación, porque corta el acceso de
// alguien que ha pagado.
// ---------------------------------------------------------------

const BOTON =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13.5px] font-semibold transition-colors disabled:opacity-60 lg:min-h-[36px]";
const PRINCIPAL = `${BOTON} bg-marca-verdeOsc text-white hover:bg-marca-tinta`;
const SECUNDARIO = `${BOTON} border border-marca-borde bg-white text-marca-tinta hover:bg-marca-niebla`;

function usarAccion() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPanel | null>(null);

  async function hacer(accion: () => Promise<ResultadoPanel>) {
    setOcupado(true);
    setResultado(null);
    try {
      const r = await accion();
      setResultado(r);
      if (r.ok) router.refresh();
    } catch {
      setResultado({ ok: false, mensaje: "No se ha podido hacer. Vuelve a intentarlo." });
    } finally {
      setOcupado(false);
    }
  }

  return { ocupado, resultado, hacer };
}

function Mensaje({ resultado }: { resultado: ResultadoPanel | null }) {
  if (!resultado?.mensaje) return null;
  return (
    <p role="status" className={`w-full text-[13px] leading-[1.45] ${resultado.ok ? "text-marca-verdeOsc" : "text-marca-tinta"}`}>
      {resultado.mensaje}
    </p>
  );
}

export function AccionesPase({
  pedidoId,
  paseId,
  estado,
  bloqueado,
}: {
  pedidoId: number | null;
  paseId: string | null;
  estado: string | null;
  bloqueado: boolean;
}) {
  const { ocupado, resultado, hacer } = usarAccion();
  const [confirmando, setConfirmando] = useState(false);
  const activo = estado === "activo";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {pedidoId !== null && (
        <button type="button" disabled={ocupado} className={SECUNDARIO} onClick={() => hacer(() => reprocesarPedido(pedidoId))}>
          Reprocesar
        </button>
      )}

      {paseId && activo && (
        <button type="button" disabled={ocupado} className={SECUNDARIO} onClick={() => hacer(() => reenviarCorreo(paseId))}>
          Reenviar correo
        </button>
      )}

      {paseId && activo && !confirmando && (
        <button type="button" disabled={ocupado} className={SECUNDARIO} onClick={() => setConfirmando(true)}>
          Quitar acceso
        </button>
      )}

      {paseId && activo && confirmando && (
        <>
          <button
            type="button"
            disabled={ocupado}
            className={PRINCIPAL}
            onClick={() => {
              setConfirmando(false);
              void hacer(() => quitarPase(paseId, "Quitado desde el panel"));
            }}
          >
            Sí, quitar
          </button>
          <button type="button" disabled={ocupado} className={SECUNDARIO} onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </>
      )}

      {paseId && !activo && (
        <button type="button" disabled={ocupado} className={SECUNDARIO} onClick={() => hacer(() => reactivarPase(paseId))}>
          {bloqueado ? "Quitar bloqueo y reactivar" : "Reactivar"}
        </button>
      )}

      <Mensaje resultado={resultado} />
    </div>
  );
}

export function ResolverAlerta({ alertaId }: { alertaId: number }) {
  const { ocupado, resultado, hacer } = usarAccion();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" disabled={ocupado} className={SECUNDARIO} onClick={() => hacer(() => resolverAlerta(alertaId))}>
        Marcar como resuelta
      </button>
      <Mensaje resultado={resultado} />
    </div>
  );
}

const CAMPO =
  "min-h-[44px] w-full rounded-[10px] border border-marca-borde bg-white px-3 text-[16px] text-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-verdeOsc lg:text-[14px]";

export function FormularioPanel() {
  const concesion = usarAccion();
  const pedido = usarAccion();

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(evento) => {
          evento.preventDefault();
          const f = new FormData(evento.currentTarget);
          void concesion.hacer(() =>
            darAccesoManual({ email: f.get("email"), nombre: f.get("nombre"), meses: f.get("meses"), motivo: f.get("motivo") })
          );
        }}
      >
        <h2 className="font-display text-[17px] font-semibold text-marca-tinta">Dar acceso a mano</h2>
        <label className="text-[13px] font-medium text-marca-tintaMedia">
          Email
          <input name="email" type="email" required autoComplete="off" className={`mt-1 ${CAMPO}`} />
        </label>
        <label className="text-[13px] font-medium text-marca-tintaMedia">
          Nombre (opcional)
          <input name="nombre" autoComplete="off" className={`mt-1 ${CAMPO}`} />
        </label>
        <div className="grid grid-cols-[96px_1fr] gap-2.5">
          <label className="text-[13px] font-medium text-marca-tintaMedia">
            Meses
            <input name="meses" type="number" min={1} max={60} defaultValue={12} required className={`mt-1 ${CAMPO}`} />
          </label>
          <label className="text-[13px] font-medium text-marca-tintaMedia">
            Motivo
            <input name="motivo" autoComplete="off" className={`mt-1 ${CAMPO}`} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={concesion.ocupado} className={PRINCIPAL}>
            Dar acceso y enviar correo
          </button>
          <Mensaje resultado={concesion.resultado} />
        </div>
      </form>

      <form
        className="flex flex-col gap-2.5"
        onSubmit={(evento) => {
          evento.preventDefault();
          const id = Number(new FormData(evento.currentTarget).get("pedido"));
          void pedido.hacer(() => reprocesarPedido(id));
        }}
      >
        <h2 className="font-display text-[17px] font-semibold text-marca-tinta">Reprocesar un pedido</h2>
        <p className="text-[13.5px] leading-[1.45] text-marca-tintaMedia">
          Vuelve a leerlo de la tienda y aplica su estado, aunque todavía no salga en la lista.
        </p>
        <label className="text-[13px] font-medium text-marca-tintaMedia">
          Número de pedido
          <input name="pedido" inputMode="numeric" pattern="[0-9]+" required autoComplete="off" className={`mt-1 ${CAMPO}`} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pedido.ocupado} className={SECUNDARIO}>
            Reprocesar
          </button>
          <Mensaje resultado={pedido.resultado} />
        </div>
      </form>
    </div>
  );
}
