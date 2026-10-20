"use client";

// ---------------------------------------------------------------
// EL SELECTOR DE FECHAS DEL PANEL
//
// Un botón con el rango y, al abrirlo, atajos y un calendario propio:
// en español, de lunes a domingo, sin librería. El rango vive en la URL
// (`?desde=&hasta=`), así que aplicar es navegar: la página se vuelve a
// pintar en el servidor y un enlace copiado abre lo mismo.
//
// CÓMO SE ELIGE
//   · Dos clics: el primero marca el inicio y el segundo el final (si va
//     antes, se dan la vuelta). Entre uno y otro el tramo se ilumina
//     siguiendo al ratón o al foco.
//   · Un clic y «Aplicar»: un día suelto.
//   · Un atajo rellena la selección y lleva el calendario a su mes; se
//     aplica igual, con «Aplicar». Nada cambia hasta entonces.
//   · Los días futuros no se pueden elegir, y más de 12 meses tampoco:
//     «Aplicar» se apaga y dice por qué.
//
// TECLADO: el calendario es una sola parada de tabulador. Flechas, un día
// o una semana; Re Pág / Av Pág, un mes; Inicio / Fin, el lunes o el
// domingo de esa semana; Intro o espacio, elegir. Esc cierra sin aplicar
// y devuelve el foco al botón.
//
// A 375 PX el panel es una hoja a todo el ancho, pegada abajo, con el
// fondo oscurecido; en escritorio cuelga del botón.
// ---------------------------------------------------------------

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sumarDias } from "@/lib/fechas";
import { atajosDeFechas, diasDelRango, DIAS_MAXIMOS, lunesDe, type Rango } from "@/lib/panel-rango";
import { mesLargo, rangoLegible } from "@/lib/panel-formato";

type Borrador = { inicio: string | null; fin: string | null };

const NOMBRE_DIA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const INICIAL_DIA = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "narrow" });
const DIA_SEMANA = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long" });
const enFecha = (dia: string) => new Date(`${dia}T12:00:00Z`);

/** Las iniciales de lunes a domingo, a partir de un lunes cualquiera. */
const CABECERA = Array.from({ length: 7 }, (_, i) => {
  const dia = sumarDias("2026-10-12", i);
  return { inicial: INICIAL_DIA.format(enFecha(dia)).toUpperCase(), nombre: DIA_SEMANA.format(enFecha(dia)) };
});

const primeroDeMes = (dia: string) => `${dia.slice(0, 8)}01`;
function sumarMeses(primero: string, n: number): string {
  const anio = Number(primero.slice(0, 4));
  const mes = Number(primero.slice(5, 7)) - 1 + n;
  const fecha = new Date(Date.UTC(anio, mes, 1));
  return fecha.toISOString().slice(0, 10);
}
const ultimoDeMes = (primero: string) => sumarDias(sumarMeses(primero, 1), -1);

/** Las semanas del mes, de lunes a domingo; null en los huecos de fuera del mes. */
function semanasDelMes(primero: string): (string | null)[][] {
  const ultimo = ultimoDeMes(primero);
  const semanas: (string | null)[][] = [];
  for (let lunes = lunesDe(primero); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    semanas.push(
      Array.from({ length: 7 }, (_, i) => {
        const dia = sumarDias(lunes, i);
        return dia >= primero && dia <= ultimo ? dia : null;
      })
    );
  }
  return semanas;
}

/** La selección como rango ordenado, con el día suelto como rango de un día. */
function comoRango(b: Borrador): Rango | null {
  if (!b.inicio) return null;
  return { desde: b.inicio, hasta: b.fin ?? b.inicio };
}

export default function SelectorFechas({ rango, hoy }: { rango: Rango; hoy: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const [cargando, empezar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Borrador>({ inicio: rango.desde, fin: rango.hasta });
  const [mes, setMes] = useState(primeroDeMes(rango.hasta));
  const [foco, setFoco] = useState(rango.hasta);
  const [encima, setEncima] = useState<string | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const rejilla = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const atajos = atajosDeFechas(hoy);

  function abrir() {
    setBorrador({ inicio: rango.desde, fin: rango.hasta });
    setMes(primeroDeMes(rango.hasta));
    setFoco(rango.hasta);
    setEncima(null);
    setAbierto(true);
  }

  function cerrar(devolverFoco = true) {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }

  // Al abrir, el foco va al día que manda en el calendario.
  useEffect(() => {
    if (abierto) rejilla.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
    // Solo al abrir: después el foco lo mueve el teclado.
  }, [abierto]);

  // Un clic fuera es cancelar. En móvil el fondo oscuro ya lo recoge.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !boton.current?.contains(t)) cerrar(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  function elegir(dia: string) {
    if (dia > hoy) return;
    setFoco(dia);
    setBorrador((b) => {
      if (!b.inicio || b.fin) return { inicio: dia, fin: null };
      return dia < b.inicio ? { inicio: dia, fin: b.inicio } : { inicio: b.inicio, fin: dia };
    });
  }

  function moverFoco(dia: string) {
    const destino = dia > hoy ? hoy : dia;
    setFoco(destino);
    if (destino.slice(0, 7) !== mes.slice(0, 7)) setMes(primeroDeMes(destino));
    // El botón del día nuevo existe tras pintar.
    requestAnimationFrame(() => rejilla.current?.querySelector<HTMLButtonElement>(`[data-dia="${destino}"]`)?.focus());
  }

  function teclaEnRejilla(e: React.KeyboardEvent) {
    const desdeLunes = (enFecha(foco).getUTCDay() + 6) % 7;
    const destinos: Record<string, string> = {
      ArrowLeft: sumarDias(foco, -1),
      ArrowRight: sumarDias(foco, 1),
      ArrowUp: sumarDias(foco, -7),
      ArrowDown: sumarDias(foco, 7),
      Home: sumarDias(foco, -desdeLunes),
      End: sumarDias(foco, 6 - desdeLunes),
    };
    if (e.key === "PageUp" || e.key === "PageDown") {
      const otro = sumarMeses(primeroDeMes(foco), e.key === "PageUp" ? -1 : 1);
      const dia = Math.min(Number(foco.slice(8)), Number(ultimoDeMes(otro).slice(8)));
      destinos[e.key] = `${otro.slice(0, 8)}${String(dia).padStart(2, "0")}`;
    }
    const destino = destinos[e.key];
    if (!destino) return;
    e.preventDefault();
    moverFoco(destino);
    if (borrador.inicio && !borrador.fin) setEncima(destino > hoy ? hoy : destino);
  }

  const elegido = comoRango(borrador);
  const dias = elegido ? diasDelRango(elegido) : 0;
  const demasiado = dias > DIAS_MAXIMOS;

  // El tramo iluminado: lo elegido, o del inicio hasta donde está el ratón.
  const tramo: Rango | null =
    borrador.inicio && !borrador.fin && encima
      ? encima < borrador.inicio
        ? { desde: encima, hasta: borrador.inicio }
        : { desde: borrador.inicio, hasta: encima }
      : elegido;

  function aplicar() {
    if (!elegido || demasiado) return;
    cerrar();
    if (elegido.desde === rango.desde && elegido.hasta === rango.hasta) return;
    empezar(() => router.push(`${ruta}?desde=${elegido.desde}&hasta=${elegido.hasta}`, { scroll: false }));
  }

  const atajoPuesto = elegido ? atajos.find((a) => a.rango.desde === elegido.desde && a.rango.hasta === elegido.hasta)?.id : undefined;
  const hayMesSiguiente = sumarMeses(mes, 1) <= hoy;

  return (
    <div className="relative w-full sm:w-auto">
      <button
        ref={boton}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar() : abrir())}
        className="inline-flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded-full border border-marca-borde bg-white px-4 text-[14.5px] font-semibold text-marca-tinta transition-colors hover:border-marca-bordeSuave hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde sm:w-auto"
      >
        <span className="inline-flex items-center gap-2.5">
          <svg aria-hidden viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-marca-verdeOsc">
            <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
            <path d="M3 8.5h14M7 2.8v3.4M13 2.8v3.4" />
          </svg>
          <span className="tabular-nums">{rangoLegible(rango)}</span>
        </span>
        {cargando ? (
          <span className="text-[12.5px] font-medium text-marca-grisSuave">Cargando…</span>
        ) : (
          <svg aria-hidden viewBox="0 0 12 12" width="10" height="10" className="text-marca-grisSuave">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {abierto && (
        <>
          {/* El fondo de la hoja, solo en móvil. */}
          <div aria-hidden className="fixed inset-0 z-40 bg-marca-tinta/30 sm:hidden" />
          <div
            ref={panel}
            role="dialog"
            aria-modal="false"
            aria-labelledby={idTitulo}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                cerrar();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[18px] border border-marca-borde bg-white p-5 shadow-[0_-8px_32px_rgba(18,33,26,0.18)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[560px] sm:max-h-none sm:rounded-[14px] sm:p-4 sm:shadow-[0_12px_40px_rgba(18,33,26,0.16)]"
          >
            <h2 id={idTitulo} className="sr-only">
              Elegir fechas
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              {/* Atajos: en móvil, una fila que se parte; en escritorio, una columna. */}
              <ul className="flex flex-wrap gap-1.5 sm:w-[150px] sm:flex-none sm:flex-col sm:gap-0.5 sm:border-r sm:border-marca-nieblaOscura sm:pr-3">
                {atajos.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      aria-pressed={atajoPuesto === a.id}
                      onClick={() => {
                        setBorrador({ inicio: a.rango.desde, fin: a.rango.hasta });
                        setMes(primeroDeMes(a.rango.hasta));
                        setFoco(a.rango.hasta);
                        setEncima(null);
                      }}
                      className={`min-h-[36px] w-full whitespace-nowrap rounded-full border px-3 text-left text-[13.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde sm:rounded-[8px] sm:border-0 sm:px-2.5 ${
                        atajoPuesto === a.id
                          ? "border-marca-tinta bg-marca-tinta text-white"
                          : "border-marca-borde text-marca-tintaMedia hover:bg-marca-niebla hover:text-marca-tinta"
                      }`}
                    >
                      {a.nombre}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Mes anterior"
                    onClick={() => setMes(sumarMeses(mes, -1))}
                    className="grid h-9 w-9 place-items-center rounded-full text-marca-tintaMedia hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-verde"
                  >
                    <svg aria-hidden viewBox="0 0 12 12" width="12" height="12">
                      <path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <p className="font-display text-[15px] font-semibold text-marca-tinta" aria-live="polite">
                    {mesLargo(mes)}
                  </p>
                  <button
                    type="button"
                    aria-label="Mes siguiente"
                    disabled={!hayMesSiguiente}
                    onClick={() => setMes(sumarMeses(mes, 1))}
                    className="grid h-9 w-9 place-items-center rounded-full text-marca-tintaMedia hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-verde disabled:pointer-events-none disabled:opacity-30"
                  >
                    <svg aria-hidden viewBox="0 0 12 12" width="12" height="12">
                      <path d="M4.5 2.5 8 6 4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <div role="grid" aria-label={mesLargo(mes)} ref={rejilla} onKeyDown={teclaEnRejilla} onMouseLeave={() => setEncima(null)} className="mt-2">
                  <div role="row" className="grid grid-cols-7">
                    {CABECERA.map((c) => (
                      <span key={c.nombre} role="columnheader" aria-label={c.nombre} className="py-1 text-center text-[11.5px] font-semibold text-marca-grisSuave">
                        {c.inicial}
                      </span>
                    ))}
                  </div>
                  {semanasDelMes(mes).map((semana, i) => (
                    <div role="row" key={i} className="grid grid-cols-7">
                      {semana.map((dia, j) => {
                        if (!dia) return <span key={j} role="gridcell" />;
                        const futuro = dia > hoy;
                        const dentro = tramo !== null && dia >= tramo.desde && dia <= tramo.hasta;
                        const extremo = tramo !== null && (dia === tramo.desde || dia === tramo.hasta);
                        const esHoy = dia === hoy;
                        // El tramo se pinta como una banda continua: redondeada solo en sus extremos y en los bordes de la semana.
                        const bordeIzq = dentro && (dia === tramo!.desde || j === 0);
                        const bordeDer = dentro && (dia === tramo!.hasta || j === 6);
                        return (
                          <span
                            key={dia}
                            role="gridcell"
                            aria-selected={dentro}
                            className={`flex h-10 items-center justify-center ${dentro ? "bg-marca-verdeFondo" : ""} ${bordeIzq ? "rounded-l-full" : ""} ${bordeDer ? "rounded-r-full" : ""}`}
                          >
                            <button
                              type="button"
                              data-dia={dia}
                              tabIndex={dia === foco ? 0 : -1}
                              disabled={futuro}
                              aria-label={NOMBRE_DIA.format(enFecha(dia))}
                              aria-current={esHoy ? "date" : undefined}
                              onClick={() => elegir(dia)}
                              onMouseEnter={() => !futuro && setEncima(dia)}
                              onFocus={() => {
                                setFoco(dia);
                                if (borrador.inicio && !borrador.fin) setEncima(dia);
                              }}
                              className={`grid h-9 w-9 place-items-center rounded-full text-[13.5px] tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marca-verde disabled:cursor-not-allowed disabled:text-marca-puntoPendiente ${
                                extremo
                                  ? "bg-marca-verde font-semibold text-white"
                                  : dentro
                                    ? "text-marca-tinta hover:bg-white"
                                    : "text-marca-tinta hover:bg-marca-niebla"
                              } ${esHoy && !extremo ? "font-semibold underline decoration-marca-amarillo decoration-2 underline-offset-4" : ""}`}
                            >
                              {Number(dia.slice(8))}
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-marca-nieblaOscura pt-3.5">
              <p className="text-[13px] text-marca-tintaMedia" aria-live="polite">
                {!elegido ? (
                  "Elige el primer día"
                ) : demasiado ? (
                  <span className="font-semibold text-[#A5432F]">Como mucho 12 meses: {dias} días elegidos</span>
                ) : (
                  <>
                    <b className="font-semibold text-marca-tinta">{rangoLegible(elegido)}</b>
                    {` · ${dias === 1 ? "1 día" : `${dias} días`}`}
                    {borrador.inicio && !borrador.fin && <span className="text-marca-grisSuave"> · elige el último o aplica</span>}
                  </>
                )}
              </p>
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => cerrar()}
                  className="min-h-[40px] flex-1 rounded-full border border-marca-borde px-4 text-[14px] font-semibold text-marca-tintaMedia hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde sm:flex-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={aplicar}
                  disabled={!elegido || demasiado}
                  className="min-h-[40px] flex-1 rounded-full bg-marca-verde px-5 text-[14px] font-semibold text-white hover:bg-marca-verdeOsc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde disabled:cursor-not-allowed disabled:bg-marca-pista disabled:text-marca-grisInactivo sm:flex-none"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
