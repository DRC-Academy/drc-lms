"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Alumno, Bloque } from "@/lib/data";
import { leerProgresoAlumno } from "@/lib/progreso";
import ListaBloques, { type ProgresoBloques } from "@/components/ListaBloques";

function fechaDeHoy() {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default function PanelAlumno({
  alumno,
  bloques,
}: {
  alumno: Alumno;
  bloques: Bloque[];
}) {
  const [progreso, setProgreso] = useState<ProgresoBloques>({});
  // En build queda congelada la fecha del prerender; el efecto la corrige.
  const [hoy, setHoy] = useState(fechaDeHoy);

  useEffect(() => {
    setProgreso(leerProgresoAlumno(alumno.id));
    setHoy(fechaDeHoy());
  }, [alumno.id]);

  // El último bloque llega bloqueado hasta la siguiente clase.
  const indiceBloqueado = bloques.length > 1 ? bloques.length - 1 : -1;
  const hechos = bloques.filter((b) => progreso[b.id]).length;
  const totalMinutos = bloques.reduce((suma, b) => suma + b.minutos, 0);

  const disponibles = bloques.filter((_, i) => i !== indiceBloqueado);
  const enCurso = disponibles.find((b) => !progreso[b.id]) ?? disponibles[0];

  return (
    <>
      <main className="mx-auto flex max-w-columna flex-col gap-10 px-6 pb-[140px] pt-8">
        {/* ---------------------------- BARRA SUPERIOR --------------------------- */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-[14px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
          >
            ← Cambiar de alumno
          </Link>
          <p className="flex shrink-0 items-center gap-2.5 rounded-full border border-drc-borde bg-drc-superficie py-1.5 pl-1.5 pr-4">
            <span
              aria-hidden
              className="grid h-[26px] w-[26px] place-items-center rounded-full bg-drc-verde-solido font-display text-[12px] font-semibold text-white"
            >
              {alumno.profesor[0]}
            </span>
            <span className="text-[13px] text-drc-texto">{alumno.profesor}</span>
          </p>
        </div>

        {/* ------------------------------ CABECERA ------------------------------ */}
        <header className="flex flex-col gap-7 wide:flex-row wide:items-end wide:justify-between wide:gap-10">
          <div className="min-w-0">
            <p suppressHydrationWarning className="eyebrow tabular-nums text-drc-cuerpo">
              {hoy}
            </p>
            <h1 className="mt-3.5 font-display text-[40px] font-semibold leading-none tracking-[-0.02em] text-drc-titular wide:text-[58px]">
              Hola, {alumno.nombre}
            </h1>
            <p className="mt-3 text-[16px] leading-[1.55] text-drc-cuerpo">
              Nivel <span className="font-medium text-drc-verde-texto">{alumno.nivel}</span> ·
              clases con {alumno.profesor}
            </p>
          </div>

          <div className="shrink-0 wide:text-right">
            <p className="font-display text-[34px] font-semibold leading-none tabular-nums text-drc-titular">
              {hechos}
              <span className="text-drc-cuerpo">/{bloques.length}</span>
            </p>
            <p className="eyebrow mt-2.5 text-drc-cuerpo">bloques hechos</p>
            <div className="mt-3 flex gap-1.5 wide:justify-end" aria-hidden>
              {bloques.map((b) => (
                <span
                  key={b.id}
                  className={`h-[5px] w-[26px] rounded-full ${
                    progreso[b.id] ? "bg-drc-verde" : "bg-drc-discontinuo"
                  }`}
                />
              ))}
            </div>
          </div>
        </header>

        {/* --------------------------- FILA DE TARJETAS -------------------------- */}
        <section className="grid gap-4 wide:grid-cols-[1.15fr_1fr]">
          <article className="tarjeta">
            <h2 className="eyebrow text-drc-cuerpo">Lo que vienes trabajando</h2>
            <ul className="mt-5 flex flex-col gap-3.5">
              {alumno.clases.map((clase, k) => {
                const reciente = k === 0;
                return (
                  <li key={`${clase.fecha}-${k}`} className="flex items-start gap-3">
                    <span
                      className={`w-[52px] shrink-0 text-[13px] tabular-nums ${
                        reciente ? "font-medium text-drc-verde-texto" : "text-drc-cuerpo"
                      }`}
                    >
                      {clase.fecha}
                    </span>
                    <span
                      aria-hidden
                      className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${
                        reciente ? "bg-drc-verde" : "bg-drc-hairline"
                      }`}
                    />
                    <span
                      className={`text-[15px] leading-[1.45] ${
                        reciente ? "font-medium text-drc-titular" : "text-drc-chip-texto"
                      }`}
                    >
                      {clase.tema}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="rounded-[20px] bg-drc-banner px-[26px] py-6">
            <h2 className="eyebrow text-drc-amarillo">Vas bien en</h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {alumno.logros.map((logro) => (
                <li
                  key={logro}
                  className="rounded-full bg-drc-superficie px-3.5 py-1.5 text-[13px] font-medium leading-snug text-drc-banner-texto"
                >
                  {logro}
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* --------------------------- BLOQUES DE LA SEMANA ---------------------- */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-drc-borde pb-5">
            <div className="min-w-0">
              <h2 className="font-display text-[30px] font-semibold leading-[1.1] text-drc-titular">
                Tus bloques de esta semana
              </h2>
              <p className="mt-2 max-w-[46ch] text-pretty text-[15px] leading-[1.55] text-drc-cuerpo">
                Cada bloque va de reconocer la forma a producirla tú solo. Cinco minutos cada uno.
              </p>
            </div>
            <p className="eyebrow shrink-0 tabular-nums text-drc-cuerpo">
              {totalMinutos} min en total
            </p>
          </div>

          <ListaBloques
            bloques={bloques}
            alumnoId={alumno.id}
            progreso={progreso}
            indiceBloqueado={indiceBloqueado}
          />
        </section>
      </main>

      {/* ----------------------------- BARRA FIJA ------------------------------ */}
      {enCurso && (
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
                href={`/alumno/${alumno.id}/${enCurso.id}`}
                className="btn btn-amarillo min-h-[44px] shrink-0"
              >
                Empezar bloque
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
