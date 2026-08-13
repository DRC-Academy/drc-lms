"use client";

import type { ModoGeneracion } from "@/lib/modos";
import { textoDeEtapa, type EtapaGeneracion } from "@/lib/generacion";

/**
 * Lo que ve el alumno mientras se prepara su bloque.
 *
 * Sustituye a un spinner sin final. Entre veinte y cuarenta y cinco
 * segundos mirando algo que gira sin decir nada no se distingue de una
 * pantalla rota, y esa es la lectura que acaba haciendo cualquiera.
 *
 * Tres decisiones que sostienen la pieza:
 *
 *   1. El texto lo manda el servidor. Cambia cuando cambia la etapa de
 *      verdad, no cuando lo dice un temporizador. Si pone "revisando",
 *      el revisor está corriendo.
 *   2. La barra no llega al 100% hasta que el bloque está. Plantada en
 *      el 95% es honesta; llegando al 100% y siguiendo a la espera
 *      convierte cada segundo siguiente en sospecha.
 *   3. Si se pasa de lo previsto se dice. Reconocer la espera cuesta una
 *      frase y evita que el alumno se pregunte si aquello sigue vivo.
 */
export default function AvanceGeneracion({
  modo,
  etapa,
  progreso,
  tardando,
}: {
  modo: ModoGeneracion;
  etapa: EtapaGeneracion;
  progreso: number;
  tardando: boolean;
}) {
  const texto = textoDeEtapa(modo, etapa);

  return (
    <div className="aparece mt-4 rounded-[18px] border border-drc-borde bg-drc-superficie px-[26px] py-5">
      <p className="eyebrow text-drc-verde-texto">Preparando tu bloque</p>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        {/* `aria-live` y no `role="status"` en el contenedor: así el lector
            de pantalla anuncia el cambio de etapa sin repetir el resto. */}
        <p aria-live="polite" className="font-display text-[17px] font-semibold text-drc-titular">
          {texto}
        </p>
        <span aria-hidden className="shrink-0 text-[13px] tabular-nums text-drc-cuerpo">
          {progreso}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progreso}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la preparación"
        className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-drc-suave"
      >
        <div
          className="h-full rounded-full bg-marca-verde"
          style={{ width: `${progreso}%`, transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </div>

      <p className="mt-3 text-[14px] leading-[1.5] text-drc-cuerpo">
        {tardando
          ? "Está tardando un poco más de lo normal, seguimos en ello."
          : "Tarda algo menos de un minuto. Puedes quedarte aquí."}
      </p>
    </div>
  );
}
