"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { cambiarHorarioAutoservicio, huecosAutoservicio } from "@/app/acciones-autoservicio";
import { horaFin } from "@/lib/autoservicio/franjas";
import type {
  ClaseProxima,
  CodigoAutoservicio,
  EstadoAutoservicio,
  HuecoLibre,
  LecturaAutoservicio,
  ModoCambio,
  ResultadoCambio,
  Sesion,
} from "@/lib/autoservicio/tipos";
import { Aviso, BotonWhatsApp, ListaDeHuecos, Opcion, TituloPaso, Volver, nuevaClave } from "@/components/clases/autoservicio/Piezas";

/**
 * «CAMBIAR DE HORARIO», PASO A PASO.
 *
 * Con `TarjetaRecuperacion` de plantilla: un estado por paso, las
 * llamadas a Gestión por acciones de servidor, y lo que conteste Gestión
 * manda —si un hueco ya no está, se vuelve a la lista; si algo no se
 * puede, se explica y se ofrece el WhatsApp—.
 *
 *   1. sesion     solo si tiene más de una clase a la semana
 *   2. modo       «solo una clase» o «desde ahora, todas». Lo que
 *                 Gestión no deja mover sale desactivado, con el motivo
 *                 y, si lo sabe, desde cuándo se podrá
 *   3. fecha      solo en «solo una clase»: cuál de las próximas, igual
 *   4. huecos     los de su profesor, por día y franja
 *   5. confirmar  antes y después
 *   6. hecho
 *
 * EL DOBLE TOQUE NO HACE DOS CAMBIOS. La `idempotency_key` se crea al
 * entrar en «confirmar» con un destino elegido —una por intento, no por
 * clic—: si el alumno toca dos veces, o reintenta tras un fallo, Gestión
 * recibe la misma clave y aplica el cambio una sola vez. Además el botón
 * se desactiva al enviar, y `enVuelo` corta el segundo toque que llega
 * antes de que React lo pinte desactivado.
 *
 * QUÉ SE HACE CON CADA RESPUESTA DEL POST:
 *   · HUECO_YA_OCUPADO, SLOT_NO_DISPONIBLE: la lista otra vez, recargada.
 *   · MISMO_HORARIO: la lista otra vez, con el aviso.
 *   · SESION_NO_ENCONTRADA: el aviso, y «Mis clases» se recarga debajo.
 *   · EN_CURSO y el resto: el aviso; «Confirmar» repite con la misma
 *     clave, como pide el contrato.
 *   · A_MEDIAS: el aviso y solo «Cerrar». No se ofrece repetir.
 *
 * Vive dentro de la hoja: al cerrarla se desmonta, y al abrirla empieza
 * de cero.
 */

type Paso = "sesion" | "modo" | "fecha" | "huecos" | "confirmar" | "hecho";
type Huecos = { estado: "cargando" } | { estado: "listo"; lista: HuecoLibre[] } | { estado: "error"; codigo: CodigoAutoservicio };

export default function CambiarHorario({
  estado,
  whatsapp,
  alCerrar,
}: {
  estado: EstadoAutoservicio;
  whatsapp: string;
  alCerrar: () => void;
}) {
  const t = usarIdioma().t.autoservicio;
  const router = useRouter();
  const variasSesiones = estado.sesiones.length > 1;

  const [paso, setPaso] = useState<Paso>(variasSesiones ? "sesion" : "modo");
  const [sesion, setSesion] = useState<Sesion | null>(variasSesiones ? null : estado.sesiones[0] ?? null);
  const [modo, setModo] = useState<ModoCambio | null>(null);
  const [clase, setClase] = useState<ClaseProxima | null>(null);
  const [huecos, setHuecos] = useState<Huecos>({ estado: "cargando" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [destino, setDestino] = useState<HuecoLibre | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const [fallo, setFallo] = useState<CodigoAutoservicio | null>(null);
  const [fechaNueva, setFechaNueva] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const enVuelo = useRef(false);
  const titulo = useRef<HTMLDivElement>(null);

  // Al cambiar de paso, el foco va al principio: el lector de pantalla
  // lee el paso nuevo, y en móvil la hoja vuelve arriba.
  useEffect(() => {
    titulo.current?.focus();
  }, [paso]);

  // Hecho el cambio, «Mis clases» se vuelve a pedir debajo: el calendario
  // dice ya lo nuevo, cierre la hoja como la cierre.
  useEffect(() => {
    if (paso === "hecho") router.refresh();
  }, [paso, router]);

  /** `fecha`: en puntual, la clase que se mueve. */
  function cargarHuecos(m: ModoCambio, s: Sesion, fecha: string | null, mensaje: string | null = null) {
    setAviso(mensaje);
    setHuecos({ estado: "cargando" });
    setPaso("huecos");
    void (async () => {
      let r: LecturaAutoservicio<HuecoLibre[]>;
      try {
        r = await huecosAutoservicio(m, s.id, fecha);
      } catch {
        r = { ok: false, codigo: "GENERICO" };
      }
      if (!r.ok && r.codigo === "SESION_NO_ENCONTRADA") router.refresh();
      setHuecos(r.ok ? { estado: "listo", lista: r.datos } : { estado: "error", codigo: r.codigo });
    })();
  }

  function elegirModo(m: ModoCambio) {
    if (!sesion) return;
    setModo(m);
    if (m === "puntual") setPaso("fecha");
    else cargarHuecos(m, sesion, null);
  }

  function elegirDestino(h: HuecoLibre) {
    setDestino(h);
    // Un intento nuevo: clave nueva. Los toques y reintentos de este
    // mismo intento reutilizan esta.
    setClave(nuevaClave());
    setFallo(null);
    setPaso("confirmar");
  }

  function confirmar() {
    if (!sesion || !modo || !destino || !clave || enVuelo.current) return;
    enVuelo.current = true;
    iniciar(async () => {
      let r: ResultadoCambio;
      try {
        r = await cambiarHorarioAutoservicio({
          modo,
          sesionOrigen: { dia: sesion.dia, hora: sesion.hora, duracion: sesion.duracion },
          fechaOrigen: modo === "puntual" ? clase?.fecha ?? null : null,
          destino,
          idempotencyKey: clave,
        });
      } catch {
        r = { ok: false, codigo: "GENERICO", mensaje: null };
      }
      enVuelo.current = false;
      if (r.ok) {
        setFechaNueva(r.fechaNueva);
        setPaso("hecho");
      } else if (r.codigo === "HUECO_YA_OCUPADO" || r.codigo === "SLOT_NO_DISPONIBLE") {
        // Sin salir del flujo: la lista otra vez, ya sin ese hueco.
        setDestino(null);
        setClave(null);
        cargarHuecos(modo, sesion, modo === "puntual" ? clase?.fecha ?? null : null, t.ocupado);
      } else if (r.codigo === "MISMO_HORARIO") {
        setDestino(null);
        setClave(null);
        setAviso(t.motivo(r.codigo));
        setPaso("huecos");
      } else {
        // Gestión ya no tiene esa sesión: lo de debajo se pone al día.
        if (r.codigo === "SESION_NO_ENCONTRADA") router.refresh();
        setFallo(r.codigo);
      }
    });
  }

  const tramo = (h: { hora: string; duracion: number }) => [h.hora, horaFin(h.hora, h.duracion)] as const;
  const describeSesion = (s: Sesion) => t.sesion(s.dia, ...tramo(s));
  const describeDestino = (h: HuecoLibre) => (h.fecha ? t.clase(h.fecha, ...tramo(h)) : t.sesion(h.dia, ...tramo(h)));

  return (
    <div>
      <div ref={titulo} tabIndex={-1} className="outline-none" />

      {paso === "sesion" && (
        <>
          <TituloPaso>{t.queClase}</TituloPaso>
          <div className="mt-4 flex flex-col gap-2.5">
            {estado.sesiones.map((s) => (
              <Opcion
                key={s.id}
                titulo={describeSesion(s)}
                alPulsar={() => {
                  setSesion(s);
                  setPaso("modo");
                }}
              />
            ))}
          </div>
        </>
      )}

      {paso === "modo" && sesion && (
        <>
          {variasSesiones && <Volver texto={t.volver} alPulsar={() => setPaso("sesion")} />}
          <TituloPaso>{t.queCambio}</TituloPaso>
          <p className="mt-1 text-[15px] text-marca-gris">{describeSesion(sesion)}</p>
          <div className="mt-4 flex flex-col gap-2.5">
            <Opcion
              titulo={t.soloEsta}
              detalle={sesion.proximasClases.length > 0 ? t.soloEstaDetalle : t.sinProximas}
              desactivada={sesion.proximasClases.length === 0}
              alPulsar={() => elegirModo("puntual")}
            />
            <Opcion
              titulo={t.todas}
              detalle={sesion.fijo.movible ? t.todasDetalle : t.noMovible(sesion.fijo, "horario")}
              desactivada={!sesion.fijo.movible}
              alPulsar={() => elegirModo("fijo")}
            />
          </div>
          {!sesion.fijo.movible && (
            <div className="mt-4">
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
            </div>
          )}
        </>
      )}

      {paso === "fecha" && sesion && (
        <>
          <Volver texto={t.volver} alPulsar={() => setPaso("modo")} />
          <TituloPaso>{t.queFecha}</TituloPaso>
          <ul className="mt-4 flex flex-col gap-2.5">
            {sesion.proximasClases.map((c) => (
              <li key={c.fecha}>
                <Opcion
                  titulo={t.clase(c.fecha, ...tramo(c))}
                  detalle={c.movible ? undefined : t.noMovible(c, "clase")}
                  desactivada={!c.movible}
                  alPulsar={() => {
                    setClase(c);
                    cargarHuecos("puntual", sesion, c.fecha);
                  }}
                />
              </li>
            ))}
          </ul>
          {sesion.proximasClases.some((c) => !c.movible) && (
            <div className="mt-4">
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
            </div>
          )}
        </>
      )}

      {paso === "huecos" && sesion && modo && (
        <>
          <Volver texto={t.volver} alPulsar={() => setPaso(modo === "puntual" ? "fecha" : "modo")} />
          <TituloPaso>{t.huecosDe(estado.profesor)}</TituloPaso>
          <p className="mt-1 text-[14px] text-marca-gris">{t.horaPeninsular}</p>
          {aviso && (
            <div className="mt-3">
              <Aviso role="status">{aviso}</Aviso>
            </div>
          )}
          <div className="mt-4" aria-busy={huecos.estado === "cargando"}>
            {huecos.estado === "cargando" && <p className="text-[15px] text-marca-gris">{t.cargando}</p>}
            {huecos.estado === "error" && (
              <div className="flex flex-col gap-3">
                <Aviso role="alert">{t.motivoAlLeer(huecos.codigo)}</Aviso>
                <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
              </div>
            )}
            {huecos.estado === "listo" &&
              (huecos.lista.length === 0 ? (
                <Aviso>{t.sinHuecos}</Aviso>
              ) : (
                <ListaDeHuecos huecos={huecos.lista} t={t} alElegir={elegirDestino} />
              ))}
          </div>
          {huecos.estado !== "error" && (
            <div className="mt-6 border-t border-marca-borde pt-4">
              <p className="mb-2 text-[15px] font-semibold text-marca-tinta">{t.noEncuentras}</p>
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
            </div>
          )}
        </>
      )}

      {paso === "confirmar" && sesion && modo && destino && (
        <>
          {fallo !== "A_MEDIAS" && <Volver texto={t.volver} alPulsar={() => setPaso("huecos")} />}
          <TituloPaso>{t.confirmaTitulo}</TituloPaso>
          <dl className="mt-4 overflow-hidden rounded-[14px] border border-marca-borde">
            <div className="bg-marca-niebla px-4 py-3">
              <dt className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-gris">{t.antes}</dt>
              <dd className="mt-0.5 text-[16px] text-marca-tintaMedia line-through decoration-marca-grisSuave">
                {modo === "puntual" && clase ? t.clase(clase.fecha, ...tramo(clase)) : describeSesion(sesion)}
              </dd>
            </div>
            <div className="border-t border-marca-borde bg-white px-4 py-3">
              <dt className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-verdeOsc">{t.despues}</dt>
              <dd className="mt-0.5 text-[17px] font-bold text-marca-tinta">{describeDestino(destino)}</dd>
              <dd className="mt-0.5 text-[14px] text-marca-gris">
                {modo === "fijo" ? `${t.desdeAhora} · ` : ""}
                {estado.profesor ? t.conProfesor(estado.profesor) : ""}
              </dd>
              {modo === "fijo" && destino.primeraClase && (
                <dd className="text-[14px] text-marca-gris">{t.primeraClase(destino.primeraClase)}</dd>
              )}
            </div>
          </dl>
          <p className="mt-2 text-[13.5px] text-marca-gris">{t.horaPeninsular}</p>

          {fallo && (
            <div className="mt-4 flex flex-col gap-3">
              <Aviso role="alert">{t.motivo(fallo)}</Aviso>
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
            </div>
          )}

          {fallo === "A_MEDIAS" ? (
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

      {paso === "hecho" && destino && (
        <>
          <TituloPaso>{t.hechoTitulo}</TituloPaso>
          <div className="mt-3">
            <Aviso tono="ok" role="status">
              <p className="font-semibold">{modo === "fijo" ? t.hechoFijo(describeDestino(destino)) : t.hechoPuntual(describeDestino(destino))}</p>
              {modo === "fijo" && (fechaNueva ?? destino.primeraClase) && (
                <p className="mt-1">{t.primeraClase((fechaNueva ?? destino.primeraClase)!)}</p>
              )}
              <p className="mt-1">{t.hechoAviso}</p>
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
