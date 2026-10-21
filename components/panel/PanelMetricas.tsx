// ---------------------------------------------------------------
// EL PANEL DEL EQUIPO
//
// Tres cifras, cada una con su comparación, su gráfico semana a semana
// (las 12 semanas que acaban en la del final del rango) y su «Cómo se
// calcula»:
//   1. Clases a las que se entró con el botón «Ingresar a clase».
//   2. Alumnos que usaron el botón.
//   3. Alumnos que generaron práctica con IA en «Para ti».
// Debajo, la lista de alumnos con clase, para ver quién usa el botón y
// quién no.
//
// LOS ESTADOS. Lo que existía en todo el rango se pinta entero; lo que
// empezó a apuntarse a mitad, con «datos desde…»; lo que no existía,
// como «sin datos»; y lo que no se pudo leer, como lectura fallida.
// Nunca un cero en su lugar. Un porcentaje con base menor que 10 va en
// gris y con «muestra pequeña».
// ---------------------------------------------------------------

import Link from "next/link";
import type { ReactNode } from "react";
import type { Disponibilidad, ResumenClase } from "@/lib/panel-calculos";
import type { Fuente, MetricasPanel } from "@/lib/panel-metricas";
import { contraQue, diaCorto, etiquetaPeriodo, MUESTRA_MINIMA, numero, porcentaje, tituloPeriodo } from "@/lib/panel-formato";
import { Columnas, LineaPorcentaje, type PuntoEje } from "@/components/panel/graficos";
import { AvisoParcial, CabTarjeta, ChipPequena, ComoSeCalcula, Delta, ErrorLectura, SinDatos, TablaVista, Tarjeta } from "@/components/panel/piezas";
import TablaClase from "@/components/panel/TablaClase";

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
  const puntos: PuntoEje[] = m.semanas.map((s) => ({ periodo: s.periodo, etiqueta: etiquetaPeriodo(s.periodo), titulo: tituloPeriodo(s.periodo) }));

  const reglaBoton = (
    <p>
      Una clase dada es un parte de Gestión de tipo «normal» o «recuperación». Se abrió con el botón si el alumno pulsó «Ingresar a clase» para esa
      clase (mismo día y hora de inicio); varios clics cuentan una vez. Los clics en clases sin parte o con parte de falta no cuentan. Hay datos desde
      el {inicio("entradasClase") ? diaCorto(inicio("entradasClase") as string) : "primer clic"}: las clases de antes no se cuentan. No es asistencia:
      quien entra por el enlace de WhatsApp o de Google Calendar no aparece aquí.
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
            vacio: "Ninguna clase dada en el periodo, según los partes de Gestión.",
            aria: "Porcentaje de clases dadas abiertas con el botón, por semana",
            como: (
              <>
                <p>De las clases dadas en el periodo, cuántas se abrieron con el botón «Ingresar a clase» desde la plataforma.</p>
                {reglaBoton}
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
            vacio: "Ningún alumno tuvo clase en el periodo, según los partes de Gestión.",
            aria: "Porcentaje de alumnos con clase que la abrieron con el botón, por semana",
            como: (
              <>
                <p>
                  De los alumnos con al menos una clase dada en el periodo, cuántos abrieron al menos una de esas clases con el botón. Cada alumno cuenta
                  una vez, use el botón en una clase o en todas.
                </p>
                {reglaBoton}
              </>
            ),
          })}
        </Cifra>

        {/* 3. IA EN «PARA TI» */}
        <Cifra titulo="Generaron con IA en «Para ti»">{cifraParaTi()}</Cifra>
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
          Días en hora de Madrid; semanas de lunes a domingo. Comparado con {contra.replace("vs. ", "")}, el periodo anterior de la misma duración.
          Datos calculados {minutos < 1 ? "hace un momento" : `hace ${minutos} min`}; se recalculan cada 5 minutos.
        </p>
      </footer>
    </div>
  );

  // ---------------------------------------------------------------
  // LAS CIFRAS
  // ---------------------------------------------------------------

  /** 1 y 2: el mismo cruce, contado por clases o por alumnos. */
  function cifraBoton({
    parte,
    base,
    unidad,
    vacio,
    aria,
    como,
  }: {
    parte: (r: ResumenClase) => number;
    base: (r: ResumenClase) => number;
    unidad: string;
    vacio: string;
    aria: string;
    como: ReactNode;
  }) {
    const d = disp("entradasClase", "actual");
    const explica = <ComoSeCalcula>{como}</ComoSeCalcula>;
    if (!m.clase || !d) return <ErrorLectura que="las clases o las entradas" conValor />;
    if (d.estado === "sin_datos" || !m.clase.actual) {
      return (
        <>
          <SinDatos texto={textoSinDatos("entradasClase")} />
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
          {explica}
        </>
      );
    }
    const pequena = base(a) < MUESTRA_MINIMA;
    const g = m.grafico;
    return (
      <>
        <Valor n={numero(parte(a))} />
        <p className="text-[14px] text-marca-tinta">
          de {numero(base(a))} {unidad} · <b className={`font-semibold ${pequena ? "text-marca-grisSuave" : ""}`}>{porcentaje(parte(a), base(a))} %</b>
          {pequena && <ChipPequena />}
        </p>
        <Delta
          actual={porcentaje(parte(a), base(a))}
          anterior={ant && base(ant) > 0 ? porcentaje(parte(ant), base(ant)) : null}
          enPuntos
          sinComparar={sinComparar("entradasClase")}
        />
        <Parcial d={d} texto={(desde) => `Datos desde el ${diaCorto(desde)}: las clases de antes no se cuentan.`} />
        {g ? (
          <>
            <LineaPorcentaje
              puntos={puntos}
              valores={g.clase.map((r) => (r ? { parte: parte(r), base: base(r) } : null))}
              unidad={unidad}
              alto={160}
              aria={aria}
            />
            <TablaVista
              cabeceras={["Semana", "Con el botón", unidad.charAt(0).toUpperCase() + unidad.slice(1), "%"]}
              filas={puntos.map((p, i) => {
                const r = g.clase[i];
                return r
                  ? [p.titulo, numero(parte(r)), numero(base(r)), base(r) ? `${porcentaje(parte(r), base(r))} %` : "—"]
                  : [p.titulo, "sin datos", "sin datos", "—"];
              })}
            />
          </>
        ) : (
          <div className="mt-3"><ErrorLectura que="el gráfico" /></div>
        )}
        {explica}
      </>
    );
  }

  /** 3: alumnos únicos que generaron con IA en «Para ti». */
  function cifraParaTi() {
    const d = disp("paraTi", "actual");
    const explica = (
      <ComoSeCalcula>
        <p>
          Alumnos únicos que generaron al menos un bloque de práctica en el periodo desde la pantalla «Para ti» y que escribió la IA. No cuentan los
          bloques servidos del banco de reserva (cuando la IA no responde a tiempo), los pedidos desde Inicio ni los que genera el equipo revisando una
          ficha.
        </p>
        <p>
          La pantalla desde la que se pide cada bloque se registra desde el{" "}
          {inicio("paraTi") ? diaCorto(inicio("paraTi") as string) : "despliegue de la instrumentación"}: de los bloques de antes no se sabe y no
          cuentan.
        </p>
      </ComoSeCalcula>
    );
    if (!m.paraTi || !d) return <ErrorLectura que="la práctica de «Para ti»" conValor />;
    if (d.estado === "sin_datos") {
      return (
        <>
          <SinDatos texto={textoSinDatos("paraTi")} />
          {explica}
        </>
      );
    }
    const a = m.paraTi.actual;
    const ant = comparable("paraTi") ? m.paraTi.anterior : null;
    const g = m.grafico;
    return (
      <>
        <Valor n={numero(a.alumnos)} />
        <p className="text-[14px] text-marca-tinta">
          {a.alumnos === 1 ? "alumno" : "alumnos"} · {numero(a.bloques)} {a.bloques === 1 ? "bloque" : "bloques"} de IA
        </p>
        <Delta actual={a.alumnos} anterior={ant ? ant.alumnos : null} sinComparar={sinComparar("paraTi")} />
        <Parcial d={d} texto={(desde) => `Datos desde el ${diaCorto(desde)}: antes no se registraba la pantalla.`} />
        {g ? (
          <>
            <Columnas
              puntos={puntos}
              series={[{ nombre: "Alumnos", valores: g.paraTi.map((v) => (v ? v.alumnos : null)) }]}
              alto={160}
              aria="Alumnos que generaron con IA en «Para ti», por semana"
            />
            <TablaVista
              cabeceras={["Semana", "Alumnos", "Bloques"]}
              filas={puntos.map((p, i) => {
                const v = g.paraTi[i];
                return v ? [p.titulo, numero(v.alumnos), numero(v.bloques)] : [p.titulo, "sin datos", "sin datos"];
              })}
            />
          </>
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
    return desde ? `La pantalla de cada bloque se registra desde el ${diaCorto(desde)}.` : "Todavía no hay ningún bloque con la pantalla registrada.";
  }
}

// ---------------------------------------------------------------
// PIEZAS
// ---------------------------------------------------------------

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

function Parcial({ d, texto }: { d: Disponibilidad | null; texto: (desde: string) => string }) {
  if (d?.estado !== "parcial") return null;
  return <AvisoParcial>{texto(d.desde)}</AvisoParcial>;
}
