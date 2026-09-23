// ---------------------------------------------------------------
// «CLASES», LA PANTALLA ENTERA
//
// Con el formato del inicio (`app/(alumno)/alumno/[id]/page.tsx`): el
// mismo `main` —ancho máximo, márgenes, corte de 900 px—, la misma
// cabecera y la misma rejilla de tarjeta ancha y columna de 416 px.
//
//   · ARRIBA, LA PRÓXIMA CLASE (`BannerClase`, el del inicio) y a su lado
//     la última que se dio, con lo que se trabajó y el enlace a su sitio
//     en el historial. Lo que viene y lo que acaba de pasar, juntos.
//   · EL CALENDARIO (`SemanaClases`): esta semana y las tres siguientes.
//   · EL HISTORIAL (`HistorialClases`, el recorrido de «Mi progreso»), con
//     un ancla por clase para que el calendario lleve a cada una.
//
// SIN HORARIO NI CLASES POR DELANTE, una tarjeta con la mascota que dice dónde van a
// salir y lleva a la práctica: no es un error, es que aún no ha empezado.
//
// Recibe los datos ya leídos: la página los pide con las mismas consultas
// que ya tenía «Clases». `ahora` es la hora del servidor, inyectable para
// fijarla en las pruebas visuales.
// ---------------------------------------------------------------

import Link from "next/link";
import { proximaDelAlumno, semanasDelAlumno } from "@/lib/clases";
import type { FilaCalendario } from "@/lib/calendario-gestion";
import type { ClaseDelRecorrido } from "@/lib/gestion";
import { formatearFechaLarga } from "@/lib/perfil";
import type { Textos } from "@/lib/textos";
import BannerClase, { SinProxima } from "@/components/clases/BannerClase";
import SemanaClases from "@/components/clases/SemanaClases";
import HistorialClases from "@/components/clases/HistorialClases";
import AnclaMascota from "@/components/mascota/AnclaMascota";

export default function PantallaClases({
  calendario,
  excepciones,
  recorrido,
  profesores,
  semana,
  hrefSemana,
  hrefPractica,
  t,
  ahora = new Date(),
}: {
  calendario: FilaCalendario[];
  excepciones: unknown;
  /** `obtenerRecorrido().todas`: de la más reciente a la más antigua. */
  recorrido: ClaseDelRecorrido[];
  profesores: Map<string, string>;
  /** La semana del calendario que se enseña: 0 es la actual. */
  semana: number;
  hrefSemana: (indice: number) => string;
  /** «Para ti», con el foco de revisión si lo hay: el enlace del estado vacío. */
  hrefPractica: string;
  t: Textos;
  ahora?: Date;
}) {
  const tc = t.clases;
  const proxima = proximaDelAlumno(calendario, excepciones, ahora);
  const semanas = semanasDelAlumno(calendario, excepciones, ahora, undefined, { conPasadas: true });
  const indice = Math.min(Math.max(0, semana), semanas.length - 1);
  const ultima = recorrido[0];
  // Sin horario, o con horario pero ninguna clase en estas cuatro semanas
  // (los hay: celdas antiguas que ya no dan clase): la misma tarjeta.
  const sinHorario = calendario.length === 0 || (!proxima && semanas.every((s) => s.dias.every((d) => d.clases.length === 0)));

  return (
    <main className="mx-auto w-full max-w-contenido flex-1 px-4 pb-8 pt-[18px] min-[900px]:px-9 min-[900px]:pb-11 min-[900px]:pt-8">
      {/* LA CABECERA, la del saludo del inicio. */}
      <header className="entra mb-4 min-[900px]:mb-[22px]">
        <h1 className="font-display text-[22px] font-bold leading-[1.15] text-marca-tinta min-[900px]:text-[30px]">{tc.misClases}</h1>
        <p className="mt-[5px] text-pretty text-[14px] leading-[1.4] text-marca-gris min-[900px]:mt-1.5 min-[900px]:text-[16px]">
          {tc.tuHorarioSemanal}
        </p>
      </header>

      {sinHorario ? (
        <SinClases t={tc} hrefPractica={hrefPractica} />
      ) : (
        <>
          <div
            className={`entra grid items-stretch gap-3 min-[900px]:gap-5 ${ultima ? "min-[1200px]:grid-cols-[minmax(0,1fr)_416px]" : ""}`}
            style={{ animationDelay: "var(--paso-escalonado)" }}
          >
            {proxima ? <BannerClase proxima={proxima} t={tc} ahora={ahora} /> : <SinProxima t={tc} />}
            {ultima && <UltimaClase clase={ultima} profesores={profesores} t={t} />}
          </div>

          <div className="entra mt-[26px] min-[900px]:mt-9" style={{ animationDelay: "calc(var(--paso-escalonado) * 2)" }}>
            <SemanaClases semanas={semanas} indice={indice} hrefSemana={hrefSemana} recorrido={recorrido} t={tc} ahora={ahora} />
          </div>
        </>
      )}

      <div className="mt-[26px] min-[900px]:mt-9">
        <HistorialClases clases={recorrido} profesores={profesores} t={tc} anclas />
      </div>
    </main>
  );
}

/**
 * La clase más reciente del historial, al lado del banner: su fecha, con
 * quién, el título y los temas, y el enlace a su tarjeta del historial.
 * La tarjeta es la de «Tu bloque de práctica» del inicio.
 */
function UltimaClase({ clase, profesores, t }: { clase: ClaseDelRecorrido; profesores: Map<string, string>; t: Textos }) {
  const tc = t.clases;
  const fecha = clase.fechaClase !== "" ? formatearFechaLarga(clase.fechaClase, t.progreso.fechaLarga) : null;
  const profesor = clase.teacherId ? profesores.get(clase.teacherId) : undefined;

  return (
    <article className="flex flex-col rounded-[16px] border border-marca-borde bg-white p-[18px] shadow-[0_10px_24px_rgba(18,33,26,0.07)] min-[900px]:rounded-[20px] min-[900px]:p-6">
      <p className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-marca-verdeFondo px-2.5 py-[5px] text-[14px] font-bold leading-none text-marca-verdeOsc min-[900px]:text-[12.5px]">
          {tc.tuUltimaClase}
        </span>
      </p>
      <p className="mt-3 text-[15px] leading-snug text-marca-tintaMedia first-letter:uppercase">
        {fecha}
        {profesor && ` · ${tc.conProfesor(profesor)}`}
      </p>
      {clase.titulo !== "" && (
        <h2 className="mt-2 text-pretty font-display text-[20px] font-bold leading-[1.15] text-marca-tinta min-[900px]:text-[22px]">{clase.titulo}</h2>
      )}
      {clase.temas !== "" && (
        <div className="mt-3">
          <p className="text-[14px] font-semibold text-marca-gris min-[900px]:text-[12.5px] min-[900px]:uppercase min-[900px]:tracking-[0.08em]">
            {tc.temasYVocabulario}
          </p>
          <p className="mt-1 line-clamp-4 text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">{clase.temas}</p>
        </div>
      )}
      <a
        href={`#clase-${clase.id}`}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full btn-verde-linea px-6 text-[15.5px] font-bold min-[1200px]:mt-auto"
      >
        {tc.verLoQueTrabajaste}
      </a>
    </article>
  );
}

/** Sin horario: dónde van a salir las clases, y la práctica mientras tanto. */
function SinClases({ t, hrefPractica }: { t: Textos["clases"]; hrefPractica: string }) {
  return (
    <section className="entra flex flex-col items-start gap-5 rounded-[16px] border border-marca-borde bg-white p-5 shadow-[0_10px_24px_rgba(18,33,26,0.07)] min-[700px]:flex-row min-[700px]:items-center min-[900px]:rounded-[20px] min-[900px]:p-8">
      <AnclaMascota id="clases-vacio" prioridad={1} tamaño={130} />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="font-display text-[20px] font-bold leading-tight text-marca-tinta min-[900px]:text-[24px]">{t.vacioTitulo}</h2>
        <p className="max-w-[560px] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[16px]">{t.vacioTexto}</p>
        <Link
          href={hrefPractica}
          className="btn-verde mt-2 inline-flex min-h-[48px] items-center justify-center rounded-full px-7 text-[15.5px] font-bold"
        >
          {t.vacioAccion}
        </Link>
      </div>
    </section>
  );
}
