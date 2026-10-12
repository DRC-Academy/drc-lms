"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { cambiarProfesorAutoservicio, huecosDeProfesorAutoservicio, huecosProfesoresAutoservicio } from "@/app/acciones-autoservicio";
import type { DiaSemana } from "@/lib/clases";
import { DIAS_LABORABLES, FRANJAS, filtrarHuecos, horaFin, type Franja } from "@/lib/autoservicio/franjas";
import { aDestino, agruparPorProfesor, cabe, destinosListos, estadoReparto } from "@/lib/autoservicio/profesor";
import type {
  CodigoAutoservicio,
  HuecoProfesor,
  HuecosDeProfesor,
  LecturaAutoservicio,
  ListaProfesores,
  Momento,
  PeticionCambioProfesor,
  Profesor,
  ResultadoCambioProfesor,
  SesionOrigen,
} from "@/lib/autoservicio/tipos";
import type { TextosAutoservicio } from "@/lib/textos/autoservicio";
import { Aviso, BotonWhatsApp, TituloPaso, Volver, nuevaClave } from "@/components/clases/autoservicio/Piezas";

/**
 * «CAMBIAR DE PROFESOR», CONTRA EL CONTRATO V2 DE GESTIÓN.
 *
 * Pasa TODAS sus sesiones a otro profesor, con las mismas duraciones:
 *
 *   1. buscar     día y franja, y la lista de huecos con el nombre de cada
 *                 profesor, EN EL ORDEN DE GESTIÓN (aleatorio y estable
 *                 durante el día, nunca por puntuación). Se pide una vez
 *                 al abrir y se filtra aquí. La lista es para la duración
 *                 de su primera sesión.
 *   2. repartir   solo si tiene más de una clase a la semana. TODAS pasan
 *                 al profesor nuevo, cada una con su misma duración: una
 *                 fila por clase («Tu clase de los jueves, 2 horas») con
 *                 los huecos de ESE profesor de esa duración, y un
 *                 contador («Has elegido 2 de 3 clases»). Lo que pisa
 *                 algo ya elegido sale desactivado: Gestión rechaza los
 *                 solapes. Si para alguna clase no tiene hueco, o no
 *                 caben todas sin pisarse, se dice y se ofrece otro
 *                 profesor o el WhatsApp.
 *   3. confirmar  antes y después, con el profesor de cada lado
 *   4. hecho      el profesor nuevo está avisado, le llega un correo de
 *                 bienvenida y él le pasará el enlace
 *
 * LAS SESIONES SALEN DE LA RESPUESTA DE GESTIÓN, no del estado: con el
 * calendario de su profesor sin actualizar el estado llega sin sesiones
 * y, aun así, puede cambiar de profesor.
 *
 * LA CLAVE DE INTENTO como en `CambiarHorario`: una por intento al
 * entrar en «confirmar», la misma en los reintentos. Lo que no se
 * arregla repitiendo (A_MEDIAS el primero) no ofrece repetir: solo
 * cerrar o escribir.
 *
 * `acciones` existe para el arnés de pruebas; la pantalla real usa las
 * acciones de servidor.
 */

export type AccionesProfesor = {
  lista: () => Promise<LecturaAutoservicio<ListaProfesores>>;
  deProfesor: (profesorId: string) => Promise<LecturaAutoservicio<HuecosDeProfesor>>;
  cambiar: (peticion: PeticionCambioProfesor) => Promise<ResultadoCambioProfesor>;
};

const DE_SERVIDOR: AccionesProfesor = {
  lista: huecosProfesoresAutoservicio,
  deProfesor: huecosDeProfesorAutoservicio,
  cambiar: cambiarProfesorAutoservicio,
};

type Paso = "buscar" | "repartir" | "confirmar" | "hecho";
type Carga<T> = { estado: "cargando" } | { estado: "listo"; datos: T } | { estado: "error"; codigo: CodigoAutoservicio };
type Fallo = { codigo: CodigoAutoservicio; disponibleDesde: Momento | null };

/** El profesor elegido no vale: se vuelve a la lista, recargada. */
const OTRO_PROFESOR: CodigoAutoservicio[] = [
  "MISMO_PROFESOR",
  "PROFESOR_NO_EXISTE",
  "PROFESOR_ARCHIVADO",
  "PROFESOR_DE_PRUEBA",
  "CALENDARIO_SIN_ACTUALIZAR",
];

/** Lo que no se arregla repitiendo: se explica y solo queda cerrar o escribir. */
const SIN_REPETIR: CodigoAutoservicio[] = [
  "A_MEDIAS",
  "ANTELACION_INSUFICIENTE",
  "HORAS_NO_COINCIDEN",
  "ASIGNACION_CAMBIADA",
  "ASIGNACION_INACTIVA",
  "ASIGNACION_NO_EXISTE",
  "SESION_NO_ENCONTRADA",
  "NO_ELEGIBLE",
  "RECUPERACION_PENDIENTE",
];

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

/** Un hueco de otro profesor: el día y el tramo, y debajo su primera clase, o por qué no se puede. */
function BotonHueco({
  h,
  t,
  alPulsar,
  elegido = false,
  desactivado = false,
}: {
  h: HuecoProfesor;
  t: TextosAutoservicio;
  alPulsar: () => void;
  elegido?: boolean;
  desactivado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={desactivado}
      aria-pressed={elegido}
      className={`flex min-h-[56px] w-full flex-col items-start justify-center rounded-[12px] border px-3.5 py-2 text-left leading-tight transition-colors ${
        elegido
          ? "border-marca-verde bg-marca-verde text-white"
          : desactivado
            ? "cursor-default border-marca-borde bg-marca-niebla text-marca-gris"
            : "border-marca-borde bg-white text-marca-tinta hover:border-marca-verde"
      }`}
    >
      <span className="text-[15.5px] font-bold">
        {t.diaSemanal(h.dia)} {h.hora}–{horaFin(h.hora, h.duracion)}
      </span>
      <span className={`mt-0.5 text-[13px] ${elegido ? "text-white/90" : "text-marca-gris"}`}>
        {elegido ? t.elegido : desactivado ? t.coincide : h.primeraClase ? t.primeraClaseCorta(h.primeraClase) : ""}
      </span>
    </button>
  );
}

export default function CambiarProfesor({
  profesorActual,
  whatsapp,
  alCerrar,
  simulado = false,
  acciones = DE_SERVIDOR,
}: {
  /** El de ahora, para el «antes». «» si Gestión no lo dio. */
  profesorActual: string;
  whatsapp: string;
  alCerrar: () => void;
  /** Con AUTOSERVICIO_SIMULADO: un aviso arriba de que no se guarda. */
  simulado?: boolean;
  acciones?: AccionesProfesor;
}) {
  const t = usarIdioma().t.autoservicio;
  const router = useRouter();

  const [paso, setPaso] = useState<Paso>("buscar");
  const [lista, setLista] = useState<Carga<ListaProfesores>>({ estado: "cargando" });
  const [dia, setDia] = useState<DiaSemana | null>(null);
  const [franja, setFranja] = useState<Franja | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [profesor, setProfesor] = useState<Profesor | null>(null);
  const [suyos, setSuyos] = useState<Carga<HuecosDeProfesor> | null>(null);
  const [destinos, setDestinos] = useState<(HuecoProfesor | null)[]>([]);
  const [clave, setClave] = useState<string | null>(null);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [hecho, setHecho] = useState<{ profesor: string; sesiones: SesionOrigen[] } | null>(null);
  const [enviando, iniciar] = useTransition();
  const enVuelo = useRef(false);
  const titulo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titulo.current?.focus();
  }, [paso]);

  // Hecho el cambio, «Mis clases» se vuelve a pedir debajo. La acción ya
  // ha tirado la caché del alumno.
  useEffect(() => {
    if (paso === "hecho") router.refresh();
  }, [paso, router]);

  function cargarLista(mensaje: string | null = null) {
    setAviso(mensaje);
    setProfesor(null);
    setSuyos(null);
    setDestinos([]);
    setClave(null);
    setFallo(null);
    setLista({ estado: "cargando" });
    setPaso("buscar");
    void (async () => {
      let r: LecturaAutoservicio<ListaProfesores>;
      try {
        r = await acciones.lista();
      } catch {
        r = { ok: false, codigo: "GENERICO" };
      }
      setLista(r.ok ? { estado: "listo", datos: r.datos } : { estado: "error", codigo: r.codigo });
    })();
  }

  // Al abrir, la lista. Una sola vez: los filtros se aplican aquí.
  const abierta = useRef(false);
  useEffect(() => {
    if (abierta.current) return;
    abierta.current = true;
    cargarLista();
  });

  // Las sesiones a las que hay que dar destino: las de ese profesor si ya
  // se han pedido, si no las de la lista.
  const sesiones: SesionOrigen[] =
    suyos?.estado === "listo" ? suyos.datos.sesiones.map((s) => s.sesion) : lista.estado === "listo" ? lista.datos.sesiones : [];

  function irAConfirmar() {
    // Un intento nuevo: clave nueva. Los toques y reintentos de este
    // mismo intento reutilizan esta.
    setClave(nuevaClave());
    setFallo(null);
    setPaso("confirmar");
  }

  function cargarSuyos(p: Profesor, primero: HuecoProfesor | null, mensaje: string | null = null) {
    setAviso(mensaje);
    setSuyos({ estado: "cargando" });
    setDestinos([]);
    setPaso("repartir");
    void (async () => {
      let r: LecturaAutoservicio<HuecosDeProfesor>;
      try {
        r = await acciones.deProfesor(p.id);
      } catch {
        r = { ok: false, codigo: "GENERICO" };
      }
      if (!r.ok) {
        if (OTRO_PROFESOR.includes(r.codigo)) cargarLista(t.motivoProfesor(r.codigo));
        else setSuyos({ estado: "error", codigo: r.codigo });
        return;
      }
      setSuyos({ estado: "listo", datos: r.datos });
      // El hueco elegido en la lista queda puesto en su primera sesión si
      // sigue entre los suyos; el resto, por elegir.
      const sigue = primero ? r.datos.sesiones[0]?.huecos.find((h) => h.dia === primero.dia && h.hora === primero.hora) ?? null : null;
      setDestinos(r.datos.sesiones.map((_, i) => (i === 0 ? sigue : null)));
    })();
  }

  function elegirHueco(h: HuecoProfesor) {
    if (lista.estado !== "listo") return;
    setProfesor(h.profesor);
    if (lista.datos.sesiones.length === 1) {
      setSuyos(null);
      setDestinos([h]);
      irAConfirmar();
    } else {
      cargarSuyos(h.profesor, h);
    }
  }

  function confirmar() {
    if (!profesor || !clave || enVuelo.current || !destinosListos(sesiones, destinos)) return;
    const elegidos = destinos;
    enVuelo.current = true;
    iniciar(async () => {
      let r: ResultadoCambioProfesor;
      try {
        r = await acciones.cambiar({ profesorId: profesor.id, destinos: elegidos.map(aDestino), idempotencyKey: clave });
      } catch {
        r = { ok: false, codigo: "GENERICO", mensaje: null, disponibleDesde: null };
      }
      enVuelo.current = false;
      if (r.ok) {
        setHecho({ profesor: r.profesorNuevo || profesor.nombre, sesiones: r.sesionesDespues.length > 0 ? r.sesionesDespues : elegidos });
        setPaso("hecho");
      } else if (r.codigo === "HUECO_YA_OCUPADO" || r.codigo === "SLOT_NO_DISPONIBLE") {
        // Sin salir del flujo: los huecos otra vez, ya sin el ocupado.
        if (sesiones.length > 1) cargarSuyos(profesor, null, t.ocupado);
        else cargarLista(t.ocupado);
      } else if (OTRO_PROFESOR.includes(r.codigo)) {
        cargarLista(t.motivoProfesor(r.codigo));
      } else {
        // Sus clases han cambiado por otro lado: lo de debajo se pone al día.
        if (r.codigo === "ASIGNACION_CAMBIADA" || r.codigo === "SESION_NO_ENCONTRADA") router.refresh();
        setFallo({ codigo: r.codigo, disponibleDesde: r.disponibleDesde });
      }
    });
  }

  const tramo = (h: { hora: string; duracion: number }) => [h.hora, horaFin(h.hora, h.duracion)] as const;
  const describe = (s: SesionOrigen) => t.sesion(s.dia, ...tramo(s));
  const resultados = lista.estado === "listo" ? filtrarHuecos(lista.datos.huecos, dia, franja) : [];
  const listos = destinosListos(sesiones, destinos);
  const reparto = suyos?.estado === "listo" ? estadoReparto(sesiones, suyos.datos.sesiones.map((s) => s.huecos), destinos) : null;
  /** Las duraciones de las clases sin hueco, sin repetir: «tu clase de 2 horas» una vez. */
  const horasSinHueco = reparto ? Array.from(new Set(reparto.sinHueco.map((i) => sesiones[i].duracion))) : [];
  const atascado = reparto !== null && (reparto.sinHueco.length > 0 || reparto.imposible);
  const sinRepetir = fallo !== null && SIN_REPETIR.includes(fallo.codigo);
  const textoFallo = (f: Fallo) =>
    f.codigo === "ANTELACION_INSUFICIENTE"
      ? t.profesorNoDisponible({ puede: false, motivo: f.codigo, disponibleDesde: f.disponibleDesde })
      : t.motivoProfesor(f.codigo);
  const leyendo = (codigo: CodigoAutoservicio) => (codigo === "GENERICO" ? t.motivoAlLeer("GENERICO") : t.motivoProfesor(codigo));

  const pieWhatsApp = (
    <div className="mt-6 border-t border-marca-borde pt-4">
      <p className="mb-2 text-[15px] font-semibold text-marca-tinta">{t.noEncuentras}</p>
      <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
    </div>
  );

  return (
    <div>
      <div ref={titulo} tabIndex={-1} className="outline-none" />
      {simulado && <p className="mb-3 rounded-[10px] bg-marca-niebla px-3 py-2 text-[13px] font-semibold text-marca-gris">{t.simulacion}</p>}

      {paso === "buscar" && (
        <>
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
          {aviso && (
            <div className="mt-3">
              <Aviso role="status">{aviso}</Aviso>
            </div>
          )}
          <div className="mt-3" aria-busy={lista.estado === "cargando"}>
            {lista.estado === "cargando" && <p className="text-[15px] text-marca-gris">{t.cargandoProfesores}</p>}
            {lista.estado === "error" && (
              <div className="flex flex-col gap-3">
                <Aviso role="alert">{leyendo(lista.codigo)}</Aviso>
                <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
              </div>
            )}
            {lista.estado === "listo" &&
              (lista.datos.huecos.length === 0 ? (
                <Aviso>{t.sinProfesores}</Aviso>
              ) : resultados.length === 0 ? (
                <Aviso>{t.sinResultados}</Aviso>
              ) : (
                <div className="flex flex-col gap-5">
                  {agruparPorProfesor(resultados).map((g) => (
                    <section key={g.profesor.id} aria-label={g.profesor.nombre}>
                      <h3 className="text-[16px] font-bold text-marca-tinta">{g.profesor.nombre}</h3>
                      <ul className="mt-2 grid grid-cols-1 gap-2 min-[500px]:grid-cols-2">
                        {g.huecos.map((h) => (
                          <li key={`${h.dia}-${h.hora}`}>
                            <BotonHueco h={h} t={t} alPulsar={() => elegirHueco(h)} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ))}
          </div>
          {lista.estado !== "error" && pieWhatsApp}
        </>
      )}

      {paso === "repartir" && profesor && suyos && (
        <>
          <Volver texto={t.volver} alPulsar={() => setPaso("buscar")} />
          <TituloPaso>{t.repartirTitulo(profesor.nombre)}</TituloPaso>
          {sesiones.length > 1 && <p className="mt-1 text-[15px] text-marca-gris">{t.repartirDetalle(sesiones.length)}</p>}
          <p className="mt-1 text-[14px] text-marca-gris">{t.horaPeninsular}</p>
          {aviso && (
            <div className="mt-3">
              <Aviso role="status">{aviso}</Aviso>
            </div>
          )}
          <div className="mt-4" aria-busy={suyos.estado === "cargando"}>
            {suyos.estado === "cargando" && <p className="text-[15px] text-marca-gris">{t.cargando}</p>}
            {suyos.estado === "error" && (
              <div className="flex flex-col gap-3">
                <Aviso role="alert">{leyendo(suyos.codigo)}</Aviso>
                <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
              </div>
            )}
            {suyos.estado === "listo" && reparto && (
              <div className="flex flex-col gap-6">
                {atascado && (
                  <div className="flex flex-col gap-3">
                    <Aviso role="alert">
                      {reparto.imposible ? t.noCabenTodas : horasSinHueco.map((h) => <p key={h}>{t.sinHuecoPara(h)}</p>)}
                    </Aviso>
                    <div className="flex flex-col gap-2.5 min-[500px]:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null);
                          setPaso("buscar");
                        }}
                        className="btn-verde inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-[15.5px] font-bold min-[500px]:w-auto"
                      >
                        {t.otroProfesor}
                      </button>
                      <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
                    </div>
                  </div>
                )}
                {suyos.datos.sesiones.map(({ sesion, huecos }, i) => (
                  <fieldset key={i}>
                    <legend className="text-[16px] font-bold text-marca-tinta">{t.tuClaseDe(sesion.dia, sesion.duracion)}</legend>
                    <p className="text-[14px] text-marca-gris">{t.ahora(...tramo(sesion))}</p>
                    {huecos.length === 0 ? (
                      <div className="mt-2">
                        <Aviso>{t.sinHuecoPara(sesion.duracion)}</Aviso>
                      </div>
                    ) : (
                      <ul className="mt-2 grid grid-cols-1 gap-2 min-[500px]:grid-cols-2">
                        {huecos.map((h) => {
                          const elegido = destinos[i]?.dia === h.dia && destinos[i]?.hora === h.hora;
                          return (
                            <li key={`${h.dia}-${h.hora}`}>
                              <BotonHueco
                                h={h}
                                t={t}
                                elegido={elegido}
                                desactivado={!elegido && !cabe(h, i, destinos)}
                                alPulsar={() => setDestinos((ds) => ds.map((d, j) => (j === i ? h : d)))}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </fieldset>
                ))}
                <div className="flex flex-col gap-2.5">
                  <p aria-live="polite" className="text-center text-[15px] font-semibold text-marca-tinta">
                    {t.contadorClases(reparto.elegidas, reparto.total)}
                  </p>
                  <button
                    type="button"
                    onClick={irAConfirmar}
                    disabled={!reparto.listo}
                    className="btn-verde inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[16px] font-bold disabled:opacity-50"
                  >
                    {t.continuar}
                  </button>
                </div>
              </div>
            )}
          </div>
          {suyos.estado !== "error" && !atascado && pieWhatsApp}
        </>
      )}

      {paso === "confirmar" && profesor && listos && (
        <>
          {fallo?.codigo !== "A_MEDIAS" && <Volver texto={t.volver} alPulsar={() => setPaso(sesiones.length > 1 ? "repartir" : "buscar")} />}
          <TituloPaso>{t.confirmaTitulo}</TituloPaso>
          <dl className="mt-4 overflow-hidden rounded-[14px] border border-marca-borde">
            <div className="bg-marca-niebla px-4 py-3">
              <dt className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-gris">{t.antes}</dt>
              {sesiones.map((s, i) => (
                <dd key={i} className="mt-0.5 text-[16px] text-marca-tintaMedia line-through decoration-marca-grisSuave">
                  {describe(s)}
                </dd>
              ))}
              {profesorActual && <dd className="text-[14px] text-marca-gris">{t.conProfesor(profesorActual)}</dd>}
            </div>
            <div className="border-t border-marca-borde bg-white px-4 py-3">
              <dt className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-verdeOsc">{t.despues}</dt>
              {destinos.map((d, i) =>
                d ? (
                  <dd key={i} className="mt-0.5">
                    <span className="block text-[17px] font-bold text-marca-tinta">{describe(d)}</span>
                    {d.primeraClase && <span className="block text-[13.5px] text-marca-gris">{t.primeraClaseCorta(d.primeraClase)}</span>}
                  </dd>
                ) : null
              )}
              <dd className="mt-1 text-[14px] text-marca-gris">
                {t.desdeAhora} · {t.conProfesor(profesor.nombre)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[13.5px] text-marca-gris">{t.enlaceCambia}</p>
          <p className="text-[13.5px] text-marca-gris">{t.horaPeninsular}</p>

          {fallo && (
            <div className="mt-4 flex flex-col gap-3">
              <Aviso role="alert">{textoFallo(fallo)}</Aviso>
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
            </div>
          )}

          {sinRepetir ? (
            <button
              type="button"
              onClick={alCerrar}
              className="btn-verde mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[16px] font-bold"
            >
              {t.cerrar}
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className="btn-verde mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[16px] font-bold disabled:opacity-60"
            >
              {enviando ? t.enviando : t.confirmar}
            </button>
          )}
        </>
      )}

      {paso === "hecho" && hecho && (
        <>
          <TituloPaso>{t.hechoProfesorTitulo}</TituloPaso>
          <div className="mt-3">
            <Aviso tono="ok" role="status">
              <p className="font-semibold">{t.hechoProfesor(hecho.profesor)}</p>
              <ul className="mt-1">
                {hecho.sesiones.map((s, i) => (
                  <li key={i}>{describe(s)}</li>
                ))}
              </ul>
              <p className="mt-2">{t.hechoProfesorAviso}</p>
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
