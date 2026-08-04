"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bloque, PerfilAlumno, UltimaClase } from "@/lib/data";
import type { ModoGeneracion, TarjetaModo } from "@/lib/modos";
import { formatearFecha } from "@/lib/perfil";
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
import TarjetasGeneracion, { type EstadoGeneracion } from "@/components/TarjetasGeneracion";
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
  alumnoId,
  perfil,
  ultimaClase,
  tarjetas,
  bloques,
}: {
  alumnoId: string;
  /** Puede ser null: hay alumnos con clase analizada y sin fila de perfil. */
  perfil: PerfilAlumno | null;
  ultimaClase: UltimaClase | null;
  tarjetas: TarjetaModo[];
  bloques: Bloque[];
}) {
  const [progreso, setProgreso] = useState<ProgresoBloques>({});
  const [avance, setAvance] = useState<AvanceBloques>({});
  const [generados, setGenerados] = useState<Bloque[]>([]);
  const [estado, setEstado] = useState<EstadoGeneracion>("listo");
  const [modoActivo, setModoActivo] = useState<ModoGeneracion | null>(null);
  // En build queda congelada la fecha del prerender; el efecto la corrige.
  const [hoy, setHoy] = useState(fechaDeHoy);

  const zonaNuevos = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setProgreso(leerProgresoAlumno(alumnoId));
    setAvance(leerAvanceAlumno(alumnoId));
    setGenerados(leerBloquesGenerados(alumnoId));
    setHoy(fechaDeHoy());
  }, [alumnoId]);

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

  const generar = useCallback(
    async (modo: ModoGeneracion) => {
      setEstado("generando");
      setModoActivo(modo);
      try {
        const respuesta = await fetch("/api/generar-bloque", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            alumnoId,
            modo,
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

        guardarBloqueGenerado(alumnoId, bloque);
        setGenerados((previos) => [bloque, ...previos]);
        setEstado("listo");
        setModoActivo(null);

        // Que se vea aparecer: el bloque nuevo entra en cabeza de la lista.
        window.requestAnimationFrame(() => {
          zonaNuevos.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } catch (error) {
        console.error("[panel] No se pudo generar el bloque:", error);
        setEstado("error");
        setModoActivo(null);
      }
    },
    [alumnoId, todos]
  );

  const generando = estado === "generando";
  const nombre = perfil?.nombre.trim() ?? "";
  // Sin perfil no hay ni nivel ni profesor: se saluda igual y se enseña menos.
  const subtitulo = perfil
    ? `Nivel ${perfil.nivel} · clases con ${perfil.profesor}`
    : null;

  return (
    <>
      <Cabecera nombre={nombre || undefined} />

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
          <h1 className="mt-3.5 text-balance font-display text-[40px] font-semibold leading-none tracking-[-0.02em] text-drc-titular wide:text-[58px]">
            {nombre ? `Hola, ${nombre}` : "Hola"}
          </h1>
          {subtitulo && (
            <p className="mt-3 text-[16px] leading-[1.55] text-drc-cuerpo">
              Nivel <span className="font-medium text-drc-verde-texto">{perfil?.nivel}</span> ·
              clases con {perfil?.profesor}
            </p>
          )}
        </header>

        {/* --------------------------- RESUMEN DE PROGRESO ---------------------- */}
        {todos.length > 0 && (
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
        )}

        {/* --------------------------- CONTEXTO DEL ALUMNO ---------------------- */}
        {(ultimaClase || perfil?.puntosFuertes) && (
          <section className="grid gap-4 wide:grid-cols-[1.15fr_1fr]">
            {ultimaClase && (
              <article className="tarjeta">
                <h2 className="eyebrow text-drc-cuerpo">Tu última clase</h2>
                <p className="mt-4 text-[13px] tabular-nums text-drc-verde-texto">
                  {formatearFecha(ultimaClase.fechaClase)}
                </p>
                <p className="mt-1.5 text-pretty font-display text-[17px] font-semibold leading-snug text-drc-titular">
                  {ultimaClase.titulo}
                </p>
              </article>
            )}

            {perfil?.puntosFuertes && (
              <article className="tarjeta">
                <h2 className="eyebrow text-drc-cuerpo">Vas bien en</h2>
                <p className="mt-4 text-pretty text-[15px] leading-[1.55] text-drc-texto">
                  {perfil.puntosFuertes}
                </p>
              </article>
            )}
          </section>
        )}

        {/* ------------------------- MODOS DE GENERACIÓN ------------------------ */}
        <TarjetasGeneracion
          tarjetas={tarjetas}
          estado={estado}
          modoActivo={modoActivo}
          onGenerar={generar}
        />

        {/* --------------------------- BLOQUES DE LA SEMANA ---------------------- */}
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
                href={`/alumno/${alumnoId}/${enCurso.id}`}
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
