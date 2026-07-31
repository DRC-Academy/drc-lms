"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Alumno, Bloque } from "@/lib/data";
import { validarBloque } from "@/lib/validarBloque";
import {
  contarGeneradosEstaSemana,
  estadoDeBloque,
  guardarBloqueGenerado,
  leerAvanceAlumno,
  leerBloquesGenerados,
  leerProgresoAlumno,
} from "@/lib/progreso";
import Cabecera from "@/components/Cabecera";
import BannerGenerar, {
  PASOS_GENERACION,
  type EstadoGeneracion,
} from "@/components/BannerGenerar";
import ListaBloques, {
  type AvanceBloques,
  type ProgresoBloques,
} from "@/components/ListaBloques";

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
  const [avance, setAvance] = useState<AvanceBloques>({});
  const [generados, setGenerados] = useState<Bloque[]>([]);
  const [estaSemana, setEstaSemana] = useState(0);
  const [estado, setEstado] = useState<EstadoGeneracion>("listo");
  const [paso, setPaso] = useState(0);
  // En build queda congelada la fecha del prerender; el efecto la corrige.
  const [hoy, setHoy] = useState(fechaDeHoy);

  const zonaNuevos = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setProgreso(leerProgresoAlumno(alumno.id));
    setAvance(leerAvanceAlumno(alumno.id));
    setGenerados(leerBloquesGenerados(alumno.id));
    setEstaSemana(contarGeneradosEstaSemana(alumno.id));
    setHoy(fechaDeHoy());
  }, [alumno.id]);

  // Los pasos avanzan solos mientras se genera y se quedan en el último.
  useEffect(() => {
    if (estado !== "generando") return;
    setPaso(0);
    const relojes = [
      window.setTimeout(() => setPaso(1), 700),
      window.setTimeout(() => setPaso(2), 1450),
    ];
    return () => relojes.forEach(window.clearTimeout);
  }, [estado]);

  // Los generados van primero: son la novedad de la semana.
  const todos = useMemo(() => [...generados, ...bloques], [generados, bloques]);
  const idsGenerados = useMemo(() => generados.map((b) => b.id), [generados]);

  // El último bloque estático llega bloqueado hasta la siguiente clase.
  const indiceBloqueado = bloques.length > 1 ? todos.length - 1 : -1;

  const resumen = useMemo(() => {
    const visibles = todos.filter((_, i) => i !== indiceBloqueado);
    let dominados = 0;
    let minutos = 0;
    const porcentajes: number[] = [];

    for (const bloque of visibles) {
      const { estado: estadoBloque, porcentaje } = estadoDeBloque(
        progreso[bloque.id],
        avance[bloque.id],
        idsGenerados.includes(bloque.id)
      );
      if (estadoBloque === "dominado") dominados += 1;
      if (porcentaje !== null) {
        porcentajes.push(porcentaje);
        minutos += bloque.minutos;
      }
    }

    return {
      dominados,
      total: visibles.length,
      medio: porcentajes.length
        ? Math.round(porcentajes.reduce((suma, p) => suma + p, 0) / porcentajes.length)
        : null,
      minutos,
    };
  }, [todos, indiceBloqueado, progreso, avance, idsGenerados]);

  const disponibles = todos.filter((_, i) => i !== indiceBloqueado);
  const enCurso = disponibles.find((b) => !progreso[b.id]) ?? disponibles[0];

  const generar = useCallback(async () => {
    setEstado("generando");
    try {
      const respuesta = await fetch("/api/generar-bloque", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alumnoId: alumno.id,
          excluir: todos.map((b) => b.titulo),
        }),
      });

      if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);

      const cuerpo: unknown = await respuesta.json();
      const bloque = validarBloque(
        typeof cuerpo === "object" && cuerpo !== null
          ? (cuerpo as { bloque?: unknown }).bloque
          : null
      );
      if (!bloque) throw new Error("El bloque recibido no tiene la forma esperada");

      guardarBloqueGenerado(alumno.id, bloque);
      setGenerados((previos) => [bloque, ...previos]);
      setEstaSemana(contarGeneradosEstaSemana(alumno.id));
      setEstado("listo");

      // Que se vea aparecer: el bloque nuevo entra en cabeza de la lista.
      window.requestAnimationFrame(() => {
        zonaNuevos.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      console.error("[panel] No se pudo generar el bloque:", error);
      setEstado("error");
    }
  }, [alumno.id, todos]);

  const generando = estado === "generando";

  return (
    <>
      <Cabecera nombre={alumno.nombre} />

      <main className="mx-auto flex max-w-columna flex-col gap-10 px-6 pb-[140px] pt-7">
        <Link
          href="/"
          className="-mb-4 self-start text-[14px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
        >
          ← Cambiar de alumno
        </Link>

        {/* ------------------------------ CABECERA ------------------------------ */}
        <header className="min-w-0">
          <p suppressHydrationWarning className="eyebrow tabular-nums text-drc-cuerpo">
            {hoy}
          </p>
          <h1 className="mt-3.5 font-display text-[40px] font-semibold leading-none tracking-[-0.02em] text-drc-titular wide:text-[58px]">
            Hola, {alumno.nombre}
          </h1>
          <p className="mt-3 text-[16px] leading-[1.55] text-drc-cuerpo">
            Nivel <span className="font-medium text-drc-verde-texto">{alumno.nivel}</span> · clases
            con {alumno.profesor}
          </p>
        </header>

        {/* --------------------------- RESUMEN DE PROGRESO ---------------------- */}
        <section
          aria-label="Tu progreso"
          className="grid grid-cols-3 divide-x divide-drc-borde rounded-[20px] border border-drc-borde bg-drc-superficie"
        >
          <div className="px-2.5 py-5 text-center wide:px-6">
            <p className="font-display text-[28px] font-semibold leading-none tabular-nums text-drc-titular wide:text-[32px]">
              {resumen.dominados}
              <span className="text-drc-cuerpo">/{resumen.total}</span>
            </p>
            {/* leading-[1.35] deja que la etiqueta parta en dos líneas en móvil sin cortarse. */}
            <p className="eyebrow mt-2.5 leading-[1.35] text-drc-cuerpo">Dominados</p>
          </div>
          <div className="px-2.5 py-5 text-center wide:px-6">
            <p className="font-display text-[28px] font-semibold leading-none tabular-nums text-drc-titular wide:text-[32px]">
              {resumen.medio === null ? "—" : `${resumen.medio}%`}
            </p>
            <p className="eyebrow mt-2.5 leading-[1.35] text-drc-cuerpo">Acierto medio</p>
          </div>
          <div className="px-2.5 py-5 text-center wide:px-6">
            <p className="font-display text-[28px] font-semibold leading-none tabular-nums text-drc-titular wide:text-[32px]">
              {resumen.minutos}
              <span className="text-[17px] text-drc-cuerpo"> min</span>
            </p>
            <p className="eyebrow mt-2.5 leading-[1.35] text-drc-cuerpo">Practicados</p>
          </div>
        </section>

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

          <article className="tarjeta">
            <h2 className="eyebrow text-drc-cuerpo">Vas bien en</h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {alumno.logros.map((logro) => (
                <li
                  key={logro}
                  className="rounded-full bg-drc-chip-verde px-3.5 py-1.5 text-[13px] font-medium leading-snug text-drc-verde-texto"
                >
                  {logro}
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* ------------------------- GENERAR PRÓXIMA CLASE ---------------------- */}
        <BannerGenerar
          ultimaClase={alumno.clases[0].tema}
          estado={estado}
          paso={paso}
          generadosEstaSemana={estaSemana}
          onGenerar={generar}
        />

        {/* --------------------------- BLOQUES DE LA SEMANA ---------------------- */}
        <section ref={zonaNuevos} className="scroll-mt-20">
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
              {todos.reduce((suma, b) => suma + b.minutos, 0)} min en total
            </p>
          </div>

          <ListaBloques
            bloques={todos}
            alumnoId={alumno.id}
            progreso={progreso}
            avance={avance}
            generados={idsGenerados}
            indiceBloqueado={indiceBloqueado}
            generando={generando}
          />
        </section>
      </main>

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
                href={`/alumno/${alumno.id}/${enCurso.id}`}
                className="btn btn-amarillo min-h-[46px] shrink-0"
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
