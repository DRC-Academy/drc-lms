"use client";

import { useState } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";
import type { DiaSemana } from "@/lib/clases";
import { DIAS_LABORABLES, FRANJAS, filtrarHuecos, horaFin, type Franja } from "@/lib/autoservicio/franjas";
import type { EstadoAutoservicio, HuecoConProfesor, Sesion } from "@/lib/autoservicio/tipos";
import { Aviso, BotonWhatsApp, ListaDeHuecos, Opcion, TituloPaso, Volver } from "@/components/clases/autoservicio/Piezas";

/**
 * «CAMBIAR DE PROFESOR»: EL ESQUELETO (FASE 2).
 *
 * Sin endpoint todavía. Los huecos de otros profesores son los de la
 * simulación (`huecosDeOtrosProfesores`), y la página solo pinta el botón
 * con AUTOSERVICIO_SIMULADO: con Gestión de verdad no hay nada que
 * enseñar. Confirmar no guarda nada y lo dice.
 *
 *   1. sesion     solo si tiene más de una clase a la semana
 *   2. buscar     día y franja, y la lista con el nombre de cada profesor
 *   3. confirmar  antes y después
 *   4. hecho
 *
 * Cuando exista el endpoint: la lista sale de una acción de servidor como
 * la de los huecos, y confirmar llama a la suya con su clave de intento,
 * igual que en `CambiarHorario`.
 */

type Paso = "sesion" | "buscar" | "confirmar" | "hecho";

function Chip({ activo, alPulsar, children }: { activo: boolean; alPulsar: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={alPulsar}
      className={`min-h-[44px] rounded-full border px-3.5 text-[14.5px] font-semibold transition-colors ${
        activo ? "border-marca-verde bg-marca-verde text-white" : "border-marca-borde bg-white text-marca-tinta hover:border-marca-verde"
      }`}
    >
      {children}
    </button>
  );
}

export default function CambiarProfesor({
  estado,
  otros,
  whatsapp,
  alCerrar,
}: {
  estado: EstadoAutoservicio;
  /** Los huecos de otros profesores, por sesión. */
  otros: Record<string, HuecoConProfesor[]>;
  whatsapp: string;
  alCerrar: () => void;
}) {
  const { t: todos } = usarIdioma();
  const t = todos.autoservicio;
  const variasSesiones = estado.sesiones.length > 1;

  const [paso, setPaso] = useState<Paso>(variasSesiones ? "sesion" : "buscar");
  const [sesion, setSesion] = useState<Sesion | null>(variasSesiones ? null : estado.sesiones[0] ?? null);
  const [dia, setDia] = useState<DiaSemana | null>(null);
  const [franja, setFranja] = useState<Franja | null>(null);
  const [destino, setDestino] = useState<HuecoConProfesor | null>(null);

  const tramo = (h: { hora: string; duracion: number }) => [h.hora, horaFin(h.hora, h.duracion)] as const;
  const resultados = sesion ? filtrarHuecos(otros[sesion.id] ?? [], dia, franja) : [];

  return (
    <div>
      <p className="mb-3 rounded-[10px] bg-marca-niebla px-3 py-2 text-[13px] font-semibold text-marca-gris">{t.simulacion}</p>

      {paso === "sesion" && (
        <>
          <TituloPaso>{t.queClase}</TituloPaso>
          <div className="mt-4 flex flex-col gap-2.5">
            {estado.sesiones.map((s) => (
              <Opcion
                key={s.id}
                titulo={t.sesion(s.dia, ...tramo(s))}
                alPulsar={() => {
                  setSesion(s);
                  setPaso("buscar");
                }}
              />
            ))}
          </div>
        </>
      )}

      {paso === "buscar" && sesion && (
        <>
          {variasSesiones && <Volver texto={t.volver} alPulsar={() => setPaso("sesion")} />}
          <TituloPaso>{t.buscaTitulo}</TituloPaso>
          <p className="mt-1 text-[15px] text-marca-gris">{t.buscaDetalle}</p>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t.cualquierDia}>
            <Chip activo={dia === null} alPulsar={() => setDia(null)}>
              {t.cualquierDia}
            </Chip>
            {DIAS_LABORABLES.map((d) => (
              <Chip key={d} activo={dia === d} alPulsar={() => setDia(d)}>
                {t.diaSemanal(d)}
              </Chip>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label={t.cualquierHora}>
            <Chip activo={franja === null} alPulsar={() => setFranja(null)}>
              {t.cualquierHora}
            </Chip>
            {FRANJAS.map((f) => (
              <Chip key={f} activo={franja === f} alPulsar={() => setFranja(f)}>
                {t.franja[f]}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-[14px] text-marca-gris">{t.horaPeninsular}</p>
          <div className="mt-3">
            {resultados.length === 0 ? (
              <Aviso>{t.sinResultados}</Aviso>
            ) : (
              <ListaDeHuecos
                huecos={resultados}
                t={t}
                extra={(h) => h.profesor}
                alElegir={(h) => {
                  setDestino(h);
                  setPaso("confirmar");
                }}
              />
            )}
          </div>

          <div className="mt-6 border-t border-marca-borde pt-4">
            <p className="mb-2 text-[15px] font-semibold text-marca-tinta">{t.noEncuentras}</p>
            <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
          </div>
        </>
      )}

      {paso === "confirmar" && sesion && destino && (
        <>
          <Volver texto={t.volver} alPulsar={() => setPaso("buscar")} />
          <TituloPaso>{t.confirmaTitulo}</TituloPaso>
          <dl className="mt-4 overflow-hidden rounded-[14px] border border-marca-borde">
            <div className="bg-marca-niebla px-4 py-3">
              <dt className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-gris">{t.antes}</dt>
              <dd className="mt-0.5 text-[16px] text-marca-tintaMedia line-through decoration-marca-grisSuave">{t.sesion(sesion.dia, ...tramo(sesion))}</dd>
              {estado.profesor && <dd className="text-[14px] text-marca-gris">{t.conProfesor(estado.profesor)}</dd>}
            </div>
            <div className="border-t border-marca-borde bg-white px-4 py-3">
              <dt className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-verdeOsc">{t.despues}</dt>
              <dd className="mt-0.5 text-[17px] font-bold text-marca-tinta">{t.sesion(destino.dia, ...tramo(destino))}</dd>
              <dd className="text-[14px] text-marca-gris">
                {t.desdeAhora} · {t.conProfesor(destino.profesor)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setPaso("hecho")}
            className="btn-verde mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[16px] font-bold"
          >
            {t.confirmar}
          </button>
        </>
      )}

      {paso === "hecho" && destino && (
        <>
          <TituloPaso>{t.hechoTitulo}</TituloPaso>
          <div className="mt-3">
            <Aviso tono="ok" role="status">
              <p className="font-semibold">{t.hechoFijo(t.sesion(destino.dia, ...tramo(destino)))}</p>
              <p className="mt-1">{t.conProfesor(destino.profesor)}</p>
            </Aviso>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="btn-verde mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[16px] font-bold"
          >
            {t.cerrar}
          </button>
        </>
      )}
    </div>
  );
}
