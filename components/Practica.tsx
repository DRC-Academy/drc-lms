"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Bloque, Ejercicio } from "@/lib/data";
import { guardarProgreso } from "@/lib/progreso";

const ETAPAS = {
  reconocer: { nombre: "Reconocer", desc: "Identifica la forma correcta." },
  transformar: { nombre: "Transformar", desc: "Ahora escríbelo tú." },
  producir: { nombre: "Producir", desc: "Tus propias palabras." },
} as const;

function normalizar(s: string) {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[.,;!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Practica({ bloque, alumnoId }: { bloque: Bloque; alumnoId: string }) {
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
    registrar(e.respuestas.some((r) => normalizar(r) === normalizar(texto)));
  }

  function siguiente() {
    const ultimo = i === ejercicios.length - 1;
    if (ultimo) {
      guardarProgreso(alumnoId, bloque.id, aciertos, ejercicios.length);
      setTerminado(true);
      return;
    }
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
    return (
      <div className="max-w-md mx-auto pt-16 px-6 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          <div className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-5 bg-marca-amarillo text-marca-tinta font-display text-xl font-bold">
            {pct}%
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">{bloque.titulo}</h2>
          <p className="text-slate-600 mb-8">
            {pct === 100
              ? "Bloque impecable. Esto ya lo tienes dominado."
              : pct >= 60
              ? "Buen avance. Lo que se resistió hoy vuelve la semana que viene."
              : "Bloque exigente. Repítelo en un par de días y verás el salto."}
          </p>
          <Link
            href={`/alumno/${alumnoId}`}
            className="block w-full rounded-2xl py-3.5 font-display font-semibold text-white bg-marca-verde hover:bg-marca-verdeOsc transition"
          >
            Volver a mis bloques
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/alumno/${alumnoId}`} className="text-sm text-slate-500 hover:text-marca-tinta">
          ← Salir
        </Link>
        <span className="text-xs text-slate-400">
          {i + 1} de {ejercicios.length}
        </span>
      </div>

      <div className="flex gap-1.5 mb-8">
        {ejercicios.map((_, k) => (
          <div
            key={k}
            className={`h-1.5 flex-1 rounded-full ${
              k < i ? "bg-marca-verde" : k === i ? "bg-marca-tinta" : "bg-marca-borde"
            }`}
          />
        ))}
      </div>

      {etapaCambia && (
        <div className="mb-6 rounded-2xl bg-marca-tinta px-5 py-4">
          <p className="font-display font-semibold text-white">
            Fase {ej.tipo === "reconocer" ? "1" : ej.tipo === "transformar" ? "2" : "3"} ·{" "}
            {ETAPAS[ej.tipo].nombre}
          </p>
          <p className="text-sm text-white/60 mt-0.5">{ETAPAS[ej.tipo].desc}</p>
        </div>
      )}

      {/* ---------------- RECONOCER ---------------- */}
      {ej.tipo === "reconocer" && (
        <>
          <h2 className="font-display text-xl sm:text-2xl font-semibold leading-snug mb-7">
            {ej.enunciado}
          </h2>
          <div className="space-y-2.5">
            {ej.opciones.map((op, k) => {
              const esCorrecta = k === ej.correcta;
              const esElegida = k === elegida;
              let cls = "bg-white border-transparent hover:border-slate-300";
              if (resuelto) {
                if (esCorrecta) cls = "bg-white border-marca-verde";
                else if (esElegida) cls = "bg-red-50 border-red-400";
                else cls = "bg-white/50 border-transparent opacity-50";
              }
              return (
                <button
                  key={k}
                  disabled={resuelto}
                  onClick={() => {
                    if (resuelto) return;
                    setElegida(k);
                    registrar(esCorrecta);
                  }}
                  className={`w-full text-left rounded-xl px-5 py-4 border-2 transition ${cls}`}
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
          <p className="text-sm text-slate-600 mb-3">{ej.instruccion}</p>
          <p className="font-display text-lg sm:text-xl font-semibold leading-snug mb-5 bg-white rounded-xl px-5 py-4">
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
            rows={2}
            placeholder="Escribe tu versión…"
            className="w-full rounded-xl border-2 border-marca-borde px-5 py-4 outline-none focus:border-marca-verde resize-none disabled:opacity-60"
          />
          {!resuelto && (
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={comprobarTexto}
                disabled={!texto.trim()}
                className="rounded-xl px-6 py-3 font-display font-semibold text-white bg-marca-verde hover:bg-marca-verdeOsc disabled:opacity-40 transition"
              >
                Comprobar
              </button>
              <details className="text-sm text-slate-500">
                <summary className="cursor-pointer hover:text-marca-tinta">Ver pista</summary>
                <p className="mt-2">{ej.pista}</p>
              </details>
            </div>
          )}
          {resuelto && !correcto && (
            <p className="mt-4 text-sm text-slate-700">
              Una versión correcta: <span className="font-medium">{ej.respuestas[0]}</span>
            </p>
          )}
        </>
      )}

      {/* ---------------- PRODUCIR ---------------- */}
      {ej.tipo === "producir" && (
        <>
          <h2 className="font-display text-xl sm:text-2xl font-semibold leading-snug mb-2">
            {ej.instruccion}
          </h2>
          <p className="text-slate-600 mb-5">{ej.contexto}</p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Escribe aquí…"
            className="w-full rounded-xl border-2 border-marca-borde px-5 py-4 outline-none focus:border-marca-verde resize-none"
          />

          {!verModelo ? (
            <button
              onClick={() => setVerModelo(true)}
              disabled={!texto.trim()}
              className="mt-4 rounded-xl px-6 py-3 font-display font-semibold text-white bg-marca-verde hover:bg-marca-verdeOsc disabled:opacity-40 transition"
            >
              Comparar con el modelo
            </button>
          ) : (
            <div className="mt-5 rounded-2xl bg-white p-5">
              <p className="font-display font-semibold mb-3">Revisa tu respuesta</p>
              <div className="space-y-2 mb-5">
                {ej.criterios.map((c, k) => {
                  const on = marcados.includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() =>
                        setMarcados((m) => (on ? m.filter((x) => x !== k) : [...m, k]))
                      }
                      className="flex items-start gap-3 text-left w-full"
                    >
                      <span
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 grid place-items-center text-xs text-white ${
                          on ? "bg-marca-verde border-marca-verde" : "border-marca-borde"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="text-sm text-slate-700">{c}</span>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl bg-marca-niebla p-4">
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Un ejemplo válido</p>
                <p className="text-sm text-slate-700 leading-relaxed">{ej.modelo}</p>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Tu profesor verá esta respuesta antes de la próxima clase.
              </p>
              <button
                onClick={() => {
                  registrar(marcados.length === ej.criterios.length);
                  setTimeout(siguiente, 0);
                }}
                className="mt-4 rounded-xl px-6 py-3 font-display font-semibold text-white bg-marca-verde hover:bg-marca-verdeOsc transition"
              >
                {i === ejercicios.length - 1 ? "Terminar bloque" : "Siguiente"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ---------------- FEEDBACK ---------------- */}
      {resuelto && ej.tipo !== "producir" && (
        <div className={`mt-6 rounded-2xl p-5 ${correcto ? "bg-[#EAF6EC]" : "bg-[#FFF8E1]"}`}>
          <p className="font-display font-semibold mb-1.5">
            {correcto ? "Exacto." : "Casi. Mira esto:"}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{ej.explicacion}</p>
          <button
            onClick={siguiente}
            className="mt-5 rounded-xl px-6 py-3 font-display font-semibold text-white bg-marca-verde hover:bg-marca-verdeOsc transition"
          >
            {i === ejercicios.length - 1 ? "Terminar bloque" : "Siguiente"}
          </button>
        </div>
      )}
    </div>
  );
}
