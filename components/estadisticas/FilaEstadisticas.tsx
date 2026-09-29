import type { ReactNode } from "react";
import type { EstadisticasAlumno } from "@/lib/estadisticas";
import type { Textos } from "@/lib/textos";
import { TARJETA } from "@/components/base/Seccion";

/**
 * Las estadísticas en el inicio, por debajo de 900px: una fila de
 * tarjetas que se desliza en horizontal. En escritorio viven en la barra
 * lateral (`BarraLateral`), y por eso aquí todo va con `min-[900px]:hidden`
 * desde fuera.
 *
 * SIN EL CURSO (septiembre de 2026). La tarjeta del anillo contaba «12
 * de 182 lecciones» dos dedos por debajo del banner del diploma, que
 * cuenta lo mismo. El dato vive solo en el banner.
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
  const { nivel, clases, ejercicios } = estadisticas;

  const tarjetas: { clave: string; contenido: ReactNode }[] = [];

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
            className={`${TARJETA} flex w-[168px] shrink-0 snap-start scroll-ml-4 p-4`}
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
