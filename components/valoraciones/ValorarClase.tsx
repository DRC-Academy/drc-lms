"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import HojaValoracion, { type Inicial } from "@/components/valoraciones/HojaValoracion";
import { EstrellasFijas } from "@/components/valoraciones/Estrellas";
import { FOCO } from "@/components/clases/autoservicio/Piezas";

/**
 * «Valorar clase» en una parada del historial de «Mis clases», o sus
 * estrellas y «Editar» si ya la valoró. Abre la misma hoja que el pop-up
 * (`HojaValoracion`). Cerrarla aquí no descarta nada.
 *
 * `vistaPrevia`: el equipo revisando la ficha lo ve y lo prueba igual que
 * el alumno, pero no guarda nada en su nombre.
 */
export default function ValorarClase({
  claseId,
  profesor,
  guardada,
  vistaPrevia = false,
}: {
  claseId: string;
  profesor: string | null;
  guardada: Inicial | null;
  vistaPrevia?: boolean;
}) {
  const { t } = usarIdioma();
  const tv = t.valoraciones;
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const estrellas = guardada?.estrellas ?? null;

  // Con algo enviado, la página se vuelve a pedir y trae lo de la base.
  const alCerrar = useCallback(
    (enviada: boolean) => {
      setAbierta(false);
      if (enviada && !vistaPrevia) router.refresh();
    },
    [router, vistaPrevia]
  );

  return (
    <div className="mt-2">
      {estrellas !== null ? (
        <div className="flex flex-wrap items-center gap-x-3">
          <EstrellasFijas valor={estrellas} etiqueta={tv.tuValoracion(estrellas)} />
          <button
            type="button"
            onClick={() => setAbierta(true)}
            aria-label={tv.editarValoracion(estrellas)}
            className={`inline-flex min-h-[44px] items-center rounded-full px-1 text-[15px] font-semibold text-marca-verdeOsc underline-offset-4 hover:underline ${FOCO}`}
          >
            {tv.editar}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAbierta(true)}
          className={`btn-verde-linea inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[15px] font-bold ${FOCO}`}
        >
          <svg aria-hidden viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M12 2.6l2.83 5.94 6.47.79-4.77 4.47 1.22 6.42L12 17.08l-5.75 3.14 1.22-6.42-4.77-4.47 6.47-.79z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          {tv.valorarClase}
        </button>
      )}

      <HojaValoracion
        abierta={abierta}
        claseId={claseId}
        profesor={profesor}
        origen="mis_clases"
        inicial={guardada}
        vistaPrevia={vistaPrevia}
        alCerrar={alCerrar}
      />
    </div>
  );
}
