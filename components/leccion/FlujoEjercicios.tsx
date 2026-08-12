"use client";

import { useEffect, useState } from "react";
import { normalizarRespuesta } from "@/lib/validarBloque";
import { huecosAceptados, indicesCorrectos, type EjercicioVista } from "@/lib/ejercicios";
import BotonCompletar from "@/components/leccion/BotonCompletar";

/**
 * Los ejercicios de la lección, de uno en uno.
 *
 * ANTES SE APILABAN LOS CINCO en una sola página. Con cinco enunciados,
 * veinte opciones y cinco avisos de corrección a la vista, el alumno
 * leía el siguiente ejercicio mientras respondía el anterior. De uno en
 * uno cada pantalla tiene una sola pregunta y una sola decisión.
 *
 * NINGUNO DE LOS 1.492 EJERCICIOS TIENE EXPLICACIÓN: el campo viene
 * vacío en todo el export de LearnDash. Así que al fallar se dice cuál
 * era la respuesta y se calla; inventar un porqué sería ponerle a la
 * academia palabras que no ha dicho. Y el bloque de corrección mide lo
 * que mide su única línea: reservar sitio para una explicación que no
 * llega deja un hueco que parece contenido sin cargar.
 *
 * NO AUTOAVANZA al responder. La corrección es lo que el alumno ha
 * venido a leer; llevárselo de pantalla en cuanto pulsa se la quita.
 */

const NUMEROS = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
const LETRAS = "ABCDEFGH";

function enLetras(n: number): string {
  return NUMEROS[n] ?? String(n);
}

/** "a, b y c" */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/**
 * Deja constancia del intento sin que el alumno espere: la corrección ya
 * está pintada cuando esto sale. `keepalive` para que sobreviva si
 * responde el último y sigue en el mismo gesto. Que falle no se le
 * cuenta a nadie: perder un intento no puede cortar la lección.
 */
function registrarIntento(ejercicioId: string, correcto: boolean) {
  void fetch("/api/intento-ejercicio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ejercicioId, correcto }),
    keepalive: true,
  }).catch((error) => {
    console.error("[leccion] No se pudo registrar el intento:", error);
  });
}

type Estado = {
  /** Opciones marcadas. Vacío mientras no ha tocado nada. */
  elegidas: number[];
  /** Confirmado: en single basta con pulsar; en multiple, con "Comprobar". */
  resuelto: boolean;
  /** Lo escrito en cada hueco. */
  huecos: string[];
  /** Corregido por hueco: null mientras no ha salido del campo. */
  huecosOk: (boolean | null)[];
};

const VACIO = (ejercicio: EjercicioVista): Estado => ({
  elegidas: [],
  resuelto: false,
  huecos: huecosAceptados(ejercicio.correcta).map(() => ""),
  huecosOk: huecosAceptados(ejercicio.correcta).map(() => null),
});

export default function FlujoEjercicios({
  ejercicios,
  registrarIntentos,
  profesor,
  leccionId,
  cursoSlug,
  siguienteId,
  alSalir,
}: {
  ejercicios: EjercicioVista[];
  /** false para el equipo: revisa el curso, no lo cursa. */
  registrarIntentos: boolean;
  /** Va en el cierre: es lo que hace que esto no parezca una app genérica. */
  profesor: string;
  leccionId: string;
  cursoSlug: string;
  siguienteId: string | null;
  alSalir: () => void;
}) {
  const [indice, setIndice] = useState(0);
  const [cerrado, setCerrado] = useState(false);
  const [estados, setEstados] = useState<Estado[]>(() => ejercicios.map(VACIO));

  const ejercicio = ejercicios[indice];
  const estado = estados[indice];

  const cambiar = (parcial: Partial<Estado>) =>
    setEstados((previos) => previos.map((e, i) => (i === indice ? { ...e, ...parcial } : e)));

  // --- lo que sabe de cada ejercicio ---
  const correctas = indicesCorrectos(ejercicio?.correcta);
  const aceptados = huecosAceptados(ejercicio?.correcta);
  const esHuecos = ejercicio?.tipo === "cloze";
  const esMultiple = ejercicio?.tipo === "multiple";

  const respondido = (i: number): boolean => {
    const e = estados[i];
    const ej = ejercicios[i];
    if (!e || !ej) return false;
    if (ej.tipo === "cloze") return e.huecosOk.length > 0 && e.huecosOk.every((v) => v !== null);
    return e.resuelto;
  };

  const acertado = (i: number): boolean => {
    const e = estados[i];
    const ej = ejercicios[i];
    if (!e || !ej) return false;
    if (ej.tipo === "cloze") return e.huecosOk.every((v) => v === true);
    const suyas = indicesCorrectos(ej.correcta);
    return (
      e.elegidas.length === suyas.length && [...e.elegidas].sort().join() === [...suyas].sort().join()
    );
  };

  const yaRespondido = respondido(indice);
  const yaAcertado = acertado(indice);

  // --- acciones ---
  function elegir(i: number) {
    if (yaRespondido) return;

    if (esMultiple) {
      cambiar({
        elegidas: estado.elegidas.includes(i)
          ? estado.elegidas.filter((x) => x !== i)
          : [...estado.elegidas, i],
      });
      return;
    }

    cambiar({ elegidas: [i], resuelto: true });
    if (registrarIntentos) registrarIntento(ejercicio.id, correctas.includes(i));
  }

  function comprobarMultiple() {
    const bien =
      estado.elegidas.length === correctas.length &&
      [...estado.elegidas].sort().join() === [...correctas].sort().join();
    cambiar({ resuelto: true });
    if (registrarIntentos) registrarIntento(ejercicio.id, bien);
  }

  /** Corrige un hueco al salir del campo. Sin espacios ni mayúsculas. */
  function corregirHueco(i: number) {
    const dada = normalizarRespuesta(estado.huecos[i] ?? "");
    if (dada === "") return;

    const bien = (aceptados[i] ?? []).some((valida) => normalizarRespuesta(valida) === dada);
    const nuevos = estado.huecosOk.map((v, j) => (j === i ? bien : v));
    cambiar({ huecosOk: nuevos });

    // El intento se registra cuando ya están todos: es un ejercicio, no
    // un hueco.
    if (registrarIntentos && nuevos.every((v) => v !== null)) {
      registrarIntento(ejercicio.id, nuevos.every((v) => v === true));
    }
  }

  function avanzar() {
    if (indice + 1 >= ejercicios.length) {
      setCerrado(true);
    } else {
      setIndice(indice + 1);
    }
    window.scrollTo({ top: 0 });
  }

  function repetir() {
    setEstados(ejercicios.map(VACIO));
    setIndice(0);
    setCerrado(false);
    window.scrollTo({ top: 0 });
  }

  function verEjercicio(i: number) {
    setIndice(i);
    setCerrado(false);
    window.scrollTo({ top: 0 });
  }

  /**
   * Teclado: 1–8 eligen opción y Enter avanza.
   *
   * Sin lista de dependencias a propósito: se vuelve a registrar en cada
   * render y así siempre ve el estado de ahora. Es un único `keydown`;
   * el coste de recolocarlo no se nota y evita una lista de siete cosas
   * que se quedaría desfasada al primer cambio.
   *
   * No se toca nada mientras el foco está en un hueco: ahí las cifras
   * son la respuesta que el alumno está escribiendo.
   */
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (cerrado) return;

      const destino = evento.target as HTMLElement | null;
      const escribiendo = destino?.tagName === "INPUT" || destino?.tagName === "TEXTAREA";

      if (evento.key === "Enter" && !escribiendo) {
        if (yaRespondido) {
          evento.preventDefault();
          avanzar();
        } else if (esMultiple && estado.elegidas.length > 0) {
          evento.preventDefault();
          comprobarMultiple();
        }
        return;
      }

      if (escribiendo || esHuecos || yaRespondido) return;

      const n = Number(evento.key);
      if (Number.isInteger(n) && n >= 1 && n <= ejercicio.opciones.length) {
        evento.preventDefault();
        elegir(n - 1);
      }
    }

    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  });

  if (ejercicios.length === 0) return null;

  // ---------------------------------------------------------------
  // CIERRE
  // ---------------------------------------------------------------
  if (cerrado) {
    const aciertos = ejercicios.filter((_, i) => acertado(i)).length;
    const todos = aciertos === ejercicios.length;

    return (
      <div className="mx-auto w-full max-w-[calc(600px+7rem)] px-4 py-10 min-[1100px]:px-14 min-[1100px]:py-14">
        <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
          Ejercicios terminados
        </p>
        <h2 className="mt-3 text-pretty font-display text-[25px] font-bold leading-[1.15] text-marca-tinta min-[1100px]:text-[34px]">
          {/* El diseño decía "Los cinco, correctos", pero cinco es la media
              y no la regla: hay lecciones de uno y lecciones de quince. */}
          {!todos
            ? `Acertaste ${aciertos} de ${ejercicios.length}.`
            : ejercicios.length === 1
            ? "Correcto."
            : `Los ${enLetras(ejercicios.length)}, correctos.`}
        </h2>
        <p className="mt-3 text-pretty text-[16px] leading-[1.6] text-marca-gris min-[1100px]:text-[17px]">
          {todos
            ? "Has terminado los ejercicios de esta lección. Puedes seguir con la siguiente cuando quieras."
            : `Lo que se te ha quedado a medias vuelve a aparecer en tu práctica.${
                profesor ? ` ${profesor} lo verá antes de vuestra próxima clase.` : ""
              }`}
        </p>

        <ol className="mt-7 overflow-hidden rounded-[16px] border border-marca-borde bg-white">
          {ejercicios.map((ej, i) => (
            <li
              key={ej.id}
              className="flex items-center gap-3 border-b border-marca-nieblaOscura px-[18px] py-3.5 last:border-b-0"
            >
              <span
                aria-hidden
                className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold leading-none text-white ${
                  acertado(i) ? "bg-marca-verde" : "bg-marca-calido"
                }`}
              >
                {acertado(i) ? "✓" : "—"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-marca-tintaCuerpo">
                {ej.enunciado.replace(/\{\{\d+\}\}/g, "___").split("\n")[0]}
              </span>
              <button
                type="button"
                onClick={() => verEjercicio(i)}
                className="shrink-0 text-[13.5px] font-semibold text-marca-verdeOsc transition-colors hover:text-marca-tinta"
              >
                Ver
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-7 flex flex-col gap-3.5 min-[1100px]:flex-row">
          <BotonCompletar
            leccionId={leccionId}
            cursoSlug={cursoSlug}
            siguienteId={siguienteId}
            className="w-full rounded-full bg-marca-verde px-8 py-[15px] text-[16px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc min-[1100px]:order-2 min-[1100px]:w-auto"
          >
            Completar y seguir
          </BotonCompletar>

          <button
            type="button"
            onClick={repetir}
            className="w-full rounded-full border-[1.5px] border-marca-verde px-8 py-[13.5px] text-[16px] font-semibold text-marca-verdeOsc transition-colors hover:bg-marca-verde hover:text-white min-[1100px]:order-1 min-[1100px]:w-auto"
          >
            Repetir los ejercicios
          </button>
        </div>

        <button
          type="button"
          onClick={alSalir}
          className="mt-5 text-[14px] text-marca-grisSuave transition-colors hover:text-marca-tinta"
        >
          ← Volver a la teoría de la lección
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // UN EJERCICIO
  // ---------------------------------------------------------------
  const masLarga = Math.max(0, ...ejercicio.opciones.map((o) => o.length));
  const dosColumnasMovil = masLarga <= 8;
  const dosColumnas = masLarga <= 22;

  const solucion = correctas
    .map((i) => `${LETRAS[i]}: ${ejercicio.opciones[i]}`)
    .filter((t) => t.trim() !== "")
    .join(" · ");

  const pendienteMultiple = esMultiple && !estado.resuelto;
  const puedeComprobar = pendienteMultiple && estado.elegidas.length > 0;

  return (
    // Igual que en la teoría: el padding se suma al ancho máximo para
    // que la caja de contenido mida de verdad los 760px del diseño.
    <div className="mx-auto flex w-full max-w-[calc(760px+7rem)] flex-1 flex-col px-4 pb-6 pt-6 min-[1100px]:px-14 min-[1100px]:pb-6 min-[1100px]:pt-[34px]">
      {/* ------------------------------ PROGRESO ------------------------------ */}
      <div className="flex items-center gap-4 min-[1100px]:gap-5">
        <span className="shrink-0 text-[13px] font-semibold text-marca-gris tabular-nums">
          Ejercicio {indice + 1} de {ejercicios.length}
        </span>
        <div className="flex flex-1 gap-[5px]">
          {ejercicios.map((ej, i) => (
            <span
              key={ej.id}
              className={`h-[5px] flex-1 rounded-[3px] ${
                i === indice
                  ? "bg-marca-tinta"
                  : !respondido(i)
                  ? "bg-marca-pista"
                  : acertado(i)
                  ? "bg-marca-verde"
                  : "bg-marca-calidoSegmento"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={alSalir}
          className="shrink-0 text-[13.5px] text-marca-grisSuave transition-colors hover:text-marca-tinta"
        >
          Salir
        </button>
      </div>

      {/* ------------------------------ PREGUNTA ------------------------------ */}
      {!esHuecos && (
        <h2 className="mt-8 text-pretty font-display text-[22px] font-bold leading-[1.25] text-marca-tinta min-[1100px]:mt-10 min-[1100px]:text-[29px]">
          {ejercicio.enunciado}
        </h2>
      )}

      {esHuecos ? (
        <Huecos
          ejercicio={ejercicio}
          estado={estado}
          aceptados={aceptados}
          alEscribir={(i, v) => cambiar({ huecos: estado.huecos.map((x, j) => (j === i ? v : x)) })}
          alCorregir={corregirHueco}
        />
      ) : (
        <>
          {esMultiple && (
            <p className="mt-4 text-[14px] text-marca-gris">Puede haber más de una correcta.</p>
          )}
          <div
            className={`mt-6 grid gap-3 min-[1100px]:mt-7 ${
              dosColumnasMovil ? "grid-cols-2" : "grid-cols-1"
            } ${dosColumnas ? "min-[1100px]:grid-cols-2" : "min-[1100px]:grid-cols-1"}`}
          >
            {ejercicio.opciones.map((opcion, i) => (
              <Opcion
                key={i}
                letra={LETRAS[i] ?? "?"}
                texto={opcion}
                elegida={estado.elegidas.includes(i)}
                esCorrecta={correctas.includes(i)}
                revelado={yaRespondido}
                cuadrado={esMultiple}
                alPulsar={() => elegir(i)}
              />
            ))}
          </div>
        </>
      )}

      {/* ------------------------------ CORRECCIÓN ---------------------------- */}
      {yaRespondido && (
        <div className="mt-5 flex items-center gap-[11px] min-[1100px]:mt-[22px]">
          <span
            aria-hidden
            className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold leading-none text-white ${
              yaAcertado ? "bg-marca-verde" : "bg-marca-calido"
            }`}
          >
            {yaAcertado ? "✓" : "—"}
          </span>
          <p className="text-pretty text-[15px] font-medium leading-[1.45] text-marca-tintaCuerpo min-[1100px]:text-[16px]">
            {esHuecos
              ? yaAcertado
                ? aceptados.length === 1
                  ? "El hueco, correcto."
                  : `Los ${enLetras(aceptados.length)} huecos, correctos.`
                : `Casi. ${
                    aceptados.length === 1 ? "La respuesta era" : "Las respuestas eran"
                  } ${enumerar(aceptados.map((a) => a[0] ?? "—"))}.`
              : yaAcertado
              ? "Eso es."
              : `No era esa. La correcta es la ${solucion}`}
          </p>
        </div>
      )}

      {/* --------------------------------- CTA -------------------------------- */}
      <div className="mt-auto flex justify-end pt-8 min-[1100px]:pt-9">
        {pendienteMultiple ? (
          <button
            type="button"
            onClick={comprobarMultiple}
            disabled={!puedeComprobar}
            className={`w-full rounded-full px-8 py-[15px] text-[16px] font-semibold transition-colors min-[1100px]:w-auto ${
              puedeComprobar
                ? "bg-marca-verde text-white hover:bg-marca-verdeOsc"
                : "cursor-not-allowed bg-marca-pista text-marca-grisInactivo"
            }`}
          >
            {puedeComprobar ? "Comprobar" : "Elige una opción"}
          </button>
        ) : (
          <button
            type="button"
            onClick={avanzar}
            disabled={!yaRespondido}
            className={`w-full rounded-full px-8 py-[15px] text-[16px] font-semibold transition-colors min-[1100px]:w-auto ${
              yaRespondido
                ? "bg-marca-verde text-white hover:bg-marca-verdeOsc"
                : "cursor-not-allowed bg-marca-pista text-marca-grisInactivo"
            }`}
          >
            {!yaRespondido
              ? esHuecos
                ? "Rellena los huecos"
                : "Elige una opción"
              : indice + 1 >= ejercicios.length
              ? "Ver el resultado →"
              : "Siguiente ejercicio →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------

function Opcion({
  letra,
  texto,
  elegida,
  esCorrecta,
  revelado,
  cuadrado,
  alPulsar,
}: {
  letra: string;
  texto: string;
  elegida: boolean;
  esCorrecta: boolean;
  revelado: boolean;
  /** Los de varias respuestas llevan la insignia cuadrada. */
  cuadrado: boolean;
  alPulsar: () => void;
}) {
  let caja = "border-marca-borde bg-white hover:border-marca-verde";
  let insignia = "bg-marca-niebla text-marca-gris";
  let marca: string | null = null;
  let colorMarca = "";

  if (revelado) {
    if (esCorrecta) {
      caja = "border-marca-verde bg-marca-verdeFondo";
      insignia = "bg-marca-verde text-white";
      marca = "✓";
      colorMarca = "text-marca-verde";
    } else if (elegida) {
      caja = "border-marca-calido bg-marca-calidoFondo";
      insignia = "bg-marca-calidoBadge text-marca-calidoBadgeTexto";
      marca = "—";
      colorMarca = "text-marca-amarilloTexto";
    } else {
      caja = "border-marca-borde bg-marca-casiBlanco";
    }
  } else if (elegida) {
    caja = "border-marca-verde bg-marca-verdeFondo";
    insignia = "bg-marca-verde text-white";
  }

  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={revelado}
      className={`flex w-full items-center gap-3.5 rounded-[13px] border-[1.5px] px-4 py-4 text-left transition-colors disabled:cursor-default min-[1100px]:rounded-[14px] min-[1100px]:px-5 min-[1100px]:py-[18px] ${caja}`}
    >
      <span
        aria-hidden
        className={`grid h-[26px] w-[26px] shrink-0 place-items-center text-[13px] font-semibold leading-none ${
          cuadrado ? "rounded-[6px]" : "rounded-[8px]"
        } ${insignia}`}
      >
        {letra}
      </span>
      <span className="min-w-0 flex-1 text-pretty text-[15.5px] leading-[1.45] text-marca-tinta min-[1100px]:text-[16.5px]">
        {texto}
      </span>
      {marca && (
        <span aria-hidden className={`shrink-0 text-[15px] font-semibold ${colorMarca}`}>
          {marca}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------

/**
 * Rellenar huecos.
 *
 * El enunciado trae los huecos como {{1}}, {{2}}… en su sitio dentro del
 * texto, así que aquí el enunciado ES el ejercicio: se parte por ellos y
 * se intercala un campo.
 *
 * SE CORRIGE HUECO A HUECO al salir del campo, no todo de golpe al
 * final. Hay lecciones con dieciocho huecos: esperar al final para saber
 * si el primero estaba bien es esperar demasiado.
 */
function Huecos({
  ejercicio,
  estado,
  aceptados,
  alEscribir,
  alCorregir,
}: {
  ejercicio: EjercicioVista;
  estado: Estado;
  aceptados: string[][];
  alEscribir: (i: number, valor: string) => void;
  alCorregir: (i: number) => void;
}) {
  const trozos = ejercicio.enunciado.split(/(\{\{\d+\}\})/g);

  return (
    <>
      <div className="mt-6 rounded-[16px] border border-marca-borde bg-white px-5 py-5 text-[16px] leading-[2.2] text-marca-tintaCuerpo min-[1100px]:mt-7 min-[1100px]:px-7 min-[1100px]:py-[26px] min-[1100px]:text-[18px] min-[1100px]:leading-[2.1]">
        {trozos.map((trozo, i) => {
          const hueco = trozo.match(/^\{\{(\d+)\}\}$/);
          if (!hueco) {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {trozo}
              </span>
            );
          }

          const indice = Number(hueco[1]) - 1;
          const ok = estado.huecosOk[indice];

          return (
            <input
              key={i}
              type="text"
              value={estado.huecos[indice] ?? ""}
              onChange={(e) => alEscribir(indice, e.target.value)}
              onBlur={() => alCorregir(indice)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  alCorregir(indice);
                }
              }}
              readOnly={ok !== null}
              placeholder="…"
              aria-label={`Hueco ${indice + 1}`}
              className={`mx-1 inline-block w-[100px] rounded-[9px] border-[1.5px] px-2.5 py-[7px] text-center text-[17px] leading-none outline-none transition-colors ${
                ok === null
                  ? "border-marca-bordeSuave bg-marca-huecoFondo text-marca-tinta focus:border-marca-verde"
                  : ok
                  ? "border-marca-verde bg-marca-verdeFondo text-marca-tinta"
                  : "border-marca-calido bg-marca-calidoFondo text-marca-tinta"
              }`}
            />
          );
        })}
      </div>

      <p className="mt-3 text-[13.5px] text-marca-grisTenue">
        Escribe y sal del hueco para corregirlo. {enLetras(aceptados.length)}{" "}
        {aceptados.length === 1 ? "hueco" : "huecos"}.
      </p>
    </>
  );
}

