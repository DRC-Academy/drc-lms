import { textosActuales } from "@/lib/idioma-servidor";
import type { Estimacion } from "@/lib/estimacion";
import MascotaRitmo from "@/components/MascotaRitmo";

/**
 * «AHORA PUEDES LLEGAR MÁS RÁPIDO»: la comparativa de ritmos del inicio.
 *
 * Ocupa el sitio de «Tus bloques» cuando no hay bloque pendiente ni uno
 * generándose (ver `BloquesGenerados`). Es una recomendación ligada a su
 * meta, no una venta: sin urgencia, sin precios, sin contadores.
 *
 * DOS SENDEROS, EL LENGUAJE DE LA RUTA DE «PARA TI». Salen del mismo
 * punto («Estás aquí») y llegan a la misma meta. El de su ritmo da más
 * vueltas y tiene más paradas; el del plan recomendado va casi recto. La
 * diferencia se ve sin leer: los tiempos, además, van escritos en la
 * leyenda —y el lector de pantalla los oye en una frase—.
 *
 * En móvil los senderos bajan en vertical, uno a cada lado; desde 900px
 * van en horizontal junto al texto.
 *
 * LA MASCOTA señala el recomendado: su ancla está en esa fila de la
 * leyenda (`MascotaRitmo`).
 *
 * LAS CIFRAS SON LAS DEL BANNER DE «MI PROGRESO», de la misma estimación
 * (`lib/estimacion.ts`), en horas a la semana, que es en lo que calcula.
 * El recomendado es el mismo: el plan de más horas, y solo si ahorra
 * algún mes (`datosDeRitmo`).
 */

export type DatosRitmo = {
  /** El nivel de la meta: "B2". */
  meta: string;
  actual: { horas: number; meses: number };
  recomendado: { horas: number; meses: number; ahorro: number };
};

/**
 * Lo que enseña la comparativa, o null si no hay nada que recomendar: sin
 * estimación, ya en el plan más alto, o con un ahorro de cero meses. Con
 * null la sección no se pinta.
 */
export function datosDeRitmo(estimacion: Estimacion | null): DatosRitmo | null {
  if (!estimacion || !estimacion.hayAmpliacion) return null;
  const actual = estimacion.opciones.find((o) => o.esSuPlan);
  const mejor = estimacion.opciones[estimacion.opciones.length - 1];
  if (!actual || !mejor || mejor.esSuPlan || mejor.mesesAhorrados <= 0) return null;
  return {
    meta: estimacion.meta.nivel,
    actual: { horas: actual.horasSemanales, meses: actual.meses },
    recomendado: { horas: mejor.horasSemanales, meses: mejor.meses, ahorro: mejor.mesesAhorrados },
  };
}

const ID_RECOMENDADO = "ritmo-recomendado";

export default function ComparativaRitmo({ datos, href }: { datos: DatosRitmo; href: string }) {
  const t = textosActuales().banners;
  const { meta, actual, recomendado } = datos;

  return (
    <section
      aria-labelledby="titulo-ritmo"
      className="rounded-[20px] border border-marca-borde bg-white px-5 py-[22px] min-[900px]:grid min-[900px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] min-[900px]:items-center min-[900px]:gap-x-10 min-[900px]:px-8 min-[900px]:py-[30px]"
    >
      <div className="flex flex-col gap-4 min-[900px]:gap-3.5">
        <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-marca-verdeOsc">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-marca-verde" />
          {t.haciaTuMeta(meta)}
        </p>
        <h2 id="titulo-ritmo" className="text-balance font-display text-[23px] font-bold leading-[1.15] tracking-[-0.01em] text-marca-tinta min-[900px]:text-[27px]">
          {t.ahoraPuedesLlegarMasRapido}
        </h2>
        <p className="text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia">
          {t.ritmoEntradilla(recomendado.horas - actual.horas, meta, recomendado.ahorro)}
        </p>

        {/* El dibujo en vertical, solo en móvil. */}
        <div className="min-[900px]:hidden">
          <SenderosVertical datos={datos} t={t} />
        </div>

        <p className="sr-only">{t.ritmoLector(meta, actual.horas, actual.meses, recomendado.horas, recomendado.meses)}</p>

        {/* LOS TIEMPOS, ESCRITOS. El tiempo va debajo del texto: deja libre la
            derecha de la fila recomendada, que es el sitio de la mascota. */}
        <ul aria-hidden className="flex flex-col gap-2.5">
          <li className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 rounded-[12px] bg-marca-niebla px-3 py-2.5">
            <TrazoLeyenda recomendado={false} />
            <span className="text-[13.5px] leading-[1.3] text-marca-tintaMedia">
              <b className="block text-[14.5px] font-semibold text-marca-tinta">{t.tuRitmoActual}</b>
              {t.horasALaSemana(actual.horas)}
            </span>
            <span className="col-start-2 font-display text-[17px] font-bold leading-[1.1] text-marca-tinta">{t.unosMeses(actual.meses)}</span>
          </li>
          <li className="relative grid grid-cols-[34px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 rounded-[12px] bg-[#EEF8F0] py-2.5 pl-3 pr-[84px] shadow-[inset_0_0_0_1px_#CFE8D8] min-[900px]:pr-[92px]">
            <TrazoLeyenda recomendado />
            <span id={ID_RECOMENDADO} className="text-[13.5px] leading-[1.3] text-marca-tintaMedia">
              <b className="block text-[14.5px] font-semibold text-marca-tinta">
                {t.conHorasALaSemana(recomendado.horas)}{" "}
                <span className="ml-0.5 inline-flex -translate-y-px items-center rounded-full bg-marca-verde px-2 py-0.5 align-middle text-[10.5px] font-bold uppercase tracking-[0.06em] text-white">
                  {t.recomendado}
                </span>
              </b>
              {t.horasExtraCadaSemana(recomendado.horas - actual.horas)}
            </span>
            {/* El tiempo no se parte; «3 meses antes» baja de línea si no cabe
                junto a él (en móvil, con el hueco de la mascota, no cabe). */}
            <span className="col-start-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-display text-[17px] font-bold leading-[1.1] text-marca-verdeOsc">
              <span className="whitespace-nowrap">{t.unosMeses(recomendado.meses)}</span>
              <small className="whitespace-nowrap font-sans text-[11.5px] font-medium text-marca-gris">{t.mesesAntes(recomendado.ahorro)}</small>
            </span>
            <MascotaRitmo idObjetivo={ID_RECOMENDADO} />
          </li>
        </ul>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] w-full items-center justify-center rounded-full btn-verde px-7 text-[15.5px] font-bold min-[900px]:w-fit"
        >
          {t.quieroIrMasRapido}
        </a>
      </div>

      {/* El dibujo en horizontal, desde 900px. */}
      <div className="hidden min-[900px]:block">
        <SenderosHorizontal datos={datos} t={t} />
      </div>
    </section>
  );
}

type Textos = ReturnType<typeof textosActuales>["banners"];

function TrazoLeyenda({ recomendado }: { recomendado: boolean }) {
  return (
    <svg aria-hidden width="34" height="12" viewBox="0 0 34 12" fill="none" strokeLinecap="round">
      {recomendado ? (
        <path d="M3 6h28" stroke="#1E9E3A" strokeWidth="6" />
      ) : (
        <path d="M3 6h28" stroke="#9FBAAA" strokeWidth="5" strokeDasharray="0.1 9" />
      )}
    </svg>
  );
}

/**
 * Lo que comparten los dos dibujos: los senderos, sus paradas, «Estás
 * aquí» y la meta. El de su ritmo, punteado y con más paradas; el
 * recomendado, verde, liso y dibujándose al aparecer.
 */
function Senderos({
  lento,
  veloz,
  paradasLento,
  paradasVeloz,
  inicio,
  meta,
  datos,
  t,
}: {
  lento: string;
  veloz: string;
  paradasLento: [number, number][];
  paradasVeloz: [number, number][];
  inicio: [number, number];
  meta: [number, number];
  datos: DatosRitmo;
  t: Textos;
}) {
  return (
    <>
      <path d={lento} fill="none" stroke="#DCEAE1" strokeWidth="12" strokeLinecap="round" />
      <path d={lento} fill="none" stroke="#9FBAAA" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 11" />
      <path d={veloz} fill="none" stroke="#D9EFE0" strokeWidth="14" strokeLinecap="round" />
      {/* Se dibuja al aparecer, con el mismo gesto que el camino andado de
          la ruta (`sendero-andado`). `pathLength` 1: el largo no depende
          del trazo. */}
      <path
        d={veloz}
        pathLength={1}
        className="sendero-andado"
        style={{ "--largo": 1 } as React.CSSProperties}
        fill="none"
        stroke="#1E9E3A"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {paradasLento.map(([x, y]) => (
        <circle key={`l${x}-${y}`} cx={x} cy={y} r="6" fill="#FFFFFF" stroke="#9FBAAA" strokeWidth="2.5" />
      ))}
      {paradasVeloz.map(([x, y]) => (
        <circle key={`v${x}-${y}`} cx={x} cy={y} r="6.5" fill="#FFFFFF" stroke="#1E9E3A" strokeWidth="3" />
      ))}
      <rect x={inicio[0] - 42} y={inicio[1] - 48} width="84" height="26" rx="13" fill="#FFC400" />
      <text x={inicio[0]} y={inicio[1] - 30.5} textAnchor="middle" className="font-sans" fontSize="12.5" fontWeight="700" fill="#12211A">
        {t.estasAqui}
      </text>
      <circle cx={inicio[0]} cy={inicio[1]} r="11" fill="#12211A" stroke="#FFFFFF" strokeWidth="3.5" />
      <circle cx={meta[0]} cy={meta[1]} r="25" fill="#F0FAF2" stroke="#FFC400" strokeWidth="5" />
      <text x={meta[0]} y={meta[1] + 6} textAnchor="middle" className="font-display" fontSize="16" fontWeight="700" fill="#14722A">
        {datos.meta}
      </text>
      <text x={meta[0]} y={meta[1] + 44} textAnchor="middle" className="font-sans" fontSize="12" fontWeight="600" fill="#4C5C53">
        {t.tuMeta}
      </text>
    </>
  );
}

function SenderosHorizontal({ datos, t }: { datos: DatosRitmo; t: Textos }) {
  return (
    <svg aria-hidden viewBox="0 0 604 214" className="block h-auto w-full">
      <Senderos
        lento="M56 112 C 66 58, 118 26, 160 44 C 202 62, 176 104, 218 104 C 262 104, 252 34, 302 32 C 352 30, 344 98, 388 94 C 432 90, 422 30, 466 32 C 510 34, 536 74, 548 112"
        veloz="M56 112 C 170 176, 434 176, 548 112"
        paradasLento={[[160, 44], [218, 104], [302, 32], [388, 94], [466, 32]]}
        paradasVeloz={[[208, 152], [396, 152]]}
        inicio={[56, 112]}
        meta={[548, 112]}
        datos={datos}
        t={t}
      />
      <text x="302" y="16" textAnchor="middle" className="font-sans" fontSize="13" fontWeight="600" fill="#4C5C53">
        {t.unosMeses(datos.actual.meses)}
      </text>
      <text x="302" y="198" textAnchor="middle" className="font-sans" fontSize="13.5" fontWeight="700" fill="#14722A">
        {t.unosMeses(datos.recomendado.meses)}
      </text>
    </svg>
  );
}

/** «unos 10 meses» → «unos» / «10 meses»: en vertical, a cada lado, no cabe en una. */
function dosLineas(texto: string): string[] {
  const corte = texto.indexOf(" ");
  return corte < 0 ? [texto] : [texto.slice(0, corte), texto.slice(corte + 1)];
}

function SenderosVertical({ datos, t }: { datos: DatosRitmo; t: Textos }) {
  return (
    <svg aria-hidden viewBox="0 0 320 412" className="mx-auto block h-auto w-full max-w-[320px]">
      <Senderos
        lento="M168 58 C 98 62, 56 88, 70 122 C 84 156, 140 150, 136 184 C 132 218, 58 214, 54 248 C 50 282, 118 282, 120 310 C 122 336, 146 350, 168 362"
        veloz="M168 58 C 272 130, 272 290, 168 362"
        paradasLento={[[70, 122], [136, 184], [54, 248], [120, 310]]}
        paradasVeloz={[[239, 164], [239, 258]]}
        inicio={[168, 58]}
        meta={[168, 362]}
        datos={datos}
        t={t}
      />
      <text className="font-sans" fontSize="12.5" fontWeight="600" fill="#4C5C53">
        {dosLineas(t.unosMeses(datos.actual.meses)).map((linea, i) => (
          <tspan key={i} x="10" y={186 + i * 16}>
            {linea}
          </tspan>
        ))}
      </text>
      <text className="font-sans" fontSize="13" fontWeight="700" fill="#14722A">
        {dosLineas(t.unosMeses(datos.recomendado.meses)).map((linea, i) => (
          <tspan key={i} x="258" y={206 + i * 16}>
            {linea}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
