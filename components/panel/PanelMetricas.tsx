// ---------------------------------------------------------------
// EL PANEL DEL EQUIPO
//
// Tres cifras, cada una con:
//   · Debajo de la cifra, las dos comparaciones fijas: la semana y el mes
//     en curso hasta ahora contra el mismo tramo del anterior. No
//     dependen del selector de fechas.
//   · La comparación del rango elegido con el periodo anterior de la
//     misma duración, en pequeño y en gris: subordinada a las dos fijas.
//   · Su gráfico, por semanas (las 12 que acaban en la del final del
//     rango) o por meses (los 6 que acaban en el de ese final), y su
//     «Cómo se calcula».
// Las cifras:
//   1. Clases a las que se entró con el botón «Ingresar a clase».
//   2. Alumnos que usaron el botón.
//   3. Alumnos que generaron práctica con IA.
// Debajo, la lista de alumnos con clase, para ver quién usa el botón y
// quién no.
//
// LOS ESTADOS. Lo que existía en todo el rango se pinta entero; lo que
// empezó a apuntarse a mitad, con «datos desde…»; lo que no existía,
// como «sin datos»; y lo que no se pudo leer, como lectura fallida.
// Nunca un cero en su lugar. Un porcentaje con base menor que 10 va en
// gris y con «muestra pequeña». Una comparación fija contra un periodo
// sin datos lo dice en vez de dar una variación; contra uno incompleto,
// la da en gris y dice desde cuándo hay datos.
// ---------------------------------------------------------------

import Link from "next/link";
import type { ReactNode } from "react";
import type { CifrasClase, Disponibilidad } from "@/lib/panel-calculos";
import type { Fija, Fijas, Fuente, Ia, MetricasPanel } from "@/lib/panel-metricas";
import { lunesDe } from "@/lib/panel-rango";
import { tramoVacio, type Comparacion } from "@/lib/panel-tramos";
import {
  contraQue,
  diaCorto,
  etiquetaMes,
  etiquetaPeriodo,
  mesLargo,
  MUESTRA_MINIMA,
  numero,
  porcentaje,
  tituloPeriodo,
  tramoCorto,
  tramoLargo,
  variacionEnNumero,
  variacionEnPuntos,
} from "@/lib/panel-formato";
import type { PuntoEje } from "@/components/panel/graficos";
import GraficoBloque, { type Vista } from "@/components/panel/GraficoBloque";
import {
  AvisoParcial,
  CabTarjeta,
  ChipPequena,
  ComoSeCalcula,
  Delta,
  ErrorLectura,
  LineaFija,
  LineasFijas,
  SinDatos,
  Tarjeta,
  type EstadoFija,
} from "@/components/panel/piezas";
import TablaClase from "@/components/panel/TablaClase";

/** Cómo se compara una cifra en las líneas fijas. */
type OpcionesFija<T> = {
  /** Sobre qué se calcula: con base 0 no hay variación que dar. */
  base: (v: T) => number;
  variacion: (a: T, b: T) => Extract<EstadoFija, { tipo: "variacion" }>;
  /** Qué se dice si el tramo en curso, o el anterior, tiene base 0. */
  vacio: string;
  anteriorVacio: string;
};

const QUE = ["semana", "mes"] as const;
type Que = (typeof QUE)[number];

const NOMBRE_FIJA: Record<Que, { linea: string; actual: string; anterior: string }> = {
  semana: { linea: "vs. semana anterior", actual: "Semana en curso", anterior: "Semana anterior, mismo tramo" },
  mes: { linea: "vs. mes anterior", actual: "Mes en curso", anterior: "Mes anterior, mismo tramo" },
};

export default function PanelMetricas({ m, ahora }: { m: MetricasPanel; ahora: Date }) {
  const disp = (f: Fuente, cual: "actual" | "anterior"): Disponibilidad | null => m.disponibilidad?.[f][cual] ?? null;
  const inicio = (f: Fuente) => m.inicioDatos?.[f] ?? null;
  /** Se compara con el anterior solo si el anterior tenía el dato entero. */
  const comparable = (f: Fuente) => disp(f, "anterior")?.estado === "completo";
  const sinComparar = (f: Fuente) => {
    const d = disp(f, "anterior");
    return d?.estado === "parcial" ? `El periodo anterior solo tiene datos desde el ${diaCorto(d.desde)}` : "Sin datos en el periodo anterior";
  };
  const contra = contraQue(m.anterior, m.rango);
  const minutos = Math.max(0, Math.round((ahora.getTime() - Date.parse(m.calculadoEn)) / 60_000));
  const tramos = m.fijas.tramos;

  // Los ejes de los gráficos y qué periodo va a medias.
  const puntosSemanas: PuntoEje[] = m.semanas.map((s) => ({ periodo: s.periodo, etiqueta: etiquetaPeriodo(s.periodo), titulo: tituloPeriodo(s.periodo) }));
  const puntosMeses: PuntoEje[] = m.meses.map((s) => ({ periodo: s.periodo, etiqueta: etiquetaMes(s.periodo), titulo: mesLargo(s.periodo) }));
  const semanaEnCurso = indiceONull(m.semanas.findIndex((s) => s.periodo === lunesDe(m.hoy)));
  const mesEnCurso = indiceONull(m.meses.findIndex((s) => s.enCurso));

  const reglaBoton = (
    <p>
      Una clase dada es un parte de Gestión de tipo «normal» o «recuperación». Se abrió con el botón si el alumno pulsó «Ingresar a clase» para esa
      clase (mismo día y hora de inicio); varios clics cuentan una vez. Los clics en clases sin parte o con parte de falta no cuentan. Hay datos desde
      el {inicio("entradasClase") ? diaCorto(inicio("entradasClase") as string) : "primer clic"}: las clases de antes no se cuentan. No es asistencia:
      quien entra por el enlace de WhatsApp o de Google Calendar no aparece aquí.
    </p>
  );
  const reglaFijas = (
    <p>
      «vs. semana anterior» y «vs. mes anterior» no dependen de las fechas elegidas: comparan siempre la semana y el mes en curso, hasta ahora, con
      los mismos días de la semana o del mes anterior hasta la misma hora. En las de clases, una clase entra en el tramo si su hora de inicio cae
      dentro.
    </p>
  );

  return (
    <div className="space-y-3">
      {m.fallos.length > 0 && (
        <p role="alert" className="rounded-[12px] border border-[#EBCFC7] bg-[#FBF3F1] px-4 py-3 text-[13.5px] leading-[1.5] text-[#7A3222]">
          <b className="font-semibold">No se ha podido leer todo.</b> Falta: {m.fallos.join(", ")}. Esas cifras salen con «—» y no como cero; el resto
          es correcto. Vuelve a cargar en unos minutos.
        </p>
      )}

      <section aria-label="Las tres cifras" className="grid grid-cols-1 items-start gap-3 pt-3 min-[1100px]:grid-cols-3">
        {/* 1. CLASES CON EL BOTÓN */}
        <Cifra titulo="Clases a las que se entró con el botón">
          {cifraBoton({
            parte: (r) => r.clasesConEntrada,
            base: (r) => r.clases,
            unidad: "clases dadas",
            columna: "Dadas",
            vacio: "Ninguna clase dada en el periodo, según los partes de Gestión.",
            aria: "Porcentaje de clases dadas abiertas con el botón",
            como: (
              <>
                <p>De las clases dadas en el periodo, cuántas se abrieron con el botón «Ingresar a clase» desde la plataforma.</p>
                {reglaBoton}
                {reglaFijas}
              </>
            ),
          })}
        </Cifra>

        {/* 2. ALUMNOS CON EL BOTÓN */}
        <Cifra titulo="Alumnos que usaron el botón">
          {cifraBoton({
            parte: (r) => r.alumnosConEntrada,
            base: (r) => r.alumnos,
            unidad: "alumnos con clase",
            columna: "Con clase",
            vacio: "Ningún alumno tuvo clase en el periodo, según los partes de Gestión.",
            aria: "Porcentaje de alumnos con clase que la abrieron con el botón",
            como: (
              <>
                <p>
                  De los alumnos con al menos una clase dada en el periodo, cuántos abrieron al menos una de esas clases con el botón. Cada alumno cuenta
                  una vez, use el botón en una clase o en todas; también en cada mes del gráfico, que se cuenta entero y no sumando semanas.
                </p>
                {reglaBoton}
                {reglaFijas}
              </>
            ),
          })}
        </Cifra>

        {/* 3. PRÁCTICA CON IA */}
        <Cifra titulo="Generaron práctica con IA">{cifraIa()}</Cifra>
      </section>

      {/* LA LISTA */}
      <Tarjeta titulo="alumnos" id="alumnos">
        <CabTarjeta
          id="alumnos"
          titulo="Alumnos con clase en el periodo"
          sub="Quién entró con el botón y quién no: todos los alumnos con alguna clase dada, también los que nunca lo usaron."
        />
        {m.listaClase ? (
          m.clase?.actual ? (
            <TablaClase filas={m.listaClase} />
          ) : (
            <div className="mt-4"><SinDatos texto={textoSinDatos("entradasClase")} /></div>
          )
        ) : (
          <div className="mt-4"><ErrorLectura que="la lista de alumnos" /></div>
        )}
      </Tarjeta>

      <footer className="space-y-1.5 pt-5 text-[12.5px] leading-[1.5] text-marca-grisSuave">
        {avisoExclusiones()}
        <p>
          Días en hora de Madrid; semanas de lunes a domingo y meses naturales. «vs. semana anterior» y «vs. mes anterior» comparan siempre la semana
          y el mes en curso, hasta las {tramos.ahora.slice(11)}, con el mismo tramo del anterior; el resto de cada cifra es del rango elegido,
          comparado con {contra.replace("vs. ", "")}, el periodo anterior de la misma duración. Datos calculados{" "}
          {minutos < 1 ? "hace un momento" : `hace ${minutos} min`}; se recalculan cada 5 minutos.
        </p>
      </footer>
    </div>
  );

  // ---------------------------------------------------------------
  // LAS COMPARACIONES FIJAS
  // ---------------------------------------------------------------

  /** Los dos tramos con sus horas y cifras, para el tooltip. */
  function detalle<T>(que: Que, f: Fija<T>, describir: (v: T) => string): string {
    const c: Comparacion = tramos[que];
    const n = NOMBRE_FIJA[que];
    const lado = (t: Comparacion["actual"], v: T | null) => (tramoVacio(t) ? "aún no ha empezado" : `${tramoLargo(t)}: ${v === null ? "sin datos" : describir(v)}`);
    const corto = c.recortado ? " El mes anterior tiene menos días que el de hoy: se compara con él entero, hasta su último día." : "";
    return `${n.actual}, ${lado(c.actual, f.actual)}. ${n.anterior}, ${lado(c.anterior, f.anterior)}.${corto}`;
  }

  /** Por qué no hay variación, o la variación con sus avisos. */
  function estadoFija<T>(f: Fija<T>, { base, variacion, vacio, anteriorVacio }: OpcionesFija<T>): EstadoFija {
    const d = f.disponibilidad.anterior;
    if (d.estado === "sin_datos" || f.anterior === null) return { tipo: "texto", texto: "sin datos del periodo anterior" };
    if (f.actual === null) return { tipo: "texto", texto: "sin datos en el tramo en curso" };
    if (base(f.actual) === 0) return { tipo: "texto", texto: vacio };
    if (base(f.anterior) === 0) return { tipo: "texto", texto: anteriorVacio };
    const e = variacion(f.actual, f.anterior);
    if (d.estado === "parcial") e.notas.unshift(`periodo anterior incompleto: datos desde el ${diaCorto(d.desde)}`);
    return { ...e, tenue: e.tenue || e.notas.length > 0 };
  }

  function lineasFijas<T>(fijas: Fijas<T> | null, que: string, opciones: OpcionesFija<T>, describir: (v: T) => string) {
    if (!fijas) {
      return (
        <LineasFijas>
          <ErrorLectura que={que} />
        </LineasFijas>
      );
    }
    return (
      <LineasFijas>
        {QUE.map((q) => (
          <LineaFija
            key={q}
            nombre={NOMBRE_FIJA[q].linea}
            tramo={tramoCorto(tramos[q].actual.hasta, q)}
            detalle={detalle(q, fijas[q], describir)}
            estado={estadoFija(fijas[q], opciones)}
          />
        ))}
      </LineasFijas>
    );
  }

  // ---------------------------------------------------------------
  // LAS CIFRAS
  // ---------------------------------------------------------------

  /** 1 y 2: el mismo cruce, contado por clases o por alumnos. */
  function cifraBoton({
    parte,
    base,
    unidad,
    columna,
    vacio,
    aria,
    como,
  }: {
    parte: (r: CifrasClase) => number;
    base: (r: CifrasClase) => number;
    unidad: string;
    /** La cabecera de la base en la tabla, corta: la tarjeta es estrecha. */
    columna: string;
    vacio: string;
    aria: string;
    como: ReactNode;
  }) {
    const d = disp("entradasClase", "actual");
    const explica = <ComoSeCalcula>{como}</ComoSeCalcula>;
    const pct = (r: CifrasClase) => porcentaje(parte(r), base(r));
    const fijas = lineasFijas(
      m.fijas.clase,
      "la semana ni el mes en curso",
      {
        base,
        vacio: `aún sin ${unidad} en este tramo`,
        anteriorVacio: `sin ${unidad} en el periodo anterior`,
        variacion: (a, b) => {
          const pequena = base(a) < MUESTRA_MINIMA || base(b) < MUESTRA_MINIMA;
          return { tipo: "variacion", variacion: variacionEnPuntos(pct(a), pct(b)), tenue: pequena, notas: pequena ? ["muestra pequeña"] : [] };
        },
      },
      (r) => `${pct(r)} % (${numero(parte(r))} de ${numero(base(r))} ${unidad})`
    );
    if (!m.clase || !d) {
      return (
        <>
          <ErrorLectura que="las clases o las entradas" conValor />
          {fijas}
        </>
      );
    }
    if (d.estado === "sin_datos" || !m.clase.actual) {
      return (
        <>
          <SinDatos texto={textoSinDatos("entradasClase")} />
          {fijas}
          {explica}
        </>
      );
    }
    const a = m.clase.actual;
    const ant = comparable("entradasClase") ? m.clase.anterior : null;
    if (base(a) === 0) {
      return (
        <>
          <p className="text-[14px] text-marca-tintaMedia">{vacio}</p>
          {fijas}
          {explica}
        </>
      );
    }
    const pequena = base(a) < MUESTRA_MINIMA;
    const g = m.grafico;

    // La tabla de cada vista: el periodo, sus cifras y los puntos que cambia respecto al anterior.
    const vista = (puntos: PuntoEje[], valores: (CifrasClase | null)[], enCurso: number | null, primera: string): Vista => ({
      tipo: "linea",
      puntos,
      enCurso,
      valores: valores.map((r) => (r ? { parte: parte(r), base: base(r) } : null)),
      unidad,
      tabla: {
        cabeceras: [primera, `Botón / ${columna.toLowerCase()}`, "%", "vs. ant."],
        filas: puntos.map((p, i) => {
          const r = valores[i];
          const titulo = enTabla(p, i === enCurso, primera === "Mes");
          if (!r) return [titulo, "sin datos", "—", "—"];
          const previo = i > 0 ? valores[i - 1] : null;
          const cambio = base(r) && previo && base(previo) ? variacionEnPuntos(pct(r), pct(previo)).texto.split(" · ")[0] : "—";
          return [titulo, `${numero(parte(r))} / ${numero(base(r))}`, base(r) ? `${pct(r)} %` : "—", cambio];
        }),
      },
    });

    return (
      <>
        <Valor n={numero(parte(a))} />
        <p className="text-[14px] text-marca-tinta">
          de {numero(base(a))} {unidad} · <b className={`font-semibold ${pequena ? "text-marca-grisSuave" : ""}`}>{porcentaje(parte(a), base(a))} %</b>
          {pequena && <ChipPequena />}
        </p>
        {fijas}
        <DelRango contra={contra}>
          <Delta
            actual={porcentaje(parte(a), base(a))}
            anterior={ant && base(ant) > 0 ? porcentaje(parte(ant), base(ant)) : null}
            enPuntos
            tenue
            sinComparar={sinComparar("entradasClase")}
          />
        </DelRango>
        <Parcial d={d} texto={(desde) => `Datos desde el ${diaCorto(desde)}: las clases de antes no se cuentan.`} />
        {g ? (
          <GraficoBloque
            aria={aria}
            semanas={vista(puntosSemanas, g.clase, semanaEnCurso, "Semana")}
            meses={vista(puntosMeses, g.claseMeses, mesEnCurso, "Mes")}
          />
        ) : (
          <div className="mt-3"><ErrorLectura que="el gráfico" /></div>
        )}
        {explica}
      </>
    );
  }

  /** 3: alumnos únicos que generaron práctica con IA. */
  function cifraIa() {
    const d = disp("ia", "actual");
    const explica = (
      <ComoSeCalcula>
        <p>
          Alumnos únicos que generaron al menos un bloque de práctica escrito por la IA en el periodo, desde «Para ti» o desde Inicio. No cuentan los
          bloques servidos del banco de reserva (cuando la IA no responde a tiempo) ni los que genera el equipo revisando una ficha. Cada alumno cuenta
          una vez por periodo: los de cada mes se cuentan en el mes entero, no sumando semanas.
        </p>
        {reglaFijas}
      </ComoSeCalcula>
    );
    const fijas = lineasFijas(
      m.fijas.ia,
      "la semana ni el mes en curso",
      {
        // Una cifra de alumnos siempre se puede comparar, también desde cero.
        base: () => 1,
        vacio: "",
        anteriorVacio: "",
        variacion: (a, b) => {
          const pequena = b.alumnos < MUESTRA_MINIMA;
          return { tipo: "variacion", variacion: variacionEnNumero(a.alumnos, b.alumnos), tenue: pequena, notas: pequena ? ["muestra pequeña"] : [] };
        },
      },
      (v) => `${numero(v.alumnos)} ${v.alumnos === 1 ? "alumno" : "alumnos"}, ${numero(v.bloques)} ${v.bloques === 1 ? "bloque" : "bloques"}`
    );
    if (!m.ia || !d) {
      return (
        <>
          <ErrorLectura que="la práctica con IA" conValor />
          {fijas}
        </>
      );
    }
    if (d.estado === "sin_datos") {
      return (
        <>
          <SinDatos texto={textoSinDatos("ia")} />
          {fijas}
          {explica}
        </>
      );
    }
    const a = m.ia.actual;
    const ant = comparable("ia") ? m.ia.anterior : null;
    const g = m.grafico;

    const vista = (puntos: PuntoEje[], valores: (Ia | null)[], enCurso: number | null, primera: string): Vista => ({
      tipo: "columnas",
      nombre: "Alumnos",
      puntos,
      enCurso,
      valores: valores.map((v) => (v ? v.alumnos : null)),
      tabla: {
        cabeceras: [primera, "Alumnos", "Bloques", "vs. ant."],
        filas: puntos.map((p, i) => {
          const v = valores[i];
          const titulo = enTabla(p, i === enCurso, primera === "Mes");
          if (!v) return [titulo, "sin datos", "—", "—"];
          const previo = i > 0 ? valores[i - 1] : null;
          return [titulo, numero(v.alumnos), numero(v.bloques), previo ? variacionEnNumero(v.alumnos, previo.alumnos).texto : "—"];
        }),
      },
    });

    return (
      <>
        <Valor n={numero(a.alumnos)} />
        <p className="text-[14px] text-marca-tinta">
          {a.alumnos === 1 ? "alumno" : "alumnos"} · {numero(a.bloques)} {a.bloques === 1 ? "bloque" : "bloques"} de IA
        </p>
        {fijas}
        <DelRango contra={contra}>
          <Delta actual={a.alumnos} anterior={ant ? ant.alumnos : null} tenue sinComparar={sinComparar("ia")} />
        </DelRango>
        <Parcial d={d} texto={(desde) => `Datos desde el ${diaCorto(desde)}: antes no había bloques.`} />
        {g ? (
          <GraficoBloque
            aria="Alumnos que generaron práctica con IA"
            semanas={vista(puntosSemanas, g.ia, semanaEnCurso, "Semana")}
            meses={vista(puntosMeses, g.iaMeses, mesEnCurso, "Mes")}
          />
        ) : (
          <div className="mt-3"><ErrorLectura que="el gráfico" /></div>
        )}
        {explica}
      </>
    );
  }

  function avisoExclusiones() {
    const e = m.exclusiones;
    if (!e) return <p>No se ha podido leer la lista de cuentas excluidas.</p>;
    const sin = e.sinExcluir;
    return (
      <>
        {sin && sin.length > 0 && (
          <p className="inline-flex items-baseline gap-1.5 rounded-[8px] border border-marca-borde bg-[#F7F9F7] px-2.5 py-1.5 text-marca-tintaMedia">
            <i aria-hidden className="inline-block h-2 w-2 flex-none translate-y-[1px] rounded-full bg-marca-amarillo" />
            <span>
              {sin.length === 1 ? "1 posible cuenta de prueba sin excluir" : `${numero(sin.length)} posibles cuentas de prueba sin excluir`}:{" "}
              {sin.map((a) => a.nombre || a.alumnoId).join(", ")}.{" "}
              <Link href="/exclusiones" className="font-semibold text-marca-verdeOsc hover:text-marca-tinta">
                Revisar
              </Link>
            </span>
          </p>
        )}
        <p>
          Fuera de todas las cifras: {numero(e.cuentas)} {e.cuentas === 1 ? "cuenta excluida" : "cuentas excluidas"} (demostración, pruebas y equipo) ·{" "}
          <Link href="/exclusiones" className="font-semibold text-marca-verdeOsc hover:text-marca-tinta">
            ver la lista
          </Link>
          , y los bloques que genera el equipo revisando una ficha.
          {sin === null && " No se ha podido comprobar si hay alumnos del profesor de prueba sin excluir."}
        </p>
      </>
    );
  }

  function textoSinDatos(fuente: Fuente): string {
    const desde = inicio(fuente);
    if (fuente === "entradasClase") {
      return desde ? `«Ingresar a clase» se registra desde el ${diaCorto(desde)}.` : "Todavía no hay ninguna entrada a clase registrada.";
    }
    return desde ? `El primer bloque de práctica es del ${diaCorto(desde)}.` : "Todavía no hay ningún bloque de práctica.";
  }
}

// ---------------------------------------------------------------
// PIEZAS
// ---------------------------------------------------------------

const indiceONull = (i: number) => (i >= 0 ? i : null);

/** El periodo en la tabla, corto («12 oct», «sep 2026»): la cabecera ya dice si es semana o mes. */
function enTabla(p: PuntoEje, enCurso: boolean, esMes: boolean): string {
  const corto = esMes ? `${p.etiqueta} ${p.periodo.slice(0, 4)}` : p.etiqueta;
  return enCurso ? `${corto} · en curso` : corto;
}

function Cifra({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-1 rounded-[14px] border border-marca-borde bg-white p-[18px] lg:p-[22px]">
      <h2 className="text-[14px] font-semibold text-marca-tintaMedia">{titulo}</h2>
      {children}
    </article>
  );
}

function Valor({ n }: { n: string }) {
  return <p className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums text-marca-tinta sm:text-[44px]">{n}</p>;
}

/** La comparación del rango elegido: debajo de las fijas, en pequeño y en gris. */
function DelRango({ contra, children }: { contra: string; children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[12.5px] leading-[1.4] text-marca-grisSuave">
      Rango elegido {contra}: {children}
    </p>
  );
}

function Parcial({ d, texto }: { d: Disponibilidad | null; texto: (desde: string) => string }) {
  if (d?.estado !== "parcial") return null;
  return <AvisoParcial>{texto(d.desde)}</AvisoParcial>;
}
