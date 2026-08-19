"use client";

import { textoDeEtapa, type EtapaGeneracion } from "@/lib/generacion";

/**
 * Lo que ve el alumno mientras se prepara su bloque.
 *
 * Sustituye a un spinner sin final. Con diez ejercicios la espera son
 * entre cuarenta y tres y cincuenta y dos segundos medidos, y ese rato
 * mirando algo que gira sin decir nada no se distingue de una pantalla
 * rota: es la lectura que acaba haciendo cualquiera.
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
 *
 * Ya no recibe `modo`: había un juego de textos por cada uno de los tres
 * y ahora hay uno solo, porque el bloque es uno solo.
 */
export default function AvanceGeneracion({
  etapa,
  progreso,
  tardando,
}: {
  etapa: EtapaGeneracion;
  progreso: number;
  tardando: boolean;
}) {
  const texto = textoDeEtapa(etapa);

  return (
    <div className="aparece mt-4 rounded-[14px] border border-marca-borde bg-white px-5 py-5 lg:px-6">
      <p className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-marca-verdeOsc">
        Preparando tu bloque
      </p>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        {/* `aria-live` y no `role="status"` en el contenedor: así el lector
            de pantalla anuncia el cambio de etapa sin repetir el resto. */}
        <p aria-live="polite" className="font-display text-[17px] font-bold text-marca-tinta">
          {texto}
        </p>
        <span aria-hidden className="shrink-0 text-[13px] tabular-nums text-marca-gris">
          {progreso}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progreso}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la preparación"
        className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-marca-pista"
      >
        <div
          className="h-full rounded-full bg-marca-verde"
          style={{ width: `${progreso}%`, transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </div>

      <p className="mt-3 text-[14px] leading-[1.5] text-marca-gris">
        {tardando
          ? "Se está haciendo de rogar, pero seguimos en ello."
          : "Son diez ejercicios, así que tarda un poco. Puedes quedarte aquí mientras."}
      </p>
    </div>
  );
}
