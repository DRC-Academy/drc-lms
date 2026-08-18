import type { Bloque } from "@/lib/data";
import Banner from "@/components/Banner";

/**
 * La fila que abre `/practica`: por dónde seguir y qué pasó en clase.
 *
 * DOS PIEZAS QUE NO SON LA MISMA COSA. A la izquierda el banner, que es
 * la franja destacada de la aplicación y se ve igual aquí que en el
 * inicio o en el curso. A la derecha una TARJETA crema, que no es un
 * banner: no lleva verde ni amarillo y su sitio es contar de qué
 * depende lo que aún no ha pasado.
 *
 * LO QUE MANDA ES EL BLOQUE EN CURSO, no la lista. La pregunta que trae
 * al alumno es "¿por dónde iba?", y responderla arriba del todo le
 * ahorra recorrer la lista entera para encontrarse a sí mismo.
 *
 * NO SE MIDE EL TIEMPO EN NINGUNA PARTE. Ni aquí ni en el resto de la
 * pantalla: los minutos de un bloque no son una promesa que podamos
 * cumplir —depende de lo que le cueste a cada uno— y ponerlos convierte
 * la práctica en una cuenta atrás. Lo que sí orienta es la posición:
 * "bloque 1 de 4" dice lo que falta sin prometer nada.
 */
export default function FilaDestacada({
  alumnoId,
  enCurso,
  posicion,
  total,
  empezados,
  segmentos,
  ultimaClase,
}: {
  alumnoId: string;
  /** El primer bloque sin terminar, o null si no queda ninguno. */
  enCurso: Bloque | null;
  /** Posición de ese bloque en la lista, empezando en 1. */
  posicion: number;
  total: number;
  empezados: number;
  /** Uno por bloque, en orden: true si ya se ha tocado. */
  segmentos: boolean[];
  /** Qué contarle de su última clase. Lo redacta quien llama. */
  ultimaClase: { titulo: string; cuerpo: string };
}) {
  // Sin bloques no hay banner: quedaría un titular hablando de algo que
  // no existe. La tarjeta de la clase se queda sola a ancho completo y
  // es la que explica de qué depende que aparezca la práctica.
  const hayPractica = total > 0;
  const empezado = enCurso !== null && segmentos[posicion - 1] === true;

  return (
    <div
      className={`grid items-start gap-3 lg:gap-5 ${
        hayPractica ? "min-[1200px]:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1"
      }`}
    >
      {hayPractica && (
        <Banner
          eyebrow={enCurso ? "Sigue por aquí" : "Por hoy, hecho"}
          title={enCurso ? enCurso.titulo : "Has terminado tu práctica de hoy"}
          meta={
            enCurso ? `${enCurso.area} · Bloque ${posicion} de ${total}` : `Los ${total} bloques, terminados`
          }
          subtitle={
            enCurso
              ? enCurso.intro
              : "Tu práctica se vuelve a generar con lo de tu siguiente clase. Mientras tanto, puedes repasar cualquiera de los bloques de abajo."
          }
          action={
            enCurso
              ? {
                  label: empezado ? "Continuar" : "Empezar",
                  href: `/alumno/${alumnoId}/${enCurso.id}`,
                  srSuffix: enCurso.titulo,
                }
              : undefined
          }
          secondaryText={enCurso ? (empezado ? "Lo dejaste a medias" : "Es por donde toca seguir") : undefined}
          aside={
            <>
              <p className="flex items-baseline gap-[7px]">
                <span className="font-display text-[40px] font-extrabold leading-none text-white tabular-nums">
                  {total}
                </span>
                <span className="text-[14px] font-semibold text-white/[0.82]">
                  {total === 1 ? "bloque" : "bloques"}
                </span>
              </p>
              <p className="mt-1 text-[13px] text-white/[0.82]">preparados para ti</p>

              {/* Una marca por bloque, igual que el banner del curso marca
                  una por lección: lo empezado en blanco, lo que queda
                  apagado. */}
              <div aria-hidden className="mt-[18px] flex gap-[3px]">
                {segmentos.map((tocado, i) => (
                  <span
                    key={i}
                    className={`h-[11px] flex-1 rounded-[1.5px] ${tocado ? "bg-white" : "bg-white/[0.32]"}`}
                  />
                ))}
              </div>

              <p className="mt-3.5 text-[13px] text-white/[0.82]">
                {empezados === 0
                  ? "ninguno empezado todavía"
                  : `${empezados} ya ${empezados === 1 ? "empezado" : "empezados"}`}
              </p>
            </>
          }
        />
      )}

      {/* La tarjeta de la clase. Discontinua como la invitación al perfil
          del inicio: es lo único de la pantalla que está a la espera de
          algo que no depende del alumno. */}
      <section className="rounded-[16px] border-[1.5px] border-dashed border-marca-perfilBorde bg-marca-perfil p-[18px] lg:p-5">
        <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-amarilloTexto lg:text-[11px]">
          Tu última clase
        </span>

        <h2 className="mt-2 text-pretty font-display text-[17px] font-bold leading-[1.2] text-marca-tinta lg:mt-2.5 lg:text-[19px]">
          {ultimaClase.titulo}
        </h2>

        <p className="mt-1.5 text-pretty text-[13.5px] leading-[1.45] text-marca-gris lg:mt-[7px] lg:text-[14px]">
          {ultimaClase.cuerpo}
        </p>
      </section>
    </div>
  );
}
