"use client";

import { useState, type FormEvent } from "react";
import { solicitarEnlace } from "@/app/acceso/acciones";
import type { EstadoAcceso } from "@/app/acceso/estado";

const INICIAL: EstadoAcceso = { estado: "inicial", mensaje: "" };

/**
 * El campo de email y su estado de envío.
 *
 * Se envía con `onSubmit` en vez de con `action={...}` porque así el
 * botón puede decir "Enviando…" mientras espera, sin recargar la
 * página. A cambio, el formulario necesita JavaScript; el resto de la
 * práctica también lo necesita, así que no se pierde nada.
 */
export default function FormularioAcceso({ aviso }: { aviso: string | null }) {
  const [resultado, setResultado] = useState<EstadoAcceso>(INICIAL);
  const [enviando, setEnviando] = useState(false);
  // El aviso de "enlace caducado" viene de la URL. Se retira en cuanto
  // el visitante hace algo: si no, se quedaría contradiciendo al
  // mensaje de "te hemos enviado un enlace".
  const [avisoVisible, setAvisoVisible] = useState(aviso);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    setAvisoVisible(null);

    try {
      setResultado(await solicitarEnlace(datos));
    } catch (error) {
      console.error("[acceso] No se pudo enviar el formulario:", error);
      setResultado({
        estado: "error",
        mensaje: "No hemos podido enviar el enlace. Inténtalo otra vez en un momento.",
      });
    } finally {
      setEnviando(false);
    }
  }

  if (resultado.estado === "enviado") {
    return (
      <div className="aparece" aria-live="polite">
        <div className="rounded-[20px] border border-drc-borde bg-drc-superficie px-[26px] py-6">
          <p className="eyebrow text-drc-verde-texto">Revisa tu correo</p>
          <p className="mt-3.5 text-pretty text-[16px] leading-[1.55] text-drc-texto">
            {resultado.mensaje}
          </p>
          <p className="mt-3 text-[14px] leading-[1.55] text-drc-cuerpo">
            El enlace caduca en 15 minutos. Si no lo ves, mira en spam.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setResultado(INICIAL)}
          className="mt-5 text-[14px] font-medium text-drc-verde-texto underline underline-offset-2 transition-colors hover:text-drc-enlace-hover"
        >
          Probar con otro email
        </button>
      </div>
    );
  }

  return (
    <>
      {avisoVisible && (
        <p
          role="status"
          className="mb-6 rounded-[16px] border border-drc-borde bg-drc-suave px-5 py-4 text-[15px] leading-[1.55] text-drc-texto"
        >
          {avisoVisible}
        </p>
      )}

      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-2.5">
        <label htmlFor="email" className="sr-only">
          Tu email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          disabled={enviando}
          placeholder="tucorreo@ejemplo.com"
          className="min-h-[48px] w-full rounded-full border-2 border-drc-borde bg-drc-superficie px-5 text-[16px] text-drc-texto outline-none transition-colors placeholder:text-drc-apagado focus:border-drc-verde-solido disabled:opacity-60"
        />
        <button type="submit" disabled={enviando} className="btn btn-primario min-h-[48px]">
          {enviando ? "Enviando…" : "Enviarme el enlace"}
        </button>
      </form>

      <p aria-live="polite" className="min-h-[22px]">
        {(resultado.estado === "invalido" || resultado.estado === "error") && (
          <span className="mt-4 inline-block text-[14px] leading-[1.55] text-drc-texto">
            {resultado.mensaje}
          </span>
        )}
      </p>
    </>
  );
}
