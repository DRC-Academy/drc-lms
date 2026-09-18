"use client";

import { useState } from "react";
import Geckonoid, { ESTADOS_MASCOTA, type EstadoMascota } from "@/components/mascota/Geckonoid";
import { useMascota } from "@/components/mascota/useMascota";

/**
 * Banco de pruebas de la mascota: la mascota y un botón por estado.
 *
 * No es una pantalla del alumno, pero cuelga del mismo middleware, así
 * que hace falta sesión para verla. Se queda en el repo a propósito:
 * es donde se comprueba cada gesto nuevo sin tener que provocarlo en
 * el producto.
 */

const NOMBRES: Record<EstadoMascota, string> = {
  idle: "Idle",
  estudiando: "Estudiando",
  exito: "Éxito",
  duda: "Duda",
  animo: "Ánimo",
  racha_perdida: "Racha perdida",
  nivel_superado: "Nivel superado",
};

const TAMANOS = [120, 240, 400] as const;

export default function PaginaMascota() {
  const mascota = useMascota();
  const [size, setSize] = useState<(typeof TAMANOS)[number]>(240);
  const [volverAIdle, setVolverAIdle] = useState(true);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[880px] flex-col items-center gap-8 px-4 py-10">
      <div>
        <h1 className="text-center font-display text-[26px] font-bold text-marca-tinta">Geckonoid</h1>
        <p className="mt-1 text-center text-[14px] text-marca-gris">
          Estado: <strong className="text-marca-tinta">{mascota.estado}</strong> · disparo {mascota.disparo}
        </p>
      </div>

      <div className="rounded-[24px] border border-marca-borde bg-white p-6">
        <Geckonoid estado={mascota.estado} disparo={mascota.disparo} size={size} volverAIdle={volverAIdle} />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {ESTADOS_MASCOTA.map((estado) => (
          <button
            key={estado}
            type="button"
            onClick={() => mascota.dispara(estado)}
            className={`rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors ${
              mascota.estado === estado
                ? "border-marca-verde bg-marca-verdeFondo text-marca-verdeOsc"
                : "border-marca-borde bg-white text-marca-tinta hover:bg-marca-niebla"
            }`}
          >
            {NOMBRES[estado]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[13.5px] text-marca-gris">
        <span className="inline-flex items-center gap-1.5">
          Tamaño
          {TAMANOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSize(t)}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                size === t ? "bg-marca-tinta text-white" : "bg-marca-niebla text-marca-tinta"
              }`}
            >
              {t}
            </button>
          ))}
        </span>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={volverAIdle} onChange={(e) => setVolverAIdle(e.target.checked)} />
          Vuelve a idle a los 2,5 s
        </label>
      </div>
    </main>
  );
}
