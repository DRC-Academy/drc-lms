import { textosActuales } from "@/lib/idioma-servidor";
import { HORAS_SEMANALES_MAXIMAS, type Estimacion } from "@/lib/estimacion";
import type { NivelMcer } from "@/lib/recorrido";
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
// (`lib/estimacion.ts`) a través de `datosDeRitmo`, que decide QUÉ
// VARIANTE toca. Desde el 30/09/2026 se enseña siempre: sin datos, en el
// plan más alto o sin ahorro cambia lo que dice, no si aparece.
//
// SIN MASCOTA. La de escritorio señala la fila recomendada; en móvil la
// fila ya es la segunda de dos y el dibujo cabe sin nadie que la señale.
// ---------------------------------------------------------------

/** Unos meses que se pueden escribir: entero, 1 o más. Nunca NaN, 0 ni negativo. */
type Meses = number;

/**
 * LAS CINCO VARIANTES. El banner se enseña SIEMPRE (decisión de producto,
 * 30/09/2026); lo que cambia es qué puede prometer:
 *
 *   normal            hay ahorro: las dos barras con sus meses y el botón.
 *   maximo            ya va a 5 h o más: un solo camino, sin botón. Con
 *                     estimación, «llegas al nivel B2 en unos 3 meses»;
 *                     sin ella, «hacia tu meta».
 *   generica          sin nivel o sin horas: los dos caminos sin cifras.
 *   perfeccionar-c2   C2 sin examen: no hay meta fija, así que no se
 *                     promete llegar antes, sino avanzar más.
 *   sin-ahorro        ampliar no ahorra ningún mes: sin cifras.
 *
 * Solo `normal` y `maximo` llevan meses, y siempre de 1 en adelante: la
 * pantalla no tiene cómo escribir «0 meses».
 */
export type DatosRitmo =
  | {
      variante: "normal";
      /** El nivel de la meta: "B2". */
      meta: string;
      actual: { horas: number; meses: Meses };
      recomendado: { horas: number; meses: Meses; ahorro: Meses };
    }
  | { variante: "maximo"; horas: number; meta: string | null; meses: Meses | null }
  | { variante: "generica" | "sin-ahorro"; horas: number | null; meta: string | null }
  | { variante: "perfeccionar-c2"; horas: number | null };

type TextosBanners = ReturnType<typeof textosActuales>["banners"];

const escribible = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 1;

/**
 * Qué variante le toca, con los números de `calcularEstimacion`. No
 * calcula ni un mes: solo decide qué se puede decir con lo que llega.
 *
 * `perfil` va aparte porque sin estimación hay que saber POR QUÉ no la
 * hay: ya va al máximo, está en C2, o falta el nivel o las horas.
 */
export function datosDeRitmo(
  estimacion: Estimacion | null,
  perfil: { nivel: NivelMcer | null; horasSemanales: number | null | undefined }
): DatosRitmo {
  const horas = Math.round(Number(perfil.horasSemanales ?? 0));
  const conHoras = Number.isFinite(horas) && horas >= 1;

  // Ya va al máximo (hay alumnos a 6 y 7 h): un solo camino, sin botón.
  if (conHoras && horas >= HORAS_SEMANALES_MAXIMAS) {
    const suyo = estimacion?.opciones.find((o) => o.esSuPlan);
    const meses = suyo && escribible(suyo.meses) ? suyo.meses : null;
    const meta = estimacion ? estimacion.meta.nivel : null;
    return { variante: "maximo", horas, meta, meses: meta ? meses : null };
  }

  if (!perfil.nivel || !conHoras) return { variante: "generica", horas: conHoras ? horas : null, meta: null };
  if (!estimacion) {
    return perfil.nivel === "C2" ? { variante: "perfeccionar-c2", horas } : { variante: "generica", horas, meta: null };
  }

  const actual = estimacion.opciones.find((o) => o.esSuPlan);
  const mejor = estimacion.opciones[estimacion.opciones.length - 1];
  if (
    actual &&
    mejor &&
    !mejor.esSuPlan &&
    escribible(actual.meses) &&
    escribible(mejor.meses) &&
    escribible(mejor.mesesAhorrados) &&
    mejor.horasSemanales > actual.horasSemanales
  ) {
    return {
      variante: "normal",
      meta: estimacion.meta.nivel,
      actual: { horas: actual.horasSemanales, meses: actual.meses },
      recomendado: { horas: mejor.horasSemanales, meses: mejor.meses, ahorro: mejor.mesesAhorrados },
    };
  }
  return { variante: "sin-ahorro", horas, meta: estimacion.meta.nivel };
}

/** El titular de las variantes sin cifras, que es también todo su texto. */
export function tituloSinCifras(datos: DatosRitmo, t: TextosBanners): string {
  return datos.variante === "perfeccionar-c2" ? t.conMasHorasAvanzasMas : t.conMasHorasLlegasAntes;
}

/** La etiqueta de la meta: "Nivel B2", "Perfeccionar tu C2" o "Tu meta". */
export function etiquetaMeta(datos: DatosRitmo, t: TextosBanners): string {
  if (datos.variante === "perfeccionar-c2") return t.perfeccionarTuC2;
  return datos.meta ? t.nivelMeta(datos.meta) : t.tuMeta;
}

/**
 * «Máximo»: con cifra, el titular y debajo «Llegas al nivel B2 en unos 3
 * meses»; sin ella, un solo titular que ya lo dice todo, sin frase debajo.
 */
export function textosMaximo(
  datos: Extract<DatosRitmo, { variante: "maximo" }>,
  t: TextosBanners
): { titulo: string; linea: string | null } {
  return datos.meta && datos.meses
    ? { titulo: t.vasAlRitmoMasRapido, linea: t.llegasAEn(datos.meta, datos.meses) }
    : { titulo: t.haciaTuMetaSinCifras, linea: null };
}

export default function RitmoCompacto({ datos, href, id }: { datos: DatosRitmo; href: string; id: string }) {
  const t = textosActuales().banners;

  if (datos.variante === "normal") {
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
          <EtiquetaMeta texto={t.nivelMeta(meta)} />
          <Fila nombre={t.tuRitmoActual} detalle={t.horasALaSemana(actual.horas)} tiempo={t.unosMeses(actual.meses)} ancho={100} destacada={false} />
          <Fila
            nombre={t.conHorasALaSemana(recomendado.horas)}
            detalle={t.recomendado}
            tiempo={t.unosMeses(recomendado.meses)}
            ancho={proporcion}
            destacada
          />
        </div>

        <Boton href={href} texto={t.quieroIrMasRapido} />
      </section>
    );
  }

  // YA VA AL MÁXIMO: un solo camino hasta la meta, entero y en verde. Sin
  // botón: no hay plan más alto que ofrecerle.
  if (datos.variante === "maximo") {
    return (
      <section aria-labelledby={id} className={`${TARJETA} px-5 py-5`}>
        <h2 id={id} className="text-balance font-display text-[26px] font-bold leading-[1.12] tracking-[-0.01em] text-marca-tinta">
          {textosMaximo(datos, t).titulo}
        </h2>
        {textosMaximo(datos, t).linea && (
          <p className="mt-1.5 text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia">{textosMaximo(datos, t).linea}</p>
        )}
        <p className="sr-only">{t.ritmoLectorMaximo(datos.meta, datos.meses)}</p>

        <div aria-hidden className="mt-5 flex flex-col gap-4">
          <EtiquetaMeta texto={etiquetaMeta(datos, t)} />
          <Fila
            nombre={t.tuRitmoActual}
            detalle={t.horasALaSemana(datos.horas)}
            tiempo={datos.meta && datos.meses ? t.unosMeses(datos.meses) : null}
            ancho={100}
            destacada
          />
        </div>
      </section>
    );
  }

  // SIN CIFRAS: los dos caminos, el corto en verde, y el botón. Lo que no
  // se sabe no se escribe; la diferencia se ve en las barras.
  return (
    <section aria-labelledby={id} className={`${TARJETA} px-5 py-5`}>
      <h2 id={id} className="text-balance font-display text-[24px] font-bold leading-[1.15] tracking-[-0.01em] text-marca-tinta">
        {tituloSinCifras(datos, t)}
      </h2>

      <div aria-hidden className="mt-5 flex flex-col gap-4">
        <EtiquetaMeta texto={etiquetaMeta(datos, t)} />
        <Fila nombre={t.tuRitmoActual} detalle={datos.horas ? t.horasALaSemana(datos.horas) : null} tiempo={null} ancho={100} destacada={false} />
        <Fila nombre={t.conMasHorasALaSemana} detalle={t.recomendado} tiempo={null} ancho={60} destacada />
      </div>

      <Boton href={href} texto={t.quieroIrMasRapido} />
    </section>
  );
}

function EtiquetaMeta({ texto }: { texto: string }) {
  return (
    <p className="-mb-2 flex items-center justify-end gap-1.5 text-[12.5px] font-semibold text-marca-gris">
      <DiscoMeta />
      <span className="whitespace-nowrap">{texto}</span>
    </p>
  );
}

function Boton({ href, texto }: { href: string; texto: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-verde mt-5 flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-[15.5px] font-bold"
    >
      {texto}
    </a>
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
  detalle: string | null;
  /** Null en las variantes sin cifras. */
  tiempo: string | null;
  /** Porcentaje del ancho disponible. */
  ancho: number;
  destacada: boolean;
}) {
  return (
    <div>
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3">
        <p className="min-w-0 text-[14.5px] font-semibold leading-snug text-marca-tinta">
          {nombre}
          {detalle && (
            <span className={`block text-[13px] font-medium ${destacada ? "text-marca-verdeOsc" : "text-marca-gris"}`}>{detalle}</span>
          )}
        </p>
        {tiempo && (
          <p
            className={`whitespace-nowrap font-display text-[17px] font-bold leading-tight ${
              destacada ? "text-marca-verdeOsc" : "text-marca-tinta"
            }`}
          >
            {tiempo}
          </p>
        )}
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
