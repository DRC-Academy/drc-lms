// ---------------------------------------------------------------
// EL CALENDARIO DEL INICIO: «SemanaClases» EN PEQUEÑO
//
// Los mismos datos que «Mis clases» (`semanasDelAlumno`, la lógica de
// Gestión) y las mismas piezas: la tira de la semana, el disco de cada
// día, las chapas de estado, las flechas. Lo que cambia es la forma:
//
//   · EN ESCRITORIO, LA SEMANA EN SIETE COLUMNAS: cada día con su disco
//     y, debajo, sus clases como bloques. Sin rejilla horaria: un alumno
//     con dos clases a la semana vería cuarenta celdas vacías.
//   · EN MÓVIL, LA TIRA Y UNA LISTA POR DÍA: solo los días con clase.
//
// NINGUNA CLASE LLEVA EL BOTÓN DE LA SALA. Cada una enlaza a su día en
// «Mis clases» (`/clases?semana=N#dia-…`), que es donde está el botón de
// entrar con su ventana de media hora. El `meet_link` no sale de allí.
//
// La semana va en `?semana=` del propio inicio y se calcula en el
// servidor, como en «Mis clases».
// ---------------------------------------------------------------

import Link from "next/link";
import { ventanaAbierta, type ClaseCalendario, type SemanaCalendario } from "@/lib/clases";
import { diaLocal } from "@/lib/fechas";
import type { TextosClases } from "@/lib/textos/clases";
import { Estado, Etiqueta, FlechaSemana, ParadaDia, TiraSemana, nombreDia, partes } from "@/components/clases/SemanaClases";

export default function SemanaCompacta({
  semanas,
  indice,
  sinHorario,
  hrefSemana,
  hrefDia,
  hrefTodas,
  t,
  ahora,
}: {
  /** De `semanasDelAlumno(…, { conPasadas: true })`, como en «Mis clases». */
  semanas: SemanaCalendario[];
  /** La semana que se enseña: 0 es la actual. */
  indice: number;
  /** Sin horario ni clases en estas semanas: el estado de bienvenida. */
  sinHorario: boolean;
  /** Otra semana del inicio, con el foco de revisión si lo hay. */
  hrefSemana: (indice: number) => string;
  /** El día de una clase en «Mis clases», en la misma semana. */
  hrefDia: (fecha: string) => string;
  /** «Mis clases», sin más. */
  hrefTodas: string;
  t: TextosClases;
  ahora: Date;
}) {
  const semana = semanas[indice];
  const hoy = diaLocal(ahora);
  const conClase = semana.dias.filter((d) => d.clases.length > 0);

  return (
    <section className="flex flex-col gap-4 min-[900px]:gap-5" aria-labelledby="titulo-calendario-inicio">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="titulo-calendario-inicio" className="font-display text-[20px] font-bold leading-tight text-marca-tinta min-[900px]:text-[24px]">
            {t.calendario}
          </h2>
          {!sinHorario && (
            <p className="mt-1 text-[15px] leading-snug text-marca-tintaMedia">
              <span className="font-semibold text-marca-tinta">
                {indice === 0 ? `${t.estaSemana} · ` : ""}
                {t.rangoSemana(partes(semana.lunes), partes(semana.domingo))}
              </span>{" "}
              <span className="text-[14px] text-marca-grisSuave">{t.horaDeMadrid}</span>
            </p>
          )}
        </div>

        {!sinHorario && (
          <nav className="flex items-center gap-2" aria-label={t.calendario}>
            <FlechaSemana href={indice > 0 ? hrefSemana(indice - 1) : null} etiqueta={t.semanaAnterior} direccion="atras" />
            {indice > 0 ? (
              <Link
                href={hrefSemana(0)}
                scroll={false}
                className="inline-flex min-h-[48px] items-center rounded-full px-3 text-[14px] font-semibold text-marca-verdeOsc hover:text-marca-tinta"
              >
                {t.volverAEstaSemana}
              </Link>
            ) : (
              <span className="min-w-[3.5rem] text-center text-[14px] font-semibold tabular-nums text-marca-gris">
                {indice + 1} / {semanas.length}
              </span>
            )}
            <FlechaSemana
              href={indice < semanas.length - 1 ? hrefSemana(indice + 1) : null}
              etiqueta={t.semanaSiguiente}
              direccion="adelante"
            />
          </nav>
        )}
      </header>

      {sinHorario ? (
        <div className="rounded-[16px] border border-marca-borde bg-white px-5 py-4 min-[900px]:rounded-[20px] min-[900px]:px-6 min-[900px]:py-5">
          <p className="font-display text-[17px] font-bold leading-tight text-marca-tinta">{t.vacioTitulo}</p>
          <p className="mt-1.5 max-w-[560px] text-pretty text-[15px] leading-snug text-marca-tintaMedia">{t.vacioInicio}</p>
        </div>
      ) : (
        <>
          {/* ------------------------- MÓVIL ------------------------- */}
          <div className="flex flex-col gap-4 min-[900px]:hidden">
            <TiraSemana semana={semana} hoy={hoy} t={t} hrefDia={hrefDia} />
            {conClase.length === 0 ? (
              <SemanaVacia t={t} />
            ) : (
              <ol className="flex flex-col gap-4">
                {conClase.map((dia) => {
                  const { dia: numero, mes } = partes(dia.fecha);
                  return (
                    <li key={dia.fecha}>
                      <h3 className="text-[14px] font-semibold text-marca-tintaMedia first-letter:uppercase">
                        {t.diaAgenda(nombreDia(dia), numero, mes)}
                      </h3>
                      <ul className="mt-2 flex flex-col gap-2">
                        {dia.clases.map((c) => (
                          <li key={c.desde}>
                            <FilaClase clase={c} href={hrefDia(c.fecha)} t={t} ahora={ahora} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* ----------------------- ESCRITORIO ----------------------- */}
          <div className="hidden min-[900px]:block">
            <ol className="grid grid-cols-7 gap-2 rounded-[20px] border border-marca-borde bg-white p-4 shadow-[0_10px_24px_rgba(18,33,26,0.07)]">
              {semana.dias.map((dia) => {
                const { dia: numero, mes } = partes(dia.fecha);
                return (
                  <li key={dia.fecha} className="flex min-w-0 flex-col items-stretch">
                    <div className="flex flex-col items-center">
                      <ParadaDia dia={dia} pasado={dia.fecha < hoy} t={t} />
                    </div>
                    {dia.clases.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-2">
                        {dia.clases.map((c) => (
                          <li key={c.desde}>
                            <BloqueClase
                              clase={c}
                              dia={t.diaAgenda(nombreDia(dia), numero, mes)}
                              href={hrefDia(c.fecha)}
                              t={t}
                              ahora={ahora}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
            {conClase.length === 0 && (
              <div className="mt-3">
                <SemanaVacia t={t} />
              </div>
            )}
          </div>
        </>
      )}

      <Link
        href={hrefTodas}
        className="-mx-1 inline-flex min-h-[48px] w-fit items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold text-marca-verdeOsc hover:text-marca-tinta"
      >
        {t.verTodasMisClases}
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h10m-4-4 4 4-4 4" />
        </svg>
      </Link>
    </section>
  );
}

function SemanaVacia({ t }: { t: TextosClases }) {
  return (
    <p className="rounded-[16px] border border-marca-borde bg-white px-5 py-4 text-[15px] leading-snug text-marca-tintaMedia min-[900px]:rounded-[20px]">
      {t.semanaSinClases}
    </p>
  );
}

/** Colores de una clase según su estado, los mismos que la tarjeta de «Mis clases». */
function aspecto(clase: ClaseCalendario, ahora: Date) {
  const cancelada = clase.estado === "cancelada";
  const abierta = !cancelada && !clase.terminada && ventanaAbierta(clase, ahora);
  const apagada = cancelada || clase.terminada;
  const caja = abierta
    ? "border-marca-verde bg-marca-verdeFondo"
    : apagada
      ? "border-marca-borde bg-marca-niebla"
      : "border-marca-borde bg-white";
  const hora = cancelada
    ? "text-marca-gris line-through decoration-[1.5px]"
    : clase.terminada
      ? "text-marca-tintaMedia"
      : "text-marca-tinta";
  return { abierta, apagada, caja, hora };
}

/** Una clase en la lista de móvil: la hora, cuánto dura y con quién, y su estado. */
function FilaClase({ clase, href, t, ahora }: { clase: ClaseCalendario; href: string; t: TextosClases; ahora: Date }) {
  const { abierta, apagada, caja, hora } = aspecto(clase, ahora);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[16px] border px-4 py-3 transition-colors hover:border-marca-verde focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc ${caja}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`font-display text-[20px] font-bold leading-none tracking-[-0.01em] ${hora}`}>{t.franja(clase.desde, clase.hasta)}</p>
        <p className={`mt-1.5 text-[14px] leading-snug ${apagada ? "text-marca-gris" : "text-marca-tintaMedia"}`}>
          {t.duracion(clase.horas)}
          {clase.profesor && (
            <>
              {" · "}
              {t.con} <span className="font-semibold">{clase.profesor}</span>
            </>
          )}
        </p>
        <Etiqueta clase={clase} t={t} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Estado clase={clase} abierta={abierta} t={t} />
        <Flecha />
      </div>
    </Link>
  );
}

/**
 * Una clase en la semana de escritorio. La columna mide unos cien
 * píxeles a 900 px, así que no caben las chapas de «Mis clases»: el
 * estado va en una línea de texto, y el día —que ya dice la cabecera de
 * la columna— solo para el lector de pantalla.
 */
function BloqueClase({
  clase,
  dia,
  href,
  t,
  ahora,
}: {
  clase: ClaseCalendario;
  dia: string;
  href: string;
  t: TextosClases;
  ahora: Date;
}) {
  const { abierta, apagada, caja, hora } = aspecto(clase, ahora);
  const estado = abierta
    ? clase.enCurso
      ? t.enCurso
      : t.empiezaPronto
    : clase.estado === "cancelada"
      ? t.cancelada
      : clase.terminada
        ? t.hecha
        : clase.estado === "recuperacion"
          ? t.recuperacion
          : clase.estado === "reprogramada"
            ? t.reprogramadaCorta
            : null;

  return (
    <Link
      href={href}
      className={`block rounded-[12px] border px-2.5 py-2 transition-colors hover:border-marca-verde focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc ${caja}`}
    >
      <span className="sr-only first-letter:uppercase">{dia}, </span>
      <span className={`block font-display text-[14.5px] font-bold leading-tight tabular-nums ${hora}`}>
        {t.franja(clase.desde, clase.hasta)}
      </span>
      <span className={`mt-1 block text-[12.5px] leading-snug ${apagada ? "text-marca-gris" : "text-marca-tintaMedia"}`}>
        {t.duracion(clase.horas)}
      </span>
      {clase.profesor && (
        <span className={`block truncate text-[12.5px] font-semibold leading-snug ${apagada ? "text-marca-gris" : "text-marca-tintaMedia"}`}>
          {clase.profesor}
        </span>
      )}
      {estado && (
        <span className={`mt-1.5 block text-[12px] font-semibold leading-tight ${abierta ? "text-marca-verdeOsc" : "text-marca-gris"}`}>
          {estado}
        </span>
      )}
    </Link>
  );
}

function Flecha() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 text-marca-grisSuave" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}
