// ---------------------------------------------------------------
// LAS PIEZAS DEL PANEL
//
// Tarjeta, variación, porcentaje con su base y los estados de una cifra.
// Sin "use client": se pintan en el servidor, y los componentes de
// cliente las importan igual.
//
// LOS ESTADOS. Un cero y un «no lo sé» no pueden parecerse:
//   · Sin datos         `SinDatos`: el rango cae antes de que se apuntara.
//   · Histórico parcial `AvisoParcial`: hay datos desde una fecha del rango.
//   · Muestra pequeña   `Pct`: base menor que 10, en gris y con etiqueta.
//   · Cero real         un 0 normal: se ha leído y no hubo nada.
//   · Lectura fallida   `ErrorLectura`: «—» y el aviso, nunca un 0.
// ---------------------------------------------------------------

import type { ReactNode } from "react";
import { MUESTRA_MINIMA, numero, porcentaje, type Variacion } from "@/lib/panel-formato";

export const COLOR_BAJA = "#A5432F";
export const COLOR_SUBE = "#14722A";

export function Tarjeta({
  children,
  className = "",
  titulo,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Si lo lleva, la tarjeta es una sección con nombre. */
  titulo?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={titulo ? id : undefined}
      className={`min-w-0 rounded-[14px] border border-marca-borde bg-white p-[18px] lg:p-[22px] ${className}`}
    >
      {children}
    </section>
  );
}

export function CabTarjeta({ id, titulo, sub, derecha }: { id: string; titulo: string; sub?: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-[18px] font-semibold leading-[1.25] tracking-[-0.01em] text-marca-tinta">
          {titulo}
        </h2>
        {sub && <p className="mt-1 max-w-[68ch] text-pretty text-[13.5px] leading-[1.5] text-marca-tintaMedia">{sub}</p>}
      </div>
      {derecha}
    </div>
  );
}

/** Los botones de «qué enseñar» dentro de una tarjeta: el segmentado suave del prototipo. */
export function Segmentado<T extends string>({
  opciones,
  valor,
  alElegir,
  etiqueta,
}: {
  opciones: { id: T; nombre: string }[];
  valor: T;
  alElegir: (id: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[18px] border border-marca-borde bg-white p-[3px] sm:rounded-full">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valor === o.id}
          onClick={() => alElegir(o.id)}
          className={`min-h-[32px] whitespace-nowrap rounded-full px-2.5 text-[13.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde sm:px-[13px] ${
            valor === o.id ? "bg-marca-tinta text-white hover:bg-[#24382D]" : "text-marca-tintaMedia hover:bg-marca-niebla hover:text-marca-tinta"
          }`}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------
// CIFRAS
// ---------------------------------------------------------------

export function ChipPequena() {
  return (
    <span className="ml-1 inline-block whitespace-nowrap rounded-full border border-marca-borde px-[7px] align-[2px] text-[11px] font-medium text-marca-grisSuave">
      muestra pequeña
    </span>
  );
}

/** Un porcentaje con su base. Base menor que 10: gris y «muestra pequeña». */
export function Pct({ parte, base, chip = true }: { parte: number; base: number; chip?: boolean }) {
  const pequena = base < MUESTRA_MINIMA;
  return (
    <>
      <span className={pequena ? "text-marca-grisSuave" : undefined}>{porcentaje(parte, base)}&nbsp;%</span>
      {pequena && chip && <ChipPequena />}
    </>
  );
}

/**
 * La variación frente al periodo anterior. Sin `anterior` no hay con qué
 * comparar y lo dice; en puntos para los porcentajes.
 */
export function Delta({
  actual,
  anterior,
  enPuntos = false,
  sinComparar = "Sin periodo anterior para comparar",
  tenue = false,
}: {
  actual: number;
  anterior: number | null;
  /** Para porcentajes: la diferencia va en puntos y sin %, y el «vs.» lleva el %. */
  enPuntos?: boolean;
  sinComparar?: string;
  /** Por debajo de las comparaciones fijas: gris, sin flecha ni color. */
  tenue?: boolean;
}) {
  if (anterior === null) {
    // Tenue va a media frase («Rango elegido vs. …: sin datos…»): en minúscula.
    const texto = tenue ? sinComparar.charAt(0).toLowerCase() + sinComparar.slice(1) : sinComparar;
    return <span className={`text-[13px] text-marca-grisSuave ${tenue ? "" : "font-medium"}`}>{texto}</span>;
  }
  const d = actual - anterior;
  const vs = enPuntos ? `${anterior} %` : numero(anterior);
  if (d === 0) {
    return (
      <span className="text-[13px] font-medium text-marca-grisSuave">
        = sin cambios <span className="font-normal">vs. {vs}</span>
      </span>
    );
  }
  const sube = d > 0;
  const signo = sube ? "+" : "−";
  const relativo = !enPuntos && anterior > 0 ? ` (${signo}${Math.abs(Math.round((d / anterior) * 100))} %)` : "";
  if (tenue) {
    return (
      <span className="text-[13px] tabular-nums text-marca-grisSuave">
        {signo}
        {numero(Math.abs(d))}
        {enPuntos ? (Math.abs(d) === 1 ? " pt" : " pts") : relativo} · vs. {vs}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 text-[13px] font-semibold" style={{ color: sube ? COLOR_SUBE : COLOR_BAJA }}>
      <span aria-hidden>{sube ? "▲" : "▼"}</span>
      <span>
        {signo}
        {numero(Math.abs(d))}
        {enPuntos ? (Math.abs(d) === 1 ? " punto" : " puntos") : relativo}
      </span>
      <span className="font-normal text-marca-grisSuave">vs. {vs}</span>
    </span>
  );
}

/**
 * Lo que dice una comparación fija: la variación, o por qué no la hay.
 * `tenue`: gris en vez de verde o rojo (periodo anterior incompleto,
 * muestra pequeña), con la razón en `nota`.
 */
export type EstadoFija =
  | { tipo: "variacion"; variacion: Variacion; tenue: boolean; notas: string[] }
  | { tipo: "texto"; texto: string };

/**
 * Una de las dos comparaciones fijas: «vs. semana anterior · lun–jue» y
 * debajo la variación. El detalle (los dos tramos con sus horas y sus
 * cifras) va en el tooltip y, para lectores de pantalla, en el texto.
 */
export function LineaFija({ nombre, tramo, detalle, estado }: { nombre: string; tramo: string; detalle: string; estado: EstadoFija }) {
  const color =
    estado.tipo !== "variacion" || estado.tenue || estado.variacion.signo === 0
      ? undefined
      : estado.variacion.signo > 0
        ? COLOR_SUBE
        : COLOR_BAJA;
  return (
    <div title={detalle} className="min-w-0">
      <p className="text-[12px] leading-[1.35] text-marca-grisSuave">
        <span className="font-medium text-marca-tintaMedia">{nombre}</span> · <span className="whitespace-nowrap">{tramo}</span>
      </p>
      {estado.tipo === "variacion" ? (
        <>
          <p
            className={`text-[13.5px] font-semibold leading-[1.4] tabular-nums ${color ? "" : "text-marca-grisSuave"}`}
            style={color ? { color } : undefined}
          >
            {estado.variacion.texto}
          </p>
          {estado.notas.map((n) => (
            <p key={n} className="text-[12px] leading-[1.35] text-marca-grisSuave">
              {n}
            </p>
          ))}
        </>
      ) : (
        <p className="text-[13px] leading-[1.4] text-marca-grisSuave">{estado.texto}</p>
      )}
      <span className="sr-only">{detalle}</span>
    </div>
  );
}

/** Las dos comparaciones fijas, una al lado de la otra; en móvil, una encima de otra. */
export function LineasFijas({ children }: { children: ReactNode }) {
  return <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-marca-nieblaOscura pt-2.5 min-[480px]:grid-cols-2">{children}</div>;
}

/** «Ver como tabla», debajo de cada gráfico. */
export function TablaVista({ cabeceras, filas }: { cabeceras: string[]; filas: ReactNode[][] }) {
  return (
    <details className="group mt-3 text-[13px]">
      <summary className="w-max cursor-pointer rounded font-medium text-marca-verdeOsc hover:text-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde">
        Ver como tabla
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full border-collapse tabular-nums">
          <thead>
            <tr>
              {cabeceras.map((c, i) => (
                <th key={c} className={`whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-1 font-medium text-marca-grisSuave ${i ? "text-right" : "text-left"}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                {f.map((c, j) => (
                  <td key={j} className={`border-b border-marca-nieblaOscura px-2.5 py-1 ${j ? "whitespace-nowrap text-right" : "min-w-[5.5rem] text-left"}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------
// LOS ESTADOS
// ---------------------------------------------------------------

/** No hay datos en el rango: el rango cae antes de que se apuntara, o aún no hay nada. */
export function SinDatos({ texto, falta, compacto = false }: { texto: ReactNode; falta?: ReactNode; compacto?: boolean }) {
  return (
    <div className="rounded-[10px] border border-marca-borde bg-[#F7F9F7] px-3.5 py-3">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-marca-tintaMedia">
        <i aria-hidden className="inline-block h-2 w-2 rounded-full border-[1.5px] border-marca-grisSuave" />
        Sin datos en este rango
      </span>
      {!compacto && <div className="mt-1.5 text-[26px] font-semibold leading-[1.1] text-[#B5C0BA]">—</div>}
      <p className="mt-1.5 text-[13px] leading-[1.45] text-marca-tintaMedia">{texto}</p>
      {falta && <p className="mt-1 text-[12.5px] leading-[1.45] text-marca-grisSuave">{falta}</p>}
    </div>
  );
}

/** Hay datos solo desde una fecha del rango. */
export function AvisoParcial({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 inline-flex items-baseline gap-1.5 rounded-[8px] border border-marca-borde bg-[#F7F9F7] px-2.5 py-1.5 text-[12.5px] leading-[1.4] text-marca-tintaMedia">
      <i aria-hidden className="inline-block h-2 w-2 flex-none translate-y-[1px] rounded-full bg-marca-amarillo" />
      <span>{children}</span>
    </p>
  );
}

/** No se pudo leer: guion y aviso, nunca un cero. */
export function ErrorLectura({ que, conValor = false }: { que: string; conValor?: boolean }) {
  return (
    <div>
      {conValor && <div className="text-[34px] font-semibold leading-[1.05] text-[#B5C0BA]">—</div>}
      <p className="mt-1 text-[13px] font-medium leading-[1.45]" style={{ color: COLOR_BAJA }}>
        No se ha podido leer {que}. Vuelve a cargar en unos minutos.
      </p>
    </div>
  );
}

/** «Cómo se calcula», cerrado: la definición exacta, en llano. */
export function ComoSeCalcula({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 text-[13px]">
      <summary className="w-max cursor-pointer rounded font-medium text-marca-verdeOsc hover:text-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde">
        Cómo se calcula
      </summary>
      <div className="mt-2 max-w-[72ch] space-y-1.5 text-pretty leading-[1.5] text-marca-tintaMedia">{children}</div>
    </details>
  );
}
