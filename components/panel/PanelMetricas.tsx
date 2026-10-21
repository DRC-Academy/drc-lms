// ---------------------------------------------------------------
// EL PANEL DEL EQUIPO
//
// Lo que importa, por orden: quién entra a clase con el botón (arriba,
// con su lista), los accesos, quién no ha entrado nunca, y dos
// indicadores pequeños de práctica. Cada bloque lleva su gráfico semana
// a semana (las 12 semanas que acaban en la del final del rango) y su
// «Cómo se calcula».
//
// LOS ESTADOS. Lo que existía en todo el rango se pinta entero; lo que
// empezó a apuntarse a mitad, con «datos desde…»; lo que no existía,
// como «sin datos»; y lo que no se pudo leer, como lectura fallida.
// Nunca un cero en su lugar. Un porcentaje con base menor que 10 va en
// gris y con «muestra pequeña».
//
// Componente de servidor: recibe los datos ya calculados y prepara lo
// que necesitan el gráfico y las listas (cliente) como datos planos.
// ---------------------------------------------------------------

import Link from "next/link";
import type { ReactNode } from "react";
import type { Disponibilidad } from "@/lib/panel-calculos";
import type { Fuente, MetricasPanel } from "@/lib/panel-metricas";
import { COLOR_SERIE, contraQue, diaCorto, etiquetaPeriodo, MUESTRA_MINIMA, numero, porcentaje, tituloPeriodo } from "@/lib/panel-formato";
import { Chispa, Columnas, LineaPorcentaje, type PuntoEje } from "@/components/panel/graficos";
import { AvisoParcial, CabTarjeta, ChipPequena, ComoSeCalcula, Delta, ErrorLectura, Leyenda, Pct, SinDatos, TablaVista, Tarjeta } from "@/components/panel/piezas";
import TablaClase from "@/components/panel/TablaClase";
import ListaNunca from "@/components/panel/ListaNunca";

/** Por encima de esto, la tarjeta de práctica avisa de que el banco sirve demasiado. */
const TOPE_BANCO = 25;

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

  return (
    <div className="space-y-3">
      {m.fallos.length > 0 && (
        <p role="alert" className="rounded-[12px] border border-[#EBCFC7] bg-[#FBF3F1] px-4 py-3 text-[13.5px] leading-[1.5] text-[#7A3222]">
          <b className="font-semibold">No se ha podido leer todo.</b> Falta: {m.fallos.join(", ")}. Esas cifras salen con «—» y no como cero; el resto
          es correcto. Vuelve a cargar en unos minutos.
        </p>
      )}

      {/* 1. ENTRAR A CLASE */}
      <Tarjeta titulo="clase" id="t-clase" className="mt-3">
        <CabTarjeta
          id="t-clase"
          titulo="Entrar a clase con el botón"
          sub="De los alumnos que tuvieron alguna clase en el periodo, cuántos la abrieron con «Ingresar a clase» desde la plataforma."
        />
        {bloqueClase()}
      </Tarjeta>

      <div className="grid grid-cols-1 items-start gap-3 min-[960px]:grid-cols-2">
        {/* 2. ACCESOS */}
        <Tarjeta titulo="accesos" id="t-accesos">
          <CabTarjeta id="t-accesos" titulo="Accesos a la plataforma" />
          {bloqueAccesos()}
        </Tarjeta>

        {/* 3. NUNCA ACCEDIERON */}
        <Tarjeta titulo="nunca" id="t-nunca">
          <CabTarjeta id="t-nunca" titulo="Nunca accedieron" sub="La foto de hoy: no depende de las fechas elegidas arriba." />
          {bloqueNunca()}
        </Tarjeta>
      </div>

      {/* 4. INDICADORES PEQUEÑOS */}
      <section aria-label="Práctica" className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        {indicadores()}
      </section>

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
  // LOS BLOQUES
  // ---------------------------------------------------------------

  function bloqueClase() {
    const d = disp("entradasClase", "actual");
    const como = (
      <ComoSeCalcula>
        <p>
          <b className="font-semibold text-marca-tinta">Alumnos:</b> de los alumnos con al menos una clase dada en el periodo, los que abrieron al menos
          una de esas clases con el botón «Ingresar a clase».
        </p>
        <p>
          <b className="font-semibold text-marca-tinta">Clases:</b> de las clases dadas en el periodo, las que se abrieron al menos una vez con el botón.
          Varios clics en la misma clase cuentan una vez.
        </p>
        <p>
          Una clase dada es un parte de Gestión de tipo «normal» o «recuperación». El clic casa con la clase por alumno, día y hora de inicio. Los
          clics en clases sin parte o con parte de falta no cuentan. No es asistencia: quien entra por el enlace de WhatsApp o de Google Calendar no
          aparece aquí.
        </p>
        <p>
          Hay datos desde el {inicio("entradasClase") ? diaCorto(inicio("entradasClase") as string) : "primer clic"} de 2026, el primer clic en el
          botón: las clases de antes no se cuentan. Fuera, las cuentas excluidas (ver el pie).
        </p>
      </ComoSeCalcula>
    );
    if (!m.clase || !d) return <div className="mt-4"><ErrorLectura que="las clases o las entradas" /></div>;
    if (d.estado === "sin_datos" || !m.clase.actual) {
      return (
        <>
          <div className="mt-4"><SinDatos texto={textoSinDatos("entradasClase")} /></div>
          {como}
        </>
      );
    }
    const a = m.clase.actual;
    const ant = comparable("entradasClase") ? m.clase.anterior : null;
    if (a.clases === 0) {
      return (
        <>
          <p className="mt-4 text-[14px] text-marca-tintaMedia">Ninguna clase dada en el periodo, según los partes de Gestión.</p>
          {como}
        </>
      );
    }
    return (
      <>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-[auto_1fr]">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-marca-tintaMedia">Alumnos que entran con el botón</p>
            <Valor n={`${porcentaje(a.alumnosConEntrada, a.alumnos)} %`} gris={a.alumnos < MUESTRA_MINIMA} grande />
            <p className="mt-1 text-[14px] text-marca-tinta">
              <b className="font-semibold tabular-nums">{numero(a.alumnosConEntrada)}</b> de {numero(a.alumnos)} alumnos con clase
              {a.alumnos < MUESTRA_MINIMA && <ChipPequena />}
            </p>
            <div className="mt-1">
              <Delta
                actual={porcentaje(a.alumnosConEntrada, a.alumnos)}
                anterior={ant && ant.alumnos > 0 ? porcentaje(ant.alumnosConEntrada, ant.alumnos) : null}
                enPuntos
                sinComparar={sinComparar("entradasClase")}
              />
            </div>
          </div>
          <div className="min-w-0 sm:border-l sm:border-marca-nieblaOscura sm:pl-8">
            <p className="text-[13.5px] font-medium text-marca-tintaMedia">Clases abiertas con el botón</p>
            <Valor n={`${porcentaje(a.clasesConEntrada, a.clases)} %`} gris={a.clases < MUESTRA_MINIMA} />
            <p className="mt-1 text-[14px] text-marca-tinta">
              <b className="font-semibold tabular-nums">{numero(a.clasesConEntrada)}</b> de {numero(a.clases)} clases
              {a.clases < MUESTRA_MINIMA && <ChipPequena />}
            </p>
            <div className="mt-1">
              <Delta
                actual={porcentaje(a.clasesConEntrada, a.clases)}
                anterior={ant && ant.clases > 0 ? porcentaje(ant.clasesConEntrada, ant.clases) : null}
                enPuntos
                sinComparar={sinComparar("entradasClase")}
              />
            </div>
          </div>
        </div>
        <Parcial d={d} texto={(desde) => `Datos desde el ${diaCorto(desde)}: las clases de antes no se cuentan.`} />
        {graficoClase()}
        {como}
        <div className="mt-5 border-t border-marca-nieblaOscura pt-4">
          <h3 className="font-display text-[15px] font-semibold text-marca-tinta">Alumnos con clase en el periodo</h3>
          {m.listaClase ? <TablaClase filas={m.listaClase} /> : <div className="mt-3"><ErrorLectura que="la lista de alumnos" /></div>}
        </div>
      </>
    );
  }

  function bloqueAccesos() {
    const d = disp("accesos", "actual");
    const t = m.cifras;
    const como = (
      <ComoSeCalcula>
        <p>
          <b className="font-semibold text-marca-tinta">Accesos totales:</b> visitas a la plataforma. Cuenta como visita entrar por un enlace o desde la
          tienda, o volver después de más de 30 minutos sin actividad.
        </p>
        <p>
          <b className="font-semibold text-marca-tinta">Alumnos únicos:</b> alumnos con al menos una visita en el periodo; cada uno cuenta una vez.
        </p>
        <p>
          Las visitas se registran desde el {inicio("accesos") ? diaCorto(inicio("accesos") as string) : "despliegue de la instrumentación"} de 2026 (tabla
          de accesos). Antes solo existían los inicios de sesión, y no son lo mismo: la sesión dura 30 días y quien vuelve con ella abierta no deja
          rastro. Por eso no se mezclan ni se comparan con estas cifras.
        </p>
      </ComoSeCalcula>
    );
    if (!t || !d) return <div className="mt-4"><ErrorLectura que="los accesos" conValor /></div>;
    if (d.estado === "sin_datos") {
      return (
        <>
          <div className="mt-4"><SinDatos texto={textoSinDatos("accesos")} /></div>
          {como}
        </>
      );
    }
    const ant = comparable("accesos") ? t.anterior : null;
    return (
      <>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <Valor n={numero(t.actual.accesos)} />
            <p className="text-[13.5px] text-marca-tintaMedia">accesos totales</p>
            <div className="mt-1">
              <Delta actual={t.actual.accesos} anterior={ant ? ant.accesos : null} sinComparar={sinComparar("accesos")} />
            </div>
          </div>
          <div className="min-w-0">
            <Valor n={numero(t.actual.accesosAlumnos)} />
            <p className="text-[13.5px] text-marca-tintaMedia">alumnos únicos</p>
            <div className="mt-1">
              <Delta actual={t.actual.accesosAlumnos} anterior={ant ? ant.accesosAlumnos : null} sinComparar={sinComparar("accesos")} />
            </div>
          </div>
        </div>
        <Parcial d={d} texto={(desde) => `Datos desde el ${diaCorto(desde)}: antes no se registraban las visitas.`} />
        {graficoAccesos()}
        {como}
      </>
    );
  }

  function bloqueNunca() {
    const n = m.nunca;
    if (!n) return <div className="mt-4"><ErrorLectura que="quién no ha accedido" conValor /></div>;
    return (
      <>
        <div className="mt-4">
          <Valor n={numero(n.alumnos.length)} unidad="alumnos" />
          <p className="mt-1 text-[14px] text-marca-tinta">
            de {numero(n.conPlan)} con plan activo hoy · <Pct parte={n.alumnos.length} base={n.conPlan} />
          </p>
        </div>
        <ComoSeCalcula>
          <p>
            Alumnos con el plan activo hoy en Gestión que no tienen ningún inicio de sesión ni ningún acceso a la plataforma, nunca. Las sesiones se
            guardan desde el primer día de la plataforma.
          </p>
          <p>Entrar a una clase desde el correo o WhatsApp no cuenta como acceder: no pasa por la plataforma. Fuera, las cuentas excluidas.</p>
        </ComoSeCalcula>
        <ListaNunca filas={n.alumnos} />
      </>
    );
  }

  function indicadores() {
    const t = m.cifras;
    if (!t) {
      return (
        <>
          <Indicador titulo="Practicaron"><ErrorLectura que="la práctica" /></Indicador>
          <Indicador titulo="Práctica generada con IA"><ErrorLectura que="los bloques" /></Indicador>
        </>
      );
    }
    const a = t.actual;
    const bancoPct = porcentaje(a.bloquesBanco, a.bloques);
    return (
      <>
        <Indicador titulo="Practicaron">
          <p className="text-[15px] text-marca-tinta">
            <b className="text-[22px] font-semibold tabular-nums">{numero(a.practicaron)}</b> alumnos
          </p>
          <Delta actual={a.practicaron} anterior={t.anterior.practicaron === 0 ? null : t.anterior.practicaron} sinComparar="Sin práctica en el periodo anterior" />
          {m.grafico && <Chispa valores={m.grafico.practicaron} />}
          <ComoSeCalcula>
            <p>
              Alumnos únicos con al menos una lección completada, un intento de ejercicio de lección o un bloque de práctica generado en el periodo.
              Entrar a clase o a la plataforma no cuenta. Solo lo hecho en la plataforma: el historial importado de LearnDash no entra, ni los bloques
              que genera el equipo revisando una ficha.
            </p>
          </ComoSeCalcula>
        </Indicador>
        <Indicador titulo="Práctica generada con IA">
          {a.bloques === 0 ? (
            <p className="text-[14px] text-marca-tintaMedia">Ningún bloque generado en el periodo.</p>
          ) : (
            <>
              <p className="text-[15px] text-marca-tinta">
                <b className="text-[22px] font-semibold tabular-nums">{numero(a.bloquesIa)}</b> de IA ·{" "}
                <b className="text-[22px] font-semibold tabular-nums">{numero(a.bloquesBanco)}</b> del banco
              </p>
              <p className="text-[13px] text-marca-grisSuave">
                {numero(a.bloques)} bloques · del banco el <Pct parte={a.bloquesBanco} base={a.bloques} />
              </p>
              {bancoPct > TOPE_BANCO && a.bloques >= MUESTRA_MINIMA && (
                <AvisoParcial>El banco pasa del {TOPE_BANCO} %: la IA no respondió a tiempo en más de 1 de cada 4 bloques.</AvisoParcial>
              )}
            </>
          )}
          {graficoBloques()}
          <ComoSeCalcula>
            <p>
              Bloques de práctica generados en el periodo, según quién los hizo: la IA, a partir de la última clase analizada, o el banco de reserva,
              que se sirve cuando la IA no responde a tiempo. Sin los que genera el equipo revisando una ficha. Se avisa si el banco pasa del{" "}
              {TOPE_BANCO} % con al menos {MUESTRA_MINIMA} bloques.
            </p>
          </ComoSeCalcula>
        </Indicador>
      </>
    );
  }

  // ---------------------------------------------------------------
  // LOS GRÁFICOS DE CADA BLOQUE
  // ---------------------------------------------------------------

  function graficoClase() {
    const g = m.grafico;
    if (!g) return <div className="mt-4"><ErrorLectura que="el gráfico" /></div>;
    const valores = g.clase.map((r) => (r ? { parte: r.alumnosConEntrada, base: r.alumnos } : null));
    return (
      <>
        <p className="mt-4 text-[12.5px] font-medium text-marca-grisSuave">Semana a semana · % de alumnos con clase que entraron con el botón</p>
        <LineaPorcentaje puntos={puntos} valores={valores} unidad="alumnos con clase" aria="Porcentaje de alumnos con clase que la abrieron con el botón, por semana" />
        <TablaVista
          cabeceras={["Semana", "Alumnos con clase", "Entraron con el botón", "%", "Clases", "Abiertas con el botón"]}
          filas={puntos.map((p, i) => {
            const r = g.clase[i];
            return r
              ? [p.titulo, numero(r.alumnos), numero(r.alumnosConEntrada), r.alumnos ? `${porcentaje(r.alumnosConEntrada, r.alumnos)} %` : "—", numero(r.clases), numero(r.clasesConEntrada)]
              : [p.titulo, "sin datos", "sin datos", "—", "sin datos", "sin datos"];
          })}
        />
      </>
    );
  }

  function graficoAccesos() {
    const g = m.grafico;
    if (!g) return <div className="mt-4"><ErrorLectura que="el gráfico" /></div>;
    if (g.accesos.every((v) => v === null)) return null;
    return (
      <>
        <p className="mt-4 text-[12.5px] font-medium text-marca-grisSuave">Semana a semana · accesos totales</p>
        <Columnas puntos={puntos} series={[{ nombre: "Accesos totales", valores: g.accesos }]} alto={190} aria="Accesos totales a la plataforma, por semana" />
        <TablaVista
          cabeceras={["Semana", "Accesos totales"]}
          filas={puntos.map((p, i) => [p.titulo, g.accesos[i] === null ? "sin datos" : numero(g.accesos[i] as number)])}
        />
      </>
    );
  }

  function graficoBloques() {
    const g = m.grafico;
    if (!g) return null;
    const nombres = ["De IA", "Del banco"];
    return (
      <>
        <Leyenda nombres={nombres} colores={COLOR_SERIE} />
        <Columnas
          puntos={puntos}
          series={[
            { nombre: nombres[0], valores: g.bloquesIa },
            { nombre: nombres[1], valores: g.bloquesBanco },
          ]}
          alto={150}
          aria="Bloques generados con IA y servidos del banco, por semana"
        />
        <TablaVista
          cabeceras={["Semana", ...nombres]}
          filas={puntos.map((p, i) => [p.titulo, numero(g.bloquesIa[i]), numero(g.bloquesBanco[i])])}
        />
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
    return desde ? `Las visitas se registran desde el ${diaCorto(desde)}.` : "Todavía no se ha registrado ninguna visita.";
  }
}

// ---------------------------------------------------------------
// PIEZAS
// ---------------------------------------------------------------

function Valor({ n, unidad, gris = false, grande = false }: { n: string; unidad?: string; gris?: boolean; grande?: boolean }) {
  return (
    <p
      className={`${grande ? "text-[40px] sm:text-[48px]" : "text-[30px] sm:text-[34px]"} font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums ${gris ? "text-marca-grisSuave" : "text-marca-tinta"}`}
    >
      {n}
      {unidad && <small className="ml-1 text-[15px] font-medium tracking-normal text-marca-tintaMedia">{unidad}</small>}
    </p>
  );
}

function Indicador({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-1 rounded-[14px] border border-marca-borde bg-white px-[18px] py-3.5 lg:px-[22px]">
      <h2 className="text-[13.5px] font-medium text-marca-tintaMedia">{titulo}</h2>
      {children}
    </article>
  );
}

function Parcial({ d, texto }: { d: Disponibilidad | null; texto: (desde: string) => string }) {
  if (d?.estado !== "parcial") return null;
  return <AvisoParcial>{texto(d.desde)}</AvisoParcial>;
}
