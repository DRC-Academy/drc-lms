"use client";

import type { ReactNode } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";
import type { EstadisticasAlumno } from "@/lib/estadisticas";
import type { TextosEstadisticas } from "@/lib/textos/estadisticas";

/**
 * «CÓMO VAS»: el nivel y cuatro anillos en 2×2.
 *
 *   Curso             lo hecho de lo que el drip ya ha abierto (%).
 *   Tiempo de curso   el anillo es lo recorrido de las 24 semanas; el
 *                     número, lo que queda. Verde oscuro: el tiempo pasa
 *                     solo y no es un logro.
 *   Clases            cuántas lleva, con su profesor.
 *   Práctica          ejercicios hechos.
 *
 * CLASES Y PRÁCTICA NO TIENEN TOTAL, así que su anillo va cerrado, en
 * verde claro: se lee como un contador, no como algo a medias. Sin hitos
 * ni «próximo»: nada que alcanzar.
 *
 * SIN «0 %» NI «0». Lo que no ha empezado va punteado, con un icono y
 * una invitación. Un dato que no se pudo leer (null) no se pinta.
 *
 * Lo pintan la barra lateral de escritorio, al abrirse, y la hoja del
 * perfil en móvil (`variante`). Sin estado: se dibuja igual en los dos.
 */

/** Grosor del anillo: fino. Con peso sería 7 en escritorio y 8 en móvil. */
const TRAZO = { barra: 3, movil: 3.5 };
const TAMAÑO = { barra: 62, movil: 74 };

type Celda = {
  clave: string;
  lector: string;
  anillo: { tipo: "vacio"; icono: ReactNode } | { tipo: "progreso"; p: number; color: string } | { tipo: "contador" } | { tipo: "completo" };
  /** Lo de dentro cuando hay número. */
  cifra?: ReactNode;
  rotulo: string;
  detalle: string;
};

export function celdasComoVas(e: EstadisticasAlumno, te: TextosEstadisticas): Celda[] {
  const ta = te.anillos;
  const celdas: Celda[] = [];

  if (e.curso) {
    const p = e.curso.porcentajeDesbloqueado;
    if (e.curso.completadas === 0) {
      celdas.push({ clave: "curso", lector: te.lector.cursoVacio, anillo: { tipo: "vacio", icono: <IconoLibro /> }, rotulo: ta.curso, detalle: ta.cursoInvita });
    } else if (p >= 100) {
      celdas.push({ clave: "curso", lector: te.lector.curso(100), anillo: { tipo: "completo" }, rotulo: ta.curso, detalle: ta.todoLoDesbloqueado });
    } else {
      celdas.push({
        clave: "curso",
        lector: te.lector.curso(p),
        anillo: { tipo: "progreso", p: p / 100, color: "#1E9E3A" },
        cifra: (
          <>
            {p}
            <small>%</small>
          </>
        ),
        rotulo: ta.curso,
        detalle: ta.deLoDesbloqueado,
      });
    }
  }

  if (e.tiempo) {
    const { semanasRestantes: n, semanasTotales: total } = e.tiempo;
    celdas.push({
      clave: "tiempo",
      lector: te.lector.tiempo(n, total),
      anillo: { tipo: "progreso", p: (total - n) / total, color: "#14722A" },
      cifra: (
        <>
          {n}
          <span className="unidad">{ta.semanas(n)}</span>
        </>
      ),
      rotulo: ta.tiempo,
      detalle: ta.paraCompletar,
    });
  }

  if (e.clases !== null) {
    const detalle = e.profesor ? ta.conProfesor(e.profesor) : ta.clasesHechas;
    celdas.push(
      e.clases === 0
        ? { clave: "clases", lector: te.lector.clasesVacio, anillo: { tipo: "vacio", icono: <IconoCalendario /> }, rotulo: ta.clases, detalle: ta.clasesInvita }
        : { clave: "clases", lector: te.lector.clases(e.clases, e.profesor), anillo: { tipo: "contador" }, cifra: e.clases, rotulo: ta.clases, detalle }
    );
  }

  if (e.ejercicios !== null) {
    celdas.push(
      e.ejercicios === 0
        ? { clave: "practica", lector: te.lector.practicaVacio, anillo: { tipo: "vacio", icono: <IconoLapiz /> }, rotulo: ta.practica, detalle: ta.practicaInvita }
        : { clave: "practica", lector: te.lector.practica(e.ejercicios), anillo: { tipo: "contador" }, cifra: e.ejercicios, rotulo: ta.practica, detalle: ta.ejerciciosHechos }
    );
  }

  return celdas;
}

export default function ComoVas({
  estadisticas,
  variante,
}: {
  estadisticas: EstadisticasAlumno;
  /** `barra`: la barra lateral de escritorio, 236px. `movil`: la hoja del perfil. */
  variante: "barra" | "movil";
}) {
  const { t } = usarIdioma();
  const te = t.estadisticas;
  const movil = variante === "movil";
  const celdas = celdasComoVas(estadisticas, te);
  const { nivel } = estadisticas;

  if (celdas.length === 0 && !nivel) return null;

  return (
    <section
      aria-label={te.titulo}
      className={`rounded-[12px] border border-marca-borde bg-marca-niebla ${
        movil ? "flex flex-col gap-4 px-[18px] py-5" : "flex w-[236px] flex-col gap-3.5 px-3.5 py-4"
      }`}
    >
      <h3
        className={`m-0 font-display font-semibold uppercase tracking-[0.14em] text-marca-gris ${
          movil ? "text-[12px]" : "text-[11px]"
        }`}
      >
        {te.titulo}
      </h3>

      {nivel && (
        <div className="flex flex-col gap-[5px]">
          <div className="flex items-center gap-2.5">
            <span className={`font-medium text-marca-gris ${movil ? "text-[14px]" : "text-[12.5px]"}`}>{te.nivel}</span>
            <span className="inline-flex h-7 min-w-[42px] items-center justify-center rounded-full border border-marca-verdePalido bg-white px-2.5 font-display text-[15px] font-bold text-marca-verdeOsc">
              {nivel.valor}
            </span>
            {nivel.fiable && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-marca-verdeOsc">
                <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                </svg>
                {te.nivelConfirmado}
              </span>
            )}
          </div>
          {!nivel.fiable && (
            <span className={`leading-[1.3] text-marca-gris ${movil ? "text-[12.5px]" : "text-[11.5px]"}`}>{te.nivelEstimado}</span>
          )}
        </div>
      )}

      {nivel && celdas.length > 0 && <div className="h-px bg-marca-borde" />}

      {celdas.length > 0 && (
        <ul className={`m-0 grid list-none grid-cols-2 p-0 ${movil ? "gap-x-3 gap-y-5" : "gap-x-2.5 gap-y-4"}`}>
          {celdas.map((c) => (
            <li key={c.clave} className="flex min-w-0 flex-col items-center text-center">
              <Anillo celda={c} variante={variante} />
              <span aria-hidden className={`font-semibold leading-[1.2] text-marca-tinta ${movil ? "mt-[9px] text-[14px]" : "mt-2 text-[12.5px]"}`}>
                {c.rotulo}
              </span>
              <span aria-hidden className={`mt-0.5 text-balance leading-[1.3] text-marca-gris ${movil ? "text-[12.5px]" : "text-[11.5px]"}`}>
                {c.detalle}
              </span>
              <span className="sr-only">{c.lector}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Anillo({ celda, variante }: { celda: Celda; variante: "barra" | "movil" }) {
  const tam = TAMAÑO[variante];
  const trazo = TRAZO[variante];
  const c = tam / 2;
  const r = (tam - trazo) / 2 - 1.5;
  const C = 2 * Math.PI * r;
  const a = celda.anillo;
  const movil = variante === "movil";

  let pista: ReactNode;
  let arco: ReactNode = null;
  if (a.tipo === "vacio") {
    pista = <circle cx={c} cy={c} r={r} fill="none" stroke="#93A79A" strokeWidth={2} strokeDasharray="0.01 6.4" strokeLinecap="round" />;
  } else if (a.tipo === "contador") {
    // Cerrado y claro: un contador, no un progreso.
    pista = <circle cx={c} cy={c} r={r} fill="none" stroke="#A9DFB7" strokeWidth={trazo} />;
  } else {
    pista = <circle cx={c} cy={c} r={r} fill={a.tipo === "completo" ? "#E7F5EA" : "none"} stroke="#E2E8E4" strokeWidth={trazo} />;
    const p = a.tipo === "completo" ? 1 : a.p;
    const color = a.tipo === "completo" ? "#1E9E3A" : a.color;
    // Un avance real nunca es un punto invisible.
    const largo = p <= 0 ? 0 : Math.max(p, 0.04) * C;
    if (largo > 0) {
      arco = (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={trazo}
          strokeLinecap="round"
          strokeDasharray={`${largo.toFixed(2)} ${C.toFixed(2)}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      );
    }
  }

  let centro: ReactNode;
  if (a.tipo === "vacio") {
    centro = <span className="text-marca-tintaMedia">{a.icono}</span>;
  } else if (a.tipo === "completo") {
    centro = (
      <svg viewBox="0 0 20 20" className={movil ? "h-6 w-6" : "h-[22px] w-[22px]"} fill="none" stroke="#14722A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 10.5l3.5 3.5 7.5-8" />
      </svg>
    );
  } else {
    centro = (
      <span
        // El «%» va pegado al número y en pequeño; la unidad de las
        // semanas, debajo, en la letra de las etiquetas.
        className={`inline-block text-center font-display font-bold tabular-nums leading-none tracking-[-0.01em] text-marca-tinta [&_.unidad]:mt-[3px] [&_.unidad]:block [&_.unidad]:font-sans [&_.unidad]:font-semibold [&_.unidad]:tracking-normal [&_.unidad]:text-marca-tintaMedia [&_small]:text-[0.62em] [&_small]:font-semibold [&_small]:text-marca-tintaMedia ${
          movil ? "text-[21px] [&_.unidad]:text-[12px]" : "text-[18px] [&_.unidad]:text-[11px]"
        }`}
      >
        {celda.cifra}
      </span>
    );
  }

  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} className="block">
        {pista}
        {arco}
      </svg>
      <span className="absolute inset-0 grid place-items-center">{centro}</span>
    </span>
  );
}

function IconoLibro() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5.5C8.5 4.3 6.4 3.8 3.5 4v11c2.9-.2 5 .3 6.5 1.5 1.5-1.2 3.6-1.7 6.5-1.5V4c-2.9-.2-5 .3-6.5 1.5z" />
      <path d="M10 5.5v11" />
    </svg>
  );
}

function IconoCalendario() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 3v3M13 3v3" />
    </svg>
  );
}

function IconoLapiz() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 4.5l3 3L8 15H5v-3z" />
      <path d="M11 6l3 3" />
    </svg>
  );
}
