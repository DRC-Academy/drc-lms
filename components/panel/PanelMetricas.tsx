// ---------------------------------------------------------------
// EL PANEL DEL EQUIPO, CON DATOS REALES
//
// La pantalla de `design/admin-dashboard-preview.html`, sin el
// interruptor «Diseño completo / Con lo que hay hoy»: ahora lo decide la
// disponibilidad de cada dato (`MetricasPanel.disponibilidad`). Lo que
// existía en todo el rango se pinta entero; lo que empezó a apuntarse a
// mitad, con «datos desde…»; lo que no existía, como «sin datos»; y lo
// que no se pudo leer, como lectura fallida. Nunca un cero en su lugar.
//
// Componente de servidor: recibe los datos ya calculados y prepara lo
// que necesitan los gráficos (cliente) como números planos. Los alumnos
// únicos de las tarjetas son los de TODO el rango (`panel_totales`); la
// serie da los de cada periodo, que no se suman.
// ---------------------------------------------------------------

import type { ReactNode } from "react";
import type { Disponibilidad, Periodo } from "@/lib/panel-calculos";
import { periodosDelRango } from "@/lib/panel-calculos";
import type { FilaPanel, Fuente, MetricasPanel } from "@/lib/panel-metricas";
import { diasNaturales, diaLocal } from "@/lib/fechas";
import { preguntaPorId } from "@/lib/faq";
import { COLOR_SERIE, contraQue, diaCorto, etiquetaPeriodo, MUESTRA_MINIMA, numero, porcentaje, rangoLegible, tituloPeriodo } from "@/lib/panel-formato";
import { Chispa, Columnas, LineaPorcentaje, type PuntoEje, type Serie } from "@/components/panel/graficos";
import {
  Aclaracion,
  AvisoParcial,
  CabTarjeta,
  ChipPequena,
  Cifra,
  Delta,
  ErrorLectura,
  Leyenda,
  LineaDato,
  Pct,
  SinDatos,
  TablaVista,
  Tarjeta,
} from "@/components/panel/piezas";
import SerieConMetricas, { type MetricaSerie } from "@/components/panel/SerieConMetricas";
import TopCurso from "@/components/panel/TopCurso";
import TablaAlumnos, { type FilaTabla } from "@/components/panel/TablaAlumnos";

const GRIS_SIN_PANTALLA = "#A9B4AE";
const SIN_ACTIVIDAD_ANTES = "Sin actividad en el periodo anterior";

/** Lo que cada fuente dice cuando no tiene datos en el rango. */
function textoSinDatos(fuente: Fuente, inicio: string | null): string {
  if (fuente === "entradasClase") {
    return inicio ? `«Ingresar a clase» se registra desde el ${diaCorto(inicio)}.` : "Todavía no hay ninguna entrada a clase registrada.";
  }
  return inicio
    ? `Se registra desde el ${diaCorto(inicio)}.`
    : "Todavía no se ha registrado nada: empieza a contarse con la versión de la plataforma que lo apunta.";
}

export default function PanelMetricas({ m, ahora }: { m: MetricasPanel; ahora: Date }) {
  const periodos = periodosDelRango(m.rango, m.granularidad);
  const puntos: PuntoEje[] = periodos.map((p) => ({
    periodo: p.periodo,
    etiqueta: etiquetaPeriodo(p.periodo),
    titulo: tituloPeriodo(p.periodo, m.granularidad),
  }));
  const porPeriodo = new Map((m.serie ?? []).map((f) => [f.periodo, f]));

  // --- Disponibilidad ---
  const disp = (f: Fuente, cual: "actual" | "anterior"): Disponibilidad | null => m.disponibilidad?.[f][cual] ?? null;
  const inicio = (f: Fuente) => m.inicioDatos?.[f] ?? null;
  /** ¿Tiene datos ese periodo? Null si no se sabe (no se pudo leer el inicio). */
  const periodoCon = (f: Fuente | null, p: Periodo) => (f === null ? true : m.inicioDatos ? inicio(f) !== null && (inicio(f) as string) <= p.hasta : null);
  /** La serie de un campo, con null en los periodos sin datos o sin leer. */
  const serieDe = (campo: keyof FilaPanel, fuente: Fuente | null): (number | null)[] =>
    periodos.map((p) => {
      const fila = porPeriodo.get(p.periodo);
      return fila && periodoCon(fuente, p) ? (fila[campo] as number) : null;
    });
  /** Se puede comparar con el anterior solo si el anterior tenía el dato entero. */
  const comparable = (f: Fuente | null) => f === null || disp(f, "anterior")?.estado === "completo";
  const sinComparar = (f: Fuente) => {
    const d = disp(f, "anterior");
    return d?.estado === "parcial" ? `El periodo anterior solo tiene datos desde el ${diaCorto(d.desde)}` : "Sin periodo anterior con datos";
  };

  const t = m.totales;
  // Un periodo anterior sin nadie activo es de antes de abrir la plataforma
  // (14 ago 2026): «+166 vs. 0» es cierto pero no compara nada.
  const anteriorVacio = t !== null && t.anterior.activos === 0;
  const tp = m.totalesPlan;
  const contra = contraQue(m.anterior, m.rango);
  const minutos = Math.max(0, Math.round((ahora.getTime() - Date.parse(m.calculadoEn)) / 60_000));

  // ¿«Activos» cambia de método dentro del rango o frente al anterior?
  const instAct = disp("instrumentacion", "actual");
  const instAnt = disp("instrumentacion", "anterior");
  const notaMetodo =
    instAct?.estado === "parcial"
      ? `Desde el ${diaCorto(instAct.desde)} «activos» cuenta también a quien entra sin hacer nada; antes, solo a quien inició sesión o hizo algo.`
      : instAct?.estado === "completo" && instAnt?.estado !== "completo"
        ? "El periodo anterior solo contaba a quien inició sesión o hizo algo: la comparación sale a favor de este."
        : null;

  return (
    <div className="space-y-3">
      {m.fallos.length > 0 && (
        <p role="alert" className="rounded-[12px] border border-[#EBCFC7] bg-[#FBF3F1] px-4 py-3 text-[13.5px] leading-[1.5] text-[#7A3222]">
          <b className="font-semibold">No se ha podido leer todo.</b> Falta: {m.fallos.join(", ")}. Esas cifras salen con «—» y no como cero; el resto
          es correcto. Vuelve a cargar en unos minutos.
        </p>
      )}

      {/* 1. KPI */}
      <section aria-label="Cifras principales" className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 min-[1100px]:grid-cols-4">
        {/* Activos */}
        <Kpi etiqueta="Alumnos activos en la plataforma">
          {t ? (
            <>
              <Valor n={numero(t.actual.activos)} unidad="alumnos únicos" />
              <Delta actual={t.actual.activos} anterior={anteriorVacio ? null : t.anterior.activos} sinComparar={SIN_ACTIVIDAD_ANTES} />
              <Chispa valores={serieDe("activos", null)} />
              <Base>
                {tp && m.alumnos ? (
                  <>
                    {numero(tp.actual.activos)} de {numero(m.alumnos.conPlan)} con plan activo en Gestión ·{" "}
                    <Pct parte={tp.actual.activos} base={m.alumnos.conPlan} />
                    <br />
                    {numero(m.alumnos.conFicha)} alumnos con ficha en Gestión
                  </>
                ) : (
                  <span className="text-[#A5432F]">No se ha podido leer el plan activo de Gestión.</span>
                )}
              </Base>
              {notaMetodo && <AvisoParcial>{notaMetodo}</AvisoParcial>}
            </>
          ) : (
            <ErrorLectura que="la actividad" conValor />
          )}
        </Kpi>

        {/* Entradas a clase */}
        <Kpi etiqueta="Entradas con «Ingresar a clase»">
          {!t || !m.disponibilidad ? (
            <ErrorLectura que="las entradas a clase" conValor />
          ) : disp("entradasClase", "actual")?.estado === "sin_datos" ? (
            <SinDatos texto={textoSinDatos("entradasClase", inicio("entradasClase"))} />
          ) : (
            <>
              <Valor n={numero(t.actual.entradasAlumnos)} unidad="alumnos únicos" />
              <Delta
                actual={t.actual.entradasAlumnos}
                anterior={comparable("entradasClase") ? t.anterior.entradasAlumnos : null}
                sinComparar={sinComparar("entradasClase")}
              />
              <Chispa valores={serieDe("entradasAlumnos", "entradasClase")} />
              <Base>{numero(t.actual.entradas)} entradas a clase totales</Base>
              <Parcial d={disp("entradasClase", "actual")} />
            </>
          )}
        </Kpi>

        {/* Práctica con IA */}
        <Kpi etiqueta="Activos que generaron práctica con IA">
          {t ? (
            <>
              <Valor
                n={`${porcentaje(t.actual.generaron, t.actual.activos)} %`}
                gris={t.actual.activos < MUESTRA_MINIMA}
              />
              <Delta
                actual={porcentaje(t.actual.generaron, t.actual.activos)}
                anterior={anteriorVacio ? null : porcentaje(t.anterior.generaron, t.anterior.activos)}
                enPuntos
                sinComparar={SIN_ACTIVIDAD_ANTES}
              />
              <Chispa
                valores={periodos.map((p) => {
                  const f = porPeriodo.get(p.periodo);
                  return f && f.activos > 0 ? (f.generaron / f.activos) * 100 : f ? 0 : null;
                })}
              />
              <Base>
                {numero(t.actual.generaron)} de {numero(t.actual.activos)} alumnos activos · {numero(t.actual.bloques)} bloques generados
                {t.actual.activos < MUESTRA_MINIMA && <ChipPequena />}
              </Base>
            </>
          ) : (
            <ErrorLectura que="los bloques" conValor />
          )}
        </Kpi>

        {/* Accesos */}
        <Kpi etiqueta="Accesos a la plataforma">
          {!t || !m.disponibilidad ? (
            <ErrorLectura que="los accesos" conValor />
          ) : instAct?.estado === "sin_datos" ? (
            <SinDatos texto={textoSinDatos("instrumentacion", inicio("instrumentacion"))} />
          ) : (
            <>
              <Valor n={numero(t.actual.accesosAlumnos)} unidad="alumnos únicos" />
              <Delta
                actual={t.actual.accesosAlumnos}
                anterior={comparable("instrumentacion") ? t.anterior.accesosAlumnos : null}
                sinComparar={sinComparar("instrumentacion")}
              />
              <Chispa valores={serieDe("accesosAlumnos", "instrumentacion")} />
              <Base>{numero(t.actual.accesos)} accesos totales · una visita nueva tras 30 min sin actividad</Base>
              <Parcial d={instAct} />
            </>
          )}
        </Kpi>
      </section>

      {/* 2. LA SERIE */}
      <Tarjeta titulo="serie" id="t-serie">
        <CabTarjeta
          id="t-serie"
          titulo={m.granularidad === "dia" ? "Día a día" : "Semana a semana"}
          sub={
            m.granularidad === "dia"
              ? "Cada día cuenta sus alumnos únicos. Los del rango entero están en las tarjetas de arriba: no son la suma de los días."
              : "Semanas de lunes a domingo; la primera y la última pueden ir recortadas al rango. Los alumnos únicos del rango entero están arriba: no son la suma de las semanas."
          }
        />
        {m.serie ? (
          <SerieConMetricas puntos={puntos} metricas={metricasDeSerie()} />
        ) : (
          <div className="mt-4">
            <ErrorLectura que="la serie" />
          </div>
        )}
      </Tarjeta>

      <div className="grid grid-cols-1 gap-3 min-[960px]:grid-cols-2">
        {/* 3. ENTRAR A CLASE */}
        <Tarjeta titulo="clase" id="t-clase">
          <CabTarjeta
            id="t-clase"
            titulo="Entrar a clase desde la plataforma"
            sub="Clases dadas según los partes de Gestión (normales y recuperaciones) frente a las que se abrieron con «Ingresar a clase». Una clase abierta con varios clics cuenta una vez."
          />
          {tarjetaClase()}
          <Aclaracion>No es asistencia: quien entra por el enlace de WhatsApp o de Google Calendar no aparece aquí.</Aclaracion>
        </Tarjeta>

        {/* 4. PRÁCTICA CON IA */}
        <Tarjeta titulo="practica" id="t-practica">
          <CabTarjeta
            id="t-practica"
            titulo="Práctica generada con IA"
            sub="Bloques de 10 ejercicios creados a partir de la última clase analizada. «Completado» es un bloque terminado al menos una vez."
          />
          {tarjetaPractica()}
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[960px]:grid-cols-2">
        {/* 5. EMBUDO */}
        <Tarjeta titulo="embudo" id="t-embudo">
          <CabTarjeta
            id="t-embudo"
            titulo="Embudo de uso"
            sub={`Alumnos únicos con plan activo hoy en Gestión, del ${rangoLegible(m.rango)}. Cada paso está dentro del anterior.`}
          />
          {tarjetaEmbudo()}
        </Tarjeta>

        {/* 6. USO DEL CURSO */}
        <Tarjeta titulo="curso" id="t-curso">
          <CabTarjeta id="t-curso" titulo="Uso del curso" sub="Lecciones completadas en la plataforma. No cuenta el historial importado de LearnDash." />
          {tarjetaCurso()}
        </Tarjeta>
      </div>

      {/* 7. BANNER Y AYUDA */}
      <Tarjeta titulo="ayuda" id="t-ayuda">
        <CabTarjeta
          id="t-ayuda"
          titulo="Ampliar plan y ayuda"
          sub="Clics en los botones de ampliar plan y uso del chat de ayuda. Solo se apuntan identificadores: nunca lo que escribe el alumno."
        />
        {tarjetaAyuda()}
      </Tarjeta>

      {/* 8. ALUMNOS */}
      <Tarjeta titulo="alumnos" id="alumnos">
        <CabTarjeta
          id="alumnos"
          titulo="Alumnos"
          sub="Las cifras son del rango elegido; la última actividad, de siempre. Pulsa una cabecera para ordenar."
        />
        {m.tabla ? (
          <TablaAlumnos
            filas={filasTabla()}
            entradasDisponibles={disp("entradasClase", "actual")?.estado !== "sin_datos" && m.disponibilidad !== null}
            nota={notaTabla()}
          />
        ) : (
          <div className="mt-4">
            <ErrorLectura que="la lista de alumnos" />
          </div>
        )}
      </Tarjeta>

      <p className="pt-5 text-[12.5px] leading-[1.5] text-marca-grisSuave">
        Días en hora de Madrid; semanas de lunes a domingo. Comparado con {contra.replace("vs. ", "")}, el periodo anterior de la misma duración. Fuera
        de todas las cifras: las cuentas de demostración, la cuenta de pruebas y lo que genera el equipo revisando una ficha. Datos calculados{" "}
        {minutos < 1 ? "hace un momento" : `hace ${minutos} min`}; se recalculan cada 5 minutos.
      </p>
    </div>
  );

  // ---------------------------------------------------------------
  // LAS SECCIONES
  // ---------------------------------------------------------------

  function metricasDeSerie(): MetricaSerie[] {
    const nombreP = m.granularidad === "dia" ? "por día" : "por semana";
    const notaFuente = (f: Fuente): string | null => {
      const d = disp(f, "actual");
      if (d?.estado === "parcial") return `Datos desde el ${diaCorto(d.desde)}: los periodos de antes salen vacíos, no a cero.`;
      if (d?.estado === "sin_datos") return textoSinDatos(f, inicio(f));
      return null;
    };
    return [
      {
        id: "activos",
        boton: "Activos",
        series: [
          { nombre: "Alumnos activos (únicos)", valores: serieDe("activos", null) },
          { nombre: "Hicieron algo: lección, ejercicio o bloque", valores: serieDe("hicieronAlgo", null) },
        ],
        nota: notaMetodo,
        aria: `Alumnos activos y alumnos que hicieron algo, ${nombreP}`,
      },
      {
        id: "accesos",
        boton: "Accesos",
        series: [
          { nombre: "Alumnos únicos", valores: serieDe("accesosAlumnos", "instrumentacion") },
          { nombre: "Accesos totales", valores: serieDe("accesos", "instrumentacion") },
        ],
        nota: notaFuente("instrumentacion"),
        aria: `Accesos a la plataforma, ${nombreP}`,
      },
      {
        id: "entradas",
        boton: "Entradas a clase",
        series: [
          { nombre: "Alumnos únicos", valores: serieDe("entradasAlumnos", "entradasClase") },
          { nombre: "Entradas a clase totales", valores: serieDe("entradas", "entradasClase") },
        ],
        nota: notaFuente("entradasClase"),
        aria: `Entradas a clase con el botón, ${nombreP}`,
      },
      {
        id: "bloques",
        boton: "Bloques",
        series: [
          { nombre: "Bloques generados", valores: serieDe("bloques", null) },
          { nombre: "Completados", valores: serieDe("completados", null) },
        ],
        nota: null,
        aria: `Bloques generados y completados, ${nombreP}`,
      },
    ];
  }

  function tarjetaClase() {
    const d = disp("entradasClase", "actual");
    if (!m.clase || !d) return <div className="mt-4"><ErrorLectura que="las clases o las entradas" /></div>;
    if (d.estado === "sin_datos" || !m.clase.actual) {
      return <div className="mt-4"><SinDatos texto={textoSinDatos("entradasClase", inicio("entradasClase"))} /></div>;
    }
    const a = m.clase.actual;
    const ant = comparable("entradasClase") ? m.clase.anterior : null;
    const valores = m.clase.serie.map((p) => (p.resumen ? { parte: p.resumen.clasesConEntrada, base: p.resumen.clases } : null));
    return (
      <>
        <Parcial d={d} texto={(desde) => `Datos desde el ${diaCorto(desde)}: las clases de antes no se cuentan.`} />
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          <Cifra n={numero(a.clases)} texto="clases dadas (Gestión)" />
          <Cifra n={numero(a.clasesConEntrada)} texto="abiertas desde el botón" />
          <Cifra n={<Pct parte={a.clasesConEntrada} base={a.clases} chip={false} />} texto={`${numero(a.clasesConEntrada)} de ${numero(a.clases)}`} />
        </div>
        <div className="mt-2.5">
          <Delta
            actual={porcentaje(a.clasesConEntrada, a.clases)}
            anterior={ant && ant.clases > 0 ? porcentaje(ant.clasesConEntrada, ant.clases) : null}
            enPuntos
            sinComparar={sinComparar("entradasClase")}
          />
        </div>
        {a.clases < MUESTRA_MINIMA && a.clases > 0 && <p className="mt-1"><ChipPequena /></p>}
        <div className="mt-2">
          <LineaDato
            izq="Alumnos con clase que usaron el botón"
            der={
              <>
                {numero(a.alumnosConEntrada)} de {numero(a.alumnos)} · <Pct parte={a.alumnosConEntrada} base={a.alumnos} />
              </>
            }
          />
        </div>
        <LineaPorcentaje
          puntos={puntos}
          valores={valores}
          unidad="clases"
          aria={`Porcentaje de clases abiertas desde el botón, ${m.granularidad === "dia" ? "por día" : "por semana"}`}
        />
        <TablaVista
          cabeceras={["Periodo", "Clases", "Desde el botón", "%"]}
          filas={m.clase.serie.map((p, i) =>
            p.resumen
              ? [puntos[i].titulo, numero(p.resumen.clases), numero(p.resumen.clasesConEntrada), p.resumen.clases ? `${porcentaje(p.resumen.clasesConEntrada, p.resumen.clases)} %` : "—"]
              : [puntos[i].titulo, "sin datos", "sin datos", "—"]
          )}
        />
      </>
    );
  }

  function tarjetaPractica() {
    if (!t) return <div className="mt-4"><ErrorLectura que="los bloques" /></div>;
    const a = t.actual;
    const nombres = ["Bloques generados", "Completados"];
    const series: Serie[] = [
      { nombre: nombres[0], valores: serieDe("bloques", null) },
      { nombre: nombres[1], valores: serieDe("completados", null) },
    ];
    const pg = m.podianGenerar?.actual;
    const pb = m.primerBloque?.actual;
    return (
      <>
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          <Cifra n={numero(a.generaron)} texto="alumnos únicos generaron" />
          <Cifra n={numero(a.bloques)} texto="bloques generados" />
          <Cifra
            n={numero(a.completados)}
            texto={
              <>
                completados · <Pct parte={a.completados} base={a.bloques} chip={false} />
              </>
            }
          />
        </div>
        <Leyenda nombres={nombres} colores={COLOR_SERIE} />
        <Columnas puntos={puntos} series={series} alto={190} aria="Bloques generados y completados" />
        <TablaVista
          cabeceras={["Periodo", ...nombres]}
          filas={puntos.map((p, i) => [p.titulo, ...series.map((s) => (s.valores[i] === null ? "—" : numero(s.valores[i] as number)))])}
        />

        <div className="mt-5 border-t border-marca-nieblaOscura pt-4">
          <h3 className="font-display text-[14.5px] font-semibold text-marca-tinta">Desde dónde se generan</h3>
          {origen()}
        </div>

        <div className="mt-5 border-t border-marca-nieblaOscura pt-4">
          <h3 className="font-display text-[14.5px] font-semibold text-marca-tinta">Quién podía y quién lo hizo</h3>
          <div className="mt-1.5">
            <LineaDato
              izq="Tenían una clase analizada nueva y generaron"
              der={pg ? <>{numero(pg.generaron)} de {numero(pg.podian)} · <Pct parte={pg.generaron} base={pg.podian} /></> : <Fallo />}
            />
            <LineaDato
              izq="Completaron su primer bloque"
              der={pb ? <>{numero(pb.completaron)} de {numero(pb.primeros)} · <Pct parte={pb.completaron} base={pb.primeros} /></> : <Fallo />}
            />
            <LineaDato
              izq="Servidos del banco de reserva (la IA no respondió a tiempo)"
              der={<>{numero(a.bloquesBanco)} de {numero(a.bloques)} · <Pct parte={a.bloquesBanco} base={a.bloques} /></>}
            />
          </div>
          {m.granularidad === "dia" && periodos.length < 7 && (
            <Aclaracion>
              «Podían» sale de las clases nuevas de cada semana en Gestión: en un rango que corta una semana puede quedarse algo corto.
            </Aclaracion>
          )}
        </div>
      </>
    );
  }

  function origen() {
    const d = instAct;
    if (!t || !d) return <div className="mt-2.5"><ErrorLectura que="la pantalla de origen" /></div>;
    if (d.estado === "sin_datos") {
      return (
        <div className="mt-2.5">
          <SinDatos compacto texto="Desde qué pantalla se pide cada bloque: «Inicio» o «Para ti»." falta={textoSinDatos("instrumentacion", inicio("instrumentacion"))} />
        </div>
      );
    }
    const a = t.actual;
    const partes = [
      { nombre: "Inicio", v: a.bloquesInicio, color: COLOR_SERIE[0] },
      { nombre: "Para ti", v: a.bloquesParaTi, color: COLOR_SERIE[1] },
      { nombre: "Sin dato", v: a.bloquesSinPantalla, color: GRIS_SIN_PANTALLA },
    ].filter((p) => p.v > 0 || p.nombre !== "Sin dato");
    const total = partes.reduce((s, p) => s + p.v, 0);
    return (
      <>
        <Parcial d={d} texto={(desde) => `Se apunta desde el ${diaCorto(desde)}: lo de antes sale como «sin dato».`} />
        {total === 0 ? (
          <p className="mt-2.5 text-[13.5px] text-marca-grisSuave">Ningún bloque generado en este rango.</p>
        ) : (
          <div className="mt-2.5 flex h-7 gap-0.5 overflow-hidden rounded-[4px]" role="img" aria-label={partes.map((p) => `${p.nombre}: ${p.v}`).join(", ")}>
            {partes
              .filter((p) => p.v > 0)
              .map((p) => (
                <div
                  key={p.nombre}
                  className="flex items-center overflow-hidden whitespace-nowrap px-2.5 text-[13px] font-semibold text-white"
                  style={{ background: p.color, flexGrow: p.v, flexBasis: 0 }}
                >
                  {numero(p.v)}
                </div>
              ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-marca-tintaMedia">
          {partes.map((p) => (
            <span key={p.nombre} className="inline-flex items-center gap-1.5">
              <i aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              {p.nombre}: <b className="font-semibold text-marca-tinta">{numero(p.v)}</b>
              {total > 0 && (
                <>
                  {" "}(<Pct parte={p.v} base={total} chip={false} />)
                </>
              )}
            </span>
          ))}
          {total > 0 && total < MUESTRA_MINIMA && <ChipPequena />}
        </div>
      </>
    );
  }

  function tarjetaEmbudo() {
    const e = m.embudo?.actual;
    const conPlan = m.alumnos?.conPlan;
    if (!e || conPlan === undefined) return <div className="mt-4"><ErrorLectura que="el embudo" /></div>;
    const unSolo = e.periodos < 2;
    const pasos = [
      { nombre: "Tienen acceso (plan activo en Gestión)", v: conPlan, extra: `${numero(m.alumnos!.conFicha)} con ficha en Gestión` },
      { nombre: "Entraron", v: e.entraron },
      { nombre: "Hicieron algo: lección, ejercicio o bloque", v: e.hicieronAlgo },
      {
        nombre: m.granularidad === "dia" ? "Volvieron: hicieron algo en más de un día" : "Volvieron: hicieron algo en más de una semana",
        v: unSolo ? null : e.volvieron,
      },
    ];
    return (
      <>
        <div className="mt-4 grid gap-2.5">
          {pasos.map((p, i) => {
            const previo = i > 0 ? pasos[i - 1].v : null;
            return (
              <div key={p.nombre} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1">
                <span className="text-[13.5px] text-marca-tintaMedia">{p.nombre}</span>
                <span className="text-right text-[15px] font-semibold tabular-nums text-marca-tinta">{p.v === null ? "—" : numero(p.v)}</span>
                <div className="col-span-2 h-3.5 overflow-hidden rounded-[4px] bg-marca-nieblaOscura">
                  {p.v !== null && (
                    <div className="h-full rounded-r-[4px] bg-marca-verde" style={{ width: `${Math.max(0.5, (p.v / Math.max(1, conPlan)) * 100)}%` }} />
                  )}
                </div>
                <span className="col-span-2 text-[12px] text-marca-grisSuave">
                  {p.v === null ? (
                    "Con un solo día en el rango no se puede volver: elige un rango más largo."
                  ) : i === 0 ? (
                    p.extra
                  ) : (
                    <>
                      {previo !== null && previo !== undefined && (
                        <>
                          <Pct parte={p.v} base={previo} /> del paso anterior ·{" "}
                        </>
                      )}
                      {porcentaje(p.v, conPlan)} % del total
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <Aclaracion>
          El plan activo es el de hoy: en rangos antiguos quedan fuera quienes tenían plan entonces y ya no. «Entraron» cuenta inicios de sesión y
          actividad{instAct && instAct.estado !== "sin_datos" ? ", y desde que se apuntan, también las visitas" : "; las visitas sin hacer nada aún no se apuntan"}.
        </Aclaracion>
      </>
    );
  }

  function tarjetaCurso() {
    if (!t) return <div className="mt-4"><ErrorLectura que="las lecciones" /></div>;
    const a = t.actual;
    const series: Serie[] = [{ nombre: "Lecciones completadas", valores: serieDe("lecciones", null) }];
    return (
      <>
        <div className="mt-4">
          <LineaDato izq="Alumnos únicos que completaron alguna lección" der={numero(a.leccionesAlumnos)} />
          <LineaDato
            izq="Lecciones completadas"
            der={
              <>
                {numero(a.lecciones)} {!anteriorVacio && <Variacion actual={a.lecciones} anterior={t.anterior.lecciones} />}
              </>
            }
          />
          <LineaDato izq="Ejercicios hechos" der={<>{numero(a.ejercicios)} <span className="font-normal text-marca-grisSuave">· {numero(a.ejerciciosAlumnos)} alumnos únicos</span></>} />
        </div>
        <Columnas puntos={puntos} series={series} alto={190} aria="Lecciones completadas" />
        <TablaVista
          cabeceras={["Periodo", "Lecciones completadas"]}
          filas={puntos.map((p, i) => [p.titulo, series[0].valores[i] === null ? "—" : numero(series[0].valores[i] as number)])}
        />
        {m.top ? (
          <TopCurso
            cursos={m.top.cursos.map((f) => ({ id: f.id, titulo: f.titulo, curso: null, lecciones: f.leccionesCompletadas, alumnos: f.alumnosUnicos }))}
            modulos={m.top.modulos.map((f) => ({ id: f.id, titulo: f.titulo, curso: f.curso, lecciones: f.leccionesCompletadas, alumnos: f.alumnosUnicos }))}
          />
        ) : (
          <div className="mt-5 border-t border-marca-nieblaOscura pt-4">
            <ErrorLectura que="los cursos con más actividad" />
          </div>
        )}
      </>
    );
  }

  function tarjetaAyuda() {
    const d = instAct;
    if (!m.eventos || !d) return <div className="mt-4"><ErrorLectura que="los eventos" /></div>;
    if (d.estado === "sin_datos") {
      return (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SinDatos texto="Clics en «Quiero ir más rápido» y en ampliar plan desde «Mi progreso»." falta={textoSinDatos("instrumentacion", inicio("instrumentacion"))} />
          <SinDatos texto="Uso de la ayuda: abrir el chat, preguntas leídas y paso a WhatsApp." falta={textoSinDatos("instrumentacion", inicio("instrumentacion"))} />
        </div>
      );
    }
    const filas = m.eventos.actual;
    const filasAnt = comparable("instrumentacion") ? m.eventos.anterior : null;
    const total = (tipo: string, de = filas) => de.find((f) => f.tipo === tipo && f.esTotal);
    const detalles = (tipo: string) => filas.filter((f) => f.tipo === tipo && !f.esTotal).sort((a, b) => b.total - a.total);
    const doble = (tipo: string, nombreTotal: string) => {
      const f = total(tipo);
      const ant = filasAnt ? (total(tipo, filasAnt)?.alumnos ?? 0) : null;
      return (
        <>
          <Valor n={numero(f?.alumnos ?? 0)} unidad="alumnos únicos" chico />
          <Delta actual={f?.alumnos ?? 0} anterior={ant} sinComparar={sinComparar("instrumentacion")} />
          <Base>
            {numero(f?.total ?? 0)} {nombreTotal}
          </Base>
        </>
      );
    };
    const PANTALLA: Record<string, string> = { inicio: "Inicio («Quiero ir más rápido»)", progreso: "Mi progreso", otra: "Otra pantalla" };
    const MOTIVO: Record<string, string> = {
      noResuelto: "La respuesta no le sirvió",
      pedido: "Pidió hablar con alguien",
      sinRespuesta: "Su búsqueda no encontró nada",
    };
    const preguntas = detalles("chat_pregunta_vista").slice(0, 5);
    return (
      <>
        <Parcial d={d} />
        <div className="mt-4 grid gap-5 md:grid-cols-3 md:gap-6">
          <div className="min-w-0">
            <h3 className="font-display text-[14.5px] font-semibold text-marca-tinta">Ampliar plan</h3>
            <div className="mt-2 flex flex-col gap-1.5">{doble("banner_ampliar_clic", "clics totales")}</div>
            <div className="mt-2">
              {detalles("banner_ampliar_clic").map((f) => (
                <LineaDato key={f.detalle ?? "nada"} izq={PANTALLA[f.detalle ?? ""] ?? "Sin dato"} der={`${numero(f.alumnos)} · ${numero(f.total)} clics`} />
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-[14.5px] font-semibold text-marca-tinta">Abrieron la ayuda</h3>
            <div className="mt-2 flex flex-col gap-1.5">{doble("chat_abierto", "aperturas totales")}</div>
            <h4 className="mt-4 text-[13px] font-semibold text-marca-tintaMedia">Preguntas más leídas</h4>
            {preguntas.length === 0 ? (
              <p className="mt-1 text-[13px] text-marca-grisSuave">Ninguna en este rango.</p>
            ) : (
              <div className="mt-1">
                {preguntas.map((f) => (
                  <LineaDato key={f.detalle ?? "nada"} izq={preguntaPorId(f.detalle ?? "")?.pregunta.es ?? f.detalle ?? "—"} der={`${numero(f.total)}`} />
                ))}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-[14.5px] font-semibold text-marca-tinta">Pasaron a WhatsApp</h3>
            <div className="mt-2 flex flex-col gap-1.5">{doble("chat_a_whatsapp", "clics totales")}</div>
            <div className="mt-2">
              {detalles("chat_a_whatsapp").map((f) => (
                <LineaDato key={f.detalle ?? "nada"} izq={MOTIVO[f.detalle ?? ""] ?? "Sin dato"} der={`${numero(f.alumnos)} · ${numero(f.total)}`} />
              ))}
            </div>
          </div>
        </div>
        <Aclaracion>En las listas, primero los alumnos únicos y después el total.</Aclaracion>
      </>
    );
  }

  /**
   * La tabla solo tiene a quien tiene ficha en Gestión; las tarjetas cuentan
   * a todos. Si en el rango hay actividad de alumnos sin ficha, se dice
   * cuánta, para que nadie busque por qué no cuadra.
   */
  function notaTabla(): string | null {
    if (!m.tabla || !t) return null;
    const suma = (c: "bloques" | "lecciones") => m.tabla!.reduce((s, f) => s + f[c], 0);
    const fuera = [
      { n: t.actual.bloques - suma("bloques"), uno: "bloque generado", varios: "bloques generados" },
      { n: t.actual.lecciones - suma("lecciones"), uno: "lección completada", varios: "lecciones completadas" },
    ].filter((x) => x.n > 0);
    if (fuera.length === 0) return null;
    return `Solo alumnos con ficha en Gestión. ${fuera.map((x) => `${numero(x.n)} ${x.n === 1 ? x.uno : x.varios}`).join(" y ")} del rango son de alumnos sin ficha: cuentan en las cifras de arriba, pero no salen aquí.`;
  }

  function filasTabla(): FilaTabla[] {
    return (m.tabla ?? []).map((f) => {
      const ultima = f.ultimaActividad ? diaLocal(new Date(f.ultimaActividad)) : null;
      return {
        alumnoId: f.alumnoId,
        nombre: f.nombre,
        profesor: f.profesor,
        activo: f.activo,
        ultima,
        diasSin: f.ultimaActividad ? Math.max(0, diasNaturales(new Date(f.ultimaActividad), ahora)) : null,
        entradas: f.entradas,
        bloques: f.bloques,
        lecciones: f.lecciones,
      };
    });
  }
}

// ---------------------------------------------------------------
// PIEZAS DE LAS TARJETAS DE ARRIBA
// ---------------------------------------------------------------

function Kpi({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-1.5 rounded-[14px] border border-marca-borde bg-white p-[18px] lg:p-[22px]">
      <h2 className="text-[13.5px] font-medium text-marca-tintaMedia">{etiqueta}</h2>
      {children}
    </article>
  );
}

function Valor({ n, unidad, gris = false, chico = false }: { n: string; unidad?: string; gris?: boolean; chico?: boolean }) {
  return (
    <p
      className={`${chico ? "text-[26px]" : "text-[30px] sm:text-[34px]"} font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums ${gris ? "text-marca-grisSuave" : "text-marca-tinta"}`}
    >
      {n}
      {unidad && <small className="ml-1 text-[15px] font-medium tracking-normal text-marca-tintaMedia">{unidad}</small>}
    </p>
  );
}

function Base({ children }: { children: ReactNode }) {
  return <p className="min-h-[19px] text-[13px] leading-[1.45] text-marca-grisSuave">{children}</p>;
}

function Parcial({ d, texto }: { d: Disponibilidad | null; texto?: (desde: string) => string }) {
  if (d?.estado !== "parcial") return null;
  return <AvisoParcial>{texto ? texto(d.desde) : `Datos desde el ${diaCorto(d.desde)}`}</AvisoParcial>;
}

function Fallo() {
  return <span className="font-medium text-[#A5432F]">no se ha podido leer</span>;
}

/** La variación en pequeño, para una línea de dato. */
function Variacion({ actual, anterior }: { actual: number; anterior: number }) {
  const d = actual - anterior;
  if (d === 0) return <span className="font-normal text-marca-grisSuave">· = vs. {numero(anterior)}</span>;
  return (
    <span className="font-normal" style={{ color: d > 0 ? "#14722A" : "#A5432F" }}>
      {d > 0 ? "▲" : "▼"} {d > 0 ? "+" : "−"}
      {numero(Math.abs(d))} <span className="text-marca-grisSuave">vs. {numero(anterior)}</span>
    </span>
  );
}
