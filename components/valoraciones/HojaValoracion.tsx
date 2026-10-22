"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import HojaInferior from "@/components/base/HojaInferior";
import AvatarProfesor from "@/components/AvatarProfesor";
import { usarIdioma } from "@/components/ProveedorIdioma";
import Estrellas from "@/components/valoraciones/Estrellas";
import { BOTON_LINEA, BOTON_VERDE, BOTON_APAGADO, FOCO } from "@/components/clases/autoservicio/Piezas";
import { enviarValoracion } from "@/app/acciones-valoraciones";
import { MAX_COMENTARIO, type Origen } from "@/lib/valoraciones";

// ---------------------------------------------------------------
// LA VALORACIÓN DE UNA CLASE: LA PIEZA CENTRAL
//
// La única que pregunta. La usan el pop-up de después de la clase
// (`PopupValoracion`) y el «Valorar clase» del historial (`ValorarClase`),
// y ninguno pinta estrellas ni formulario por su cuenta.
//
// En una `HojaInferior`: en móvil sube desde abajo; desde 900 px queda
// centrada como un cuadro. Cierra con la X, con «Ahora no», pulsando el
// fondo o con Escape; qué significa cerrar lo decide quien la abre
// (`alCerrar` dice si se llegó a enviar).
//
// EL ORDEN, DE ARRIBA ABAJO: quién dio la clase y la pregunta, las
// estrellas y su palabra, y solo después de elegir, el comentario. Enviar
// está gris hasta que hay estrellas.
//
// AL ENVIAR, LAS GRACIAS Y NADA MÁS. Sin confeti, sin puntos, sin
// celebración: el mensaje aparece en su sitio y la hoja se cierra sola a
// los dos segundos, o con «Cerrar».
//
// `vistaPrevia`: el equipo revisando una ficha la ve y la usa igual que
// el alumno, con una línea que lo avisa, y al enviar no se guarda nada.
// ---------------------------------------------------------------

/** El contador sale cuando queda poco. */
const AVISO_CONTADOR = MAX_COMENTARIO - 150;
const MS_GRACIAS = 2000;

export type Inicial = { estrellas: number | null; comentario: string | null };

export default function HojaValoracion({
  abierta,
  claseId,
  profesor,
  origen,
  inicial = null,
  vistaPrevia = false,
  alCerrar,
}: {
  abierta: boolean;
  claseId: string;
  profesor: string | null;
  origen: Origen;
  /** Lo que ya tenía, al editar. */
  inicial?: Inicial | null;
  /** El equipo revisando la ficha: todo igual, sin guardar. */
  vistaPrevia?: boolean;
  alCerrar: (enviada: boolean) => void;
}) {
  const { t } = usarIdioma();
  const tv = t.valoraciones;
  const titulo = profesor ? tv.titulo(profesor) : tv.tituloSinProfesor;
  const [enviada, setEnviada] = useState(false);

  // Cada vez que se abre, de cero.
  useEffect(() => {
    if (abierta) setEnviada(false);
  }, [abierta]);

  return (
    <HojaInferior abierta={abierta} alCerrar={() => alCerrar(enviada)} etiqueta={titulo} etiquetaCerrar={tv.cerrar}>
      <Formulario
        claseId={claseId}
        profesor={profesor}
        titulo={titulo}
        origen={origen}
        inicial={inicial}
        vistaPrevia={vistaPrevia}
        alEnviar={() => setEnviada(true)}
        alCerrar={(tras) => alCerrar(tras || enviada)}
      />
    </HojaInferior>
  );
}

function Formulario({
  claseId,
  profesor,
  titulo,
  origen,
  inicial,
  vistaPrevia,
  alEnviar,
  alCerrar,
}: {
  claseId: string;
  profesor: string | null;
  titulo: string;
  origen: Origen;
  inicial: Inicial | null;
  vistaPrevia: boolean;
  alEnviar: () => void;
  alCerrar: (enviada: boolean) => void;
}) {
  const { t } = usarIdioma();
  const tv = t.valoraciones;
  const idComentario = useId();
  const [estrellas, setEstrellas] = useState<number | null>(inicial?.estrellas ?? null);
  const [comentario, setComentario] = useState(inicial?.comentario ?? "");
  const [estado, setEstado] = useState<"editando" | "gracias" | "error">("editando");
  const [enviando, empezar] = useTransition();
  const cerrarGracias = useRef<HTMLButtonElement>(null);
  // En una referencia: quien abre la hoja la pasa nueva en cada render, y
  // el reloj de las gracias no tiene que volver a empezar por eso.
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  // Las gracias se quedan dos segundos y la hoja se cierra sola.
  useEffect(() => {
    if (estado !== "gracias") return;
    cerrarGracias.current?.focus({ preventScroll: true });
    const reloj = setTimeout(() => cerrar.current(true), MS_GRACIAS);
    return () => clearTimeout(reloj);
  }, [estado]);

  function enviar() {
    if (estrellas === null || enviando) return;
    if (vistaPrevia) {
      setEstado("gracias");
      return;
    }
    empezar(async () => {
      const resultado = await enviarValoracion({ claseId, estrellas, comentario: comentario.trim() || null, origen }).catch(() => null);
      if (resultado?.ok) {
        alEnviar();
        setEstado("gracias");
      } else {
        setEstado("error");
      }
    });
  }

  if (estado === "gracias") {
    return (
      <div role="status" className="aparece flex flex-col items-center gap-5 pb-1 pt-4 text-center">
        <p className="font-display text-[22px] font-bold leading-tight text-marca-tinta">{tv.gracias}</p>
        <button ref={cerrarGracias} type="button" onClick={() => alCerrar(true)} className={`${BOTON_LINEA} max-w-[320px]`}>
          {tv.cerrar}
        </button>
      </div>
    );
  }

  const etiqueta = estrellas !== null ? tv.etiquetas[estrellas - 1] : tv.eligeEstrellas;

  return (
    <div className="font-sans">
      <div className="flex items-start gap-3">
        {profesor && <AvatarProfesor nombre={profesor} />}
        <h2 className="min-w-0 flex-1 text-pretty pt-1 font-display text-[22px] font-bold leading-[1.2] text-marca-tinta min-[900px]:text-[24px]">
          {titulo}
        </h2>
        <button
          type="button"
          onClick={() => alCerrar(false)}
          aria-label={tv.cerrar}
          className={`-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-marca-gris transition-colors hover:bg-marca-niebla hover:text-marca-tinta ${FOCO}`}
        >
          <svg aria-hidden viewBox="0 0 20 20" width="18" height="18">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="mt-2 text-pretty text-[15px] leading-[1.45] text-marca-tintaMedia">{tv.subtitulo}</p>
      {vistaPrevia && (
        <p className="mt-3 rounded-[12px] bg-marca-niebla px-4 py-2.5 text-[14px] leading-[1.4] text-marca-tintaMedia">{tv.vistaPrevia}</p>
      )}

      <div className="mt-6">
        <Estrellas valor={estrellas} alCambiar={setEstrellas} t={tv} />
        <p
          aria-live="polite"
          className={`mt-1 text-center text-[16px] font-semibold ${estrellas !== null ? "text-marca-tinta" : "text-marca-gris"}`}
        >
          {etiqueta}
        </p>
      </div>

      {estrellas !== null && (
        <div className="aparece mt-5">
          <label htmlFor={idComentario} className="sr-only">
            {tv.comentarioEtiqueta}
          </label>
          <textarea
            id={idComentario}
            value={comentario}
            onChange={(e) => setComentario(e.target.value.slice(0, MAX_COMENTARIO))}
            maxLength={MAX_COMENTARIO}
            rows={3}
            placeholder={tv.comentarioPlaceholder}
            className="block w-full resize-y rounded-[14px] border border-marca-borde bg-marca-niebla px-4 py-3 text-[16px] leading-[1.45] text-marca-tinta placeholder:text-marca-gris focus:border-marca-verde focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-marca-verde/40"
          />
          {comentario.length >= AVISO_CONTADOR && (
            <p className="mt-1 text-right text-[13px] tabular-nums text-marca-gris">{tv.contador(comentario.length, MAX_COMENTARIO)}</p>
          )}
        </div>
      )}

      {estado === "error" && (
        <p role="alert" className="mt-4 rounded-[12px] bg-marca-niebla px-4 py-3 text-[15px] leading-[1.4] text-marca-tinta">
          {tv.noSeGuardo}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2.5 min-[900px]:flex-row-reverse">
        <button
          type="button"
          onClick={enviar}
          disabled={estrellas === null || enviando}
          className={estrellas === null ? BOTON_APAGADO : BOTON_VERDE}
        >
          {enviando ? tv.enviando : tv.enviar}
        </button>
        <button type="button" onClick={() => alCerrar(false)} className={BOTON_LINEA}>
          {tv.ahoraNo}
        </button>
      </div>
    </div>
  );
}
