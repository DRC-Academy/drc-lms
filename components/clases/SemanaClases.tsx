// ---------------------------------------------------------------
// EL CALENDARIO DE «CLASES», EN SEMANAS
//
// Sustituyó a `CalendarioClases`, una rejilla horaria de siete columnas
// que pintaba, para un alumno con una o dos clases a la semana,
// cuarenta celdas vacías por cada una llena, y en móvil ya era otra pieza
// (una agenda). Aquí hay UNA sola forma para los dos anchos:
//
//   · LA TIRA DE LA SEMANA: los siete días en fila, como las paradas de
//     la ruta de «Para ti» —el disco con sombra sólida, el de hoy en verde
//     con el aro amarillo del «Estás aquí»—, con una marca bajo cada día
//     que tiene clase: llena si ya se dio, hueca si está por venir. Es el
//     vistazo: qué días hay clase y dónde estás tú.
//   · LAS CLASES DE LA SEMANA, en tarjetas: una columna en móvil, dos o
//     tres en escritorio. Cada tarjeta tiene sitio para lo que la rejilla
//     no cabía: el profesor, el estado y el botón de entrar a su tamaño.
//
// Sin sendero entre las paradas: la línea no llevaba a ningún sitio en el
// banner del inicio y aquí tampoco diría nada que no digan las marcas.
//
// LAS CLASES DE ESTA SEMANA QUE YA HAN PASADO SÍ SALEN (`conPasadas` en
// `semanasDelAlumno`), apagadas y marcadas como hechas, y si su día tiene
// análisis llevan su título y un enlace a la tarjeta del historial de
// debajo (`#clase-<id>`, ver `Recorrido`). Antes esos días salían vacíos,
// como si no hubiera habido clase.
//
// Todo se pinta en el servidor, como el resto de «Clases»: la semana va
// en `?semana=` y el botón de entrar es `BotonClase`, que solo pone el
// enlace en el HTML con la sala abierta.
// ---------------------------------------------------------------

import Link from "next/link";
import { ventanaAbierta, type ClaseCalendario, type DiaCalendario, type SemanaCalendario, DIAS } from "@/lib/clases";
import type { ClaseDelRecorrido } from "@/lib/gestion";
import { diaLocal } from "@/lib/fechas";
import type { TextosClases } from "@/lib/textos/clases";
import { BotonClase, Chapa } from "@/components/clases/BannerClase";

export default function SemanaClases({
  semanas,
  indice,
  hrefSemana,
  recorrido,
  t,
  ahora,
}: {
  /** De `semanasDelAlumno(…, { conPasadas: true })`. */
  semanas: SemanaCalendario[];
  /** La semana que se enseña: 0 es la actual. */
  indice: number;
  /** El enlace a otra semana, con el foco de revisión si lo hay. */
  hrefSemana: (indice: number) => string;
  /** El historial (`obtenerRecorrido().todas`): de ahí sale lo trabajado en cada clase hecha. */
  recorrido: ClaseDelRecorrido[];
  t: TextosClases;
  ahora: Date;
}) {
  const semana = semanas[indice];
  const clases = semana.dias.flatMap((d) => d.clases);

  return (
    <section className="flex flex-col gap-4 min-[900px]:gap-5" aria-labelledby="titulo-calendario">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="titulo-calendario" className="font-display text-[20px] font-bold leading-tight text-marca-tinta min-[900px]:text-[24px]">
            {t.calendario}
          </h2>
          <p className="mt-1 text-[15px] leading-snug text-marca-tintaMedia">
            <span className="font-semibold text-marca-tinta">
              {indice === 0 ? `${t.estaSemana} · ` : ""}
              {t.rangoSemana(partes(semana.lunes), partes(semana.domingo))}
            </span>{" "}
            <span className="text-[14px] text-marca-grisSuave">{t.horaDeMadrid}</span>
          </p>
        </div>

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
      </header>

      <TiraSemana semana={semana} hoy={diaLocal(ahora)} t={t} />

      {clases.length === 0 ? (
        <p className="rounded-[16px] border border-marca-borde bg-white px-5 py-4 text-[15px] leading-snug text-marca-tintaMedia min-[900px]:rounded-[20px]">
          {t.semanaSinClases}
        </p>
      ) : (
        <ol className="grid items-start gap-3 min-[700px]:grid-cols-2 min-[900px]:gap-4 min-[1200px]:grid-cols-3">
          {clases.map((c, i) => (
            // El ancla de la tira va en la primera clase de cada día.
            <li
              key={`${c.fecha}-${c.desde}`}
              id={clases[i - 1]?.fecha === c.fecha ? undefined : `dia-${c.fecha}`}
              className="flex"
              style={{ scrollMarginTop: 24 }}
            >
              <TarjetaClase clase={c} analisis={recorrido.find((r) => r.fechaClase === c.fecha)} t={t} ahora={ahora} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------
// LA TIRA DE LA SEMANA
// ---------------------------------------------------------------

/**
 * Los siete días en fila. Un día con clase es un enlace a su tarjeta; uno
 * sin clase no se pulsa. Cabe en 375 px: la inicial del día a 14 px y el
 * número dentro del disco.
 */
function TiraSemana({ semana, hoy, t }: { semana: SemanaCalendario; hoy: string; t: TextosClases }) {
  return (
    <ol className="grid grid-cols-7 gap-1 rounded-[16px] border border-marca-borde bg-white px-1.5 py-3 shadow-[0_10px_24px_rgba(18,33,26,0.07)] min-[900px]:gap-2 min-[900px]:rounded-[20px] min-[900px]:px-4 min-[900px]:py-4">
      {semana.dias.map((dia) => {
        const contenido = <ParadaDia dia={dia} pasado={dia.fecha < hoy} t={t} />;
        return (
          <li key={dia.fecha} className="flex justify-center">
            {dia.clases.length > 0 ? (
              <a
                href={`#dia-${dia.fecha}`}
                aria-label={t.diaAgenda(nombreDia(dia), partes(dia.fecha).dia, partes(dia.fecha).mes)}
                className="flex min-h-[48px] w-full flex-col items-center rounded-[12px] py-1 transition-colors hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-verdeOsc"
              >
                {contenido}
              </a>
            ) : (
              <div className="flex w-full flex-col items-center py-1">{contenido}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** `pasado`: el día es anterior a hoy. Las fechas son `YYYY-MM-DD` y se comparan como cadenas. */
function ParadaDia({ dia, pasado: antes, t }: { dia: DiaCalendario; pasado: boolean; t: TextosClases }) {
  const { dia: numero } = partes(dia.fecha);
  const activas = dia.clases.filter((c) => c.estado !== "cancelada");
  const hechas = activas.length > 0 && activas.every((c) => c.terminada);
  // Apagado solo el día pasado SIN clase: uno con clase hecha lleva su disco verde.
  const pasado = antes && dia.clases.length === 0;

  return (
    <>
      <span
        aria-hidden
        className={`text-[14px] font-bold uppercase leading-none ${dia.esHoy ? "text-marca-verdeOsc" : pasado ? "text-marca-grisTenue" : "text-marca-gris"}`}
      >
        {/* La inicial en móvil; tres letras desde 900 px. */}
        <span className="min-[900px]:hidden">{t.diaCorto(nombreDia(dia)).slice(0, 1)}</span>
        <span className="hidden min-[900px]:inline">{t.diaCorto(nombreDia(dia))}</span>
      </span>
      <span
        aria-hidden
        className={`mt-2 grid h-9 w-9 place-items-center rounded-full font-display text-[16px] font-bold tabular-nums min-[900px]:h-11 min-[900px]:w-11 min-[900px]:text-[18px] ${
          dia.esHoy
            ? "border-[3px] border-marca-amarillo bg-marca-verde text-white shadow-[0_3px_0_#E0A800]"
            : activas.length > 0 && !hechas
              ? "border-2 border-marca-verde bg-marca-verdeFondo text-marca-tinta shadow-[0_3px_0_#14722A]"
              : activas.length > 0
                ? "bg-marca-verde text-white shadow-[0_3px_0_#14722A]"
                : pasado
                  ? "text-marca-grisTenue"
                  : "text-marca-tinta"
        }`}
      >
        {numero}
      </span>
      {/* La marca de debajo: hay clase ese día. */}
      <span aria-hidden className="mt-2 flex h-1.5 gap-1">
        {activas.map((c) => (
          <span key={c.desde} className={`h-1.5 w-1.5 rounded-full ${c.terminada ? "bg-marca-verde" : "border border-marca-verde bg-white"}`} />
        ))}
      </span>
    </>
  );
}

// ---------------------------------------------------------------
// UNA CLASE
// ---------------------------------------------------------------

/**
 * La tarjeta de una clase, en sus formas:
 *
 *   hecha       ya ha terminado: apagada, con su marca, y si tiene análisis,
 *               su título y el enlace a lo que se trabajó.
 *   sala abierta   desde media hora antes hasta que termina: en verde, con
 *               la chapa amarilla del banner y el botón de entrar.
 *   por venir   blanca, con la sombra de las tarjetas del inicio.
 *   cancelada   apagada y sin botón.
 */
function TarjetaClase({
  clase,
  analisis,
  t,
  ahora,
}: {
  clase: ClaseCalendario;
  analisis: ClaseDelRecorrido | undefined;
  t: TextosClases;
  ahora: Date;
}) {
  const cancelada = clase.estado === "cancelada";
  const abierta = !cancelada && !clase.terminada && ventanaAbierta(clase, ahora);
  const apagada = cancelada || clase.terminada;
  const { dia: numero, mes } = partes(clase.fecha);

  return (
    <article
      className={`flex w-full flex-col gap-3 rounded-[16px] border p-4 min-[900px]:rounded-[20px] min-[900px]:p-5 ${
        abierta
          ? "border-marca-verde bg-marca-verdeFondo shadow-[0_18px_40px_-26px_rgba(18,33,26,0.45)]"
          : apagada
            ? "border-marca-borde bg-marca-niebla"
            : "border-marca-borde bg-white shadow-[0_10px_24px_rgba(18,33,26,0.07)]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[14px] font-semibold first-letter:uppercase ${apagada ? "text-marca-gris" : "text-marca-tintaMedia"}`}>
          {t.diaAgenda(clase.dia, numero, mes)}
        </p>
        <Estado clase={clase} abierta={abierta} t={t} />
      </div>

      <div>
        <p
          className={`font-display text-[24px] font-bold leading-none tracking-[-0.01em] ${
            cancelada ? "text-marca-gris line-through decoration-[1.5px]" : clase.terminada ? "text-marca-tintaMedia" : "text-marca-tinta"
          }`}
        >
          {t.franja(clase.desde, clase.hasta)}
        </p>
        <p className={`mt-2 text-[15px] leading-snug ${apagada ? "text-marca-gris" : "text-marca-tintaMedia"}`}>
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

      {clase.terminada && analisis && (
        <div className="mt-auto flex flex-col gap-1 border-t border-marca-borde pt-3">
          {analisis.titulo !== "" && <p className="text-pretty text-[15px] font-semibold leading-snug text-marca-tinta">{analisis.titulo}</p>}
          <a
            href={`#clase-${analisis.id}`}
            className="-mx-1 inline-flex min-h-[48px] w-fit items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold text-marca-verdeOsc hover:text-marca-tinta"
          >
            {t.verLoQueTrabajaste}
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10m-4-4 4 4-4 4" />
            </svg>
          </a>
        </div>
      )}

      {abierta && (
        <div className="mt-auto [&>*]:w-full">
          <BotonClase proxima={clase} t={t} ahora={ahora} />
        </div>
      )}
    </article>
  );
}

/** Lo que va arriba a la derecha de la tarjeta. Una clase normal por venir no lleva nada. */
function Estado({ clase, abierta, t }: { clase: ClaseCalendario; abierta: boolean; t: TextosClases }) {
  if (abierta) return <Chapa destacada>{clase.enCurso ? t.enCurso : t.empiezaPronto}</Chapa>;
  if (clase.estado === "cancelada") {
    return (
      <span className="rounded-full bg-marca-nieblaOscura px-2.5 py-1 text-[14px] font-semibold text-marca-gris">{t.cancelada}</span>
    );
  }
  if (clase.terminada) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-marca-verdeOsc">
        <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-marca-verde">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        </span>
        {t.hecha}
      </span>
    );
  }
  if (clase.esHoy) return <Chapa destacada={false}>{t.hoy.charAt(0).toUpperCase() + t.hoy.slice(1)}</Chapa>;
  return null;
}

/** Recuperación y reprogramación: una línea debajo de la hora. */
function Etiqueta({ clase, t }: { clase: ClaseCalendario; t: TextosClases }) {
  if (clase.estado === "recuperacion") {
    return (
      <span className="mt-2.5 inline-flex w-fit items-center rounded-full border border-marca-verde/40 bg-marca-verdeFondo px-2.5 py-1 text-[14px] font-semibold text-marca-verdeOsc">
        {t.recuperacion}
      </span>
    );
  }
  if (clase.estado === "reprogramada" && clase.original) {
    const original = partes(clase.original);
    return (
      <p className="mt-2 text-[14px] leading-snug text-marca-tintaMedia">
        {t.reprogramada({ dia: DIAS[diaSemana(clase.original)], numero: original.dia }, { dia: clase.dia, numero: partes(clase.fecha).dia }, clase.desde)}
      </p>
    );
  }
  return null;
}

// ---------------------------------------------------------------
// PIEZAS
// ---------------------------------------------------------------

function FlechaSemana({ href, etiqueta, direccion }: { href: string | null; etiqueta: string; direccion: "atras" | "adelante" }) {
  const icono = (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direccion === "atras" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
    </svg>
  );
  const clases = "grid h-12 w-12 place-items-center rounded-full border transition-colors";
  if (!href) {
    return (
      <span aria-disabled="true" aria-label={etiqueta} className={`${clases} border-marca-borde text-marca-puntoPendiente`}>
        {icono}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={etiqueta}
      scroll={false}
      className={`${clases} border-marca-borde bg-white text-marca-tinta hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc`}
    >
      {icono}
    </Link>
  );
}

function partes(fecha: string): { dia: number; mes: number } {
  const [, mes, dia] = fecha.split("-").map(Number);
  return { dia, mes: mes - 1 };
}

function diaSemana(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

function nombreDia(dia: DiaCalendario) {
  return DIAS[diaSemana(dia.fecha)];
}
