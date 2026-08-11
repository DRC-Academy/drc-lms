"use client";

import Link from "next/link";
import type { Bloque } from "@/lib/data";
import type { TarjetaModo } from "@/lib/modos";
import { usarGenerador } from "@/components/usarGenerador";
import TarjetasGeneracion from "@/components/TarjetasGeneracion";
import ListaBloques, {
  type AvanceBloques,
  type ProgresoBloques,
} from "@/components/ListaBloques";

/**
 * La sección de práctica entera: generar y la lista de bloques.
 *
 * Vive en su propia página y no en un ancla del inicio. La navegación
 * promete tres secciones y una de ellas tiene que ser una pantalla, no
 * un salto a mitad de otra —que además en móvil aterriza torcido.
 *
 * El inicio conserva las tarjetas de generación como entrada rápida; la
 * lista de bloques se ha venido aquí, que es su sitio.
 */
export default function PanelPractica({
  alumnoId,
  tarjetas,
  bloques,
  progreso,
  avance,
  generadosIniciales,
}: {
  alumnoId: string;
  tarjetas: TarjetaModo[];
  bloques: Bloque[];
  progreso: ProgresoBloques;
  avance: AvanceBloques;
  generadosIniciales: Bloque[];
}) {
  const { estado, modoActivo, generando, todos, idsGenerados, generar, zonaNuevos } =
    usarGenerador({ alumnoId, bloques, generadosIniciales });

  // El último bloque estático llega bloqueado hasta la siguiente clase.
  const indiceBloqueado = bloques.length > 1 ? todos.length - 1 : -1;
  const disponibles = todos.filter((_, i) => i !== indiceBloqueado);
  const enCurso = disponibles.find((b) => !progreso[b.id]) ?? disponibles[0];

  return (
    <>
      <TarjetasGeneracion
        tarjetas={tarjetas}
        estado={estado}
        modoActivo={modoActivo}
        onGenerar={generar}
      />

      {todos.length > 0 && (
        <section ref={zonaNuevos} className="scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-drc-borde pb-5">
            <div className="min-w-0">
              <h2 className="font-display text-[30px] font-semibold leading-[1.1] text-drc-titular">
                Tus bloques
              </h2>
              <p className="mt-2 max-w-[46ch] text-pretty text-[15px] leading-[1.55] text-drc-cuerpo">
                Cada bloque va de reconocer la forma a producirla tú solo. Cinco minutos cada uno.
              </p>
            </div>
            <p className="eyebrow shrink-0 tabular-nums text-drc-cuerpo">
              {todos.reduce((suma, b) => suma + b.minutos, 0)} min en total
            </p>
          </div>

          <ListaBloques
            bloques={todos}
            alumnoId={alumnoId}
            progreso={progreso}
            avance={avance}
            generados={idsGenerados}
            indiceBloqueado={indiceBloqueado}
            generando={generando}
          />
        </section>
      )}

      {/* ----------------------------- BARRA FIJA ------------------------------ */}
      {enCurso && !generando && (
        <div className="fondo-fundido pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-5 pt-12">
          <div className="mx-auto w-full max-w-columna px-6">
            <div className="pointer-events-auto flex items-center gap-4 rounded-[18px] bg-drc-banner py-3 pl-5 pr-3">
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-drc-amarillo">Sigue por aquí</p>
                <p className="mt-1.5 truncate font-display text-[17px] font-semibold text-white">
                  {enCurso.titulo}
                </p>
              </div>
              <Link
                href={`/alumno/${alumnoId}/${enCurso.id}`}
                className="btn min-h-[46px] shrink-0 bg-white text-drc-verde-texto hover:bg-drc-fantasma-hover"
              >
                Empezar
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
