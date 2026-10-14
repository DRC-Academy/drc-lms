"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import type { TextosAutoservicio } from "@/lib/textos/autoservicio";
import { FOCO } from "@/components/clases/autoservicio/Piezas";

/**
 * LA PÁGINA DE CADA FLUJO: barra arriba, el paso, y la acción abajo.
 *
 *   · ARRIBA, «Volver a mis clases», el título y «Paso X de Y» con una
 *     pista de segmentos (sin porcentajes ni nada que puntúe).
 *   · EN MÓVIL, la acción del paso en una barra fija abajo, al alcance
 *     del pulgar.
 *   · EN ESCRITORIO, con `lateral` el resumen va a la derecha (y la acción
 *     dentro de él); sin él, la acción va debajo del contenido.
 *
 * `salidaCompleta`: tras un cambio hecho, «Volver a mis clases» es una
 * carga completa y no una navegación de cliente, para que «Mis clases»
 * se pida otra vez y no salga la copia de antes del cambio.
 *
 * Al cambiar de paso (`clave`), la página vuelve arriba y el foco va al
 * contenido: el lector de pantalla empieza a leer el paso nuevo.
 */
export default function MarcoFlujo({
  t,
  titulo,
  paso,
  clave,
  accion,
  lateral,
  simulado = false,
  salidaCompleta = false,
  children,
}: {
  t: TextosAutoservicio;
  titulo: string;
  /** Sin paso en «hecho» y en el cambio a medias. */
  paso: { n: number; total: number; nombre: string } | null;
  clave: string;
  accion?: ReactNode;
  lateral?: ReactNode;
  simulado?: boolean;
  salidaCompleta?: boolean;
  children: ReactNode;
}) {
  const contenido = useRef<HTMLElement>(null);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    contenido.current?.focus({ preventScroll: true });
  }, [clave]);

  const claseVolver = `-ml-1.5 inline-flex min-h-[48px] items-center gap-1 px-1.5 text-[16px] font-semibold text-marca-verdeOsc hover:text-marca-tinta ${FOCO}`;
  const flecha = (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-marca-niebla">
      <header className="border-b border-marca-borde bg-white">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col px-5 pb-4 pt-1 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between min-[900px]:gap-6 min-[900px]:px-6 min-[900px]:pb-[18px] min-[900px]:pt-3">
          <div>
            {salidaCompleta ? (
              <a href="/clases" className={claseVolver}>
                {flecha}
                {t.volverAMisClases}
              </a>
            ) : (
              <Link href="/clases" className={claseVolver}>
                {flecha}
                {t.volverAMisClases}
              </Link>
            )}
            <div className="mt-0.5 flex items-baseline justify-between gap-3">
              <h1 className="font-display text-[22px] font-bold leading-tight text-marca-tinta min-[900px]:text-[28px]">{titulo}</h1>
              {paso && <span className="whitespace-nowrap text-[14px] text-marca-gris min-[900px]:hidden">{t.pasoDe(paso.n, paso.total)}</span>}
            </div>
          </div>
          {paso && (
            <div className="mt-3 min-[900px]:mt-0 min-[900px]:w-[280px] min-[900px]:pb-1">
              <p className="mb-2 hidden text-right text-[14px] text-marca-gris min-[900px]:block">{t.pasoNombre(paso.n, paso.total, paso.nombre)}</p>
              <div aria-hidden className="flex gap-1">
                {Array.from({ length: paso.total }, (_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-sm ${i < paso.n ? "bg-marca-verde" : "bg-marca-pista"}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1040px] flex-1 items-start gap-8 px-5 py-6 min-[900px]:px-6 min-[900px]:py-8">
        <main ref={contenido} tabIndex={-1} className={`flex min-w-0 flex-1 flex-col gap-5 outline-none ${lateral ? "" : "max-w-[640px]"}`}>
          {simulado && <p className="rounded-[10px] bg-white px-3 py-2 text-[13px] font-semibold text-marca-gris">{t.simulacion}</p>}
          {children}
          {accion && !lateral && <div className="mt-3 hidden max-w-[420px] min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2.5">{accion}</div>}
        </main>
        {lateral && (
          <aside className="sticky top-6 hidden w-[340px] shrink-0 flex-col gap-3.5 rounded-[16px] border border-marca-borde bg-white p-5 shadow-[0_10px_24px_rgba(18,33,26,0.07)] min-[900px]:flex">
            {lateral}
          </aside>
        )}
      </div>

      {accion && (
        // `data-barra-inferior`: la mascota se posa encima, no sobre el botón.
        <div data-barra-inferior className="sticky bottom-0 z-10 flex flex-col gap-2.5 border-t border-marca-borde bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 min-[900px]:hidden">
          {accion}
        </div>
      )}
    </div>
  );
}
