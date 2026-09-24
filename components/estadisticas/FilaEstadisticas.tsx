import type { ReactNode } from "react";
import type { EstadisticasAlumno } from "@/lib/estadisticas";
import type { Textos } from "@/lib/textos";
import AnilloCurso from "@/components/estadisticas/AnilloCurso";

/**
 * Las estadísticas en el inicio, por debajo de 900px: una fila de
 * tarjetas que se desliza en horizontal. En escritorio viven en la barra
 * lateral (`BarraLateral`), y por eso aquí todo va con `min-[900px]:hidden`
 * desde fuera.
 *
 * Una tarjeta por dato que se pudo leer; lo que llegó null no se pinta.
 * Un cero nunca sale como cifra: sale su frase de bienvenida (ver
 * `lib/textos/estadisticas.ts`).
 *
 * La fila sangra hasta los bordes de la pantalla —el `-mx-4` deshace el
 * margen del `main`— para que la última tarjeta asome cortada y se
 * entienda que hay más a la derecha.
 */
export default function FilaEstadisticas({ estadisticas, t }: { estadisticas: EstadisticasAlumno; t: Textos }) {
  const te = t.estadisticas;
  const tp = t.progreso;
  const { curso, nivel, clases, ejercicios } = estadisticas;

  const tarjetas: { clave: string; contenido: ReactNode }[] = [];

  if (curso) {
    tarjetas.push({
      clave: "curso",
      contenido: (
        <div className="flex items-center gap-3.5">
          <AnilloCurso porcentaje={curso.porcentaje} tamaño={56} grosor={5} />
          <div className="min-w-0">
            {curso.completadas === 0 ? (
              <>
                <p className="font-display text-[16px] font-bold leading-tight text-marca-tinta">{te.cursoVacioTitulo}</p>
                <p className="mt-1 text-[13.5px] leading-snug text-marca-tintaMedia">{te.cursoVacioTexto}</p>
              </>
            ) : (
              <>
                <p className="sr-only">{te.porcentajeDe(curso.porcentaje, curso.titulo)}</p>
                <p className="font-display text-[16px] font-bold leading-tight text-marca-tinta">
                  {curso.porcentaje === 100 ? te.cursoCompleto : te.lecciones(curso.completadas, curso.total)}
                </p>
                <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-marca-tintaMedia">{curso.titulo}</p>
              </>
            )}
          </div>
        </div>
      ),
    });
  }

  if (nivel) {
    tarjetas.push({
      clave: "nivel",
      contenido: (
        <Dato etiqueta={tp.nivelActual}>
          <span className="inline-flex w-fit items-center rounded-full bg-marca-verdeFondo px-3 py-1 font-display text-[18px] font-bold leading-none text-marca-verdeOsc">
            {nivel.valor}
          </span>
          {!nivel.fiable && <span className="mt-1.5 block text-[13px] leading-snug text-marca-grisSuave">{tp.nivelEstimado}</span>}
        </Dato>
      ),
    });
  }

  if (clases !== null) {
    tarjetas.push({
      clave: "clases",
      contenido: <Cifra etiqueta={tp.clasesHechas(clases)} valor={clases} vacio={te.clasesVacio} />,
    });
  }

  if (ejercicios !== null) {
    tarjetas.push({
      clave: "ejercicios",
      contenido: <Cifra etiqueta={te.ejercicios(ejercicios)} valor={ejercicios} vacio={te.ejerciciosVacio} />,
    });
  }

  if (tarjetas.length === 0) return null;

  return (
    <section aria-label={te.titulo}>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tarjetas.map(({ clave, contenido }) => (
          <li
            key={clave}
            className={`flex shrink-0 snap-start scroll-ml-4 rounded-[16px] border border-marca-borde bg-white p-4 shadow-[0_10px_24px_rgba(18,33,26,0.07)] ${
              clave === "curso" ? "w-[272px]" : "w-[168px]"
            }`}
          >
            <div className="w-full">{contenido}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[13px] font-semibold leading-tight text-marca-gris">{etiqueta}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Una cifra con su etiqueta; con cero, la frase de bienvenida en su lugar. */
function Cifra({ etiqueta, valor, vacio }: { etiqueta: string; valor: number; vacio: string }) {
  return (
    <Dato etiqueta={etiqueta}>
      {valor > 0 ? (
        <span className="font-display text-[26px] font-bold leading-none tabular-nums text-marca-tinta">{valor}</span>
      ) : (
        <span className="block text-[13.5px] leading-snug text-marca-tintaMedia">{vacio}</span>
      )}
    </Dato>
  );
}
