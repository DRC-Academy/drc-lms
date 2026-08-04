"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Bloque, Ejercicio } from "@/lib/data";
import { borrarAvance, guardarAvance, guardarProgreso, UMBRAL_DOMINADO } from "@/lib/progreso";
import { normalizarRespuesta } from "@/lib/validarBloque";
import { TarjetaFases, nombreFase, numeroFase } from "@/components/TarjetaFases";

// El banner de fase es exclusivo del móvil: en escritorio la tarjeta
// de fases ya cuenta lo mismo y con más detalle.
const ETAPAS = {
  reconocer: { nombre: "Reconocer", desc: "Identifica la forma correcta." },
  transformar: { nombre: "Transformar", desc: "Ahora escríbelo tú." },
  producir: { nombre: "Producir", desc: "Tus propias palabras." },
} as const;

export default function Practica({
  bloque,
  alumnoId,
  profesor,
}: {
  bloque: Bloque;
  alumnoId: string;
  profesor?: string;
}) {
  const ejercicios = bloque.ejercicios;
  const [i, setI] = useState(0);
  const [resuelto, setResuelto] = useState(false);
  const [correcto, setCorrecto] = useState(false);
  const [elegida, setElegida] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [verModelo, setVerModelo] = useState(false);
  const [marcados, setMarcados] = useState<number[]>([]);
  const [aciertos, setAciertos] = useState(0);
  const [terminado, setTerminado] = useState(false);

  const ej = ejercicios[i];
  const etapaCambia = useMemo(
    () => i === 0 || ejercicios[i - 1].tipo !== ej.tipo,
    [i, ej, ejercicios]
  );

  function registrar(ok: boolean) {
    setResuelto(true);
    setCorrecto(ok);
    if (ok) setAciertos((n) => n + 1);
  }

  function comprobarTexto() {
    if (resuelto || !texto.trim()) return;
    const e = ej as Extract<Ejercicio, { tipo: "transformar" }>;
    registrar(e.respuestas.some((r) => normalizarRespuesta(r) === normalizarRespuesta(texto)));
  }

  function siguiente() {
    const ultimo = i === ejercicios.length - 1;
    if (ultimo) {
      guardarProgreso(alumnoId, bloque.id, aciertos, ejercicios.length);
      borrarAvance(alumnoId, bloque.id);
      setTerminado(true);
      return;
    }
    // Deja constancia de por dónde iba: el bloque queda "en progreso".
    guardarAvance(alumnoId, bloque.id, i + 1, ejercicios.length);
    setI(i + 1);
    setResuelto(false);
    setCorrecto(false);
    setElegida(null);
    setTexto("");
    setVerModelo(false);
    setMarcados([]);
  }

  if (terminado) {
    const pct = Math.round((aciertos / ejercicios.length) * 100);
    const dominado = pct >= UMBRAL_DOMINADO;
    return (
      <div className="mx-auto max-w-md px-6 pt-14 text-center">
        <div className="tarjeta px-7 py-9">
          <div
            className={`celebra mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full font-display text-[20px] font-bold tabular-nums ${
              dominado ? "bg-drc-amarillo text-drc-titular" : "bg-drc-chip-verde text-drc-verde-texto"
            }`}
          >
            {pct}%
          </div>
          <h2 className="font-display text-[26px] font-semibold leading-tight text-drc-titular">
            {bloque.titulo}
          </h2>
          <p className="mt-3 text-[15px] leading-[1.55] text-drc-cuerpo">
            {pct === 100
              ? "Bloque impecable. Esto ya lo tienes dominado."
              : dominado
              ? "Muy bien. Lo tienes cogido; un repaso en unos días y queda fijado."
              : pct >= 60
              ? "Buen avance. Lo que se resistió hoy vuelve la semana que viene."
              : "Bloque exigente. Repítelo en un par de días y verás el salto."}
          </p>
          <Link
            href={`/alumno/${alumnoId}`}
            className="btn btn-primario mt-8 min-h-[50px] w-full text-[15px]"
          >
            Volver a mis bloques
          </Link>
        </div>
      </div>
    );
  }

  const ultimo = i === ejercicios.length - 1;

  return (
    // Móvil: la columna centrada de siempre. A partir de `lg` el
    // contenedor se ensancha y el interior pasa a dos tarjetas.
    <div className="mx-auto max-w-2xl px-6 py-7 sm:py-10 lg:max-w-6xl lg:px-8 lg:py-9">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/alumno/${alumnoId}`}
          className="text-[14px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
        >
          ← Salir
        </Link>
        <span className="text-[13px] tabular-nums text-drc-cuerpo">
          {i + 1} de {ejercicios.length}
          <span className="hidden lg:inline"> · {bloque.minutos} min</span>
        </span>
      </div>

      {/* items-start: sin esto las dos tarjetas se estirarían a la misma altura. */}
      <div className="lg:flex lg:items-start lg:gap-7">
        <TarjetaFases
          titulo={bloque.titulo}
          indice={i}
          ejercicios={ejercicios}
          profesor={profesor}
        />

        <div className="min-w-0 lg:flex-1 lg:rounded-2xl lg:border lg:border-marca-borde lg:bg-white lg:p-7">
          <div className="mb-8 flex gap-1.5 lg:mb-5">
            {ejercicios.map((_, k) => (
              <div
                key={k}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 lg:h-1 ${
                  k < i ? "bg-drc-verde" : k === i ? "bg-drc-verde-solido" : "bg-drc-discontinuo"
                }`}
              />
            ))}
          </div>

          {/* Banner de fase: solo móvil. */}
          {etapaCambia && (
            <div key={ej.tipo} className="aparece mb-6 rounded-[18px] bg-drc-banner px-5 py-4 lg:hidden">
              <p className="font-display font-semibold text-white">
                Fase {numeroFase(ej.tipo)} · {ETAPAS[ej.tipo].nombre}
              </p>
              <p className="mt-0.5 text-[14px] text-white/60">{ETAPAS[ej.tipo].desc}</p>
            </div>
          )}

          {/* Línea de fase: solo escritorio. */}
          <p className="hidden text-[11px] font-semibold uppercase leading-none tracking-widest text-marca-verde lg:mb-4 lg:block">
            Fase {numeroFase(ej.tipo)} · {nombreFase(ej.tipo)}
          </p>

          {/* ---------------- RECONOCER ---------------- */}
          {ej.tipo === "reconocer" && (
            <>
              <h2 className="mb-7 font-display text-[21px] font-semibold leading-snug text-drc-titular sm:text-[24px] lg:mb-5 lg:text-[20px]">
                {ej.enunciado}
              </h2>
              {/* Apiladas en móvil, dos columnas a partir de `lg`. */}
              <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-2">
                {ej.opciones.map((op, k) => {
                  const esCorrecta = k === ej.correcta;
                  const esElegida = k === elegida;
                  let cls =
                    "bg-drc-superficie border-drc-borde hover:border-drc-hairline lg:bg-marca-niebla lg:border-marca-borde lg:hover:border-marca-verde";
                  if (resuelto) {
                    if (esCorrecta) cls = "bg-drc-chip-verde border-drc-verde lg:border-marca-verde";
                    else if (esElegida) cls = "bg-[#FDECEC] border-[#D98282]";
                    // En escritorio conservan el fondo niebla: sobre la tarjeta
                    // blanca, un fondo transparente las dejaría como texto suelto.
                    else cls = "bg-drc-superficie/60 border-transparent opacity-50 lg:bg-marca-niebla";
                  }
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={resuelto}
                      onClick={() => {
                        if (resuelto) return;
                        setElegida(k);
                        registrar(esCorrecta);
                      }}
                      className={`w-full rounded-xl border-2 px-5 py-4 text-left text-[16px] leading-snug text-drc-texto transition-all duration-150 lg:rounded-lg lg:px-4 lg:py-2.5 lg:text-[15px] ${cls}`}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ---------------- TRANSFORMAR ---------------- */}
          {ej.tipo === "transformar" && (
            <>
              <p className="mb-3 text-[15px] leading-[1.5] text-drc-cuerpo">{ej.instruccion}</p>
              <p className="mb-5 rounded-xl bg-drc-superficie px-5 py-4 font-display text-[18px] font-semibold leading-snug text-drc-titular sm:text-[20px] lg:bg-marca-niebla">
                {ej.frase}
              </p>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    comprobarTexto();
                  }
                }}
                disabled={resuelto}
                rows={3}
                placeholder="Escribe tu versión…"
                className="w-full resize-none rounded-xl border-2 border-drc-borde bg-drc-superficie px-5 py-4 text-[16px] leading-[1.5] text-drc-texto outline-none transition-colors focus:border-drc-verde-solido disabled:opacity-60 lg:border-marca-borde lg:bg-marca-niebla lg:focus:border-marca-verde"
              />
              {!resuelto && (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <button
                    type="button"
                    onClick={comprobarTexto}
                    disabled={!texto.trim()}
                    className="btn btn-primario min-h-[48px] w-full sm:w-auto"
                  >
                    Comprobar
                  </button>
                  <details className="text-[14px] text-drc-cuerpo">
                    <summary className="cursor-pointer py-1 transition-colors hover:text-drc-verde-texto">
                      Ver pista
                    </summary>
                    <p className="aparece mt-2 leading-[1.5]">{ej.pista}</p>
                  </details>
                </div>
              )}
              {resuelto && !correcto && (
                <p className="aparece mt-4 text-[14px] leading-[1.5] text-drc-cuerpo">
                  Una versión correcta:{" "}
                  <span className="font-medium text-drc-titular">{ej.respuestas[0]}</span>
                </p>
              )}
            </>
          )}

          {/* ---------------- PRODUCIR ---------------- */}
          {ej.tipo === "producir" && (
            <>
              <h2 className="mb-2 font-display text-[21px] font-semibold leading-snug text-drc-titular sm:text-[24px] lg:text-[20px]">
                {ej.instruccion}
              </h2>
              <p className="mb-5 text-[15px] leading-[1.55] text-drc-cuerpo">{ej.contexto}</p>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={6}
                placeholder="Escribe aquí…"
                className="w-full resize-none rounded-xl border-2 border-drc-borde bg-drc-superficie px-5 py-4 text-[16px] leading-[1.55] text-drc-texto outline-none transition-colors focus:border-drc-verde-solido lg:border-marca-borde lg:bg-marca-niebla lg:focus:border-marca-verde"
              />

              {!verModelo ? (
                <button
                  type="button"
                  onClick={() => setVerModelo(true)}
                  disabled={!texto.trim()}
                  className="btn btn-primario mt-4 min-h-[48px] w-full sm:w-auto"
                >
                  Comparar con el modelo
                </button>
              ) : (
                <div className="aparece tarjeta mt-5 lg:border-marca-borde lg:bg-marca-niebla">
                  <p className="font-display text-[17px] font-semibold text-drc-titular">
                    Revisa tu respuesta
                  </p>
                  <div className="mb-5 mt-4 flex flex-col gap-1">
                    {ej.criterios.map((c, k) => {
                      const on = marcados.includes(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() =>
                            setMarcados((m) => (on ? m.filter((x) => x !== k) : [...m, k]))
                          }
                          className="flex w-full items-start gap-3 rounded-lg py-2 text-left transition-colors hover:bg-drc-fantasma-hover"
                        >
                          <span
                            className={`mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] text-white transition-colors ${
                              on
                                ? "border-drc-verde-solido bg-drc-verde-solido"
                                : "border-drc-hairline"
                            }`}
                          >
                            {on ? "✓" : ""}
                          </span>
                          <span className="text-[14px] leading-[1.5] text-drc-texto">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="rounded-xl bg-drc-suave p-4 lg:bg-white">
                    <p className="eyebrow mb-2 text-drc-cuerpo">Un ejemplo válido</p>
                    <p className="text-[14px] leading-relaxed text-drc-texto">{ej.modelo}</p>
                  </div>
                  <p className="mt-4 text-[13px] text-drc-cuerpo">
                    Tu profesor verá esta respuesta antes de la próxima clase.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      registrar(marcados.length === ej.criterios.length);
                      setTimeout(siguiente, 0);
                    }}
                    className="btn btn-primario mt-4 min-h-[48px] w-full sm:w-auto"
                  >
                    {ultimo ? "Terminar bloque" : "Siguiente"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Ancla el ejercicio a la clase de la que salió. Dato secundario:
              línea de texto simple, sin adornos. Solo escritorio. */}
          {bloque.claseOrigen && ej.tipo !== "producir" && (
            <p className="mt-4 hidden text-[12px] leading-[1.5] text-drc-cuerpo lg:block">
              Lo viste con {bloque.claseOrigen.profesor} el {bloque.claseOrigen.fecha}.
            </p>
          )}

          {/* ---------------- FEEDBACK ---------------- */}
          {resuelto && ej.tipo !== "producir" && (
            <div
              className={`aparece mt-6 rounded-[18px] p-5 ${
                correcto ? "bg-drc-chip-verde" : "bg-[#FFF7E0]"
              }`}
            >
              <p className="font-display text-[16px] font-semibold text-drc-titular">
                {correcto ? "Exacto." : "Casi. Mira esto:"}
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-drc-texto">{ej.explicacion}</p>
              <button
                type="button"
                onClick={siguiente}
                className="btn btn-primario mt-5 min-h-[48px] w-full sm:w-auto"
              >
                {ultimo ? "Terminar bloque" : "Siguiente"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
