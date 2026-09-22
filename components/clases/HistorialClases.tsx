// ---------------------------------------------------------------
// EL HISTORIAL DE «CLASES»
//
// Las clases pasadas y lo que se trabajó en cada una. No es una pieza
// nueva: es el recorrido clase a clase de la ficha de progreso
// (`components/progreso/Recorrido.tsx`), con su CSS, en su modo
// `detalle` —quién dio la clase y los temas y el vocabulario—, y con
// TODAS las clases, también las que no tienen análisis: esas salen con su
// fecha y su profesor, sin contenido inventado.
//
// Todo se lee en el servidor (`obtenerRecorrido`, `obtenerNombresProfesor`)
// y nada de lo que se pinta es el transcript ni los errores del alumno.
// ---------------------------------------------------------------

import type { ClaseDelRecorrido } from "@/lib/gestion";
import type { TextosClases } from "@/lib/textos/clases";
import Recorrido from "@/components/progreso/Recorrido";
import { EstilosFicha } from "@/components/progreso/estilos";

export default function HistorialClases({
  clases,
  profesores,
  t,
}: {
  /** `Recorrido.todas`: de la más reciente a la más antigua. */
  clases: ClaseDelRecorrido[];
  profesores: Map<string, string>;
  t: TextosClases;
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-historial">
      <header>
        <h2 id="titulo-historial" className="font-display text-[22px] font-bold leading-tight text-marca-tinta lg:text-[24px]">
          {t.historial}
        </h2>
        <p className="mt-1 text-[15px] text-marca-gris">{t.historialAyuda}</p>
      </header>

      {/* `pg-page` pone las variables y la tipografía de la ficha; aquí no
          es la página entera, así que no crece ni pinta fondo. */}
      <div className="pg-page" style={{ flex: "none", background: "transparent" }}>
        <EstilosFicha />
        <Recorrido
          clases={clases}
          vacio={t.historialVacio}
          retraso="0ms"
          detalle={{ profesores, conProfesor: t.conProfesor, temas: t.temasYVocabulario }}
        />
      </div>
    </section>
  );
}
