"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  activarProfesor,
  aprobarEmailProfesor,
  desactivarProfesor,
  invitarAlProfesor,
} from "@/app/acciones-profesores";
import type { SituacionProfesor } from "@/lib/panel-profesor-reglas";

// ---------------------------------------------------------------
// LOS BOTONES DE UNA FILA DE «ACCESO PROFESORES»
//
// Esto es la pantalla, no el guardia: cada acción comprueba el rol en el
// servidor. Invitar y aprobar un email piden una segunda pulsación: uno
// manda un correo a una persona y el otro decide quién entra.
// ---------------------------------------------------------------

type Resultado = { ok: boolean; error?: string };
type Confirmacion = "invitar" | "aprobar" | null;

const BOTON =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13.5px] font-semibold transition-colors disabled:opacity-60 lg:min-h-[36px]";
const PRINCIPAL = `${BOTON} bg-marca-verdeOsc text-white hover:bg-marca-tinta`;
const SECUNDARIO = `${BOTON} border border-marca-borde bg-white text-marca-tinta hover:bg-marca-niebla`;

export default function AccionesProfesor({
  teacherId,
  situacion,
  email,
  invitado,
}: {
  teacherId: string;
  situacion: SituacionProfesor;
  email: string;
  invitado: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Confirmacion>(null);

  async function hacer(accion: (id: string) => Promise<Resultado>, exito?: string) {
    setOcupado(true);
    setError(null);
    setAviso(null);
    setConfirmando(null);
    try {
      const resultado = await accion(teacherId);
      if (resultado.ok) {
        if (exito) setAviso(exito);
      } else {
        setError(resultado.error ?? "No se ha podido hacer.");
      }
      router.refresh();
    } catch {
      setError("No se ha podido hacer. Vuelve a intentarlo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {situacion === "sin_acceso" && (
          <button type="button" disabled={ocupado} onClick={() => void hacer(activarProfesor)} className={PRINCIPAL}>
            Activar acceso
          </button>
        )}

        {situacion === "activo" && confirmando !== "invitar" && (
          <button type="button" disabled={ocupado} onClick={() => setConfirmando("invitar")} className={invitado ? SECUNDARIO : PRINCIPAL}>
            {invitado ? "Reenviar invitación" : "Enviar invitación"}
          </button>
        )}

        {situacion === "bloqueado_email" && confirmando !== "aprobar" && (
          <button type="button" disabled={ocupado} onClick={() => setConfirmando("aprobar")} className={PRINCIPAL}>
            Revisar email nuevo
          </button>
        )}

        {situacion !== "sin_acceso" && (
          <button type="button" disabled={ocupado} onClick={() => void hacer(desactivarProfesor)} className={SECUNDARIO}>
            Desactivar
          </button>
        )}

        <Link href={`/profesor?como=${encodeURIComponent(teacherId)}`} className={SECUNDARIO}>
          Ver como este profesor
        </Link>
      </div>

      {confirmando === "invitar" && (
        <div className="mt-3 rounded-[12px] border border-marca-borde bg-marca-niebla p-3.5">
          <p className="text-[13.5px] leading-[1.45] text-marca-tinta">
            Se enviará una invitación a <strong className="font-semibold [overflow-wrap:anywhere]">{email}</strong>.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" disabled={ocupado} onClick={() => void hacer(invitarAlProfesor, "Invitación enviada.")} className={PRINCIPAL}>
              Sí, enviarla
            </button>
            <button type="button" onClick={() => setConfirmando(null)} className={SECUNDARIO}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {confirmando === "aprobar" && (
        <div className="mt-3 rounded-[12px] border border-marca-borde bg-marca-niebla p-3.5">
          <p className="text-[13.5px] leading-[1.45] text-marca-tinta">
            Apruébalo solo si has comprobado que <strong className="font-semibold [overflow-wrap:anywhere]">{email}</strong> es de este
            profesor. Podrá entrar con esa dirección y se cerrarán sus sesiones abiertas.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" disabled={ocupado} onClick={() => void hacer(aprobarEmailProfesor, "Email aprobado.")} className={PRINCIPAL}>
              Sí, aprobarlo
            </button>
            <button type="button" onClick={() => setConfirmando(null)} className={SECUNDARIO}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {aviso && <p role="status" className="mt-2.5 text-[13px] font-medium text-marca-verdeOsc">{aviso}</p>}
      {error && (
        <p role="alert" className="mt-2.5 rounded-[10px] bg-marca-examen px-3.5 py-2.5 text-[13px] leading-[1.4] text-marca-tinta">
          {error}
        </p>
      )}
    </div>
  );
}
