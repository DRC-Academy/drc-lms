"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { cambiarProfesorAutoservicio, horariosProfesorAutoservicio } from "@/app/acciones-autoservicio";
import type { DiaSemana } from "@/lib/clases";
import { filtrarHuecos, horaFin, type Franja } from "@/lib/autoservicio/franjas";
import { aDestino, cambiarDesde, destinosListos, elegir, horariosQueValen, siguienteSesion } from "@/lib/autoservicio/profesor";
import type {
  CodigoAutoservicio,
  HorarioNuevo,
  HorariosProfesor,
  LecturaAutoservicio,
  Momento,
  PeticionCambioProfesor,
  ResultadoCambioProfesor,
  SesionOrigen,
} from "@/lib/autoservicio/tipos";
import type { TextosAutoservicio } from "@/lib/textos/autoservicio";
import { TARJETA } from "@/components/base/Seccion";
import MarcoFlujo from "@/components/clases/autoservicio/MarcoFlujo";
import { pasoPosible, usarPasoDeLaUrl } from "@/components/clases/autoservicio/pasos";
import {
  AntesDespues,
  Aviso,
  BOTON_APAGADO,
  BOTON_VERDE,
  BotonWhatsApp,
  Esqueleto,
  FOCO,
  Filtros,
  Hecho,
  NotaHora,
  Palomita,
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
 * «CAMBIAR DE PROFESOR», EN SU PÁGINA (/clases/cambiar-profesor), CONTRA
 * EL CONTRATO V3 DE GESTIÓN.
 *
 * EL ALUMNO NO VE PROFESORES: elige los horarios que le vienen bien y
 * Gestión le asigna el profesor que mejor encaje. El nombre sale por
 * primera vez en «hecho», de la respuesta del POST.
 *
 *   1. intro      qué pasa y qué no cambia (su nivel, su historial, sus horas)
 *   2. horarios   sus clases, de una en una y en el orden de Gestión.
 *                 Arriba (a la derecha en escritorio) la lista con lo
 *                 elegido o «Sin elegir»; debajo, filtros y los horarios
 *                 de la clase que toca. Cada horario elegido pide los de
 *                 la siguiente mandando los `elegidos`, y Gestión solo
 *                 devuelve los que un MISMO profesor puede cubrir junto
 *                 con ellos. «Cambiar» en una elegida deshace esa y las de
 *                 detrás. Si para la siguiente no queda nada, se dice con
 *                 calma y se ofrece cambiar lo elegido o el WhatsApp.
 *   3. confirmar  antes y después, sin nombre
 *      hecho      «Tu nuevo profesor es Daniela.»
 *
 * Cada paso en `?paso=`. Los horarios de la primera clase se piden ya en
 * la intro: sus sesiones salen de ahí (con el calendario de su profesor
 * sin actualizar, el estado llega sin sesiones y aun así puede cambiar).
 *
 * LA CLAVE DE INTENTO como en «Cambiar de horario»: una por intento al
 * pasar a «confirmar», la misma en los reintentos. Lo que no se arregla
 * repitiendo no ofrece repetir, y el cambio a medias solo deja «Cerrar».
 *
 * `acciones` existe para el arnés de pruebas; la página real usa las
 * acciones de servidor.
 */

export type AccionesProfesor = {
  horarios: (elegidos: SesionOrigen[]) => Promise<LecturaAutoservicio<HorariosProfesor>>;
  cambiar: (peticion: PeticionCambioProfesor) => Promise<ResultadoCambioProfesor>;
};

const DE_SERVIDOR: AccionesProfesor = {
  horarios: horariosProfesorAutoservicio,
  cambiar: cambiarProfesorAutoservicio,
};

const ORDEN = ["intro", "horarios", "confirmar", "hecho"] as const;
type Paso = (typeof ORDEN)[number];

type Carga<T> = { estado: "cargando" } | { estado: "listo"; datos: T } | { estado: "error"; codigo: CodigoAutoservicio };
type Fallo = { codigo: CodigoAutoservicio; disponibleDesde: Momento | null };
type Fin = { tipo: "hecho"; profesor: string; sesiones: SesionOrigen[] } | { tipo: "aMedias" };

/** Lo elegido ya no lo cubre nadie: se vuelve a elegir desde el principio. */
const VOLVER_A_ELEGIR: CodigoAutoservicio[] = ["HUECO_YA_OCUPADO", "SLOT_NO_DISPONIBLE"];

/** Lo que no se arregla repitiendo: se explica y solo queda volver o escribir. */
const SIN_REPETIR: CodigoAutoservicio[] = [
  "ANTELACION_INSUFICIENTE",
  "HORAS_NO_COINCIDEN",
  "ASIGNACION_CAMBIADA",
  "ASIGNACION_INACTIVA",
  "ASIGNACION_NO_EXISTE",
  "SESION_NO_ENCONTRADA",
  "NO_ELEGIBLE",
  "RECUPERACION_PENDIENTE",
];

/**
 * La lista de sus clases: la elegida con su horario y «Cambiar», la que
 * toca con «Ahora», las demás «Sin elegir».
 */
function ListaClases({
  t,
  sesiones,
  elegidos,
  activa,
  alCambiar,
  compacta = false,
}: {
  t: TextosAutoservicio;
  sesiones: SesionOrigen[];
  elegidos: HorarioNuevo[];
  activa: number | null;
  alCambiar: (i: number) => void;
  compacta?: boolean;
}) {
  const tramo = (h: { hora: string; duracion: number }) => [h.hora, horaFin(h.hora, h.duracion)] as const;
  return (
    <ul aria-label={t.tusClases} className={compacta ? "flex flex-col gap-2" : `${TARJETA} overflow-hidden`}>
      {sesiones.map((s, i) => {
        const elegido = elegidos[i];
        const toca = i === activa;
        return (
          <li
            key={i}
            className={`flex items-center gap-3 ${compacta ? "rounded-[12px] px-3 py-2.5" : "px-4 py-3"} ${
              toca ? (compacta ? "border-[1.5px] border-marca-verde bg-marca-verdeFondo" : "bg-marca-verdeFondo") : compacta ? "bg-marca-niebla" : ""
            } ${!compacta && i > 0 ? "border-t border-marca-nieblaOscura" : ""}`}
          >
            {elegido ? (
              <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marca-verdeOsc text-white">
                <Palomita className="h-3.5 w-3.5" grosor={3.4} />
              </span>
            ) : (
              <span
                aria-hidden
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[14px] font-bold ${
                  toca ? "border-marca-verdeOsc text-marca-verdeOsc" : "border-marca-puntoPendiente text-marca-gris"
                }`}
              >
                {i + 1}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] text-marca-tintaMedia">{t.tuClaseDe(s.duracion)}</span>
              {elegido ? (
                <span className={`${compacta ? "text-[15.5px]" : "text-[17px]"} font-bold text-marca-tinta`}>{t.sesionCorta(elegido.dia, ...tramo(elegido))}</span>
              ) : (
                <span className="text-[17px] font-semibold text-marca-tintaMedia">{t.sinElegir}</span>
              )}
            </div>
            {elegido ? (
              <button
                type="button"
                onClick={() => alCambiar(i)}
                aria-label={t.cambiarEsteEtiqueta(s.duracion)}
                className={`min-h-[48px] shrink-0 px-1 text-[16px] font-semibold text-marca-verdeOsc underline underline-offset-[3px] hover:text-marca-tinta ${FOCO}`}
              >
                {t.cambiarEste}
              </button>
            ) : (
              toca && <span className="text-[13px] font-bold text-marca-verdeOsc">{t.ahoraToca}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function CambiarProfesor({
  profesorActual,
  whatsapp,
  simulado = false,
  acciones = DE_SERVIDOR,
}: {
  /** El de ahora, para el «antes». «» si Gestión no lo dio. */
  profesorActual: string;
  whatsapp: string;
  /** Con AUTOSERVICIO_SIMULADO: un aviso arriba de que no se guarda. */
  simulado?: boolean;
  acciones?: AccionesProfesor;
}) {
  const t = usarIdioma().t.autoservicio;
  const router = useRouter();
  const { pedido, ir } = usarPasoDeLaUrl(ORDEN);

  const [sesiones, setSesiones] = useState<SesionOrigen[] | null>(null);
  const [elegidos, setElegidos] = useState<HorarioNuevo[]>([]);
  /** Los horarios para la siguiente clase (la de índice `elegidos.length`). */
  const [carga, setCarga] = useState<Carga<HorarioNuevo[]>>({ estado: "cargando" });
  const [dia, setDia] = useState<DiaSemana | null>(null);
  const [franja, setFranja] = useState<Franja | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [fin, setFin] = useState<Fin | null>(null);
  const [enviando, iniciar] = useTransition();
  const enVuelo = useRef(false);
  /** El último pedido: si llega uno viejo (cambió de idea a mitad), se descarta. */
  const pedidoActual = useRef(0);

  const listos = sesiones !== null && destinosListos(sesiones, elegidos);
  const puede = (p: Paso): boolean => {
    switch (p) {
      case "intro":
      case "horarios":
        return true;
      case "confirmar":
        return listos && clave !== null;
      case "hecho":
        return fin?.tipo === "hecho";
    }
  };
  const pasoFinal: Paso | null = fin ? (fin.tipo === "hecho" ? "hecho" : "confirmar") : null;
  const paso: Paso = pasoFinal ?? pasoPosible(ORDEN, pedido, puede);

  useEffect(() => {
    if (!fin && pedido !== paso) ir(paso, true);
  }, [fin, pedido, paso, ir]);

  // Atrás desde el final: a «Mis clases», ya con el profesor nuevo.
  const llegoAlFinal = useRef(false);
  useEffect(() => {
    if (!pasoFinal) return;
    if (pedido === pasoFinal) llegoAlFinal.current = true;
    else if (llegoAlFinal.current) window.location.replace("/clases");
  }, [pasoFinal, pedido]);

  /**
   * Deja los elegidos en `nuevos` y pide los horarios de la siguiente
   * clase. Con todas elegidas no hace falta: el POST revalida.
   */
  function pedir(nuevos: HorarioNuevo[], mensaje: string | null = null) {
    const n = ++pedidoActual.current;
    setAviso(mensaje);
    setElegidos(nuevos);
    setDia(null);
    setFranja(null);
    setFallo(null);
    if (sesiones && nuevos.length === sesiones.length) {
      setCarga({ estado: "listo", datos: [] });
      return;
    }
    setCarga({ estado: "cargando" });
    void (async () => {
      let r: LecturaAutoservicio<HorariosProfesor>;
      try {
        r = await acciones.horarios(nuevos.map(aDestino));
      } catch {
        r = { ok: false, codigo: "GENERICO" };
      }
      if (n !== pedidoActual.current) return;
      if (!r.ok) {
        setCarga({ estado: "error", codigo: r.codigo });
        return;
      }
      const { sesiones: suyas, elegidosDisponibles, horarios } = r.datos;
      // Lo elegido se ocupó mientras elegía: desde el principio, y se dice.
      if (nuevos.length > 0 && !elegidosDisponibles) {
        pedir([], t.elegidosOcupados);
        return;
      }
      setSesiones(suyas);
      const i = siguienteSesion(suyas, nuevos);
      setCarga({ estado: "listo", datos: i === null ? [] : horariosQueValen(suyas[i], nuevos, horarios) });
    })();
  }

  // Al abrir, los horarios de la primera clase: ya en la intro.
  const abierta = useRef(false);
  useEffect(() => {
    if (abierta.current) return;
    abierta.current = true;
    pedir([]);
  });

  /** Elegir o deshacer en el paso de los horarios: la página vuelve arriba, a la lista. */
  function cambiarEleccion(nuevos: HorarioNuevo[]) {
    pedir(nuevos);
    window.scrollTo({ top: 0 });
  }

  function aConfirmar() {
    if (!listos) return;
    // Un intento nuevo: clave nueva. Los toques y reintentos de este
    // mismo intento reutilizan esta.
    setClave(nuevaClave());
    setFallo(null);
    ir("confirmar");
  }

  function confirmar() {
    if (!sesiones || !clave || enVuelo.current || enviando || !destinosListos(sesiones, elegidos)) return;
    const destinos = elegidos;
    enVuelo.current = true;
    iniciar(async () => {
      let r: ResultadoCambioProfesor;
      try {
        r = await acciones.cambiar({ destinos: destinos.map(aDestino), idempotencyKey: clave });
      } catch {
        r = { ok: false, codigo: "GENERICO", mensaje: null, disponibleDesde: null };
      }
      enVuelo.current = false;
      if (r.ok) {
        setFin({ tipo: "hecho", profesor: r.profesorNuevo, sesiones: r.sesionesDespues.length > 0 ? r.sesionesDespues : destinos });
        ir("hecho", true);
      } else if (r.codigo === "A_MEDIAS") {
        setFin({ tipo: "aMedias" });
      } else if (VOLVER_A_ELEGIR.includes(r.codigo)) {
        // Sin salir del flujo: a elegir otra vez, ya sin lo ocupado.
        setClave(null);
        pedir([], t.elegidosOcupados);
        ir("horarios", true);
      } else {
        // Sus clases han cambiado por otro lado: la página se pone al día.
        if (r.codigo === "ASIGNACION_CAMBIADA" || r.codigo === "SESION_NO_ENCONTRADA") router.refresh();
        setFallo({ codigo: r.codigo, disponibleDesde: r.disponibleDesde });
      }
    });
  }

  const tramo = (h: { hora: string; duracion: number }) => [h.hora, horaFin(h.hora, h.duracion)] as const;
  const total = sesiones?.length ?? 0;
  const activa = sesiones ? siguienteSesion(sesiones, elegidos) : null;
  const visibles = carga.estado === "listo" ? filtrarHuecos(carga.datos, dia, franja) : [];
  const sinRepetir = fallo !== null && SIN_REPETIR.includes(fallo.codigo);
  const textoFallo = (f: Fallo) =>
    f.codigo === "ANTELACION_INSUFICIENTE"
      ? t.profesorNoDisponible({ puede: false, motivo: f.codigo, disponibleDesde: f.disponibleDesde })
      : t.motivoProfesor(f.codigo);
  const nombres: Record<Paso, string> = {
    intro: t.cambiarProfesor,
    horarios: t.elegirMisHorarios,
    confirmar: t.confirmaTitulo,
    hecho: t.cambiarProfesor,
  };
  const pasosDelFlujo: Paso[] = ["intro", "horarios", "confirmar"];
  const indicador = pasoFinal ? null : { n: pasosDelFlujo.indexOf(paso) + 1, total: pasosDelFlujo.length, nombre: nombres[paso] };
  const marco = { t, titulo: t.cambiarProfesor, paso: indicador, clave: fin ? `fin-${fin.tipo}` : paso, simulado };

  const errorAlLeer = (codigo: CodigoAutoservicio) =>
    sePuedeReintentar(codigo) ? (
      <PanelNoSePudo
        t={t}
        whatsapp={whatsapp}
        titulo={t.sinConexionTitulo}
        texto={t.sinConexionTexto}
        alReintentar={() => pedir(elegidos)}
        nota={elegidos.length > 0 ? t.sigueGuardado : undefined}
      />
    ) : (
      <PanelNoSePudo t={t} whatsapp={whatsapp} texto={t.motivoProfesor(codigo)} />
    );

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
        <Hecho titulo={t.hechoProfesor(fin.profesor)} texto={t.hechoProfesorAviso}>
          <p className="text-[14px] text-marca-tintaMedia">{t.tusClasesDesdeAhora}</p>
          <ul className="flex flex-col gap-1.5">
            {fin.sesiones.map((s, i) => (
              <li key={i} className="text-[18px] font-bold text-marca-tinta">
                {t.sesionCorta(s.dia, ...tramo(s))}
              </li>
            ))}
          </ul>
        </Hecho>
      </MarcoFlujo>
    );
  }

  // --- 1. intro ---

  if (paso === "intro") {
    return (
      <MarcoFlujo
        {...marco}
        accion={
          <button type="button" onClick={() => ir("horarios")} className={BOTON_VERDE}>
            {t.elegirMisHorarios}
          </button>
        }
      >
        <p className="font-display text-[21px] font-semibold leading-[1.35] text-marca-tinta">{t.profesorIntro}</p>
        <section aria-labelledby="no-cambia" className={`${TARJETA} flex flex-col gap-3 px-[18px] py-4`}>
          <h2 id="no-cambia" className="text-[17px] font-bold text-marca-tinta">
            {t.loQueNoCambia}
          </h2>
          <p className="flex items-start gap-2.5 text-[16px] leading-snug text-marca-tinta">
            <Palomita className="mt-0.5 h-5 w-5 shrink-0 text-marca-verdeOsc" />
            {t.nivelEHistorial}
          </p>
          {sesiones && (
            <p className="flex items-start gap-2.5 text-[16px] leading-snug text-marca-tinta">
              <Palomita className="mt-0.5 h-5 w-5 shrink-0 text-marca-verdeOsc" />
              {t.mismasHoras(
                sesiones.reduce((n, s) => n + s.duracion, 0),
                sesiones.length
              )}
            </p>
          )}
        </section>
        <section aria-labelledby="como-funciona" className="flex flex-col gap-3">
          <h2 id="como-funciona" className="text-[17px] font-bold text-marca-tinta">
            {t.comoFunciona}
          </h2>
          <ol className="flex flex-col gap-3">
            {[t.comoFunciona1, t.comoFunciona2, t.comoFunciona3].map((texto, i) => (
              <li key={i} className="flex items-center gap-3 text-[16px] text-marca-tinta">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marca-verdeFondo text-[15px] font-bold text-marca-verdeOsc">
                  {i + 1}
                </span>
                {texto}
              </li>
            ))}
          </ol>
        </section>
        <PieWhatsApp href={whatsapp} pregunta={t.prefieresHablarlo} texto={t.escribenos} />
      </MarcoFlujo>
    );
  }

  // --- 2. los horarios ---

  if (paso === "horarios") {
    const sesion = sesiones && activa !== null ? sesiones[activa] : null;
    const atascado = carga.estado === "listo" && activa !== null && carga.datos.length === 0;
    const continuar = (
      <button type="button" onClick={aConfirmar} disabled={!listos} className={listos ? BOTON_VERDE : BOTON_APAGADO}>
        {t.continuar}
      </button>
    );
    const contador =
      total > 0 ? (
        <p aria-live="polite" className="text-center text-[15.5px] font-semibold text-marca-tinta">
          {t.contadorClases(elegidos.length, total)}
        </p>
      ) : null;
    return (
      <MarcoFlujo
        {...marco}
        accion={
          sesiones ? (
            <>
              {contador}
              {continuar}
            </>
          ) : undefined
        }
        lateral={
          sesiones ? (
            <>
              <p className="font-display text-[18px] font-bold text-marca-tinta">{t.tusNuevosHorarios}</p>
              <ListaClases t={t} sesiones={sesiones} elegidos={elegidos} activa={activa} alCambiar={(i) => cambiarEleccion(cambiarDesde(elegidos, i))} compacta />
              {contador}
              {continuar}
              <PieWhatsApp href={whatsapp} pregunta={t.noEncuentras} texto={t.escribenos} />
            </>
          ) : undefined
        }
      >
        {!sesiones ? (
          carga.estado === "error" ? (
            errorAlLeer(carga.codigo)
          ) : (
            <Esqueleto texto={t.cargandoHorarios} />
          )
        ) : (
          <>
            <div className="min-[900px]:hidden">
              <ListaClases t={t} sesiones={sesiones} elegidos={elegidos} activa={activa} alCambiar={(i) => cambiarEleccion(cambiarDesde(elegidos, i))} />
            </div>
            {aviso && (
              <Aviso tono="atencion" role="status">
                {aviso}
              </Aviso>
            )}

            {sesion && (
              <div>
                <TituloPaso>{t.horarioParaTuClase(sesion.duracion)}</TituloPaso>
                <p className="mt-1.5 text-[15.5px] leading-snug text-marca-tintaMedia">
                  {t.ahora(sesion.dia, ...tramo(sesion))}
                  {activa !== null && activa > 0 ? `. ${t.soloCompatibles}` : ""}
                </p>
              </div>
            )}

            {activa !== null && carga.estado === "cargando" && <Esqueleto texto={t.cargandoHorarios} />}
            {activa !== null && carga.estado === "error" && errorAlLeer(carga.codigo)}
            {atascado &&
              (activa === 0 ? (
                <div className="flex flex-col gap-3">
                  <Aviso>{t.sinHorarios}</Aviso>
                  <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
                </div>
              ) : (
                <div role="status" className="flex flex-col gap-3 rounded-[16px] border border-marca-borde bg-white px-[18px] py-5">
                  <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-marca-niebla text-marca-verdeOsc">
                    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="5" width="16" height="15" rx="2" />
                      <path d="M4 10h16M9 3v4M15 3v4" />
                    </svg>
                  </span>
                  <p className="text-[16.5px] leading-[1.45] text-marca-tinta">{t.sinHorariosParaOtra(total - (activa ?? 0))}</p>
                  <div className="mt-1 flex flex-col gap-2.5">
                    <button type="button" onClick={() => cambiarEleccion([])} className={BOTON_VERDE}>
                      {t.cambiarElegidos}
                    </button>
                    <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
                  </div>
                </div>
              ))}
            {activa !== null && carga.estado === "listo" && carga.datos.length > 0 && (
              <>
                <Filtros t={t} dia={dia} franja={franja} alElegirDia={setDia} alElegirFranja={setFranja} />
                <NotaHora texto={t.horaPeninsular} />
                {visibles.length === 0 ? (
                  <Aviso>{t.sinResultados}</Aviso>
                ) : (
                  <RejillaHuecos huecos={visibles} t={t} alElegir={(h) => cambiarEleccion(elegir(elegidos, h))} />
                )}
              </>
            )}
            {!atascado && (
              <div className="min-[900px]:hidden">
                <PieWhatsApp href={whatsapp} pregunta={t.noEncuentras} texto={t.escribenos} />
              </div>
            )}
          </>
        )}
      </MarcoFlujo>
    );
  }

  // --- 3. confirmar ---

  if (paso === "confirmar" && sesiones && listos) {
    return (
      <MarcoFlujo
        {...marco}
        accion={
          sinRepetir ? (
            <Link href="/clases" className={BOTON_VERDE}>
              {t.volverAMisClases}
            </Link>
          ) : (
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
          )
        }
      >
        <TituloPaso>{t.confirmaTitulo}</TituloPaso>
        <AntesDespues
          antes={
            <>
              <Rotulo>{t.ahoraRotulo}</Rotulo>
              {sesiones.map((s, i) => (
                <p key={i} className="text-[17px] font-semibold text-marca-tintaMedia">
                  {t.sesionCorta(s.dia, ...tramo(s))}
                </p>
              ))}
              {profesorActual && <p className="mt-0.5 text-[14.5px] text-marca-tintaMedia">{t.conProfesor(profesorActual)}</p>}
            </>
          }
          despues={
            <>
              <Rotulo verde>{t.desdeAhora}</Rotulo>
              <div className="flex flex-col gap-3">
                {elegidos.map((d, i) => (
                  <div key={i}>
                    <p className="font-display text-[21px] font-bold leading-snug text-marca-tinta">{t.sesionCorta(d.dia, ...tramo(d))}</p>
                    {d.primeraClase && <p className="text-[15px] text-marca-tintaMedia">{t.primeraClaseCorta(d.primeraClase)}</p>}
                  </div>
                ))}
              </div>
              <p className="mt-2 flex items-start gap-2.5 rounded-[10px] bg-marca-verdeFondo p-3 text-[16px] leading-snug text-marca-tinta">
                <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="#14722A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                <span>{t.asignamosAlConfirmar}</span>
              </p>
            </>
          }
        />
        <p className="text-[15px] leading-[1.45] text-marca-tintaMedia">
          {t.enlaceCambia} {t.horaPeninsular}.
        </p>
        {fallo && (
          <div className="flex flex-col gap-3">
            <Aviso role="alert">{textoFallo(fallo)}</Aviso>
            <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
          </div>
        )}
      </MarcoFlujo>
    );
  }

  return null;
}
