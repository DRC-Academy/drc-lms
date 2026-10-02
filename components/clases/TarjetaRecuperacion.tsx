"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { TARJETA } from "@/components/base/Seccion";
import { elegirRecuperacion, proponerRecuperacion, type RespuestaRecuperacion } from "@/app/acciones-recuperaciones";
import { HORAS_PROPUESTA, MAX_NOTA, MAX_PROPUESTAS } from "@/lib/recuperaciones-fechas";
import type { Hueco, Opcion, Recuperacion } from "@/lib/recuperaciones";
import type { TextosRecuperaciones } from "@/lib/textos/recuperaciones";

/**
 * UNA RECUPERACIÓN, SEGÚN SU ESTADO.
 *
 * Lo que se puede hacer lo dice Gestión, no esta tarjeta: los botones
 * salen o no según `puedeElegir` y `puedeDecirNinguna`, tal cual llegan.
 *
 * Elegir y proponer van por acciones de servidor (`app/acciones-
 * recuperaciones.ts`), que son las que hablan con Gestión. Después de
 * cada una —salga bien o mal— se pide un `router.refresh()`, así la
 * tarjeta vuelve a pintarse con lo que diga Gestión en ese momento. El
 * «¡Hecho!» se queda puesto por encima de lo que llegue: es la respuesta
 * a lo que acaba de pulsar, y que desaparezca al recargar lo haría dudar.
 */

type Modo = { tipo: "ver" } | { tipo: "confirmar"; opcion: Opcion } | { tipo: "formulario" };
type Hecho = { tipo: "elegida"; fecha: string; hora: string } | { tipo: "propuso" } | { tipo: "sin_acuerdo" };

/** Chapa de cabecera: estado o parte. */
function Chapa({ children, tono }: { children: ReactNode; tono: "aviso" | "verde" | "neutro" }) {
  const colores = {
    aviso: "bg-[#FFF6D6] text-marca-amarilloTexto",
    verde: "bg-marca-verdeFondo text-marca-verdeOsc",
    neutro: "bg-marca-nieblaOscura text-marca-gris",
  }[tono];
  return <span className={`rounded-full px-2.5 py-[5px] text-[13px] font-bold leading-none ${colores}`}>{children}</span>;
}

/** Un aviso dentro de la tarjeta: el error de Gestión, o el resultado. */
function Aviso({ children, tono, role }: { children: ReactNode; tono: "ok" | "error"; role?: "alert" | "status" }) {
  const colores = tono === "ok" ? "border-marca-verdePalido bg-marca-verdeFondo text-marca-tinta" : "border-marca-borde bg-marca-niebla text-marca-tinta";
  return (
    <div role={role} className={`aparece rounded-[12px] border px-4 py-3 text-[15px] leading-[1.45] ${colores}`}>
      {children}
    </div>
  );
}

export default function TarjetaRecuperacion({
  rec,
  dias,
  resaltada = false,
  soloLectura = false,
}: {
  rec: Recuperacion;
  /** Los días que se pueden proponer, calculados en el servidor en hora de España. */
  dias: string[];
  /** La del enlace del correo: borde verde. */
  resaltada?: boolean;
  /** El equipo mirando la ficha: todo a la vista, ningún botón. */
  soloLectura?: boolean;
}) {
  const t = usarIdioma().t.recuperaciones;
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "ver" });
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  /** Lo que se hace con la respuesta de Gestión, sea cual sea la acción. */
  function alResponder(r: RespuestaRecuperacion, siOk: (estado: string) => Hecho | null) {
    if (r.ok) {
      setError(null);
      setHecho(siOk(r.estado));
      setModo({ tipo: "ver" });
    } else {
      setError(r.mensaje);
      setModo({ tipo: "ver" });
    }
    router.refresh();
  }

  function confirmar(opcion: Opcion) {
    iniciar(async () => {
      let r: RespuestaRecuperacion;
      try {
        r = await elegirRecuperacion(rec.id, opcion.indice);
      } catch {
        r = { ok: false, mensaje: t.errorDe(""), problemas: [], invalido: false };
      }
      alResponder(r, () => ({
        tipo: "elegida",
        fecha: r.ok && r.fecha ? r.fecha.fecha : opcion.fecha,
        hora: r.ok && r.fecha ? r.fecha.hora : opcion.hora,
      }));
    });
  }

  const cabecera = (
    <div className="flex flex-wrap items-center gap-2">
      {rec.estado === "esperando_alumno" || rec.estado === "sin_acuerdo" ? (
        <Chapa tono="aviso">{t.claseCancelada}</Chapa>
      ) : rec.estado === "confirmada" ? (
        <Chapa tono="verde">{t.recuperacionConfirmada}</Chapa>
      ) : null}
      {rec.parte.de > 1 && <Chapa tono="neutro">{t.parte(rec.parte.numero, rec.parte.de)}</Chapa>}
    </div>
  );

  return (
    <article
      id={`recuperacion-${rec.id}`}
      className={`${TARJETA} scroll-mt-24 p-[18px] min-[900px]:rounded-[20px] min-[900px]:p-6 ${
        resaltada ? "ring-2 ring-marca-verde ring-offset-2 ring-offset-marca-niebla" : ""
      }`}
    >
      {cabecera}

      {error && (
        <div className="mt-3">
          <Aviso tono="error" role="alert">
            {error}
          </Aviso>
        </div>
      )}

      {hecho ? (
        <div className="mt-3">
          <Aviso tono="ok" role="status">
            <span className="font-semibold">
              {hecho.tipo === "elegida" ? t.hecho(hecho.fecha, hecho.hora) : hecho.tipo === "propuso" ? t.enviado(rec.profesor) : t.sinAcuerdo}
            </span>
          </Aviso>
        </div>
      ) : (
        <Cuerpo
          rec={rec}
          t={t}
          modo={modo}
          dias={dias}
          soloLectura={soloLectura}
          enviando={enviando}
          alElegir={(opcion) => {
            setError(null);
            setModo({ tipo: "confirmar", opcion });
          }}
          alConfirmar={confirmar}
          alCambiar={() => setModo({ tipo: "ver" })}
          alNinguna={() => {
            setError(null);
            setModo({ tipo: "formulario" });
          }}
          alProponer={(horarios, nota) =>
            new Promise<RespuestaRecuperacion>((resolver) => {
              iniciar(async () => {
                let r: RespuestaRecuperacion;
                try {
                  r = await proponerRecuperacion(rec.id, horarios, nota);
                } catch {
                  r = { ok: false, mensaje: t.errorDe(""), problemas: [], invalido: false };
                }
                // Un 422 se queda en el formulario, con la lista de
                // problemas debajo: el alumno puede corregirlo ahí mismo.
                if (!r.ok && r.invalido) {
                  resolver(r);
                  return;
                }
                alResponder(r, (estado) => (estado === "sin_acuerdo" ? { tipo: "sin_acuerdo" } : { tipo: "propuso" }));
                resolver(r);
              });
            })
          }
        />
      )}
    </article>
  );
}

function Cuerpo({
  rec,
  t,
  modo,
  dias,
  soloLectura,
  enviando,
  alElegir,
  alConfirmar,
  alCambiar,
  alNinguna,
  alProponer,
}: {
  rec: Recuperacion;
  t: TextosRecuperaciones;
  modo: Modo;
  dias: string[];
  soloLectura: boolean;
  enviando: boolean;
  alElegir: (opcion: Opcion) => void;
  alConfirmar: (opcion: Opcion) => void;
  alCambiar: () => void;
  alNinguna: () => void;
  alProponer: (horarios: Hueco[], nota: string) => Promise<RespuestaRecuperacion>;
}) {
  const { claseCancelada: cc } = rec;
  const deLaClase = <p className="mt-2 text-[14px] leading-snug text-marca-gris">{t.deLaClase(cc.fecha, cc.hora)}</p>;

  switch (rec.estado) {
    case "esperando_alumno": {
      if (modo.tipo === "formulario" && !soloLectura) {
        return <FormularioNinguna rec={rec} t={t} dias={dias} enviando={enviando} alProponer={alProponer} alVolver={alCambiar} />;
      }
      const puedeElegir = rec.puedeElegir && !soloLectura;
      return (
        <>
          {rec.ronda >= 2 && <p className="mt-3 text-[14px] font-bold text-marca-verdeOsc">{t.rondaDos}</p>}
          <p className="mt-3 text-pretty text-[16px] leading-[1.5] text-marca-tinta">
            {t.noPuede(rec.profesor, cc.fecha, cc.hora, rec.opciones.length)}
          </p>

          {modo.tipo === "confirmar" && puedeElegir ? (
            <div className="aparece mt-4 rounded-[14px] border border-marca-borde bg-marca-niebla p-4">
              <p className="text-[16px] font-semibold leading-snug text-marca-tinta">{t.confirmas(modo.opcion.fecha, modo.opcion.hora)}</p>
              <div className="mt-3 flex flex-col gap-2 min-[500px]:flex-row">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => alConfirmar(modo.opcion)}
                  className="btn-verde inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full px-6 text-[15.5px] font-bold disabled:opacity-60"
                >
                  {enviando ? t.confirmando : t.siConfirmar}
                </button>
                <button
                  type="button"
                  disabled={enviando}
                  onClick={alCambiar}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[15.5px] font-bold text-marca-verdeOsc hover:bg-marca-nieblaOscura disabled:opacity-60"
                >
                  {t.cambiar}
                </button>
              </div>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {rec.opciones.map((opcion) => (
                <li key={opcion.indice}>
                  {puedeElegir ? (
                    <button
                      type="button"
                      onClick={() => alElegir(opcion)}
                      className="btn-verde-linea flex min-h-[56px] w-full items-center justify-center rounded-[14px] px-4 text-center text-[16.5px] font-bold"
                    >
                      {t.opcion(opcion.fecha, opcion.hora)}
                    </button>
                  ) : (
                    <p className="flex min-h-[48px] items-center rounded-[14px] border border-marca-borde px-4 text-[16px] font-semibold text-marca-tintaMedia">
                      {t.opcion(opcion.fecha, opcion.hora)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {rec.puedeDecirNinguna && !soloLectura && modo.tipo !== "confirmar" && (
            <button
              type="button"
              onClick={alNinguna}
              className="mt-2 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-marca-verdeOsc underline underline-offset-4"
            >
              {t.ninguna}
            </button>
          )}
          {soloLectura && <p className="mt-3 text-[13.5px] italic text-marca-gris">{t.soloLectura}</p>}
        </>
      );
    }

    case "alumno_propuso":
      return (
        <>
          <h3 className="mt-1 font-display text-[19px] font-bold leading-tight text-marca-tinta">{t.esperando(rec.profesor)}</h3>
          {deLaClase}
          {rec.misPropuestas.length > 0 && (
            <div className="mt-3">
              <p className="text-[14px] font-semibold text-marca-gris">{t.tusPropuestas}</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {rec.misPropuestas.map((h) => (
                  <li key={`${h.fecha}-${h.hora}`} className="text-[15.5px] font-semibold text-marca-tinta">
                    {t.horario(h.fecha, h.hora)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rec.miNota && (
            <div className="mt-3">
              <p className="text-[14px] font-semibold text-marca-gris">{t.tuNota}</p>
              <p className="mt-1 whitespace-pre-line text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">{rec.miNota}</p>
            </div>
          )}
        </>
      );

    case "confirmada":
      return (
        <>
          {rec.fechaConfirmada && (
            <p className="mt-3 font-display text-[19px] font-bold leading-tight text-marca-tinta">
              {t.confirmadaCon(rec.fechaConfirmada.fecha, rec.fechaConfirmada.hora, rec.profesor)}
            </p>
          )}
          {deLaClase}
        </>
      );

    case "sin_acuerdo":
      return (
        <>
          <p className="mt-3 text-pretty text-[16px] leading-[1.5] text-marca-tinta">{t.sinAcuerdo}</p>
          {deLaClase}
        </>
      );

    default:
      // Las recuperadas y anuladas van al historial, no aquí.
      return null;
  }
}

// ---------------------------------------------------------------
// «NINGUNA ME VIENE BIEN»
//
// De 1 a 3 horarios: un día de los próximos 7 (de lunes a sábado), una
// hora en punto de 09:00 a 21:00 y «Añadir». La nota es opcional. Lo
// que se comprueba aquí es lo que se ve sin preguntar —no repetir, no
// pasar de tres—; lo demás lo decide Gestión, y si dice que no, sus
// problemas salen debajo del formulario.
// ---------------------------------------------------------------

function FormularioNinguna({
  rec,
  t,
  dias,
  enviando,
  alProponer,
  alVolver,
}: {
  rec: Recuperacion;
  t: TextosRecuperaciones;
  dias: string[];
  enviando: boolean;
  alProponer: (horarios: Hueco[], nota: string) => Promise<RespuestaRecuperacion>;
  alVolver: () => void;
}) {
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState<string>("");
  const [horarios, setHorarios] = useState<Hueco[]>([]);
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);

  const lleno = horarios.length >= MAX_PROPUESTAS;

  function anadir() {
    if (lleno) return setAviso(t.yaTienesMax(MAX_PROPUESTAS));
    if (!dia) return setAviso(t.eligeDia);
    if (!hora) return setAviso(t.eligeHora);
    if (horarios.some((h) => h.fecha === dia && h.hora === hora)) return setAviso(t.yaEsta);
    setHorarios((hs) => [...hs, { fecha: dia, hora }].sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)));
    setAviso(null);
    setHora("");
  }

  async function enviar() {
    if (horarios.length === 0) return setAviso(t.faltaHorario);
    setAviso(null);
    setProblemas([]);
    const r = await alProponer(horarios, nota);
    if (!r.ok && r.invalido) {
      setAviso(r.mensaje);
      setProblemas(r.problemas);
    }
  }

  return (
    <div className="aparece mt-3">
      <h3 className="font-display text-[19px] font-bold leading-tight text-marca-tinta">{t.tituloFormulario}</h3>
      <p className="mt-1.5 text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">{t.explicacionFormulario(rec.profesor)}</p>

      <fieldset className="mt-4">
        <legend className="text-[14px] font-semibold text-marca-gris">{t.dia}</legend>
        <div className="mt-2 grid grid-cols-3 gap-2 min-[500px]:grid-cols-6">
          {dias.map((d) => {
            const { semana, fecha } = t.diaCorto(d);
            const activo = dia === d;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={activo}
                onClick={() => setDia(d)}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-[12px] border px-1 leading-tight transition-colors ${
                  activo ? "border-marca-verde bg-marca-verde text-white" : "border-marca-borde bg-white text-marca-tinta hover:border-marca-verde"
                }`}
              >
                <span className="text-[14px] font-bold">{semana}</span>
                <span className={`text-[13px] ${activo ? "text-white" : "text-marca-gris"}`}>{fecha}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-col gap-2 min-[500px]:flex-row min-[500px]:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[14px] font-semibold text-marca-gris">{t.hora}</span>
          {/* 16px: iOS hace zoom al enfocar un campo más pequeño. */}
          <select
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="min-h-[48px] w-full rounded-[12px] border border-marca-borde bg-white px-3 text-[16px] text-marca-tinta outline-none focus:border-marca-verde"
          >
            <option value="">—</option>
            {HORAS_PROPUESTA.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={anadir}
          disabled={lleno}
          className="btn-verde-linea inline-flex min-h-[48px] items-center justify-center rounded-full px-5 text-[15px] font-bold disabled:opacity-50"
        >
          {t.anadir}
        </button>
      </div>

      {horarios.length > 0 && (
        <div className="mt-4">
          <p className="text-[14px] font-semibold text-marca-gris">{t.tusHorarios(horarios.length, MAX_PROPUESTAS)}</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {horarios.map((h) => (
              <li
                key={`${h.fecha}-${h.hora}`}
                className="flex min-h-[48px] items-center justify-between gap-3 rounded-[12px] bg-marca-verdeFondo pl-4 pr-1"
              >
                <span className="text-[15.5px] font-semibold text-marca-tinta">{t.horario(h.fecha, h.hora)}</span>
                <button
                  type="button"
                  onClick={() => setHorarios((hs) => hs.filter((x) => x !== h))}
                  className="inline-flex min-h-[44px] items-center rounded-full px-3 text-[14px] font-semibold text-marca-verdeOsc hover:bg-white"
                >
                  {t.quitar}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[14px] font-semibold text-marca-gris">{t.nota}</span>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, MAX_NOTA))}
          maxLength={MAX_NOTA}
          rows={3}
          placeholder={t.marcadorNota}
          className="w-full resize-y rounded-[12px] border border-marca-borde bg-white px-3 py-2.5 text-[16px] leading-[1.45] text-marca-tinta outline-none placeholder:text-marca-grisTenue focus:border-marca-verde"
        />
        <span className="self-end text-[12.5px] tabular-nums text-marca-grisTenue">
          {nota.length}/{MAX_NOTA}
        </span>
      </label>

      {(aviso || problemas.length > 0) && (
        <div role="alert" className="mt-2 rounded-[12px] border border-marca-borde bg-marca-niebla px-4 py-3 text-[15px] leading-[1.45] text-marca-tinta">
          {aviso && <p>{aviso}</p>}
          {problemas.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="btn-verde inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[15.5px] font-bold disabled:opacity-60"
        >
          {enviando ? t.enviando : t.enviarA(rec.profesor)}
        </button>
        <button
          type="button"
          onClick={alVolver}
          disabled={enviando}
          className="inline-flex min-h-[44px] items-center justify-center text-[15px] font-semibold text-marca-verdeOsc underline-offset-4 hover:underline"
        >
          {t.volverAOpciones}
        </button>
      </div>
    </div>
  );
}
