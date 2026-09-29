import { textosActuales } from "@/lib/idioma-servidor";
import type { Estimacion } from "@/lib/estimacion";
import { TARJETA } from "@/components/base/Seccion";

// ---------------------------------------------------------------
// «LLEGARÍAS 3 MESES ANTES»: LA COMPARATIVA DE RITMO, COMPACTA
//
// Una sola pieza para el mismo mensaje, que tenía dos versiones: la
// comparativa de dos senderos del inicio (`ComparativaRitmo`) y las tres
// barras de «Mi progreso» (`BannerAmpliar`). En móvil las dos pantallas
// enseñan ESTA; en escritorio cada una conserva la suya (la de «Mi
// progreso», calco de Gestión).
//
// LO PRIMERO QUE SE LEE ES EL AHORRO, grande. Luego una línea con el
// precio en horas y la meta, y dos barras hacia el mismo nivel: tu ritmo
// y la alternativa. La barra mide el tiempo, así que la corta es la
// buena; las dos acaban en la misma meta, el disco con aro amarillo.
//
// LAS CIFRAS VAN SIEMPRE EN NÚMERO y ninguna etiqueta se parte: el
// tiempo va en su columna con `nowrap`. En vertical, el dibujo partía
// «unos 4 meses» en dos renglones y se leía «unos / 4 meses».
//
// NADA SE CALCULA AQUÍ. Los números salen de `calcularEstimacion`
// (`lib/estimacion.ts`) a través de `datosDeRitmo`, que es también lo
// que decide si hay algo que enseñar: sin datos, en el plan más alto o
// sin ahorro, null y la sección no se pinta.
//
// SIN MASCOTA. La de escritorio señala la fila recomendada; en móvil la
// fila ya es la segunda de dos y el dibujo cabe sin nadie que la señale.
// ---------------------------------------------------------------

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

export default function RitmoCompacto({ datos, href, id }: { datos: DatosRitmo; href: string; id: string }) {
  const t = textosActuales().banners;
  const { meta, actual, recomendado } = datos;
  // La barra de su ritmo es la escala entera; la otra, en proporción.
  // Nunca por debajo de un quinto, para que se vea como barra.
  const proporcion = Math.max(20, Math.round((recomendado.meses / Math.max(actual.meses, 1)) * 100));

  return (
    <section aria-labelledby={id} className={`${TARJETA} px-5 py-5`}>
      <h2 id={id} className="text-balance font-display text-[26px] font-bold leading-[1.12] tracking-[-0.01em] text-marca-tinta">
        {t.llegariasAntes(recomendado.ahorro)}
      </h2>
      <p className="mt-1.5 text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia">
        {t.conHorasMasHasta(recomendado.horas - actual.horas, meta)}
      </p>

      <p className="sr-only">{t.ritmoLector(meta, actual.horas, actual.meses, recomendado.horas, recomendado.meses)}</p>

      <div aria-hidden className="mt-5 flex flex-col gap-4">
        {/* La meta, una vez, sobre el final de las barras. */}
        <p className="-mb-2 flex items-center justify-end gap-1.5 text-[12.5px] font-semibold text-marca-gris">
          <DiscoMeta />
          <span className="whitespace-nowrap">{t.nivelMeta(meta)}</span>
        </p>

        <Fila
          nombre={t.tuRitmoActual}
          detalle={t.horasALaSemana(actual.horas)}
          tiempo={t.unosMeses(actual.meses)}
          ancho={100}
          destacada={false}
        />
        <Fila
          nombre={t.conHorasALaSemana(recomendado.horas)}
          detalle={t.recomendado}
          tiempo={t.unosMeses(recomendado.meses)}
          ancho={proporcion}
          destacada
        />
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-verde mt-5 flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-[15.5px] font-bold"
      >
        {t.quieroIrMasRapido}
      </a>
    </section>
  );
}

function Fila({
  nombre,
  detalle,
  tiempo,
  ancho,
  destacada,
}: {
  nombre: string;
  detalle: string;
  tiempo: string;
  /** Porcentaje del ancho disponible. */
  ancho: number;
  destacada: boolean;
}) {
  return (
    <div>
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3">
        <p className="min-w-0 text-[14.5px] font-semibold leading-snug text-marca-tinta">
          {nombre}
          <span className={`block text-[13px] font-medium ${destacada ? "text-marca-verdeOsc" : "text-marca-gris"}`}>{detalle}</span>
        </p>
        <p
          className={`whitespace-nowrap font-display text-[17px] font-bold leading-tight ${
            destacada ? "text-marca-verdeOsc" : "text-marca-tinta"
          }`}
        >
          {tiempo}
        </p>
      </div>
      {/* El carril, con la meta al final de la barra: las dos llegan al
          mismo sitio, una antes que otra. */}
      <div className="relative h-3">
        <div
          className={`relative h-3 rounded-full ${destacada ? "bg-marca-verde" : "bg-[#B9CDBF]"}`}
          style={{ width: `calc(${ancho}% - 8px)` }}
        >
          <span className="absolute -right-2 top-1/2 -translate-y-1/2">
            <DiscoMeta />
          </span>
        </div>
      </div>
    </div>
  );
}

/** La meta: el disco con el aro amarillo del sendero de escritorio. */
function DiscoMeta() {
  return <span className="block h-4 w-4 rounded-full border-[3px] border-marca-amarillo bg-white" />;
}
