"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usarIdioma } from "@/components/ProveedorIdioma";
import type { EstadisticasAlumno } from "@/lib/estadisticas";
import { ESCALERA_MCER } from "@/lib/recorrido";
import type { TextosEstadisticas } from "@/lib/textos/estadisticas";

/**
 * «CÓMO VAS»: la tarjeta verde (variante B2 del rediseño de septiembre
 * de 2026).
 *
 *   La llama + clases   la cifra protagonista: las clases con su
 *                       profesor. NO ES UNA RACHA. La llama no se apaga
 *                       ni castiga: con pocas clases sale más pequeña y
 *                       más tranquila (`Llama`), nada más.
 *   El nivel            la escalera A1–C2, con la marca de
 *                       `nivelMostrado`: «✓ Daniela» solo si lo confirmó
 *                       su profesor, «prueba de nivel» si lo midió la
 *                       prueba automática, «estimado» si es el del alta.
 *   Tres círculos       ejercicios distintos hechos, bloques de «Para ti»
 *                       terminados y las semanas que quedan de las 24
 *                       (este sí es un anillo de progreso). Pasadas las
 *                       24: «Todo tu curso está abierto».
 *
 * NINGÚN PORCENTAJE DEL CURSO: lo enseña el anillo de la barra y el
 * banner del diploma.
 *
 * SIN «0». Un contador a cero se pinta con su icono en vez de la cifra;
 * el de la práctica, además, es el enlace a «Para ti»: es lo único que se
 * invita a hacer. Un dato que no se pudo leer (null) no se pinta.
 *
 * VERDE PROFUNDO (#13502B) Y AMARILLO SOLO DE ACENTO: la llama, el
 * peldaño actual, los anillos. Ningún botón es amarillo. El texto
 * secundario va en #CFE2D4, que sobre ese verde pasa de 4.5:1.
 *
 * Lo pintan la barra lateral de escritorio —con su versión estrecha,
 * `ComoVasPlegado`, mientras está plegada—, el inicio en móvil y la hoja
 * del perfil. Sin estado: se dibuja igual en todos.
 */

const FONDO = "bg-[#13502B]";
const SECUNDARIO = "text-[#CFE2D4]";

/**
 * Lo que oye el lector de pantalla, una frase por dato. Lo visible va
 * `aria-hidden`: una cifra suelta dentro de un círculo no se entiende
 * leída.
 */
export function lecturasComoVas(e: EstadisticasAlumno, te: TextosEstadisticas): string[] {
  const l: string[] = [];
  if (e.clases !== null) l.push(e.clases === 0 ? te.lector.clasesVacio : te.lector.clases(e.clases, e.profesor));
  if (e.nivel) l.push(te.lector.nivel(e.nivel.valor, e.nivel.origen, e.nivel.profesor));
  if (e.ejercicios !== null) l.push(e.ejercicios === 0 ? te.lector.ejerciciosVacio : te.lector.ejercicios(e.ejercicios));
  if (e.bloques !== null) l.push(e.bloques === 0 ? te.lector.practicaVacio : te.lector.practica(e.bloques));
  if (e.tiempo)
    l.push(
      e.tiempo.semanasRestantes === 0
        ? te.lector.cursoAbierto
        : te.lector.tiempo(e.tiempo.semanasRestantes, e.tiempo.semanasTotales)
    );
  return l;
}

/**
 * Con cinco clases la llama ya va entera. No hay dato de ritmo reciente
 * todavía; cuando lo haya, es aquí donde se cambia.
 */
const llamaViva = (clases: number) => clases >= 5;

/** Una cifra que quepa en el círculo. */
const cifra = (n: number) => (n > 999 ? "999+" : String(n));

export default function ComoVas({
  estadisticas: e,
  variante,
  hrefPractica,
  lector = true,
}: {
  estadisticas: EstadisticasAlumno;
  /** `barra`: la barra lateral abierta, 236px. `movil`: el inicio y la hoja del perfil. */
  variante: "barra" | "movil";
  /** A dónde lleva el círculo de la práctica a cero. Sin él, no es enlace. */
  hrefPractica?: string;
  /** La barra lleva su propia lista para el lector, visible también plegada. */
  lector?: boolean;
}) {
  const { t } = usarIdioma();
  const te = t.estadisticas;
  const tt = te.tarjeta;
  const movil = variante === "movil";
  const lecturas = lecturasComoVas(e, te);
  if (lecturas.length === 0) return null;

  const { clases, nivel, profesor } = e;
  const medallas: { clave: string; contenido: ReactNode }[] = [];

  if (e.ejercicios !== null) {
    medallas.push({
      clave: "ejercicios",
      contenido: (
        <Medalla movil={movil} rotulo={tt.ejercicios(e.ejercicios)}>
          {e.ejercicios === 0 ? <IconoLista /> : cifra(e.ejercicios)}
        </Medalla>
      ),
    });
  }

  if (e.bloques !== null) {
    const invita = e.bloques === 0 && hrefPractica;
    medallas.push({
      clave: "practica",
      contenido: invita ? (
        <Link
          href={hrefPractica}
          aria-label={tt.empiezaPractica}
          className="group flex flex-col items-center rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Medalla movil={movil} rotulo={tt.empiezaAqui} enlace>
            <IconoLapiz />
          </Medalla>
        </Link>
      ) : (
        <Medalla movil={movil} rotulo={tt.practicas(e.bloques)}>
          {e.bloques === 0 ? <IconoLapiz /> : cifra(e.bloques)}
        </Medalla>
      ),
    });
  }

  if (e.tiempo) {
    const { semanasRestantes: n, semanasTotales: total } = e.tiempo;
    medallas.push({
      clave: "tiempo",
      // Cumplidas las 24 semanas, el anillo va cerrado y dice lo que
      // significa para el alumno —lo tiene todo abierto—, no que se acabó.
      contenido:
        n === 0 ? (
          <Medalla movil={movil} rotulo={tt.cursoAbierto} progreso={1}>
            <IconoAbierto />
          </Medalla>
        ) : (
          <Medalla movil={movil} rotulo={tt.semanas(n)} progreso={(total - n) / total}>
            {n}
          </Medalla>
        ),
    });
  }

  return (
    <section
      aria-label={te.titulo}
      className={`rounded-[16px] text-white ${FONDO} ${movil ? "px-4 pb-4 pt-3.5" : "w-[236px] px-3.5 pb-3.5 pt-3"}`}
    >
      {lector && (
        <ul className="sr-only">
          {lecturas.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}

      {clases !== null && (
        <div aria-hidden className="flex items-center gap-2.5">
          <span className={`grid shrink-0 place-items-end ${movil ? "w-9" : "w-[30px]"}`}>
            <Llama
              viva={llamaViva(clases)}
              className={
                llamaViva(clases)
                  ? movil ? "h-[46px] w-[34px]" : "h-[38px] w-7"
                  : movil ? "h-[35px] w-[26px]" : "h-[30px] w-[22px]"
              }
            />
          </span>
          {clases > 0 ? (
            <div className="min-w-0">
              <p className={`font-display font-bold leading-none tracking-[-0.01em] ${movil ? "text-[38px]" : "text-[30px]"}`}>
                {clases}
              </p>
              <p className={`mt-[3px] leading-tight ${SECUNDARIO} ${movil ? "text-[14px]" : "text-[12.5px]"}`}>
                {tt.clases(clases, profesor)}
              </p>
            </div>
          ) : (
            <p className={`font-medium leading-snug ${movil ? "text-[15px]" : "text-[13.5px]"}`}>{tt.clasesVacio(profesor?.nombre ?? null)}</p>
          )}
        </div>
      )}

      {nivel && <Escalera nivel={nivel} movil={movil} te={te} />}

      {medallas.length > 0 && (
        <div
          className={`grid gap-1 border-t border-white/15 ${movil ? "mt-4 pt-3.5" : "mt-3.5 pt-3"}`}
          style={{ gridTemplateColumns: `repeat(${medallas.length}, minmax(0, 1fr))` }}
        >
          {medallas.map((m) => (
            <div key={m.clave} className="flex min-w-0 justify-center">
              {m.contenido}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * La versión estrecha, para la barra plegada: 44px de ancho y la misma
 * altura que la tarjeta, que se abre justo encima. Así las secciones de
 * debajo no se mueven al pasar el ratón. Solo cifras: las palabras
 * llegan al abrirla.
 */
export function ComoVasPlegado({ estadisticas: e }: { estadisticas: EstadisticasAlumno }) {
  const { clases, nivel } = e;
  return (
    <div aria-hidden className={`flex h-full w-11 flex-col items-center gap-2 overflow-hidden rounded-[14px] px-1 py-2.5 text-white ${FONDO}`}>
      {clases !== null && (
        <>
          <Llama viva={llamaViva(clases)} className={llamaViva(clases) ? "h-[30px] w-[22px]" : "h-6 w-[18px]"} />
          {clases > 0 && <span className="font-display text-[17px] font-bold leading-none">{cifra(clases)}</span>}
        </>
      )}
      {nivel && (
        <span
          className={`rounded-full px-1.5 py-[3px] font-display text-[11.5px] font-bold leading-none ${
            nivel.origen === "profesor" ? "bg-white text-marca-verdeOsc" : "shadow-[inset_0_0_0_1px_rgba(255,255,255,.45)]"
          }`}
        >
          {nivel.valor}
        </span>
      )}
      {(e.ejercicios !== null || e.bloques !== null || e.tiempo) && <span className="h-px w-6 shrink-0 bg-white/15" />}
      {e.ejercicios !== null && (
        <Circulo tam={30}>{e.ejercicios === 0 ? <IconoLista pequeño /> : cifra(e.ejercicios)}</Circulo>
      )}
      {e.bloques !== null && <Circulo tam={30}>{e.bloques === 0 ? <IconoLapiz pequeño /> : cifra(e.bloques)}</Circulo>}
      {e.tiempo && (
        <Circulo tam={30} progreso={(e.tiempo.semanasTotales - e.tiempo.semanasRestantes) / e.tiempo.semanasTotales}>
          {e.tiempo.semanasRestantes === 0 ? <IconoAbierto pequeño /> : e.tiempo.semanasRestantes}
        </Circulo>
      )}
    </div>
  );
}

/**
 * La escalera A1–C2 con la marca del nivel (`nivelMostrado`):
 *
 *   profesor   peldaño lleno y «✓ Daniela»;
 *   prueba     peldaño lleno y «prueba de nivel», sin ✓: está medido,
 *              pero no lo ha confirmado nadie;
 *   alta       peldaño hueco y «estimado».
 */
function Escalera({
  nivel,
  movil,
  te,
}: {
  nivel: NonNullable<EstadisticasAlumno["nivel"]>;
  movil: boolean;
  te: TextosEstadisticas;
}) {
  const actual = ESCALERA_MCER.indexOf(nivel.valor as (typeof ESCALERA_MCER)[number]);
  const lleno = nivel.origen !== "alta";
  const marca = te.tarjeta.marcaNivel(nivel.origen, nivel.profesor);
  return (
    <div aria-hidden className={movil ? "mt-3.5" : "mt-3"}>
      <div className={`mb-1.5 flex items-center justify-between gap-2 ${SECUNDARIO} ${movil ? "text-[12.5px]" : "text-[11.5px]"}`}>
        <span>
          {te.nivel}
          <b className={`ml-[3px] font-display font-bold text-white ${movil ? "text-[15px]" : "text-[13px]"}`}>{nivel.valor}</b>
        </span>
        {nivel.origen === "profesor" ? (
          <span className="inline-flex min-w-0 items-center gap-[3px] font-semibold text-[#FFE27A]">
            <IconoCheck />
            <span className="truncate">{marca}</span>
          </span>
        ) : (
          <span>{marca}</span>
        )}
      </div>
      <div className="grid grid-cols-6 gap-[3px]">
        {ESCALERA_MCER.map((peldaño, i) => (
          <span
            key={peldaño}
            className={`h-1.5 rounded-full ${
              i < actual
                ? "bg-white/60"
                : i === actual
                  ? lleno
                    ? "bg-marca-amarillo"
                    : "shadow-[inset_0_0_0_1.5px_#FFC400]"
                  : "bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Medalla({
  children,
  rotulo,
  movil,
  progreso,
  enlace = false,
}: {
  children: ReactNode;
  rotulo: string;
  movil: boolean;
  progreso?: number;
  enlace?: boolean;
}) {
  return (
    <span aria-hidden={enlace ? undefined : true} className="flex flex-col items-center gap-[5px] text-center">
      <Circulo tam={movil ? 52 : 44} progreso={progreso} enlace={enlace}>
        {children}
      </Circulo>
      <span
        className={`leading-[1.2] ${movil ? "text-[12.5px]" : "text-[11.5px]"} ${
          enlace
            ? "font-medium text-white underline underline-offset-2 group-hover:text-[#FFE27A]"
            : SECUNDARIO
        }`}
      >
        {rotulo}
      </span>
    </span>
  );
}

/**
 * El círculo de cada dato. Los contadores no tienen total: van rellenos
 * de amarillo suave, que se lee como una cuenta y no como algo a medias.
 * Solo las semanas llevan anillo de progreso (`progreso`).
 */
function Circulo({
  children,
  tam,
  progreso,
  enlace = false,
}: {
  children: ReactNode;
  tam: number;
  progreso?: number;
  enlace?: boolean;
}) {
  const texto = tam >= 52 ? "text-[17px]" : tam >= 44 ? "text-[15px]" : "text-[11px]";

  if (progreso !== undefined) {
    const trazo = tam >= 44 ? 4 : 3;
    const c = tam / 2;
    const r = c - trazo / 2 - 1;
    const C = 2 * Math.PI * r;
    // Un avance real nunca es un punto invisible.
    const largo = progreso <= 0 ? 0 : Math.max(progreso, 0.04) * C;
    return (
      <span className="relative grid shrink-0 place-items-center" style={{ width: tam, height: tam }}>
        <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} className="absolute inset-0">
          <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth={trazo} />
          {largo > 0 && (
            <circle
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke="#FFC400"
              strokeWidth={trazo}
              strokeLinecap="round"
              strokeDasharray={`${largo.toFixed(2)} ${C.toFixed(2)}`}
              transform={`rotate(-90 ${c} ${c})`}
            />
          )}
        </svg>
        <span className={`relative font-display font-semibold leading-none text-white ${texto}`}>{children}</span>
      </span>
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-[rgba(255,196,0,.14)] font-display font-semibold leading-none text-white shadow-[inset_0_0_0_1.5px_rgba(255,196,0,.55)] transition-colors [&_svg]:text-marca-amarillo ${texto} ${
        enlace ? "group-hover:bg-[rgba(255,196,0,.26)]" : ""
      }`}
      style={{ width: tam, height: tam }}
    >
      {children}
    </span>
  );
}

/**
 * La llama. Dos trazos y un halo, en SVG. Se mece despacio y el núcleo
 * parpadea (`.llama` en `globals.css`); con movimiento reducido, quieta.
 */
export function Llama({ viva, className = "" }: { viva: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 64" className={`llama ${viva ? "" : "llama-calma"} ${className}`}>
      <ellipse cx="24" cy="47" rx="21" ry="15" fill="#FFC400" opacity="0.16" />
      <g className="llama-cuerpo">
        <path
          fill="#FFC400"
          d="M24 3C26 12 33 17 37 25C41 32 42 38 41 44C40 55 33 62 24 62C15 62 8 55 7 45C6 37 10 30 15 25C15 30 17 33 20 34C19 24 20 12 24 3Z"
        />
        <path
          className="llama-nucleo"
          fill="#FFF1BF"
          d="M24 30C26 36 31 40 32 47C33 54 29 59 24 59C19 59 15 55 16 49C16.5 44 19 41 21 38C21.5 41 22.5 43 24 44C23.5 39 23 34 24 30Z"
        />
      </g>
    </svg>
  );
}

/** El curso entero abierto: un candado abierto, no un reloj parado. */
function IconoAbierto({ pequeño = false }: { pequeño?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={pequeño ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} fill="none" stroke="#FFC400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="12" height="8" rx="1.6" />
      <path d="M7 9V6.5a3 3 0 0 1 5.8-1.1" />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function IconoLista({ pequeño = false }: { pequeño?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={pequeño ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5.5l1.8 1.8L8 4.2M3 12.5l1.8 1.8L8 11.2M11 6h6M11 13h6" />
    </svg>
  );
}

function IconoLapiz({ pequeño = false }: { pequeño?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={pequeño ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16l.9-3.6L13 4.3l2.7 2.7-8.1 8.1L4 16zM11.2 6.1l2.7 2.7" />
    </svg>
  );
}
