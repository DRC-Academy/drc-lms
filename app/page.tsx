import Link from "next/link";
import { ALUMNOS } from "@/lib/data";
import Cabecera from "@/components/Cabecera";

export default function Home() {
  return (
    <>
      <Cabecera />

      <main className="mx-auto max-w-columna px-6 py-12 sm:py-16">
        <p className="eyebrow text-drc-verde-texto">DRC Academy · prototipo</p>
        <h1 className="mt-3.5 font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-drc-titular sm:text-[44px]">
          Tu práctica, hecha con tus clases
        </h1>
        <p className="mt-3.5 max-w-[52ch] text-pretty text-[16px] leading-[1.55] text-drc-cuerpo">
          Elige un alumno de prueba. Los bloques están generados a partir de lo que trabajó en sus
          últimas clases.
        </p>

        <ul className="mt-10 flex flex-col gap-3">
          {ALUMNOS.map((a) => (
            <li key={a.id}>
              <Link
                href={`/alumno/${a.id}`}
                className="tarjeta tarjeta-activa flex items-center gap-4"
              >
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-drc-verde-solido font-display text-[16px] font-semibold text-white"
                >
                  {a.nombre[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[17px] font-semibold text-drc-titular">
                    {a.nombre} · {a.nivel}
                  </span>
                  <span className="mt-0.5 block truncate text-[14px] text-drc-cuerpo">
                    Última clase: {a.clases[0].tema}
                  </span>
                </span>
                <span aria-hidden className="text-[18px] text-drc-flecha">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
