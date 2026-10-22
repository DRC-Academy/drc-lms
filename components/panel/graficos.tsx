"use client";

// ---------------------------------------------------------------
// LOS GRÁFICOS DEL PANEL
//
// SVG a mano, sin librería: columnas (una o dos series), la línea de un
// porcentaje y la chispa de las tarjetas. Reciben números ya calculados
// en el servidor; aquí solo se dibuja y se enseña el tooltip.
//
// EL ANCHO SE MIDE. Un viewBox que escala dejaría el texto de los ejes en
// 6px a 375 de ancho, así que cada gráfico mide su caja y dibuja a esa
// medida. Hasta medir ocupa su alto en blanco: nada salta al cargar.
//
// UN NULL NO ES UN CERO. Un periodo anterior a que existiera el dato
// lleva null y se pinta como una marca corta sobre la base, con «aún no
// se registraba» en el tooltip; un cero es una columna que no se levanta.
//
// EL PERIODO EN CURSO (`enCurso`, su índice) va a medias: su columna sale
// más clara y con borde discontinuo, y el último tramo de la línea
// discontinuo y con el punto hueco. Bajo su rótulo, «en curso».
//
// TECLADO: cada gráfico es una sola parada de tabulador. Con el foco
// dentro, las flechas recorren los periodos y el tooltip los va diciendo.
// ---------------------------------------------------------------

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { COLOR_SERIE, numero, porcentaje } from "@/lib/panel-formato";

const REJILLA = "#EDF1EE";
const BASE = "#D5DDD8";
const SIN_DATO = "#C5D2C8";

/** Un periodo del eje: el valor de la serie, su rótulo corto y el título del tooltip. */
export type PuntoEje = { periodo: string; etiqueta: string; titulo: string };

/** Null = ese periodo no tiene datos (no es un cero). */
export type Serie = { nombre: string; valores: (number | null)[] };

// ---------------------------------------------------------------
// MEDIDA Y TOOLTIP
// ---------------------------------------------------------------

const usarEfectoDeMedida = typeof window === "undefined" ? useEffect : useLayoutEffect;

function usarAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState<number | null>(null);
  usarEfectoDeMedida(() => {
    const caja = ref.current;
    if (!caja) return;
    const medir = () => setAncho(Math.floor(caja.clientWidth));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caja);
    return () => observador.disconnect();
  }, []);
  return [ref, ancho] as const;
}

type Tip = { contenido: ReactNode; x: number; y: number };

function Tooltip({ tip }: { tip: Tip | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  usarEfectoDeMedida(() => {
    if (!tip || !ref.current) return setPos(null);
    const r = ref.current.getBoundingClientRect();
    let left = tip.x + 14;
    let top = tip.y - r.height - 10;
    if (left + r.width > window.innerWidth - 8) left = tip.x - r.width - 14;
    if (left < 8) left = 8;
    if (top < 8) top = tip.y + 16;
    setPos({ left, top });
  }, [tip]);
  if (!tip) return null;
  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-30 max-w-[240px] rounded-[8px] bg-marca-tinta px-2.5 py-2 text-[12.5px] leading-[1.45] text-white shadow-[0_4px_16px_rgba(18,33,26,0.18)]"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      {tip.contenido}
    </div>
  );
}

/**
 * El periodo activo (ratón o flechas) y el tooltip que le corresponde.
 * `caja(i)` dice dónde está la banda del periodo en la pantalla, para
 * colocar el tooltip cuando se llega con el teclado.
 */
function usarActivo(n: number, contenido: (i: number) => ReactNode) {
  const [activo, setActivo] = useState<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const enseñar = useCallback(
    (i: number, x?: number, y?: number) => {
      setActivo(i);
      if (x !== undefined && y !== undefined) return setTip({ contenido: contenido(i), x, y });
      const banda = svgRef.current?.querySelector<SVGRectElement>(`[data-i="${i}"]`);
      const r = banda?.getBoundingClientRect();
      if (r) setTip({ contenido: contenido(i), x: r.left + r.width / 2, y: r.top + 20 });
    },
    [contenido]
  );
  const ocultar = useCallback(() => {
    setActivo(null);
    setTip(null);
  }, []);

  useEffect(() => {
    if (!tip) return;
    window.addEventListener("scroll", ocultar, { passive: true });
    return () => window.removeEventListener("scroll", ocultar);
  }, [tip, ocultar]);

  const props = {
    ref: svgRef,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") return ocultar();
      const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home" || e.key === "End" || paso !== 0) {
        e.preventDefault();
        const i =
          e.key === "Home" ? 0 : e.key === "End" ? n - 1 : Math.min(n - 1, Math.max(0, (activo ?? (paso > 0 ? -1 : n)) + paso));
        enseñar(i);
      }
    },
    onFocus: () => enseñar(activo ?? n - 1),
    onBlur: ocultar,
    onMouseLeave: ocultar,
    className: "block overflow-visible rounded-[6px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marca-verde",
  };
  return { activo, tip, enseñar, props };
}

// ---------------------------------------------------------------
// ESCALAS
// ---------------------------------------------------------------

function pasoLimpio(x: number): number {
  if (x <= 0) return 1;
  const pot = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / pot;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pot;
}

function escala(max: number, divisiones = 4) {
  const paso = Math.max(1, pasoLimpio(max / divisiones));
  const tope = Math.max(paso, Math.ceil(max / paso) * paso);
  const ticks: number[] = [];
  for (let t = 0; t <= tope + 1e-9; t += paso) ticks.push(t);
  return { tope, ticks };
}

/** Columna con 4px redondeados arriba y la base recta. */
function columna(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** «en curso», debajo del rótulo del eje del periodo a medias. */
function EnCurso({ x, y }: { x: number; y: number }) {
  return (
    <text className="fill-marca-grisSuave text-[10.5px] font-medium" x={x} y={y} textAnchor="middle">
      en curso
    </text>
  );
}

/** El título del tooltip, con «en curso» si toca. */
const tituloDe = (p: PuntoEje, enCurso: boolean) => (enCurso ? `${p.titulo} · en curso` : p.titulo);

/** Cada cuántos periodos va un rótulo para que no se pisen (~46px cada uno), contando desde el último. */
function cadaCuanto(anchoBanda: number): number {
  return Math.max(1, Math.ceil(46 / Math.max(1, anchoBanda)));
}

const valor = (v: number | null) => (v === null ? "—" : numero(v));

const Muestra = ({ color }: { color: string }) => (
  <span aria-hidden className="inline-block h-2 w-2 flex-none rounded-[2px]" style={{ background: color }} />
);

// ---------------------------------------------------------------
// COLUMNAS
// ---------------------------------------------------------------

export function Columnas({
  puntos,
  series,
  alto = 230,
  aria,
  enCurso = null,
}: {
  puntos: PuntoEje[];
  series: Serie[];
  alto?: number;
  aria: string;
  /** El índice del periodo a medias, o null. */
  enCurso?: number | null;
}) {
  const [caja, ancho] = usarAncho<HTMLDivElement>();
  const n = puntos.length;
  const contenido = useCallback(
    (i: number) => (
      <>
        <b className="font-semibold">{tituloDe(puntos[i], i === enCurso)}</b>
        {series.every((s) => s.valores[i] === null) ? (
          <div>Aún no se registraba</div>
        ) : (
          series.map((s, j) => (
            <div key={s.nombre} className="flex items-center gap-1.5">
              <Muestra color={COLOR_SERIE[j]} />
              {s.nombre}: <b className="font-semibold">{valor(s.valores[i])}</b>
            </div>
          ))
        )}
      </>
    ),
    [puntos, series, enCurso]
  );
  const { activo, tip, enseñar, props } = usarActivo(n, contenido);

  let svg: ReactNode = null;
  if (ancho) {
    const W = Math.max(260, ancho);
    const m = { t: 22, r: 4, b: enCurso === null ? 30 : 42, l: 36 };
    const pw = W - m.l - m.r;
    const ph = alto - m.t - m.b;
    const banda = pw / Math.max(1, n);
    const k = series.length;
    const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
    const { tope, ticks } = escala(Math.max(1, ...todos));
    const gap = banda < 10 ? 0 : 2;
    const bw = Math.max(1, Math.min(k === 1 ? 24 : 16, (banda * 0.72 - (k - 1) * gap) / k));
    const y = (v: number) => m.t + ph - (v / tope) * ph;
    const cada = cadaCuanto(banda);
    const x0 = (i: number) => m.l + i * banda + (banda - (k * bw + (k - 1) * gap)) / 2;
    const ultimo = n - 1;

    svg = (
      <svg width={W} height={alto} role="img" aria-label={aria} {...props}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASE : REJILLA} />
            <text className="fill-marca-grisSuave text-[11.5px] tabular-nums" x={m.l - 8} y={y(t) + 4} textAnchor="end">
              {numero(t)}
            </text>
          </g>
        ))}
        {puntos.map((p, i) => (
          <g key={p.periodo}>
            {series.map((s, j) => {
              const v = s.valores[i];
              const x = x0(i) + j * (bw + gap);
              if (v === null) return <line key={j} x1={x + bw / 2} x2={x + bw / 2} y1={y(0) - 3} y2={y(0) + 3} stroke={SIN_DATO} />;
              return i === enCurso ? (
                <path
                  key={j}
                  d={columna(x + 0.5, y(v) + 0.5, bw - 1, (v / tope) * ph - 0.5)}
                  fill={COLOR_SERIE[j]}
                  fillOpacity={0.35}
                  stroke={COLOR_SERIE[j]}
                  strokeDasharray="3 2"
                />
              ) : (
                <path key={j} d={columna(x, y(v), bw, (v / tope) * ph)} fill={COLOR_SERIE[j]} />
              );
            })}
            {(ultimo - i) % cada === 0 && (
              <text
                className={`text-[11.5px] tabular-nums ${activo === i ? "fill-marca-tinta font-semibold" : "fill-marca-grisSuave"}`}
                x={m.l + i * banda + banda / 2}
                y={m.t + ph + 17}
                textAnchor="middle"
              >
                {p.etiqueta}
              </text>
            )}
            {i === enCurso && <EnCurso x={m.l + i * banda + banda / 2} y={m.t + ph + 30} />}
          </g>
        ))}
        {/* El valor directo, solo del último periodo. */}
        {series.map((s, j) => {
          const v = s.valores[ultimo];
          return v === null ? null : (
            <text
              key={j}
              className="fill-marca-tinta text-[12px] font-semibold tabular-nums"
              x={x0(ultimo) + j * (bw + gap) + bw / 2}
              y={y(v) - 6}
              textAnchor="middle"
            >
              {numero(v)}
            </text>
          );
        })}
        {puntos.map((p, i) => (
          <g key={`z${p.periodo}`}>
            <rect
              data-i={i}
              x={m.l + i * banda}
              y={m.t}
              width={banda}
              height={ph}
              fill="transparent"
              onMouseMove={(e) => enseñar(i, e.clientX, e.clientY)}
            />
            <rect
              x={m.l + i * banda + 1}
              y={m.t - 4}
              width={Math.max(0, banda - 2)}
              height={ph + 4}
              rx={6}
              fill="none"
              stroke={SIN_DATO}
              opacity={activo === i ? 1 : 0}
              pointerEvents="none"
            />
          </g>
        ))}
      </svg>
    );
  }

  return (
    <div ref={caja} className="relative mt-3.5" style={{ minHeight: alto }}>
      {svg}
      <Tooltip tip={tip} />
    </div>
  );
}

// ---------------------------------------------------------------
// LÍNEA DE UN PORCENTAJE
// ---------------------------------------------------------------

/** Null = sin datos en ese periodo; base 0 = no hubo nada que medir. */
export type Proporcion = { parte: number; base: number } | null;

export function LineaPorcentaje({
  puntos,
  valores,
  unidad,
  alto = 170,
  aria,
  enCurso = null,
}: {
  puntos: PuntoEje[];
  valores: Proporcion[];
  /** Lo que cuenta la base, en plural: «clases». */
  unidad: string;
  alto?: number;
  aria: string;
  /** El índice del periodo a medias, o null. */
  enCurso?: number | null;
}) {
  const [caja, ancho] = usarAncho<HTMLDivElement>();
  const n = puntos.length;
  const contenido = useCallback(
    (i: number) => {
      const v = valores[i];
      return (
        <>
          <b className="font-semibold">{tituloDe(puntos[i], i === enCurso)}</b>
          <div>
            {v === null
              ? "Aún no se registraba"
              : v.base === 0
                ? `Ninguna de las ${unidad}`
                : `${porcentaje(v.parte, v.base)} % · ${numero(v.parte)} de ${numero(v.base)} ${unidad}`}
          </div>
        </>
      );
    },
    [puntos, valores, unidad, enCurso]
  );
  const { activo, tip, enseñar, props } = usarActivo(n, contenido);

  let svg: ReactNode = null;
  if (ancho) {
    const W = Math.max(240, ancho);
    const m = { t: 16, r: 38, b: enCurso === null ? 30 : 42, l: 40 };
    const pw = W - m.l - m.r;
    const ph = alto - m.t - m.b;
    const pcts = valores.map((v) => (v === null || v.base === 0 ? null : (v.parte / v.base) * 100));
    const { tope, ticks } = escala(Math.max(5, ...pcts.filter((v): v is number => v !== null)), 3);
    const paso = n > 1 ? pw / (n - 1) : 0;
    const x = (i: number) => (n > 1 ? m.l + i * paso : m.l + pw / 2);
    const y = (v: number) => m.t + ph - (v / tope) * ph;
    const banda = n > 1 ? paso : pw;
    const cada = cadaCuanto(banda);

    // Tramos seguidos con dato: un hueco corta la línea. El periodo en
    // curso no entra en ellos: va aparte, discontinuo desde el anterior.
    const tramos: [number, number][][] = [];
    let actual: [number, number][] = [];
    pcts.forEach((v, i) => {
      if (v === null || i === enCurso) {
        if (actual.length) tramos.push(actual);
        actual = [];
      } else actual.push([x(i), y(v)]);
    });
    if (actual.length) tramos.push(actual);
    const vCurso = enCurso === null ? null : pcts[enCurso];
    const vPrevio = enCurso === null || enCurso === 0 ? null : pcts[enCurso - 1];
    const ultimoConDato = pcts.reduce<number>((u, v, i) => (v === null ? u : i), -1);

    svg = (
      <svg width={W} height={alto} role="img" aria-label={aria} {...props}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASE : REJILLA} />
            <text className="fill-marca-grisSuave text-[11.5px] tabular-nums" x={m.l - 8} y={y(t) + 4} textAnchor="end">
              {t} %
            </text>
          </g>
        ))}
        {tramos.map((t, j) => {
          const d = t.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("");
          return (
            <g key={j}>
              {t.length > 1 && <path d={`${d}L${t[t.length - 1][0]},${y(0)}L${t[0][0]},${y(0)}Z`} fill={COLOR_SERIE[0]} opacity={0.1} />}
              <path d={d} fill="none" stroke={COLOR_SERIE[0]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {enCurso !== null && vCurso != null && vPrevio != null && (
          <path
            d={`M${x(enCurso - 1)},${y(vPrevio)}L${x(enCurso)},${y(vCurso)}`}
            fill="none"
            stroke={COLOR_SERIE[0]}
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        )}
        {pcts.map((v, i) =>
          v === null ? (
            <line key={i} x1={x(i)} x2={x(i)} y1={y(0) - 3} y2={y(0) + 3} stroke={SIN_DATO} />
          ) : i === enCurso ? (
            <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="#fff" stroke={COLOR_SERIE[0]} strokeWidth={2} />
          ) : n <= 14 || i === ultimoConDato || activo === i ? (
            <circle key={i} cx={x(i)} cy={y(v)} r={4.5} fill={COLOR_SERIE[0]} stroke="#fff" strokeWidth={2} />
          ) : null
        )}
        {puntos.map(
          (p, i) =>
            (n - 1 - i) % cada === 0 && (
              <text
                key={p.periodo}
                className={`text-[11.5px] tabular-nums ${activo === i ? "fill-marca-tinta font-semibold" : "fill-marca-grisSuave"}`}
                x={x(i)}
                y={m.t + ph + 18}
                textAnchor="middle"
              >
                {p.etiqueta}
              </text>
            )
        )}
        {enCurso !== null && <EnCurso x={x(enCurso)} y={m.t + ph + 31} />}
        {ultimoConDato >= 0 && (
          <text className="fill-marca-tinta text-[12px] font-semibold tabular-nums" x={x(ultimoConDato) + 8} y={y(pcts[ultimoConDato] as number) - 8}>
            {Math.round(pcts[ultimoConDato] as number)} %
          </text>
        )}
        {puntos.map((p, i) => (
          <g key={`z${p.periodo}`}>
            <rect
              data-i={i}
              x={x(i) - banda / 2}
              y={m.t}
              width={banda}
              height={ph}
              fill="transparent"
              onMouseMove={(e) => enseñar(i, e.clientX, e.clientY)}
            />
            <line x1={x(i)} x2={x(i)} y1={m.t} y2={m.t + ph} stroke="#9AA8A0" opacity={activo === i ? 1 : 0} pointerEvents="none" />
          </g>
        ))}
      </svg>
    );
  }

  return (
    <div ref={caja} className="relative mt-3.5" style={{ minHeight: alto }}>
      {svg}
      <Tooltip tip={tip} />
    </div>
  );
}
