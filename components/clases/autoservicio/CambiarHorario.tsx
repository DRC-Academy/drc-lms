"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { cambiarHorarioAutoservicio, huecosAutoservicio } from "@/app/acciones-autoservicio";
import type { DiaSemana } from "@/lib/clases";
import { filtrarHuecos, horaFin, type Franja } from "@/lib/autoservicio/franjas";
import type {
  CodigoAutoservicio,
  EstadoAutoservicio,
  HuecoLibre,
  LecturaAutoservicio,
  ModoCambio,
  PeticionCambio,
  ResultadoCambio,
} from "@/lib/autoservicio/tipos";
import MarcoFlujo from "@/components/clases/autoservicio/MarcoFlujo";
import { pasoPosible, usarPasoDeLaUrl } from "@/components/clases/autoservicio/pasos";
import {
  AntesDespues,
  Aviso,
  BOTON_APAGADO,
  BOTON_VERDE,
  BotonWhatsApp,
  Esqueleto,
  Filtros,
  Hecho,
  NotaHora,
  Opcion,
  PanelAMedias,
  PanelNoSePudo,
  PieWhatsApp,
  RejillaHuecos,
  Rotulo,
  TituloPaso,
  nuevaClave,
  sePuedeReintentar,
} from "@/components/clases/autoservicio/Piezas";

/**
 * «CAMBIAR DE HORARIO», EN SU PÁGINA (/clases/cambiar-horario).
 *
 * Con su mismo profesor. Los pasos, cada uno en `?paso=`:
 *
 *   1. clase      solo si tiene más de una clase a la semana
 *   2. cambio     «solo una clase» (y cuál de las próximas) o «desde
 *                 ahora, todas». Lo que Gestión no deja mover sale en
 *                 gris con el motivo y, si lo sabe, desde cuándo
 *   3. hueco      los de su profesor, con filtros de día y momento del día
 *   4. confirmar  antes y después
 *      hecho
 *
 * EL DOBLE TOQUE NO HACE DOS CAMBIOS. La `idempotency_key` se crea al
 * pasar a «confirmar» con un hueco elegido —una por intento, no por
 * clic—: si el alumno toca dos veces, o reintenta tras un fallo, Gestión
 * recibe la misma clave. Además el botón no responde mientras se guarda
 * y `enVuelo` corta el segundo toque que llega antes de que React pinte.
 *
 * QUÉ SE HACE CON CADA RESPUESTA DEL POST:
 *   · HUECO_YA_OCUPADO, SLOT_NO_DISPONIBLE: los huecos otra vez,
 *     recargados, con el aviso. Sin salir del flujo.
 *   · MISMO_HORARIO: los huecos otra vez, con el aviso.
 *   · SESION_NO_ENCONTRADA: el aviso, y la página se pone al día.
 *   · A_MEDIAS: el aviso serio y solo «Cerrar». No se ofrece repetir.
 *   · EN_CURSO y el resto: el aviso; «Confirmar» repite con la misma
 *     clave, como pide el contrato.
 *
 * HECHO O A MEDIAS, NO HAY VUELTA ATRÁS: si el alumno pulsa atrás, va a
 * «Mis clases» (carga completa, para que salga ya el horario nuevo), no
 * a un paso desde el que repetir el cambio.
 *
 * `acciones` existe para el arnés de pruebas; la página real usa las
 * acciones de servidor.
 */

export type AccionesHorario = {
  huecos: (modo: ModoCambio, sesionId: string, fecha: string | null) => Promise<LecturaAutoservicio<HuecoLibre[]>>;
  cambiar: (peticion: PeticionCambio) => Promise<ResultadoCambio>;
};

const DE_SERVIDOR: AccionesHorario = { huecos: huecosAutoservicio, cambiar: cambiarHorarioAutoservicio };

const ORDEN = ["clase", "cambio", "hueco", "confirmar", "hecho"] as const;
type Paso = (typeof ORDEN)[number];

type Huecos = { clave: string; carga: { estado: "cargando" } | { estado: "listo"; lista: HuecoLibre[] } | { estado: "error"; codigo: CodigoAutoservicio } };
/** Cómo acabó: hecho (con lo que se cambió, porque el estado de la página cambia debajo) o a medias. */
type Fin = { tipo: "hecho"; modo: ModoCambio; destino: HuecoLibre; fechaNueva: string | null } | { tipo: "aMedias" };

const mismoHueco = (a: HuecoLibre, b: HuecoLibre) => a.dia === b.dia && a.hora === b.hora && a.fecha === b.fecha && a.duracion === b.duracion;

export default function CambiarHorario({
  estado,
  whatsapp,
  simulado = false,
  acciones = DE_SERVIDOR,
}: {
  estado: EstadoAutoservicio;
  whatsapp: string;
  simulado?: boolean;
  acciones?: AccionesHorario;
}) {
  const t = usarIdioma().t.autoservicio;
  const router = useRouter();
  const { pedido, ir } = usarPasoDeLaUrl(ORDEN);
  const varias = estado.sesiones.length > 1;

  const [sesionId, setSesionId] = useState<string | null>(varias ? null : estado.sesiones[0]?.id ?? null);
  const [modo, setModo] = useState<ModoCambio | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [huecos, setHuecos] = useState<Huecos | null>(null);
  const [dia, setDia] = useState<DiaSemana | null>(null);
  const [franja, setFranja] = useState<Franja | null>(null);
  const [destino, setDestino] = useState<HuecoLibre | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const [fallo, setFallo] = useState<CodigoAutoservicio | null>(null);
  const [fin, setFin] = useState<Fin | null>(null);
  const [enviando, iniciar] = useTransition();
  const enVuelo = useRef(false);
  const pedidoHuecos = useRef(0);

  const sesion = estado.sesiones.find((s) => s.id === sesionId) ?? null;
  const claveHuecos = sesion && modo ? `${modo}|${sesion.id}|${modo === "puntual" ? fecha ?? "" : ""}` : null;
  const listoParaHuecos = sesion !== null && modo !== null && (modo === "fijo" ? sesion.fijo.movible : fecha !== null);

  const puede = (p: Paso): boolean => {
    switch (p) {
      case "clase":
        return varias;
      case "cambio":
        return sesion !== null;
      case "hueco":
        return listoParaHuecos;
      case "confirmar":
        return listoParaHuecos && destino !== null && clave !== null;
      case "hecho":
        return fin?.tipo === "hecho";
    }
  };
  // Hecho o a medias, el flujo se queda donde acabó.
  const pasoFinal: Paso | null = fin ? (fin.tipo === "hecho" ? "hecho" : "confirmar") : null;
  const paso: Paso = pasoFinal ?? pasoPosible(ORDEN, pedido, puede);

  // La URL dice lo que se enseña (tras recargar, o con un paso al que no
  // se puede llegar con lo elegido).
  useEffect(() => {
    if (!fin && pedido !== paso) ir(paso, true);
  }, [fin, pedido, paso, ir]);

  // Atrás desde el final: a «Mis clases», con el horario ya cambiado.
  const llegoAlFinal = useRef(false);
  useEffect(() => {
    if (!pasoFinal) return;
    if (pedido === pasoFinal) llegoAlFinal.current = true;
    else if (llegoAlFinal.current) window.location.replace("/clases");
  }, [pasoFinal, pedido]);

  // Los huecos se piden al llegar a su paso, y otra vez si cambió qué se mueve.
  useEffect(() => {
    if (paso !== "hueco" || !sesion || !modo || !claveHuecos || huecos?.clave === claveHuecos) return;
    const n = ++pedidoHuecos.current;
    setHuecos({ clave: claveHuecos, carga: { estado: "cargando" } });
    setDia(null);
    setFranja(null);
    void (async () => {
      let r: LecturaAutoservicio<HuecoLibre[]>;
      try {
        r = await acciones.huecos(modo, sesion.id, modo === "puntual" ? fecha : null);
      } catch {
        r = { ok: false, codigo: "GENERICO" };
      }
      if (n !== pedidoHuecos.current) return;
      if (!r.ok && r.codigo === "SESION_NO_ENCONTRADA") router.refresh();
      setHuecos({ clave: claveHuecos, carga: r.ok ? { estado: "listo", lista: r.datos } : { estado: "error", codigo: r.codigo } });
    })();
  }, [paso, sesion, modo, fecha, claveHuecos, huecos, acciones, router]);

  /** Los huecos otra vez, desde cero, con un aviso. */
  function recargarHuecos(mensaje: string | null) {
    setAviso(mensaje);
    setDestino(null);
    setClave(null);
    setHuecos(null);
    ir("hueco", true);
  }

  function elegirModo(m: ModoCambio) {
    setModo(m);
    if (m === "fijo") setFecha(null);
    setDestino(null);
    setAviso(null);
  }

  function aConfirmar() {
    if (!destino) return;
    // Un intento nuevo: clave nueva. Los toques y reintentos de este
    // mismo intento reutilizan esta.
    setClave(nuevaClave());
    setFallo(null);
    ir("confirmar");
  }

  function confirmar() {
    if (!sesion || !modo || !destino || !clave || enVuelo.current || enviando) return;
    enVuelo.current = true;
    const elegido = destino;
    iniciar(async () => {
      let r: ResultadoCambio;
      try {
        r = await acciones.cambiar({
          modo,
          sesionOrigen: { dia: sesion.dia, hora: sesion.hora, duracion: sesion.duracion },
          fechaOrigen: modo === "puntual" ? fecha : null,
          destino: elegido,
          idempotencyKey: clave,
        });
      } catch {
        r = { ok: false, codigo: "GENERICO", mensaje: null };
      }
      enVuelo.current = false;
      if (r.ok) {
        setFin({ tipo: "hecho", modo, destino: elegido, fechaNueva: r.fechaNueva });
        ir("hecho", true);
      } else if (r.codigo === "A_MEDIAS") {
        setFin({ tipo: "aMedias" });
      } else if (r.codigo === "HUECO_YA_OCUPADO" || r.codigo === "SLOT_NO_DISPONIBLE") {
        recargarHuecos(t.ocupado);
      } else if (r.codigo === "MISMO_HORARIO") {
        setAviso(t.motivo(r.codigo));
        setDestino(null);
        setClave(null);
        ir("hueco", true);
      } else {
        // Gestión ya no tiene esa sesión: la página se pone al día.
        if (r.codigo === "SESION_NO_ENCONTRADA") router.refresh();
        setFallo(r.codigo);
      }
    });
  }

  const tramo = (h: { hora: string; duracion: number }) => [h.hora, horaFin(h.hora, h.duracion)] as const;
  const describeDestino = (h: HuecoLibre) => (h.fecha ? t.clase(h.fecha, ...tramo(h)) : t.sesionCorta(h.dia, ...tramo(h)));
  const pasosDelFlujo: Paso[] = varias ? ["clase", "cambio", "hueco", "confirmar"] : ["cambio", "hueco", "confirmar"];
  const nombres: Record<Paso, string> = {
    clase: t.queClase,
    cambio: t.queCambio,
    hueco: t.eligeNuevoHorario,
    confirmar: t.confirmaTitulo,
    hecho: t.hechoTitulo,
  };
  const indicador = pasoFinal ? null : { n: pasosDelFlujo.indexOf(paso) + 1, total: pasosDelFlujo.length, nombre: nombres[paso] };
  const marco = { t, titulo: t.cambiarHorario, paso: indicador, clave: fin ? `fin-${fin.tipo}` : paso, simulado };
  const claseActual = sesion && modo === "puntual" && fecha ? sesion.proximasClases.find((c) => c.fecha === fecha) ?? null : null;

  // --- el final ---

  if (fin?.tipo === "aMedias") {
    return (
      <MarcoFlujo
        {...marco}
        salidaCompleta
        accion={
          <a href="/clases" className={BOTON_VERDE}>
            {t.cerrar}
          </a>
        }
      >
        <PanelAMedias t={t} />
      </MarcoFlujo>
    );
  }

  if (fin?.tipo === "hecho") {
    const primera = fin.modo === "fijo" ? fin.fechaNueva ?? fin.destino.primeraClase ?? null : null;
    return (
      <MarcoFlujo
        {...marco}
        salidaCompleta
        accion={
          <a href="/clases" className={BOTON_VERDE}>
            {t.volverAMisClases}
          </a>
        }
      >
        <Hecho titulo={t.hechoTitulo} texto={t.hechoAviso}>
          <p className="text-[18px] font-bold leading-snug text-marca-tinta">
            {fin.modo === "fijo"
              ? t.hechoFijo(t.sesion(fin.destino.dia, ...tramo(fin.destino)))
              : t.hechoPuntual(t.clase(fin.destino.fecha ?? "", ...tramo(fin.destino)))}
          </p>
          {primera && <p className="text-[15px] text-marca-tintaMedia">{t.primeraClase(primera)}</p>}
        </Hecho>
      </MarcoFlujo>
    );
  }

  // --- 1. qué clase ---

  if (paso === "clase") {
    return (
      <MarcoFlujo
        {...marco}
        accion={
          <button type="button" onClick={() => ir("cambio")} disabled={!sesion} className={sesion ? BOTON_VERDE : BOTON_APAGADO}>
            {t.continuar}
          </button>
        }
      >
        <TituloPaso>{t.queClase}</TituloPaso>
        <div className="flex flex-col gap-2.5">
          {estado.sesiones.map((s) => (
            <Opcion
              key={s.id}
              elegida={s.id === sesionId}
              alPulsar={() => {
                if (s.id !== sesionId) {
                  setSesionId(s.id);
                  setModo(null);
                  setFecha(null);
                  setDestino(null);
                }
              }}
              titulo={t.sesionCorta(s.dia, ...tramo(s))}
              detalle={t.cadaSemana(s.duracion)}
            />
          ))}
        </div>
      </MarcoFlujo>
    );
  }

  // --- 2. qué cambio (y, en «solo una clase», qué fecha) ---

  if (paso === "cambio" && sesion) {
    const sinProximas = sesion.proximasClases.length === 0;
    const algunaBloqueada = !sesion.fijo.movible || sesion.proximasClases.some((c) => !c.movible);
    return (
      <MarcoFlujo
        {...marco}
        accion={
          <button type="button" onClick={() => ir("hueco")} disabled={!listoParaHuecos} className={listoParaHuecos ? BOTON_VERDE : BOTON_APAGADO}>
            {t.continuar}
          </button>
        }
      >
        <p className="text-[15px] text-marca-tintaMedia">{t.tuClaseDeLos(sesion.dia, ...tramo(sesion))}</p>
        <TituloPaso>{t.queCambio}</TituloPaso>
        <div className="flex flex-col gap-2.5">
          <Opcion
            grande
            elegida={modo === "puntual"}
            alPulsar={() => elegirModo("puntual")}
            desactivada={sinProximas}
            titulo={t.soloEsta}
            detalle={sinProximas ? t.sinProximas : t.soloEstaDetalle}
            icono={
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M4 10h16M9 3v4M15 3v4" />
                <circle cx="12" cy="15" r="1.6" fill="currentColor" />
              </svg>
            }
          />
          <Opcion
            grande
            elegida={modo === "fijo"}
            alPulsar={() => elegirModo("fijo")}
            desactivada={!sesion.fijo.movible}
            titulo={t.todas}
            detalle={sesion.fijo.movible ? t.todasDetalle : t.noMovible(sesion.fijo, "horario")}
            icono={
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
                <path d="M20 4v5h-5" />
                <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
                <path d="M4 20v-5h5" />
              </svg>
            }
          />
        </div>

        {modo === "puntual" && (
          <section aria-labelledby="que-fecha" className="flex flex-col gap-2.5">
            <h3 id="que-fecha" className="mt-2 text-[17px] font-bold text-marca-tinta">
              {t.queFecha}
            </h3>
            <ul className="flex flex-col gap-2">
              {sesion.proximasClases.map((c) => (
                <li key={c.fecha}>
                  <Opcion
                    elegida={fecha === c.fecha}
                    alPulsar={() => {
                      if (c.fecha !== fecha) {
                        setFecha(c.fecha);
                        setDestino(null);
                      }
                    }}
                    desactivada={!c.movible}
                    titulo={t.diaConFecha(c.fecha)}
                    detalle={c.movible ? undefined : t.noMovible(c, "clase")}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {algunaBloqueada && <PieWhatsApp href={whatsapp} pregunta={t.noEncuentras} texto={t.escribenos} />}
      </MarcoFlujo>
    );
  }

  // --- 3. el hueco ---

  if (paso === "hueco" && sesion && modo) {
    const carga = huecos?.clave === claveHuecos ? huecos.carga : ({ estado: "cargando" } as const);
    const visibles = carga.estado === "listo" ? filtrarHuecos(carga.lista, dia, franja) : [];
    const resumen = destino ? describeDestino(destino) : null;
    const continuar = (
      <button type="button" onClick={aConfirmar} disabled={!destino} className={destino ? BOTON_VERDE : BOTON_APAGADO}>
        {t.continuar}
      </button>
    );
    const pie = (
      <>
        <p aria-live="polite" className="text-center text-[15.5px] text-marca-tintaMedia">
          {resumen ? t.hasElegido(resumen) : t.eligeUnHueco}
        </p>
        {continuar}
      </>
    );
    return (
      <MarcoFlujo
        {...marco}
        accion={carga.estado === "listo" && carga.lista.length > 0 ? pie : undefined}
        lateral={
          <>
            <p className="font-display text-[18px] font-bold text-marca-tinta">{t.tuCambio}</p>
            <div className="rounded-[12px] bg-marca-nieblaOscura px-3.5 py-3">
              <Rotulo>{t.antes}</Rotulo>
              <p className="mt-0.5 text-[17px] font-semibold text-marca-tintaMedia">
                {claseActual ? t.clase(claseActual.fecha, ...tramo(claseActual)) : t.sesionCorta(sesion.dia, ...tramo(sesion))}
              </p>
            </div>
            <div className={`rounded-[12px] px-3.5 py-3 ${destino ? "border-2 border-marca-verde" : "border-[1.5px] border-dashed border-marca-bordeSuave"}`}>
              <Rotulo verde>{t.despues}</Rotulo>
              <p className={`mt-0.5 text-[18px] font-bold ${destino ? "text-marca-tinta" : "text-marca-gris"}`}>{resumen ?? t.eligeUnHueco}</p>
              {destino?.primeraClase && modo === "fijo" && <p className="text-[14.5px] text-marca-tintaMedia">{t.primeraClase(destino.primeraClase)}</p>}
            </div>
            {continuar}
            <PieWhatsApp href={whatsapp} pregunta={t.noEncuentras} texto={t.escribenos} />
          </>
        }
      >
        <div>
          <TituloPaso>{t.eligeNuevoHorario}</TituloPaso>
          <p className="mt-1.5 text-[15.5px] leading-snug text-marca-tintaMedia">
            {modo === "puntual" && fecha
              ? t.contextoPuntual(fecha, ...tramo(sesion), estado.profesor)
              : t.contextoFijo(sesion.dia, ...tramo(sesion), estado.profesor)}
          </p>
        </div>
        {aviso && (
          <Aviso tono="atencion" role="status">
            {aviso}
          </Aviso>
        )}

        {carga.estado === "cargando" && <Esqueleto texto={t.cargando} />}
        {carga.estado === "error" &&
          (sePuedeReintentar(carga.codigo) ? (
            <PanelNoSePudo
              t={t}
              whatsapp={whatsapp}
              titulo={t.sinConexionTitulo}
              texto={t.sinConexionTexto}
              alReintentar={() => recargarHuecos(null)}
            />
          ) : (
            <PanelNoSePudo t={t} whatsapp={whatsapp} texto={t.motivoAlLeer(carga.codigo)} />
          ))}
        {carga.estado === "listo" &&
          (carga.lista.length === 0 ? (
            <div className="flex flex-col gap-3">
              <Aviso>{t.sinHuecos}</Aviso>
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
            </div>
          ) : (
            <>
              <Filtros t={t} dia={dia} franja={franja} alElegirDia={setDia} alElegirFranja={setFranja} />
              <NotaHora texto={t.horaPeninsular} />
              {visibles.length === 0 ? (
                <Aviso>{t.sinResultados}</Aviso>
              ) : (
                <RejillaHuecos
                  huecos={visibles}
                  t={t}
                  elegido={(h) => destino !== null && mismoHueco(h, destino)}
                  alElegir={(h) => {
                    setDestino(h);
                    setAviso(null);
                  }}
                />
              )}
              <div className="min-[900px]:hidden">
                <PieWhatsApp href={whatsapp} pregunta={t.noEncuentras} texto={t.escribenos} />
              </div>
            </>
          ))}
      </MarcoFlujo>
    );
  }

  // --- 4. confirmar ---

  if (paso === "confirmar" && sesion && modo && destino) {
    return (
      <MarcoFlujo
        {...marco}
        accion={
          <>
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className={`${BOTON_VERDE} ${enviando ? "cursor-progress !bg-marca-verdeOsc" : ""}`}
            >
              {enviando ? t.enviando : t.confirmar}
            </button>
            {enviando && (
              <p role="status" className="text-center text-[14.5px] text-marca-tintaMedia">
                {t.guardandoNota}
              </p>
            )}
          </>
        }
      >
        <TituloPaso>{t.confirmaTitulo}</TituloPaso>
        <AntesDespues
          antes={
            <>
              <Rotulo>{t.antes}</Rotulo>
              <p className="text-[18px] font-semibold text-marca-tintaMedia">
                {claseActual ? t.clase(claseActual.fecha, ...tramo(claseActual)) : t.sesionCorta(sesion.dia, ...tramo(sesion))}
              </p>
              <p className="text-[14.5px] text-marca-tintaMedia">
                {modo === "fijo" ? t.cadaSemanaCon(estado.profesor) : estado.profesor ? t.conProfesor(estado.profesor) : ""}
              </p>
            </>
          }
          despues={
            <>
              <Rotulo verde>{t.despues}</Rotulo>
              <p className="font-display text-[22px] font-bold leading-snug text-marca-tinta">{describeDestino(destino)}</p>
              <p className="text-[15px] text-marca-tintaMedia">{modo === "fijo" ? t.desdeAhoraCon(estado.profesor) : t.soloEsaClase}</p>
              {modo === "fijo" && destino.primeraClase && (
                <p className="mt-1.5 flex items-center gap-2 rounded-[10px] bg-marca-verdeFondo px-3 py-2.5 text-[15.5px] text-marca-tinta">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="#14722A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="5" width="16" height="15" rx="2" />
                    <path d="M4 10h16M9 3v4M15 3v4" />
                  </svg>
                  <span className="font-semibold">{t.primeraClase(destino.primeraClase)}</span>
                </p>
              )}
            </>
          }
        />
        <p className="text-[15px] leading-[1.45] text-marca-tintaMedia">
          {t.avisoAlConfirmar(estado.profesor)} {t.horaPeninsular}.
        </p>
        {fallo && (
          <div className="flex flex-col gap-3">
            <Aviso role="alert">{t.motivo(fallo)}</Aviso>
            <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
          </div>
        )}
      </MarcoFlujo>
    );
  }

  return null;
}
