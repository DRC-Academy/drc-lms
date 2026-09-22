"use client";

import { useState } from "react";
import Geckonoid, {
  ESTADOS_MASCOTA,
  GESTOS_MASCOTA,
  MICRO_GESTOS,
  type EstadoMascota,
  type GestoMascota,
  type MicroGesto,
} from "@/components/mascota/Geckonoid";
import { useMascota } from "@/components/mascota/useMascota";

/**
 * Banco de pruebas de la mascota: la mascota y un botón por estado, y
 * otro por gesto (encima del estado que haya).
 *
 * No es una pantalla del alumno, pero cuelga del mismo middleware, así
 * que hace falta sesión para verla. Se queda en el repo a propósito:
 * es donde se comprueba cada gesto nuevo sin tener que provocarlo en
 * el producto. El fondo oscuro es para ver los bordes y los huecos:
 * sobre blanco un filete claro o un hueco mal cerrado no se notan.
 * La velocidad (0,5×, 1×, 2×) es para revisar los tiempos: a cámara
 * lenta se ve la anticipación y el aplastamiento del salto.
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

const NOMBRES_GESTO: Record<GestoMascota, string> = {
  saludo: "Saludo",
  senala: "Señala",
  salto: "Salto",
  dormido: "Dormido",
  estira: "Se estira",
  piensa: "Piensa",
  asombro: "Asombro",
  mira_izq: "Mira a la izquierda",
  mira_der: "Mira a la derecha",
  sentado: "Sentado",
};

const NOMBRES_MICRO: Record<MicroGesto, string> = {
  cabeza: "Cabeza",
  balanceo: "Balanceo",
  parpadeo_doble: "Parpadeo doble",
  cola: "Cola",
};

const TAMANOS = [120, 240, 400] as const;
const VELOCIDADES = [0.5, 1, 2] as const;

export default function PaginaMascota() {
  const mascota = useMascota();
  const [size, setSize] = useState<(typeof TAMANOS)[number]>(240);
  const [velocidad, setVelocidad] = useState<(typeof VELOCIDADES)[number]>(1);
  const [volverAIdle, setVolverAIdle] = useState(true);
  const [oscuro, setOscuro] = useState(false);
  const [micro, setMicro] = useState<{ nombre: MicroGesto; n: number }>();
  const [ultimoGesto, setUltimoGesto] = useState<MicroGesto>();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[880px] flex-col items-center gap-8 px-4 py-10">
      <div>
        <h1 className="text-center font-display text-[26px] font-bold text-marca-tinta">Geckonoid</h1>
        <p className="mt-1 text-center text-[14px] text-marca-gris">
          Estado: <strong className="text-marca-tinta">{mascota.estado}</strong> · disparo {mascota.disparo}
          {ultimoGesto && (
            <>
              {" "}
              · último micro-gesto: <strong className="text-marca-tinta">{NOMBRES_MICRO[ultimoGesto]}</strong>
            </>
          )}
        </p>
      </div>

      {/* Con aire a los lados y arriba: las manos de «éxito» sobresalen del lienzo, y el salto sube. */}
      <div className={`rounded-[24px] border border-marca-borde px-16 pb-6 pt-14 ${oscuro ? "bg-[#2b2f3a]" : "bg-white"}`}>
        <Geckonoid
          estado={mascota.estado}
          disparo={mascota.disparo}
          size={size}
          volverAIdle={volverAIdle}
          velocidad={velocidad}
          pose={mascota.pose}
          micro={micro}
          onMicro={setUltimoGesto}
        />
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

      {/* Los gestos: encima del estado, se van solos. */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-[13.5px] text-marca-gris">
        Gesto
        {GESTOS_MASCOTA.map((nombre) => (
          <button
            key={nombre}
            type="button"
            onClick={() => mascota.gesto(nombre)}
            className="rounded-full border border-marca-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-marca-tinta hover:bg-marca-niebla"
          >
            {NOMBRES_GESTO[nombre]}
          </button>
        ))}
      </div>

      {/* Los micro-gestos de idle, a mano: solos salen cada 8–15 s. */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-[13.5px] text-marca-gris">
        Micro-gesto
        {MICRO_GESTOS.map((nombre) => (
          <button
            key={nombre}
            type="button"
            onClick={() => setMicro((g) => ({ nombre, n: (g?.n ?? 0) + 1 }))}
            className="rounded-full border border-marca-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-marca-tinta hover:bg-marca-niebla"
          >
            {NOMBRES_MICRO[nombre]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[13.5px] text-marca-gris">
        <span className="inline-flex items-center gap-1.5">
          Alto
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
        <span className="inline-flex items-center gap-1.5">
          Velocidad
          {VELOCIDADES.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setVelocidad(x)}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                velocidad === x ? "bg-marca-tinta text-white" : "bg-marca-niebla text-marca-tinta"
              }`}
            >
              {x}×
            </button>
          ))}
        </span>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={volverAIdle} onChange={(e) => setVolverAIdle(e.target.checked)} />
          Vuelve a idle a los 2,5 s
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={oscuro} onChange={(e) => setOscuro(e.target.checked)} />
          Fondo oscuro
        </label>
      </div>
    </main>
  );
}
