"use client";

import { useState } from "react";

// ---------------------------------------------------------------
// «ELIGE TU RITMO»: EL BANNER DE AMPLIACIÓN DE «MI PROGRESO»
//
// ⚠ COPIA de `components/TuRitmoBannerV2.tsx` de DRC Gestión (30/09/2026):
// mismo dibujo, mismas clases `p2-*`. Si allí cambia, aquí cambia.
//
// Un simulador: el alumno toca un plan y ve el mes en que llegaría. Arranca
// en el plan de más horas. NO CALCULA NADA: los textos y las fechas llegan
// ya hechos del servidor (`Ficha`, con `lib/estimacion-ficha.ts`), y aquí
// solo se elige cuál enseñar.
//
// EL BOTÓN es un enlace a `RUTA_AMPLIAR`, como el de siempre del LMS: esa
// ruta decide si abre la sesión de la tienda con el puente o manda al
// cambio de plan de Mi cuenta. Verde oscuro y no amarillo: va sobre el
// fondo amarillo del banner.
// ---------------------------------------------------------------

export type OpcionRitmo = {
  horas: number;
  /** "2 h" */
  etiqueta: string;
  /** " · tu plan" en el suyo; null en los demás. */
  nota: string | null;
  /** "enero de 2027" */
  fecha: string;
  /** "4 meses · 3 meses antes que con tu plan" */
  detalle: string;
  meses: number;
};

export default function RitmoElige({
  rotulo,
  pregunta,
  frase,
  grupo,
  opciones,
  inicial,
  mesesActual,
  cta,
}: {
  rotulo: string;
  pregunta: string;
  frase: string;
  /** Nombre accesible del selector. */
  grupo: string;
  opciones: OpcionRitmo[];
  /** Horas del plan marcado al llegar: el de más horas. */
  inicial: number;
  /** Meses del plan actual: un punto por cada uno. */
  mesesActual: number;
  /** null = ya va al máximo: sin botón. */
  cta: { href: string; texto: string } | null;
}) {
  const [elegidas, setElegidas] = useState(inicial);
  const elegida = opciones.find((o) => o.horas === elegidas) ?? opciones[0];
  const puntos = Array.from({ length: mesesActual }, (_, i) => i < elegida.meses);

  return (
    <section className="p2-ritmo" aria-labelledby="p2-ritmo-titulo">
      <span className="p2-ritmo-sol" aria-hidden />
      <div className="p2-ritmo-izq">
        <p className="p2-ritmo-kicker">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="13.5" r="7.5" stroke="currentColor" strokeWidth="2" />
            <path d="M12 13.5V10M10 3h4M18.5 6.5l1.5-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {rotulo}
        </p>
        <h2 id="p2-ritmo-titulo" className="p2-ritmo-titulo">{pregunta}</h2>

        {opciones.length > 1 && (
          <div className="p2-seg" role="group" aria-label={grupo}>
            {opciones.map((o) => {
              const activa = o.horas === elegida.horas;
              return (
                <button
                  key={o.horas}
                  type="button"
                  className={`p2-seg-btn${activa ? " is-activa" : ""}`}
                  aria-pressed={activa}
                  onClick={() => setElegidas(o.horas)}
                >
                  {o.etiqueta}
                  {o.nota && <span className="p2-seg-nota">{o.nota}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p2-respuesta" aria-live="polite">
        <p className="p2-respuesta-frase">{frase}</p>
        <p className="p2-respuesta-fecha">{elegida.fecha}</p>
        <p className="p2-respuesta-detalle">{elegida.detalle}</p>
        <div className="p2-puntos" aria-hidden>
          {puntos.map((lleno, i) => (
            <span key={i} className={`p2-punto${lleno ? " is-lleno" : ""}`} />
          ))}
        </div>
        {cta && (
          <a className="p2-cta" href={cta.href} target="_blank" rel="noopener noreferrer">
            {cta.texto}
          </a>
        )}
      </div>
    </section>
  );
}
