import type { ClaseDelRecorrido } from "@/lib/gestion";
import { textosActuales } from "@/lib/idioma-servidor";
import type { EstimacionFicha } from "@/lib/estimacion-ficha";
import type { EstadoDiploma } from "@/lib/diploma";
import { calcularPlazo } from "@/lib/diploma-plazo";
import { diaLocal } from "@/lib/fechas";
import { formatearFechaLarga } from "@/lib/perfil";
import { ESCALERA_MCER, esHito, type NivelMcer } from "@/lib/recorrido";
import { enViñetas, soloParaElAlumno, textoParaElAlumno } from "@/lib/texto-alumno";
import { EstilosFicha } from "@/components/progreso/estilos";
import RitmoElige, { type OpcionRitmo } from "@/components/progreso/RitmoElige";
import RecorridoPlegado, { type ClasePlegada } from "@/components/progreso/RecorridoPlegado";

// ---------------------------------------------------------------
// «MI PROGRESO»: LA FICHA DEL ALUMNO, RÉPLICA DE LA DE DRC GESTIÓN
//
// ⚠ ESTO ES UNA COPIA DELIBERADA de `components/ProgresoFichaV2.tsx` de
// Gestión, la ficha rediseñada el 30/09/2026 que el alumno ve desde el
// enlace de su profesor y desde Mi cuenta: mismos bloques, mismo orden,
// mismo dibujo y mismo CSS (`components/progreso/estilos.tsx`, copia
// literal de su hoja). SI ALLÍ CAMBIA, AQUÍ CAMBIA LO MISMO. Desde esta
// versión el diseño es UNO SOLO para escritorio y móvil, como allí: se
// acabaron las piezas propias de móvil que tuvo el LMS en septiembre.
//
// EL ORDEN:
//   1. Saludo con el nombre de pila y, al lado (debajo en móvil), la
//      tarjeta del diploma: cuenta atrás de seis meses desde la fecha de
//      inicio (`lib/diploma-plazo.ts`, copia de Gestión) y las lecciones
//      del curso principal. Toda la tarjeta lleva a «Mi curso».
//   2. «Elige tu ritmo» (`RitmoElige`), con `lib/estimacion-ficha.ts`.
//   3. Tu nivel y tu objetivo, sin caja.
//   4. Lo que ya haces bien / lo que estamos reforzando, sin caja.
//   5. En qué trabajamos ahora: la única tarjeta blanca.
//   6. Tu recorrido, clase a clase, PLEGADO (`RecorridoPlegado`).
//
// LO QUE NO SE COPIA, y es a propósito:
//   · El marco: allí la página trae su cabecera con el logo; aquí es una
//     sección del LMS, bajo su barra de navegación.
//   · El destino de los botones: el del diploma lleva a la lección que
//     toca, en la misma pestaña (el alumno ya está en la plataforma), y el
//     de «Amplía tu plan» a `RUTA_AMPLIAR`, la del puente con la tienda.
//   · Cada clase del recorrido enseña sus temas, no el resumen: ver
//     `RecorridoPlegado`.
//   · Los textos son bilingües (`lib/textos/progreso.ts`); el contenido
//     (objetivo, puntos, foco, clases) llega de Gestión en español.
//
// Todo lo que sale de la ficha pasa por el cortafuegos de
// `lib/texto-alumno.ts`: está escrita para el profesor.
// ---------------------------------------------------------------

export default function Ficha({
  nombre,
  nivel,
  estimacion,
  objetivo,
  puntosFuertes,
  puntosDebiles,
  focoRecomendado,
  clases,
  urlAmpliar,
  diploma,
  fechaInicio,
  hrefCurso,
}: {
  nombre: string;
  nivel: NivelMcer | null;
  /** Null solo sin horas semanales: entonces no hay banner de ritmo. */
  estimacion: EstimacionFicha | null;
  objetivo: string | null;
  puntosFuertes: string | null;
  puntosDebiles: string | null;
  focoRecomendado: string | null;
  /** De la más reciente a la más antigua. */
  clases: ClaseDelRecorrido[];
  urlAmpliar: string;
  /** Lecciones del curso principal. Con "sin-curso" la tarjeta cuenta solo por fecha. */
  diploma: EstadoDiploma;
  /** `vista_perfil_alumno.fecha_inicio`. Sin ella, y sin diploma conseguido, no hay tarjeta. */
  fechaInicio: string | null;
  /** A dónde lleva la tarjeta del diploma: la misma ruta que la pestaña «Mi curso». */
  hrefCurso: string;
}) {
  const t = textosActuales().progreso;
  const fuertes = soloParaElAlumno(enViñetas(puntosFuertes));
  const debiles = soloParaElAlumno(enViñetas(puntosDebiles));
  const objetivoVisible = textoParaElAlumno(objetivo);
  const foco = textoParaElAlumno(focoRecomendado);
  const nombrePila = nombre.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="p2-page">
      <EstilosFicha />
      <main className="p2-main">
        <div className="p2-ficha">
          <div className="p2-arriba">
            <div className="p2-cabeza">
              <div className="p2-saludo">
                <h1>{t.hola(nombrePila)}</h1>
                <p>{t.entradilla}</p>
              </div>
              <TarjetaDiploma diploma={diploma} fechaInicio={fechaInicio} href={hrefCurso} />
            </div>
            {estimacion && <Ritmo estimacion={estimacion} urlAmpliar={urlAmpliar} />}
          </div>

          <div className="p2-dos">
            <section className="p2-bloque" aria-labelledby="p2-nivel">
              <h2 id="p2-nivel" className="p2-h2">{t.tuNivel}</h2>
              <Escalera nivel={nivel} meta={estimacion?.meta.nivel ?? null} />
            </section>
            {objetivoVisible && (
              <section className="p2-bloque" aria-labelledby="p2-objetivo">
                <h2 id="p2-objetivo" className="p2-h2">{t.tuObjetivo}</h2>
                <blockquote className="p2-objetivo">«{objetivoVisible}»</blockquote>
              </section>
            )}
          </div>

          {(fuertes.length > 0 || debiles.length > 0) && (
            <>
              <div className="p2-sep" aria-hidden />
              <div className="p2-dos">
                {fuertes.length > 0 && (
                  <section className="p2-bloque" aria-labelledby="p2-bien">
                    <h2 id="p2-bien" className="p2-h2">{t.loQueYaHacesBien}</h2>
                    <ul className="p2-lista">
                      {fuertes.map((texto, i) => (
                        <li key={i}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#1E9E3A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>{texto}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {debiles.length > 0 && (
                  <section className="p2-bloque" aria-labelledby="p2-reforzar">
                    <h2 id="p2-reforzar" className="p2-h2">{t.loQueEstamosReforzando}</h2>
                    <ul className="p2-lista">
                      {debiles.map((texto, i) => (
                        <li key={i}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M7 17L17 7M9 7h8v8" stroke="#B7791F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>{texto}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </>
          )}

          {foco && (
            <section className="p2-foco" aria-labelledby="p2-foco">
              <div className="p2-foco-cab">
                <h2 id="p2-foco" className="p2-h2">{t.enQueTrabajamosAhora}</h2>
                <span className="p2-chip">{t.focoActual}</span>
              </div>
              <p>{foco}</p>
            </section>
          )}

          <Recorrido clases={clases} />

          <p className="p2-pie">{t.informePrivado}</p>
        </div>
      </main>
    </div>
  );
}

/** «Elige tu ritmo», con los textos y las fechas ya redactados para el cliente. */
function Ritmo({ estimacion, urlAmpliar }: { estimacion: EstimacionFicha; urlAmpliar: string }) {
  const t = textosActuales().progreso;
  const tope = estimacion.estado === "tope";
  const examen = estimacion.meta.origen === "examen";
  // El nivel solo se nombra si es de verdad una meta: C2 sin examen
  // (`nivel_actual`) y sin nivel (`sin_nivel`) hablan de «tu objetivo».
  const nombrada = examen || estimacion.meta.origen === "siguiente_nivel" ? estimacion.meta.nivel : null;
  const actual = estimacion.opciones.find((o) => o.esActual) ?? estimacion.opciones[0];

  const opciones: OpcionRitmo[] = estimacion.opciones.map((o) => ({
    horas: o.horasSemanales,
    etiqueta: t.horas(o.horasSemanales),
    nota: o.esActual ? t.tuPlanNota : null,
    fecha: t.mesDeLlegada(o.llegada.mes, o.llegada.anio),
    detalle: o.esActual
      ? t.detalleActual(o.meses)
      : o.mesesAhorrados > 0
        ? t.detalleAhorro(o.meses, o.mesesAhorrados)
        : t.enMeses(o.meses),
    meses: o.meses,
  }));

  return (
    <RitmoElige
      rotulo={t.tuRitmo}
      pregunta={t.ritmoPregunta(tope, nombrada, examen)}
      frase={t.ritmoFrase(tope, nombrada, examen)}
      grupo={t.horasALaSemana}
      opciones={opciones}
      inicial={estimacion.mejor?.horasSemanales ?? actual.horasSemanales}
      mesesActual={actual.meses}
      cta={tope ? null : { href: urlAmpliar, texto: t.ampliaTuPlan }}
    />
  );
}

/**
 * La tarjeta del diploma, junto al saludo. Qué dice, en este orden (el
 * mismo que `bannerDe` en Gestión): conseguido → sin fecha de inicio,
 * nada → vencido → hoy → la cuenta atrás. Debajo, «para tu diploma» y las
 * lecciones del curso cuando hay curso.
 */
function TarjetaDiploma({ diploma, fechaInicio, href }: { diploma: EstadoDiploma; fechaInicio: string | null; href: string }) {
  const t = textosActuales().progreso;
  const conseguido = diploma.estado === "conseguido";
  const plazo = conseguido ? null : calcularPlazo(fechaInicio, diaLocal(new Date()));
  if (!conseguido && !plazo) return null;

  const lecciones =
    diploma.estado === "en-curso"
      ? t.leccionesDe(diploma.completadas, diploma.total)
      : diploma.estado === "conseguido"
        ? t.leccionesDe(diploma.total, diploma.total)
        : null;
  const sinEmpezar = diploma.estado === "en-curso" && diploma.completadas === 0;

  let linea1: React.ReactNode;
  let linea2: string | null = lecciones;
  let boton = sinEmpezar ? t.empezarMiCurso : t.irAMiCurso;

  if (conseguido || !plazo) {
    linea1 = <span className="p2-dip-titular">{t.diplomaConseguido}</span>;
    boton = t.verMiCurso;
  } else if (plazo.fase === "vencido") {
    linea1 = (
      <span className="p2-dip-titular">
        <span className="p2-solo-ancho">{t.retomaTuCurso}</span>
        <span className="p2-solo-movil">{t.retomaTuCursoCorto}</span>
      </span>
    );
    boton = t.continuarMiCurso;
  } else if (plazo.fase === "hoy") {
    linea1 = <span className="p2-dip-cifra">{t.diplomaHoy}</span>;
  } else {
    const cuenta = plazo.fase === "dias" ? t.cuentaDiploma(0, plazo.dias) : t.cuentaDiploma(plazo.meses, plazo.diasSueltos);
    linea1 = <span className="p2-dip-cifra">{cuenta}</span>;
    linea2 = [t.paraTuDiploma, lecciones].filter(Boolean).join(" · ");
  }

  return (
    <a className="p2-dip" href={href}>
      <span className="p2-dip-ico" aria-hidden>
        {conseguido ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#1E9E3A" />
            <path d="M7.5 12.5l3 3 6-6.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l2.6 2 3.3-.2.8 3.2 2.6 2-1.4 3 .4 3.3-3.2.9-1.9 2.7L12 18.4 8.8 19.9 6.9 17.2l-3.2-.9.4-3.3-1.4-3 2.6-2 .8-3.2 3.3.2z" stroke="#0E5A23" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="11.5" r="3" fill="#FFC400" />
          </svg>
        )}
      </span>
      <span className="p2-dip-texto">
        {linea1}
        <span className="p2-dip-lecciones">{linea2}</span>
      </span>
      <span className="p2-dip-accion">
        <span className="p2-dip-accion-txt">{boton}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}

/** La escalera del MCER: superados, «Estás aquí» y «Tu meta» (si no es su propio peldaño). */
function Escalera({ nivel, meta }: { nivel: NivelMcer | null; meta: NivelMcer | null }) {
  const t = textosActuales().progreso;
  const actual = nivel ? ESCALERA_MCER.indexOf(nivel) : -1;
  const objetivo = meta ? ESCALERA_MCER.indexOf(meta) : -1;
  return (
    <ol className="p2-escalera">
      {ESCALERA_MCER.map((etiqueta, i) => {
        const hecho = actual >= 0 && i < actual;
        const aqui = actual >= 0 && i === actual;
        const esMeta = objetivo >= 0 && i === objetivo && !aqui;
        const clases = ["p2-peldano", hecho && "is-hecho", aqui && "is-actual", esMeta && "is-meta"].filter(Boolean).join(" ");
        return (
          <li key={etiqueta} className={clases} aria-current={aqui ? "step" : undefined}>
            <span>{etiqueta}</span>
            {aqui && <span className="p2-peldano-nota">{t.estasAqui}</span>}
            {esMeta && <span className="p2-peldano-nota">{t.tuMeta}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Las clases con análisis, formateadas para el recorrido plegado. */
function Recorrido({ clases }: { clases: ClaseDelRecorrido[] }) {
  const textos = textosActuales();
  const t = textos.progreso;
  const conContenido = clases.filter((c) => c.titulo !== "" || c.temas !== "");

  const plegadas: ClasePlegada[] = conContenido.map((c) => {
    const n = c.numero ?? 0;
    return {
      id: c.id,
      numero: n > 0 ? t.claseNumero(n) : null,
      // `fecha_clase` es AAAA-MM-DD: se parte la cadena, sin `new Date()`.
      fecha: c.fechaClase !== "" ? formatearFechaLarga(c.fechaClase, t.fechaLarga) : null,
      hito: n > 0 && esHito(n),
      titulo: c.titulo,
      temas: c.temas,
    };
  });

  const ultima = plegadas[0];
  // En el resumen, la fecha sin el año: «el 25 de septiembre».
  const fechaCorta = ultima?.fecha ? ultima.fecha.replace(/ (de )?\d{4}$/, "") : null;

  return (
    <RecorridoPlegado
      titulo={t.tuRecorrido}
      vacio={t.recorridoVacio}
      resumen={ultima ? t.recorridoResumen(plegadas.length, fechaCorta, ultima.titulo || null) : ""}
      verTodas={t.verTodas}
      plegar={t.plegar}
      rotuloHito={t.hito}
      rotuloTemas={textos.clases.temasYVocabulario}
      clases={plegadas}
    />
  );
}
