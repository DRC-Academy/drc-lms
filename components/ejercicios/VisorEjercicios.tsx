"use client";

import { useEffect, useState, type ReactNode } from "react";
import { normalizarRespuesta } from "@/lib/validarBloque";
import type { EjercicioUnificado } from "@/lib/ejercicio-unificado";

/**
 * EL VISOR DE EJERCICIOS. Uno solo, para las dos fuentes.
 *
 * Antes había dos: `FlujoEjercicios` para el curso y `Practica` para los
 * bloques generados. El del curso iba de uno en uno y el otro apilaba
 * cosas en una tarjeta; cada arreglo en uno dejaba al otro un poco más
 * atrás, y esa deriva no se corrige con disciplina, se corrige quitando
 * el segundo componente.
 *
 * Lo que se conserva de cada uno:
 *
 *   DEL CURSO   el layout, un ejercicio por pantalla, la barra de
 *               segmentos, el teclado, y no autoavanzar al responder:
 *               la corrección es lo que el alumno ha venido a leer.
 *   DE LA PRÁCTICA  el lateral de fases, el aviso de que el profesor
 *               leerá la producción, y el guardado de progreso.
 *
 * NO SABE DE DÓNDE VIENEN LOS EJERCICIOS. Recibe `EjercicioUnificado[]`,
 * ya normalizados por `lib/ejercicio-unificado.ts`. Lo que cambia entre
 * las dos pantallas entra por props: el lateral, la pantalla de cierre y
 * qué hacer con cada suceso que haya que guardar.
 */

const NUMEROS = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
const LETRAS = "ABCDEFGH";

const NOMBRE_FASE = { reconocer: "Reconocer", transformar: "Transformar", producir: "Producir" };
const NUMERO_FASE = { reconocer: 1, transformar: 2, producir: 3 };

function enLetras(n: number): string {
  return NUMEROS[n] ?? String(n);
}

/** "a, b y c" */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/**
 * Lo que hay que guardar, dicho en términos del visor.
 *
 * El visor no sabe de endpoints. Anuncia lo que ha pasado y quien lo
 * usa decide dónde va: el curso manda intentos a
 * `/api/intento-ejercicio` y la práctica manda avance y progreso a
 * `/api/progreso`. Ninguno de los dos caminos cambia por esta refactor.
 */
export type SucesoVisor =
  | { tipo: "intento"; ejercicio: EjercicioUnificado; correcto: boolean }
  | { tipo: "avance"; indice: number; total: number }
  | { tipo: "produccion"; ejercicio: EjercicioUnificado; texto: string }
  | { tipo: "final"; aciertos: number; total: number };

type Estado = {
  /** Opciones marcadas. */
  elegidas: number[];
  /** Confirmado. En una sola correcta basta con pulsar; si hay varias, con "Comprobar". */
  resuelto: boolean;
  /** Lo escrito en cada hueco. */
  huecos: string[];
  /** Corregido por hueco: null mientras no ha salido del campo. */
  huecosOk: (boolean | null)[];
  /** El texto de `escritura` y de `libre`. */
  texto: string;
  /** `escritura`: si la respuesta coincidía. null hasta comprobar. */
  textoOk: boolean | null;
  /** `libre`: si ya pidió ver el modelo. Es lo que cuenta como responder. */
  verModelo: boolean;
  /** `libre`: criterios que se ha marcado a sí mismo. */
  marcados: number[];
};

const VACIO = (ejercicio: EjercicioUnificado): Estado => ({
  elegidas: [],
  resuelto: false,
  huecos: ejercicio.huecos.map(() => ""),
  huecosOk: ejercicio.huecos.map(() => null),
  texto: "",
  textoOk: null,
  verModelo: false,
  marcados: [],
});

export default function VisorEjercicios({
  ejercicios,
  lateral,
  cierre,
  alSalir,
  textoSalir = "Salir",
  notaAlPie,
  alSuceso,
  guardarIntentos = true,
}: {
  ejercicios: EjercicioUnificado[];
  /**
   * El lateral de fases. Solo lo trae la práctica generada; en la
   * lección del curso el carril lo pone `VistaLeccion` desde fuera.
   *
   * Es una función y no un nodo porque necesita el estado del visor para
   * marcar el paso actual y los ya hechos, y ese estado vive aquí.
   */
  lateral?: (estado: {
    indice: number;
    respondido: (i: number) => boolean;
    acertado: (i: number) => boolean;
  }) => ReactNode;
  /** La pantalla de cierre, que es distinta en cada fuente. */
  cierre: (datos: {
    aciertos: number;
    total: number;
    repetir: () => void;
    verEjercicio: (i: number) => void;
    acertado: (i: number) => boolean;
  }) => ReactNode;
  alSalir: () => void;
  textoSalir?: string;
  /**
   * Una línea al pie del ejercicio. La usa la práctica para anclar el
   * bloque a la clase de la que salió: es lo que recuerda que esto no es
   * material genérico. Recibe el ejercicio porque en la fase de producir
   * no se enseña.
   */
  notaAlPie?: (ejercicio: EjercicioUnificado) => ReactNode;
  alSuceso?: (suceso: SucesoVisor) => void;
  /** false para el equipo: revisa el curso, no lo cursa. */
  guardarIntentos?: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const [cerrado, setCerrado] = useState(false);
  const [estados, setEstados] = useState<Estado[]>(() => ejercicios.map(VACIO));

  const ejercicio = ejercicios[indice];
  const estado = estados[indice];

  const cambiar = (parcial: Partial<Estado>) =>
    setEstados((previos) => previos.map((e, i) => (i === indice ? { ...e, ...parcial } : e)));

  function anunciar(suceso: SucesoVisor) {
    if (suceso.tipo === "intento" && !guardarIntentos) return;
    alSuceso?.(suceso);
  }

  // --- qué sabe de cada ejercicio ---
  const esHuecos = ejercicio?.forma === "huecos";
  const esEscritura = ejercicio?.forma === "escritura";
  const esLibre = ejercicio?.forma === "libre";
  const esOpciones = ejercicio?.forma === "opciones";

  const respondido = (i: number): boolean => {
    const e = estados[i];
    const ej = ejercicios[i];
    if (!e || !ej) return false;
    if (ej.forma === "huecos") return e.huecosOk.length > 0 && e.huecosOk.every((v) => v !== null);
    // En `libre` no hay corrección: responder es haber pedido el modelo.
    if (ej.forma === "libre") return e.verModelo;
    return e.resuelto;
  };

  const acertado = (i: number): boolean => {
    const e = estados[i];
    const ej = ejercicios[i];
    if (!e || !ej) return false;
    if (ej.forma === "huecos") return e.huecosOk.length > 0 && e.huecosOk.every((v) => v === true);
    if (ej.forma === "escritura") return e.textoOk === true;
    // La autoevaluación: cuenta como acertado si se marcó todo. Sin
    // criterios no hay nada que marcar y no se puede acertar —es el caso
    // de un `essay` del curso, que no trae ninguno—.
    if (ej.forma === "libre") {
      return ej.criterios.length > 0 && e.marcados.length === ej.criterios.length;
    }
    return (
      e.elegidas.length === ej.correctas.length &&
      [...e.elegidas].sort().join() === [...ej.correctas].sort().join()
    );
  };

  const yaRespondido = respondido(indice);
  const yaAcertado = acertado(indice);

  // --- acciones ---
  function elegir(i: number) {
    if (yaRespondido) return;

    if (ejercicio.variasCorrectas) {
      cambiar({
        elegidas: estado.elegidas.includes(i)
          ? estado.elegidas.filter((x) => x !== i)
          : [...estado.elegidas, i],
      });
      return;
    }

    cambiar({ elegidas: [i], resuelto: true });
    anunciar({ tipo: "intento", ejercicio, correcto: ejercicio.correctas.includes(i) });
  }

  function comprobarVarias() {
    const bien =
      estado.elegidas.length === ejercicio.correctas.length &&
      [...estado.elegidas].sort().join() === [...ejercicio.correctas].sort().join();
    cambiar({ resuelto: true });
    anunciar({ tipo: "intento", ejercicio, correcto: bien });
  }

  /** Corrige un hueco al salir del campo. Sin espacios ni mayúsculas. */
  function corregirHueco(i: number) {
    const dada = normalizarRespuesta(estado.huecos[i] ?? "");
    if (dada === "") return;

    const bien = (ejercicio.huecos[i] ?? []).some((v) => normalizarRespuesta(v) === dada);
    const nuevos = estado.huecosOk.map((v, j) => (j === i ? bien : v));
    cambiar({ huecosOk: nuevos });

    // El intento se registra cuando ya están todos: es un ejercicio, no
    // un hueco.
    if (nuevos.every((v) => v !== null)) {
      anunciar({ tipo: "intento", ejercicio, correcto: nuevos.every((v) => v === true) });
    }
  }

  function comprobarEscritura() {
    if (yaRespondido || estado.texto.trim() === "") return;
    const dada = normalizarRespuesta(estado.texto);
    const bien = ejercicio.respuestas.some((r) => normalizarRespuesta(r) === dada);
    cambiar({ resuelto: true, textoOk: bien });
    anunciar({ tipo: "intento", ejercicio, correcto: bien });
  }

  function avanzar() {
    // La producción se guarda al salir del ejercicio, no antes: hasta
    // ese momento el alumno puede seguir escribiendo.
    if (esLibre && estado.texto.trim() !== "") {
      anunciar({ tipo: "produccion", ejercicio, texto: estado.texto });
    }

    if (indice + 1 >= ejercicios.length) {
      const aciertos = ejercicios.filter((_, i) => acertado(i)).length;
      anunciar({ tipo: "final", aciertos, total: ejercicios.length });
      setCerrado(true);
    } else {
      anunciar({ tipo: "avance", indice: indice + 1, total: ejercicios.length });
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
   * render y así siempre ve el estado de ahora.
   *
   * No se toca nada mientras el foco está en un campo: ahí las cifras
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
        } else if (esOpciones && ejercicio.variasCorrectas && estado.elegidas.length > 0) {
          evento.preventDefault();
          comprobarVarias();
        }
        return;
      }

      if (escribiendo || !esOpciones || yaRespondido) return;

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

  /**
   * El marco: rejilla de 300px + resto cuando hay lateral, y nada cuando
   * no lo hay.
   *
   * Es la MISMA rejilla que usa la lección del curso en `VistaLeccion`.
   * Con lateral la pinta este componente —es el caso de la práctica—; sin
   * él, la pinta quien lo envuelve, que es lo que hace la lección, donde
   * el carril replegado de 72px ya viene de fuera.
   *
   * No hay tercera columna: el bloque no tiene teoría, así que no hay
   * índice de títulos al que saltar. Ese ancho se lo queda el contenido.
   */
  const conMarco = (dentro: ReactNode) =>
    lateral ? (
      <div className="grid flex-1 grid-cols-1 min-[1100px]:grid-cols-[300px_minmax(0,1fr)]">
        {lateral({ indice, respondido, acertado })}
        {dentro}
      </div>
    ) : (
      <>{dentro}</>
    );

  if (cerrado) {
    const aciertos = ejercicios.filter((_, i) => acertado(i)).length;
    return conMarco(
      <div className="flex min-w-0 flex-1 flex-col">
        {cierre({ aciertos, total: ejercicios.length, repetir, verEjercicio, acertado })}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // UN EJERCICIO
  // ---------------------------------------------------------------
  const masLarga = Math.max(0, ...ejercicio.opciones.map((o) => o.length));
  const dosColumnasMovil = masLarga <= 8;
  const dosColumnas = masLarga <= 22;

  const solucion = ejercicio.correctas
    .map((i) => `${LETRAS[i]}: ${ejercicio.opciones[i]}`)
    .filter((t) => t.trim() !== "")
    .join(" · ");

  // ---------------------------------------------------------------
  // LA CORRECCIÓN, EN DOS PIEZAS
  //
  // EL VEREDICTO la encabeza. Lo escribe el modelo para ESTE ejercicio
  // y viene en `veredictoAcierto` / `veredictoFallo`; cuando no viene
  // —el curso no lo trae nunca— se pone el de siempre.
  //
  // LA SOLUCIÓN es cuál era la respuesta, y solo hay que escribirla
  // donde no esté ya en pantalla: en `escritura` y en `huecos` no se ve
  // por ningún lado, mientras que en `opciones` la buena se queda
  // marcada en verde entre las cuatro.
  //
  // Van partidas porque el veredicto del modelo sustituye al texto por
  // defecto, y ese texto llevaba la respuesta dentro. Sin partirlas, un
  // veredicto mejor se llevaría por delante el único sitio donde el
  // alumno podía leer cuál era la buena.
  // ---------------------------------------------------------------
  const solucionEscrita = esHuecos
    ? `${ejercicio.huecos.length === 1 ? "La respuesta era" : "Las respuestas eran"} ${enumerar(
        ejercicio.huecos.map((a) => a[0] ?? "—")
      )}.`
    : esEscritura
      ? `Una versión correcta: ${ejercicio.respuestas[0] ?? "—"}`
      : null;

  const veredictoPorDefecto = yaAcertado
    ? esHuecos
      ? ejercicio.huecos.length === 1
        ? "El hueco, correcto."
        : `Los ${enLetras(ejercicio.huecos.length)} huecos, correctos.`
      : "Eso es."
    : solucionEscrita
      ? `Casi. ${solucionEscrita}`
      : `No era esa. La correcta es la ${solucion}`;

  const veredicto = yaAcertado ? ejercicio.veredictoAcierto : ejercicio.veredictoFallo;

  const pendienteVarias = esOpciones && ejercicio.variasCorrectas && !estado.resuelto;
  const puedeComprobarVarias = pendienteVarias && estado.elegidas.length > 0;
  const pendienteEscritura = esEscritura && !estado.resuelto;
  const puedeComprobarEscritura = pendienteEscritura && estado.texto.trim() !== "";

  return conMarco(
    <div className="flex min-w-0 flex-1 flex-col">
      {/* El mismo ancho, el mismo padding y la misma tipografía que la
          columna de texto de la lección: el `7rem` que se suma es el
          padding lateral, para que la caja mida de verdad sus 760px. */}
      <div className="mx-auto flex w-full max-w-[calc(760px+7rem)] flex-1 flex-col px-4 pb-6 pt-6 min-[1100px]:px-14 min-[1100px]:pt-[34px]">
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
          {textoSalir}
        </button>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col">
          {/* --------------------------- FASE --------------------------- */}
          {ejercicio.fase && (
            <p className="mb-3 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verde">
              Fase {NUMERO_FASE[ejercicio.fase]} · {NOMBRE_FASE[ejercicio.fase]}
            </p>
          )}

          {/* ------------------------- ENUNCIADO ------------------------- */}
          {!esHuecos && (
            <h2
              className={`text-pretty font-display text-[22px] font-bold leading-[1.25] text-marca-tinta min-[1100px]:text-[29px] ${
                ejercicio.fase ? "" : "mt-8 min-[1100px]:mt-10"
              }`}
            >
              {ejercicio.enunciado}
            </h2>
          )}

          {/* La frase que hay que reescribir, o el contexto de la
              consigna. Destacada porque es material, no instrucción. */}
          {ejercicio.apoyo && (
            <p
              className={`mt-4 rounded-[14px] border border-marca-borde bg-white px-5 py-4 text-pretty text-[16.5px] leading-[1.5] text-marca-tintaCuerpo min-[1100px]:text-[17.5px] ${
                esLibre ? "font-normal" : "font-medium"
              }`}
            >
              {ejercicio.apoyo}
            </p>
          )}

          {esHuecos && (
            <Huecos
              ejercicio={ejercicio}
              estado={estado}
              alEscribir={(i, v) =>
                cambiar({ huecos: estado.huecos.map((x, j) => (j === i ? v : x)) })
              }
              alCorregir={corregirHueco}
            />
          )}

          {esOpciones && (
            <>
              {ejercicio.variasCorrectas && (
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
                    esCorrecta={ejercicio.correctas.includes(i)}
                    revelado={yaRespondido}
                    cuadrado={ejercicio.variasCorrectas}
                    alPulsar={() => elegir(i)}
                  />
                ))}
              </div>
            </>
          )}

          {esEscritura && (
            <>
              <textarea
                value={estado.texto}
                onChange={(e) => cambiar({ texto: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    comprobarEscritura();
                  }
                }}
                disabled={yaRespondido}
                rows={3}
                placeholder="Escribe tu versión…"
                className="mt-5 w-full resize-none rounded-[14px] border-[1.5px] border-marca-borde bg-white px-5 py-4 text-[16.5px] leading-[1.5] text-marca-tinta outline-none transition-colors focus:border-marca-verde disabled:opacity-70"
              />
              {!yaRespondido && ejercicio.pista && (
                <details className="mt-3 text-[14px] text-marca-gris">
                  <summary className="cursor-pointer py-1 transition-colors hover:text-marca-verdeOsc">
                    Ver pista
                  </summary>
                  <p className="aparece mt-2 leading-[1.5]">{ejercicio.pista}</p>
                </details>
              )}
            </>
          )}

          {esLibre && (
            <Produccion
              ejercicio={ejercicio}
              estado={estado}
              alEscribir={(v) => cambiar({ texto: v })}
              alPedirModelo={() => cambiar({ verModelo: true })}
              alMarcar={(k) =>
                cambiar({
                  marcados: estado.marcados.includes(k)
                    ? estado.marcados.filter((x) => x !== k)
                    : [...estado.marcados, k],
                })
              }
            />
          )}

          {/* ---------------------------- CORRECCIÓN ---------------------------- */}
          {yaRespondido && !esLibre && (
            <div className="mt-5 min-[1100px]:mt-[22px]">
              <div className="flex items-center gap-[11px]">
                <span
                  aria-hidden
                  className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold leading-none text-white ${
                    yaAcertado ? "bg-marca-verde" : "bg-marca-calido"
                  }`}
                >
                  {yaAcertado ? "✓" : "—"}
                </span>
                <p className="text-pretty text-[15px] font-medium leading-[1.45] text-marca-tintaCuerpo min-[1100px]:text-[16px]">
                  {veredicto ?? veredictoPorDefecto}
                </p>
              </div>

              {/* CUÁL ERA LA BUENA. Solo cuando el veredicto del modelo
                  ha ocupado el sitio del texto por defecto, que era el
                  que la llevaba dentro. El sangrado la alinea con el
                  veredicto, por debajo de la insignia. */}
              {veredicto && !yaAcertado && solucionEscrita && (
                <p className="mt-2 pl-[33px] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaCuerpo min-[1100px]:text-[15px]">
                  {solucionEscrita}
                </p>
              )}

              {/* LA EXPLICACIÓN SOLO SI EXISTE. Los 1.492 del curso la
                  traen vacía, y reservarle sitio dejaría un hueco que
                  parece contenido a medio cargar. */}
              {ejercicio.explicacion && (
                <p className="mt-3 rounded-[14px] bg-marca-niebla px-4 py-3.5 text-pretty text-[14.5px] leading-[1.55] text-marca-tintaCuerpo min-[1100px]:text-[15px]">
                  {ejercicio.explicacion}
                </p>
              )}
            </div>
          )}

          {notaAlPie?.(ejercicio)}

        </div>
      </div>
      </div>

      {/* --------------------------- BARRA DE ACCIONES ---------------------------
          El mismo tratamiento que la de la lección: pegada al fondo de la
          ventana, con borde arriba y fondo translúcido, la flecha de
          volver a la izquierda y el botón principal ocupando el resto.

          La flecha retrocede AL EJERCICIO ANTERIOR, no a la pantalla
          anterior. El estado de cada uno se conserva, así que volver
          atrás enseña lo ya respondido sin perder nada. En el primero no
          hay destino y el hueco se queda: quitarlo movería el botón
          principal de sitio al pasar del primero al segundo. */}
      {/* Sobre la navegación de secciones, no debajo: ver la nota de
          la barra equivalente en `components/leccion/VistaLeccion.tsx`. */}
      <div
        data-barra-inferior
        className="sticky bottom-[var(--nav-inferior)] border-t border-marca-borde bg-white/[0.94] backdrop-blur-md"
      >
        <div className="mx-auto w-full max-w-[calc(760px+7rem)] px-3.5 pb-4 pt-3 min-[1100px]:px-14 min-[1100px]:py-3.5">
          <div className="flex items-center gap-3 min-[1100px]:gap-4">
            <FlechaAtras alPulsar={indice > 0 ? () => verEjercicio(indice - 1) : null} />

            {pendienteVarias || pendienteEscritura ? (
              <button
                type="button"
                onClick={pendienteVarias ? comprobarVarias : comprobarEscritura}
                disabled={!(puedeComprobarVarias || puedeComprobarEscritura)}
                className={`flex-1 rounded-full px-6 py-[13px] text-center text-[15px] font-semibold transition-colors min-[1100px]:py-3.5 min-[1100px]:text-[15.5px] ${
                  puedeComprobarVarias || puedeComprobarEscritura
                    ? "btn-verde"
                    : "cursor-not-allowed bg-marca-pista text-marca-grisInactivo"
                }`}
              >
                {puedeComprobarVarias || puedeComprobarEscritura
                  ? "Comprobar"
                  : pendienteEscritura
                    ? "Escribe tu versión"
                    : "Elige una opción"}
              </button>
            ) : (
              <button
                type="button"
                onClick={avanzar}
                disabled={!yaRespondido}
                className={`flex-1 rounded-full px-6 py-[13px] text-center text-[15px] font-semibold transition-colors min-[1100px]:py-3.5 min-[1100px]:text-[15.5px] ${
                  yaRespondido
                    ? "btn-verde"
                    : "cursor-not-allowed bg-marca-pista text-marca-grisInactivo"
                }`}
              >
                {!yaRespondido
                  ? esHuecos
                    ? "Rellena los huecos"
                    : esLibre
                      ? "Escribe tu respuesta"
                      : "Elige una opción"
                  : indice + 1 >= ejercicios.length
                    ? "Ver el resultado →"
                    : "Siguiente ejercicio →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Volver al ejercicio anterior. En el primero no hay destino y el hueco
 * se conserva, igual que en la barra de la lección: sin él, el botón
 * principal daría un salto al pasar del primer ejercicio al segundo.
 */
function FlechaAtras({ alPulsar }: { alPulsar: (() => void) | null }) {
  const clase =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-marca-borde text-[15px] leading-none text-marca-tinta transition-colors hover:bg-marca-niebla min-[1100px]:h-auto min-[1100px]:w-auto min-[1100px]:px-[18px] min-[1100px]:py-[11px] min-[1100px]:text-[14.5px] min-[1100px]:font-medium";

  if (!alPulsar) {
    return <span aria-hidden className={`${clase} pointer-events-none opacity-0`} />;
  }

  return (
    <button type="button" onClick={alPulsar} className={clase}>
      <span className="min-[1100px]:hidden">←</span>
      <span className="hidden min-[1100px]:inline">← Anterior</span>
    </button>
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
 * SE CORRIGE HUECO A HUECO al salir del campo. Hay lecciones con
 * dieciocho huecos: esperar al final para saber si el primero estaba
 * bien es esperar demasiado.
 */
function Huecos({
  ejercicio,
  estado,
  alEscribir,
  alCorregir,
}: {
  ejercicio: EjercicioUnificado;
  estado: Estado;
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
        Escribe y sal del hueco para corregirlo. {enLetras(ejercicio.huecos.length)}{" "}
        {ejercicio.huecos.length === 1 ? "hueco" : "huecos"}.
      </p>
    </>
  );
}

// ---------------------------------------------------------------

/**
 * La fase de producir: texto libre con autoevaluación.
 *
 * NO SE CORRIGE SOLA, y es lo que la distingue de todo lo demás. El
 * alumno escribe, compara con un modelo y se marca a sí mismo los
 * criterios que cree haber cumplido. Ese texto es lo que llega al
 * profesor: es el bucle que cierra la práctica con la clase, así que no
 * cambia nada de cómo funcionaba.
 */
function Produccion({
  ejercicio,
  estado,
  alEscribir,
  alPedirModelo,
  alMarcar,
}: {
  ejercicio: EjercicioUnificado;
  estado: Estado;
  alEscribir: (valor: string) => void;
  alPedirModelo: () => void;
  alMarcar: (k: number) => void;
}) {
  return (
    <>
      <textarea
        value={estado.texto}
        onChange={(e) => alEscribir(e.target.value)}
        rows={6}
        placeholder="Escribe aquí…"
        className="mt-5 w-full resize-none rounded-[14px] border-[1.5px] border-marca-borde bg-white px-5 py-4 text-[16.5px] leading-[1.55] text-marca-tinta outline-none transition-colors focus:border-marca-verde"
      />

      {!estado.verModelo ? (
        <button
          type="button"
          onClick={alPedirModelo}
          disabled={estado.texto.trim() === ""}
          className={`mt-4 w-full rounded-full px-8 py-[15px] text-[16px] font-semibold transition-colors min-[1100px]:w-auto min-[1100px]:self-start ${
            estado.texto.trim() !== ""
              ? "btn-verde"
              : "cursor-not-allowed bg-marca-pista text-marca-grisInactivo"
          }`}
        >
          Comparar con el modelo
        </button>
      ) : (
        <div className="aparece mt-5 rounded-[16px] border border-marca-borde bg-white p-5 min-[1100px]:p-6">
          <p className="font-display text-[17px] font-bold text-marca-tinta">Revisa tu respuesta</p>

          <div className="mb-5 mt-4 flex flex-col gap-1">
            {ejercicio.criterios.map((criterio, k) => {
              const marcado = estado.marcados.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => alMarcar(k)}
                  className="flex w-full items-start gap-3 rounded-lg py-2 text-left transition-colors hover:bg-marca-niebla"
                >
                  <span
                    aria-hidden
                    className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] leading-none text-white transition-colors ${
                      marcado ? "border-marca-verde bg-marca-verde" : "border-marca-bordeSuave"
                    }`}
                  >
                    {marcado ? "✓" : ""}
                  </span>
                  <span className="text-[14.5px] leading-[1.5] text-marca-tintaCuerpo">
                    {criterio}
                  </span>
                </button>
              );
            })}
          </div>

          {ejercicio.modelo && (
            <div className="rounded-[12px] bg-marca-niebla p-4">
              <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
                Un ejemplo válido
              </p>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-marca-tintaCuerpo">
                {ejercicio.modelo}
              </p>
            </div>
          )}

          {/* EL AVISO SE QUEDA. Es lo que hace que el alumno escriba en
              serio: sabe que esto no cae en un pozo. */}
          <p className="mt-4 text-[13px] text-marca-gris">
            Tu profesor verá esta respuesta antes de la próxima clase.
          </p>
        </div>
      )}
    </>
  );
}
