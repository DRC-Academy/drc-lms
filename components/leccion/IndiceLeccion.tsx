"use client";

import { useCallback, useEffect, useState } from "react";
import type { TituloLeccion } from "@/lib/leccion-html";

/**
 * El índice de la propia lección, en la columna derecha.
 *
 * Solo aparece cuando la lección tiene dos títulos o más: ver
 * `prepararLeccion`. Con uno, esta columna no orienta, solo estrecha la
 * lectura.
 *
 * EL RESALTADO SE MIDE CONTRA EL 40% DE LA PANTALLA, no contra un
 * desplazamiento fijo. Con un umbral en píxeles, en una lección corta
 * los últimos títulos no llegan nunca a activarse: no queda scroll por
 * debajo para empujarlos hasta la línea. Con un porcentaje del alto
 * visible, el último título se activa siempre antes de llegar al final,
 * y al tocar fondo se fuerza de todas formas.
 */
export default function IndiceLeccion({ titulos }: { titulos: TituloLeccion[] }) {
  const [activo, setActivo] = useState(0);

  const recalcular = useCallback(() => {
    const linea = window.scrollY + window.innerHeight * 0.4;

    // Al final del documento gana el último, aunque su título haya
    // quedado por encima de la línea: es lo que el alumno está leyendo.
    const maximo = document.documentElement.scrollHeight - window.innerHeight;
    if (maximo > 0 && window.scrollY >= maximo - 4) {
      setActivo(titulos.length - 1);
      return;
    }

    let encontrado = 0;
    titulos.forEach((titulo, i) => {
      const nodo = document.getElementById(titulo.id);
      if (!nodo) return;
      const arriba = nodo.getBoundingClientRect().top + window.scrollY;
      if (arriba <= linea) encontrado = i;
    });
    setActivo(encontrado);
  }, [titulos]);

  useEffect(() => {
    let pedido = 0;
    const alHacerScroll = () => {
      if (pedido) return;
      pedido = window.requestAnimationFrame(() => {
        pedido = 0;
        recalcular();
      });
    };

    recalcular();
    window.addEventListener("scroll", alHacerScroll, { passive: true });
    window.addEventListener("resize", alHacerScroll);
    return () => {
      if (pedido) window.cancelAnimationFrame(pedido);
      window.removeEventListener("scroll", alHacerScroll);
      window.removeEventListener("resize", alHacerScroll);
    };
  }, [recalcular]);

  /**
   * Al pulsar, el título aterriza justo por encima de la línea del 40%
   * —de ahí el 30%—, para que el resaltado coincida con lo que se acaba
   * de pulsar en vez de quedarse en el anterior.
   */
  function irA(id: string, i: number) {
    const nodo = document.getElementById(id);
    if (!nodo) return;
    const arriba = nodo.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, arriba - window.innerHeight * 0.3), behavior: "smooth" });
    setActivo(i);
  }

  return (
    <nav
      aria-label="En esta lección"
      className="sticky top-16 hidden h-[calc(100vh-64px)] overflow-y-auto border-l border-marca-borde px-6 py-[34px] min-[1100px]:block"
    >
      <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
        En esta lección
      </p>

      <ol className="mt-3">
        {titulos.map((titulo, i) => (
          <li key={titulo.id}>
            <button
              type="button"
              onClick={() => irA(titulo.id, i)}
              aria-current={i === activo ? "true" : undefined}
              className={`w-full border-l-2 py-2 pl-3.5 text-left text-pretty text-[13px] leading-[1.4] transition-colors ${
                i === activo
                  ? "border-marca-verde font-semibold text-marca-tinta"
                  : "border-marca-borde font-normal text-marca-grisSuave hover:text-marca-tinta"
              }`}
            >
              {titulo.texto}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
