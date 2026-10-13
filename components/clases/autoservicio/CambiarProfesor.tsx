"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { cambiarProfesorAutoservicio, horariosProfesorAutoservicio } from "@/app/acciones-autoservicio";
import type { DiaSemana } from "@/lib/clases";
import { DIAS_LABORABLES, FRANJAS, filtrarHuecos, horaFin, type Franja } from "@/lib/autoservicio/franjas";
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
import { Aviso, BotonWhatsApp, ListaDeHuecos, TituloPaso, Volver, nuevaClave } from "@/components/clases/autoservicio/Piezas";

/**
 * «CAMBIAR DE PROFESOR», CONTRA EL CONTRATO V3 DE GESTIÓN.
 *
 * EL ALUMNO NO VE PROFESORES: elige los horarios que le vienen bien y
 * Gestión le asigna el profesor que mejor encaje. El nombre sale por
 * primera vez en «hecho», de la respuesta del POST.
 *
 *   1. elegir     una fila por cada clase actual («Tu clase de 1 hora»),
 *                 en el orden de Gestión. Se elige de una en una: la
 *                 fila activa tiene sus filtros de día y franja y la
 *                 lista de horarios; las de encima, lo elegido y
 *                 «Cambiar»; las de debajo esperan. Cada horario elegido
 *                 pide los de la siguiente mandando los `elegidos`, y
 *                 Gestión solo devuelve los que un MISMO profesor puede
 *                 cubrir junto con ellos. Contador «Has elegido 2 de 3
 *                 clases» y «Continuar» solo con todas elegidas. Si para
 *                 la siguiente no queda nada, se dice con calma y se
 *                 ofrece cambiar lo elegido o el WhatsApp.
 *   2. confirmar  antes y después, sin nombre: «con tu nuevo profesor»
 *   3. hecho      «Tu nuevo profesor es Daniela», avisado, con su ficha,
 *                 correo de bienvenida y el enlace
 *
 * LAS SESIONES SALEN DE LA RESPUESTA DE GESTIÓN, no del estado: con el
 * calendario de su profesor sin actualizar el estado llega sin sesiones
 * y, aun así, puede cambiar de profesor.
 *
 * LOS FILTROS SE APLICAN AQUÍ: se pide una vez por paso y filtrar no
 * vuelve a preguntar a Gestión.
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
  horarios: (elegidos: SesionOrigen[]) => Promise<LecturaAutoservicio<HorariosProfesor>>;
  cambiar: (peticion: PeticionCambioProfesor) => Promise<ResultadoCambioProfesor>;
};

const DE_SERVIDOR: AccionesProfesor = {
  horarios: horariosProfesorAutoservicio,
  cambiar: cambiarProfesorAutoservicio,
};

type Paso = "elegir" | "confirmar" | "hecho";
type Carga<T> = { estado: "cargando" } | { estado: "listo"; datos: T } | { estado: "error"; codigo: CodigoAutoservicio };
type Fallo = { codigo: CodigoAutoservicio; disponibleDesde: Momento | null };

/** Lo elegido ya no lo cubre nadie: se vuelve a elegir desde el principio. */
const VOLVER_A_ELEGIR: CodigoAutoservicio[] = ["HUECO_YA_OCUPADO", "SLOT_NO_DISPONIBLE"];

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

  const [paso, setPaso] = useState<Paso>("elegir");
  const [sesiones, setSesiones] = useState<SesionOrigen[] | null>(null);
  const [elegidos, setElegidos] = useState<HorarioNuevo[]>([]);
  /** Los horarios para la siguiente clase (la de índice `elegidos.length`). */
  const [carga, setCarga] = useState<Carga<HorarioNuevo[]>>({ estado: "cargando" });
  const [dia, setDia] = useState<DiaSemana | null>(null);
  const [franja, setFranja] = useState<Franja | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [hecho, setHecho] = useState<{ profesor: string; sesiones: SesionOrigen[] } | null>(null);
  const [enviando, iniciar] = useTransition();
  const enVuelo = useRef(false);
  /** El último pedido: si llega uno viejo (cambió de idea a mitad), se descarta. */
  const pedido = useRef(0);
  const titulo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titulo.current?.focus();
  }, [paso]);

  // Hecho el cambio, «Mis clases» se vuelve a pedir debajo. La acción ya
  // ha tirado la caché del alumno.
  useEffect(() => {
    if (paso === "hecho") router.refresh();
  }, [paso, router]);

  /**
   * Deja los elegidos en `nuevos` y pide los horarios de la siguiente
   * clase. Con todas elegidas no hace falta: el POST revalida.
   */
  function pedir(nuevos: HorarioNuevo[], mensaje: string | null = null) {
    const n = ++pedido.current;
    setAviso(mensaje);
    setElegidos(nuevos);
    setDia(null);
    setFranja(null);
    setFallo(null);
    setPaso("elegir");
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
      if (n !== pedido.current) return;
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

  // Al abrir, los horarios de la primera clase.
  const abierta = useRef(false);
  useEffect(() => {
    if (abierta.current) return;
    abierta.current = true;
    pedir([]);
  });

  function irAConfirmar() {
    // Un intento nuevo: clave nueva. Los toques y reintentos de este
    // mismo intento reutilizan esta.
    setClave(nuevaClave());
    setFallo(null);
    setPaso("confirmar");
  }

  function confirmar() {
    if (!sesiones || !clave || enVuelo.current || !destinosListos(sesiones, elegidos)) return;
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
        setHecho({ profesor: r.profesorNuevo, sesiones: r.sesionesDespues.length > 0 ? r.sesionesDespues : destinos });
        setPaso("hecho");
      } else if (VOLVER_A_ELEGIR.includes(r.codigo)) {
        // Sin salir del flujo: a elegir otra vez, ya sin lo ocupado.
        pedir([], t.elegidosOcupados);
      } else {
        // Sus clases han cambiado por otro lado: lo de debajo se pone al día.
        if (r.codigo === "ASIGNACION_CAMBIADA" || r.codigo === "SESION_NO_ENCONTRADA") router.refresh();
        setFallo({ codigo: r.codigo, disponibleDesde: r.disponibleDesde });
      }
    });
  }

  const tramo = (h: { hora: string; duracion: number }) => [h.hora, horaFin(h.hora, h.duracion)] as const;
  const describe = (s: SesionOrigen) => t.sesion(s.dia, ...tramo(s));
  const total = sesiones?.length ?? 0;
  const activa = sesiones ? siguienteSesion(sesiones, elegidos) : null;
  const listos = sesiones !== null && destinosListos(sesiones, elegidos);
  const visibles = carga.estado === "listo" ? filtrarHuecos(carga.datos, dia, franja) : [];
  /** Sin horarios para la clase que toca: su aviso ya lleva el WhatsApp. */
  const atascado = carga.estado === "listo" && activa !== null && carga.datos.length === 0;
  const sinRepetir = fallo !== null && SIN_REPETIR.includes(fallo.codigo);
  const textoFallo = (f: Fallo) =>
    f.codigo === "ANTELACION_INSUFICIENTE"
      ? t.profesorNoDisponible({ puede: false, motivo: f.codigo, disponibleDesde: f.disponibleDesde })
      : t.motivoProfesor(f.codigo);
  const leyendo = (codigo: CodigoAutoservicio) => (codigo === "GENERICO" ? t.motivoAlLeer("GENERICO") : t.motivoProfesor(codigo));

  const errorAlLeer = (codigo: CodigoAutoservicio) => (
    <div className="flex flex-col gap-3">
      <Aviso role="alert">{leyendo(codigo)}</Aviso>
      <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
    </div>
  );

  /** La fila de la clase a la que le toca: filtros y horarios. */
  function filaActiva(i: number) {
    if (carga.estado === "cargando") return <p className="mt-3 text-[15px] text-marca-gris">{t.cargandoHorarios}</p>;
    if (carga.estado === "error") return <div className="mt-3">{errorAlLeer(carga.codigo)}</div>;
    if (carga.datos.length === 0) {
      // Para la primera, nadie tiene nada; para otra, con lo elegido no queda nadie.
      return i === 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          <Aviso>{t.sinHorarios}</Aviso>
          <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <Aviso role="status">{t.sinHorariosParaOtra(total - i)}</Aviso>
          <div className="flex flex-col gap-2.5 min-[500px]:flex-row">
            <button
              type="button"
              onClick={() => pedir([])}
              className="btn-verde inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-[15.5px] font-bold min-[500px]:w-auto"
            >
              {t.cambiarElegidos}
            </button>
            <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t.cualquierDia}>
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
        <div className="mt-4">
          {visibles.length === 0 ? (
            <Aviso>{t.sinResultados}</Aviso>
          ) : (
            <ListaDeHuecos huecos={visibles} t={t} alElegir={(h) => pedir(elegir(elegidos, h))} />
          )}
        </div>
      </>
    );
  }

  return (
    <div>
      <div ref={titulo} tabIndex={-1} className="outline-none" />
      {simulado && <p className="mb-3 rounded-[10px] bg-marca-niebla px-3 py-2 text-[13px] font-semibold text-marca-gris">{t.simulacion}</p>}

      {paso === "elegir" && (
        <>
          <TituloPaso>{t.profesorTitulo}</TituloPaso>
          <p className="mt-1 text-[15px] text-marca-gris">{t.profesorIntro}</p>
          <p className="mt-1 text-[14px] text-marca-gris">{t.horaPeninsular}</p>
          {aviso && (
            <div className="mt-3">
              <Aviso role="status">{aviso}</Aviso>
            </div>
          )}

          <div className="mt-4" aria-busy={carga.estado === "cargando"}>
            {!sesiones ? (
              carga.estado === "error" ? (
                errorAlLeer(carga.codigo)
              ) : (
                <p className="text-[15px] text-marca-gris">{t.cargandoHorarios}</p>
              )
            ) : (
              <div className="flex flex-col gap-4">
                {sesiones.map((s, i) => {
                  const elegido = elegidos[i];
                  return (
                    <section
                      key={i}
                      aria-labelledby={`clase-${i}`}
                      className={`rounded-[14px] border px-4 py-3.5 ${i === activa ? "border-marca-verde bg-white" : "border-marca-borde bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 id={`clase-${i}`} className="text-[16px] font-bold text-marca-tinta">
                            {t.tuClaseDe(s.duracion)}
                          </h3>
                          <p className="text-[14px] text-marca-gris">{t.ahora(s.dia, ...tramo(s))}</p>
                        </div>
                        {elegido && (
                          <button
                            type="button"
                            onClick={() => pedir(cambiarDesde(elegidos, i))}
                            aria-label={t.cambiarEsteEtiqueta(s.duracion)}
                            className="-mr-1 inline-flex min-h-[44px] shrink-0 items-center px-1 text-[15px] font-semibold text-marca-verdeOsc"
                          >
                            {t.cambiarEste}
                          </button>
                        )}
                      </div>
                      {elegido ? (
                        <div className="mt-2 rounded-[10px] bg-marca-niebla px-3 py-2">
                          <p className="text-[15.5px] font-bold text-marca-tinta">{describe(elegido)}</p>
                          {elegido.primeraClase && <p className="text-[13.5px] text-marca-gris">{t.primeraClaseCorta(elegido.primeraClase)}</p>}
                        </div>
                      ) : i === activa ? (
                        filaActiva(i)
                      ) : (
                        <p className="mt-2 text-[14px] text-marca-gris">{t.despuesDeLaAnterior}</p>
                      )}
                    </section>
                  );
                })}

                <div className="flex flex-col gap-2.5">
                  {total > 1 && (
                    <p aria-live="polite" className="text-center text-[15px] font-semibold text-marca-tinta">
                      {t.contadorClases(elegidos.length, total)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={irAConfirmar}
                    disabled={!listos}
                    className="btn-verde inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[16px] font-bold disabled:opacity-50"
                  >
                    {t.continuar}
                  </button>
                </div>
              </div>
            )}
          </div>

          {carga.estado !== "error" && !atascado && (
            <div className="mt-6 border-t border-marca-borde pt-4">
              <p className="mb-2 text-[15px] font-semibold text-marca-tinta">{t.noEncuentras}</p>
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
            </div>
          )}
        </>
      )}

      {paso === "confirmar" && sesiones && listos && (
        <>
          {fallo?.codigo !== "A_MEDIAS" && <Volver texto={t.volver} alPulsar={() => setPaso("elegir")} />}
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
              {elegidos.map((d, i) => (
                <dd key={i} className="mt-0.5">
                  <span className="block text-[17px] font-bold text-marca-tinta">{describe(d)}</span>
                  {d.primeraClase && <span className="block text-[13.5px] text-marca-gris">{t.primeraClaseCorta(d.primeraClase)}</span>}
                </dd>
              ))}
              <dd className="mt-1 text-[14px] text-marca-gris">
                {t.desdeAhora} · {t.conNuevoProfesor}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[13.5px] text-marca-gris">{t.asignamosAlConfirmar}</p>
          <p className="text-[13.5px] text-marca-gris">{t.enlaceCambia}</p>
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
              <p className="mt-1">{t.hechoProfesorAviso}</p>
              <p className="mt-2 font-semibold">{t.tusClasesDesdeAhora}</p>
              <ul className="mt-0.5">
                {hecho.sesiones.map((s, i) => (
                  <li key={i}>{describe(s)}</li>
                ))}
              </ul>
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
