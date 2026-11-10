"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { elegirCurso } from "@/app/acciones-curso";
import type { Pregunta, Resultado, Vista } from "@/lib/prueba-nivel/servidor";

// ---------------------------------------------------------------
// LA PRUEBA DE NIVEL, EN PANTALLA
//
// Lo que se ve; lo que vale lo decide el servidor (`/api/prueba-nivel/*`).
// La respuesta correcta nunca llega aquí, y aquí no se dice si se acertó:
// es una prueba de nivel, no un examen.
//
// Móvil primero (375 px): una pregunta por pantalla, las opciones a lo ancho
// y el botón al alcance del pulgar. Sin librerías. Todo el texto en tinta.
//
// SALIR ES SEGURO: cada respuesta se guarda al pulsar «Siguiente», así que
// cerrar o irse deja la prueba a medias y el inicio ofrece «Continuar».
// ---------------------------------------------------------------

type Fase =
  | { tipo: "bienvenida"; repitiendo: boolean }
  | { tipo: "pregunta"; datos: Pregunta }
  | { tipo: "resultado"; resultado: Resultado }
  | { tipo: "error"; mensaje: string; reintentar: () => void };

const BOTON =
  "btn-verde inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-7 text-[16px] font-bold disabled:cursor-not-allowed disabled:opacity-50 min-[520px]:w-auto";

/** Las palabras, como las cuenta Gestión para el mínimo de la redacción. */
function contarPalabras(texto: string): number {
  const limpio = texto.trim();
  return limpio ? limpio.split(/\s+/).length : 0;
}

async function pedir(ruta: string, cuerpo?: unknown): Promise<{ ok: true; datos: unknown } | { ok: false; error: string }> {
  try {
    const r = await fetch(ruta, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const datos: unknown = await r.json().catch(() => null);
    if (!r.ok) {
      const error = datos && typeof datos === "object" && "error" in datos ? String((datos as { error: unknown }).error) : "";
      return { ok: false, error };
    }
    return { ok: true, datos };
  } catch {
    return { ok: false, error: "" };
  }
}

export default function PruebaNivel({
  vista,
  cursoActualId,
  hrefInicio,
  soloLectura,
}: {
  vista: Vista;
  cursoActualId: string | null;
  hrefInicio: string;
  /** El equipo revisando: ve la pantalla, no responde por el alumno. */
  soloLectura: boolean;
}) {
  const { t: todos } = usarIdioma();
  const t = todos.pruebaNivel;
  const [fase, setFase] = useState<Fase>(vista);
  const [ocupado, setOcupado] = useState(false);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const desde = useRef<number>(Date.now());
  const arriba = useRef<HTMLDivElement>(null);

  const preguntaId = fase.tipo === "pregunta" ? fase.datos.pregunta.id : null;
  const primera = useRef(true);
  useEffect(() => {
    // Pregunta nueva: se limpia lo elegido, se empieza a contar y se sube a
    // la barra. Al abrir la página no se mueve nada: ya está arriba.
    setSeleccion(null);
    setTexto("");
    desde.current = Date.now();
    if (primera.current) {
      primera.current = false;
      return;
    }
    arriba.current?.scrollIntoView({ block: "start" });
  }, [preguntaId]);

  function aplicar(datos: unknown) {
    const d = datos as { tipo?: string; datos?: Pregunta; resultado?: Resultado };
    if (d?.tipo === "pregunta" && d.datos) setFase({ tipo: "pregunta", datos: d.datos });
    else if (d?.tipo === "resultado" && d.resultado) setFase({ tipo: "resultado", resultado: d.resultado });
  }

  async function empezar() {
    setOcupado(true);
    const r = await pedir("/api/prueba-nivel/empezar");
    setOcupado(false);
    if (r.ok) aplicar(r.datos);
    else setFase({ tipo: "error", mensaje: r.error || t.error, reintentar: empezar });
  }

  async function enviar(datos: Pregunta) {
    const escritura = datos.pregunta.section === "writing";
    setOcupado(true);
    const r = await pedir("/api/prueba-nivel/responder", {
      pruebaId: datos.pruebaId,
      preguntaId: datos.pregunta.id,
      ...(escritura ? { texto } : { seleccion }),
      segundos: Math.round((Date.now() - desde.current) / 1000),
    });
    setOcupado(false);
    if (r.ok) aplicar(r.datos);
    else setFase({ tipo: "error", mensaje: r.error || t.error, reintentar: () => setFase({ tipo: "pregunta", datos }) });
  }

  return (
    <main ref={arriba} className="mx-auto w-full max-w-[680px] flex-1 scroll-mt-4 px-5 pb-[120px] pt-6 min-[900px]:pt-10">
      {fase.tipo === "bienvenida" && (
        <section className="entra">
          <h1 className="text-balance font-display text-[28px] font-bold leading-[1.15] text-marca-tinta min-[900px]:text-[34px]">
            {fase.repitiendo ? t.repetirTitulo : t.bienvenidaTitulo}
          </h1>
          <p className="mt-3 text-pretty text-[16px] leading-[1.55] text-marca-tinta">{t.bienvenidaTexto}</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {t.bienvenidaPuntos.map((punto) => (
              <li key={punto} className="flex items-start gap-2.5 text-[15.5px] leading-[1.45] text-marca-tinta">
                <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-marca-verde" />
                {punto}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <button type="button" className={BOTON} onClick={empezar} disabled={ocupado || soloLectura}>
              {ocupado ? t.empezando : t.empezar}
            </button>
          </div>
        </section>
      )}

      {fase.tipo === "pregunta" && (
        <PantallaPregunta
          key={fase.datos.pregunta.id}
          datos={fase.datos}
          seleccion={seleccion}
          onSeleccion={setSeleccion}
          texto={texto}
          onTexto={setTexto}
          ocupado={ocupado}
          soloLectura={soloLectura}
          onSiguiente={() => enviar(fase.datos)}
          hrefInicio={hrefInicio}
        />
      )}

      {fase.tipo === "resultado" && (
        <PantallaResultado resultado={fase.resultado} cursoActualId={cursoActualId} hrefInicio={hrefInicio} soloLectura={soloLectura} />
      )}

      {fase.tipo === "error" && (
        <section className="entra" role="alert">
          <p className="text-pretty text-[16px] leading-[1.55] text-marca-tinta">{fase.mensaje}</p>
          <div className="mt-5 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-5">
            <button type="button" className={BOTON} onClick={fase.reintentar}>
              {t.reintentar}
            </button>
            <Link href={hrefInicio} className="text-center text-[15px] font-semibold text-marca-verdeOsc underline underline-offset-2">
              {t.volverAlInicio}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function PantallaPregunta({
  datos,
  seleccion,
  onSeleccion,
  texto,
  onTexto,
  ocupado,
  soloLectura,
  onSiguiente,
  hrefInicio,
}: {
  datos: Pregunta;
  seleccion: number | null;
  onSeleccion: (i: number) => void;
  texto: string;
  onTexto: (v: string) => void;
  ocupado: boolean;
  soloLectura: boolean;
  onSiguiente: () => void;
  hrefInicio: string;
}) {
  const { t: todos } = usarIdioma();
  const t = todos.pruebaNivel;
  const { pregunta, progreso } = datos;
  const escritura = pregunta.section === "writing";
  const minimo = pregunta.writing_min_words || 50;
  const palabras = contarPalabras(texto);
  const puede = !ocupado && !soloLectura && (escritura ? palabras >= minimo : seleccion !== null);
  const numero = Math.min(progreso.answeredTotal + 1, progreso.grandTotal);
  const porcentaje = Math.round((progreso.answeredTotal / Math.max(progreso.grandTotal, 1)) * 100);

  return (
    <section className="entra" aria-labelledby="pregunta-titulo">
      {/* La barra y dónde va. */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-semibold text-marca-tinta">{t.preguntaDe(numero, progreso.grandTotal)}</p>
        <p className="text-right text-[14px] font-medium text-marca-tinta">{t.secciones[pregunta.section]}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progreso.grandTotal}
        aria-valuenow={progreso.answeredTotal}
        aria-label={t.preguntaDe(numero, progreso.grandTotal)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-marca-verdeFondo"
      >
        <div className="h-full rounded-full bg-marca-verde transition-[width] duration-300" style={{ width: `${porcentaje}%` }} />
      </div>

      {/* El texto o el email que hay que leer (en Gestión, `prompt_text`). */}
      {pregunta.prompt_text && (
        <div lang="en" className="mt-5 whitespace-pre-wrap rounded-[14px] border border-marca-borde bg-white px-4 py-4 text-[15.5px] leading-[1.6] text-marca-tinta">
          {pregunta.prompt_text}
        </div>
      )}

      {escritura ? (
        <>
          <h1 id="pregunta-titulo" lang="en" className="mt-5 text-pretty font-display text-[20px] font-bold leading-[1.35] text-marca-tinta">
            {pregunta.writing_prompt}
          </h1>
          <label htmlFor="redaccion" className="mt-4 block text-[14px] font-semibold text-marca-tinta">
            {t.escribeEnIngles}
          </label>
          <textarea
            id="redaccion"
            lang="en"
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            disabled={ocupado || soloLectura}
            rows={9}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="sentences"
            className="mt-2 block w-full resize-y rounded-[14px] border border-marca-borde bg-white px-4 py-3 text-[16px] leading-[1.55] text-marca-tinta focus:border-marca-verdeOsc focus:outline-none focus:ring-2 focus:ring-marca-verde/30"
          />
          <p className="mt-2 text-[14px] text-marca-tinta" aria-live="polite">
            {t.palabras(palabras, minimo)}
          </p>
        </>
      ) : (
        <>
          <h1 id="pregunta-titulo" lang="en" className="mt-5 text-pretty font-display text-[20px] font-bold leading-[1.35] text-marca-tinta">
            {pregunta.question_text}
          </h1>
          <div role="radiogroup" aria-labelledby="pregunta-titulo" className="mt-4 flex flex-col gap-2.5">
            {(pregunta.options ?? []).map((opcion, i) => {
              const elegida = seleccion === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={elegida}
                  disabled={ocupado || soloLectura}
                  onClick={() => onSeleccion(i)}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left text-[16px] leading-[1.4] text-marca-tinta transition-colors ${
                    elegida
                      ? "border-marca-verdeOsc bg-marca-verdeFondo shadow-[inset_0_0_0_1px_theme(colors.marca.verdeOsc)]"
                      : "border-marca-borde bg-white hover:bg-marca-niebla"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                      elegida ? "bg-marca-verdeOsc text-white" : "bg-marca-niebla text-marca-tinta"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span lang="en">{opcion}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-6">
        <button type="button" className={BOTON} onClick={onSiguiente} disabled={!puede}>
          {ocupado ? t.guardando : t.siguiente}
        </button>
        {ocupado && escritura && (
          <p className="mt-3 text-[14.5px] leading-[1.45] text-marca-tinta" aria-live="polite">
            {t.leyendoRedaccion}
          </p>
        )}
      </div>

      <p className="mt-8 text-[14px] leading-[1.45] text-marca-tinta">
        <Link href={hrefInicio} className="font-semibold text-marca-verdeOsc underline underline-offset-2 hover:text-marca-tinta">
          {t.salir}
        </Link>{" "}
        · {t.salirAyuda}
      </p>
    </section>
  );
}

function PantallaResultado({
  resultado,
  cursoActualId,
  hrefInicio,
  soloLectura,
}: {
  resultado: Resultado;
  cursoActualId: string | null;
  hrefInicio: string;
  soloLectura: boolean;
}) {
  const { t: todos } = usarIdioma();
  const t = todos.pruebaNivel;
  const nivel = t.niveles[resultado.nivel];
  const curso = resultado.curso;
  const esElSuyo = curso !== null && curso.id === cursoActualId;

  return (
    <section className="entra" aria-labelledby="resultado-titulo">
      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-verdeOsc">{t.resultadoEtiqueta}</p>
      <div className="mt-3 flex items-center gap-4">
        <span aria-hidden className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-marca-tinta font-display text-[28px] font-bold text-white">
          {resultado.nivel}
        </span>
        <div className="min-w-0">
          <h1 id="resultado-titulo" className="font-display text-[28px] font-bold leading-[1.15] text-marca-tinta">
            {t.resultadoTitulo(resultado.nivel)}
          </h1>
          <p className="mt-1 text-[17px] font-semibold leading-[1.3] text-marca-tinta">{nivel.nombre}</p>
        </div>
      </div>
      <p className="mt-4 text-pretty text-[16px] leading-[1.55] text-marca-tinta">{nivel.frase}</p>
      {resultado.provisional && <p className="mt-3 text-pretty text-[15px] leading-[1.5] text-marca-tinta">{t.provisional}</p>}

      {curso && (
        <div className="mt-6 rounded-[16px] border border-marca-borde bg-white px-5 py-5 shadow-[0_10px_24px_rgba(18,33,26,0.07)]">
          <p className="text-[14px] font-semibold text-marca-tinta">{t.resultadoCurso}</p>
          <p className="mt-1 font-display text-[22px] font-bold leading-[1.2] text-marca-tinta">{curso.titulo}</p>
          {esElSuyo && <p className="mt-1 text-[15px] leading-[1.45] text-marca-tinta">{t.esTuCurso}</p>}
          <div className="mt-4">
            {esElSuyo || soloLectura ? (
              <Link href={`/curso/${curso.slug}`} className={BOTON}>
                {esElSuyo ? t.seguirConMiCurso : t.empezarMiCurso}
              </Link>
            ) : (
              <form action={elegirCurso}>
                <input type="hidden" name="curso" value={curso.id} />
                <button type="submit" className={BOTON}>
                  {t.empezarMiCurso}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <p className="mt-6">
        <Link href={hrefInicio} className="text-[15px] font-semibold text-marca-verdeOsc underline underline-offset-2 hover:text-marca-tinta">
          {t.volverAlInicio}
        </Link>
      </p>
    </section>
  );
}
