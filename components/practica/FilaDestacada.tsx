import Link from "next/link";
import type { Bloque } from "@/lib/data";

/**
 * La fila que abre `/practica`: por dónde seguir y qué pasó en clase.
 *
 * ES LA MISMA PIEZA QUE EL BANNER DEL INICIO, con otro contenido dentro.
 * Fondo `marca-tinta`, etiqueta ámbar con punto, titular blanco grande,
 * botón verde y una columna a la derecha con la cifra y el progreso
 * marcado pieza a pieza. Quien llega desde el inicio reconoce el mueble
 * antes de leer nada, que es justo lo que se venía a arreglar: aquí
 * había otra paleta y la práctica parecía de otro producto.
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
  // Sin bloques no hay tarjeta oscura: quedaría un titular hablando de
  // algo que no existe. La de la clase se queda sola a ancho completo y
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
        <section className="grid rounded-[18px] bg-marca-tinta p-5 lg:min-h-[264px] lg:grid-cols-[minmax(0,1fr)_210px] lg:items-end lg:gap-9 lg:rounded-[20px] lg:p-8">
          <div className="flex flex-col lg:h-full">
            <p className="mb-3 flex items-center gap-2 lg:mb-4">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-marca-amarillo lg:h-1.5 lg:w-1.5" />
              <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-amarillo lg:text-[12px]">
                {enCurso ? "Sigue por aquí" : "Por hoy, hecho"}
              </span>
            </p>

            <h2 className="text-pretty font-display text-[22px] font-bold leading-[1.2] text-white lg:max-w-[560px] lg:text-[34px] lg:leading-[1.16]">
              {enCurso ? enCurso.titulo : "Has terminado tu práctica de hoy"}
            </h2>

            <p className="mt-2 text-[13px] leading-[1.4] text-white/55 lg:mt-3 lg:text-[15px] lg:leading-[1.45]">
              {enCurso
                ? `${enCurso.area} · Bloque ${posicion} de ${total}`
                : `Los ${total} bloques, terminados`}
            </p>

            <p className="mt-3 text-pretty text-[14px] leading-[1.5] text-white/[0.76] lg:mt-3.5 lg:max-w-[560px] lg:text-[15px] lg:leading-[1.55]">
              {enCurso
                ? enCurso.intro
                : "Tu práctica se vuelve a generar con lo de tu siguiente clase. Mientras tanto, puedes repasar cualquiera de los bloques de abajo."}
            </p>

            {enCurso && (
              <div className="mt-[18px] lg:mt-auto lg:flex lg:items-center lg:gap-[18px] lg:pt-[26px]">
                <Link
                  href={`/alumno/${alumnoId}/${enCurso.id}`}
                  className="block rounded-full bg-marca-verde px-8 py-[15px] text-center text-[16px] font-semibold leading-none text-white transition-colors hover:bg-marca-verdeOsc lg:inline-block lg:py-[14px]"
                >
                  {empezado ? "Continuar" : "Empezar"}
                  <span className="sr-only"> {enCurso.titulo}</span>
                </Link>
                <span className="mt-3 block text-center text-[12.5px] text-white/45 lg:mt-0 lg:inline lg:text-[14px] lg:text-white/55">
                  {empezado ? "Lo dejaste a medias" : "Es por donde toca seguir"}
                </span>
              </div>
            )}
          </div>

          {/* La columna de la derecha: cuántos hay y cuáles se han tocado.
              Una marca por bloque, igual que el banner del curso marca una
              por lección. Separada por una línea y no por un hueco: es otro
              dato, no la continuación del titular. */}
          <div className="mt-5 border-t border-white/[0.14] pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <p className="flex items-baseline gap-[7px]">
              <span className="font-display text-[32px] font-bold leading-none text-white tabular-nums lg:text-[40px]">
                {total}
              </span>
              <span className="text-[15px] font-semibold text-white/50 lg:text-[16px]">
                {total === 1 ? "bloque" : "bloques"}
              </span>
            </p>
            <p className="mt-1 text-[13px] text-white/50">preparados para ti</p>

            <div aria-hidden className="mt-[18px] flex gap-[3px]">
              {segmentos.map((tocado, i) => (
                <span
                  key={i}
                  className={`h-[11px] flex-1 rounded-[1.5px] ${tocado ? "bg-marca-verdeClaro" : "bg-white/[0.13]"}`}
                />
              ))}
            </div>

            <p className="mt-3.5 text-[13px] text-white/[0.62]">
              {empezados === 0
                ? "ninguno empezado todavía"
                : `${empezados} ya ${empezados === 1 ? "empezado" : "empezados"}`}
            </p>
          </div>
        </section>
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
