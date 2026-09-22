import type { ClaseDelRecorrido } from "@/lib/gestion";
import { textosActuales } from "@/lib/idioma-servidor";
import type { Estimacion } from "@/lib/estimacion";
import BannerAmpliar from "@/components/BannerAmpliar";
import BannerDiplomaFicha from "@/components/progreso/BannerDiplomaFicha";
import Recorrido from "@/components/progreso/Recorrido";
import { EstilosFicha } from "@/components/progreso/estilos";
import type { EstadoDiploma } from "@/lib/diploma";
import { ESCALERA_MCER, proximoHito, type NivelMcer } from "@/lib/recorrido";
import { enViñetas, soloParaElAlumno, textoParaElAlumno } from "@/lib/texto-alumno";

// ---------------------------------------------------------------
// LA FICHA DE PROGRESO, RÉPLICA DE LA DE DRC GESTIÓN
//
// ⚠ ESTO ES UNA COPIA DELIBERADA de `app/progreso/[token]/page.tsx` de
// Gestión: mismos bloques, mismo orden, mismo copy y mismo CSS. No es
// una versión adaptada, y no debe convertirse en una. Si allí cambia una
// frase, aquí cambia la misma frase.
//
// POR QUÉ SE COPIA EL CSS EN VEZ DE REESCRIBIRLO EN TAILWIND. Se hizo
// primero en Tailwind con los tokens `marca-*` de la casa, y el
// resultado se parecía sin ser lo mismo: otros radios, otros pesos, otra
// escalera. Un alumno que reciba el enlace de su profesor y luego entre
// al LMS tiene que ver la misma pantalla, no una prima hermana. Con el
// bloque `pg-*` copiado literalmente, comparar las dos versiones es un
// diff de texto y no un ejercicio de memoria visual.
//
// El namespace `pg-` no colisiona con nada del LMS, que va todo por
// clases de Tailwind, y viaja en un `<style>` dentro del propio
// componente igual que en Gestión: no toca `globals.css` ni afecta a
// ninguna otra pantalla.
//
// EL BANNER DE AMPLIACIÓN vive fuera, en `components/BannerAmpliar.tsx`,
// con sus propios estilos, y desde el 16/09/2026 vuelve a ser calco
// visual del de Gestión (tres tarjetas verticales, distintivo
// "Recomendado", botón centrado). Lo que conserva de aquí son sus textos
// bilingües y la variante sin cifras de quien prepara su propio examen.
//
// SIN ENTRADILLA, como allí. La ficha tuvo arriba un rótulo ("Tu progreso
// en inglés"), un titular con el nombre y una bajada; Gestión los quitó
// en septiembre de 2026 —lo primero que ve el alumno es la escalera de
// niveles— y el 16/09/2026 se quitaron también aquí. El `nombre` sigue
// en la firma para no tocar a quien la monta.
//
// EL BANNER DEL DIPLOMA SÍ SE REPLICA. Va entre la caja "Tu nivel" y lo
// que sigue, como allí, y vive en `components/progreso/BannerDiplomaFicha.tsx`
// con su CSS (`CSS_DIPLOMA`), que se concatena AL FINAL de esta hoja
// para que su padding gane al de `.pg-card` también en móvil. Dos
// salvedades, las dos a propósito: allí el dato llega del LMS por HTTP y
// hay hueco reservado, esqueleto y cierre animado; aquí el dato es
// nuestro y viene en el mismo render, así que la tarjeta o está o no
// está. Y el botón de quien no ha empezado allí abre el LMS en pestaña
// nueva ("Ir a la plataforma"); aquí el alumno ya está en el LMS y el
// botón lleva a la lección que toca, en la misma pestaña.
//
// LO OTRO QUE NO SE REPLICA es el marco: allí la página trae su propia
// cabecera con el logotipo y el rótulo "Informe de progreso", porque es
// una pantalla suelta que se abre desde un enlace. Aquí es una sección
// del LMS y vive dentro de la barra de navegación de la aplicación, que
// no se puede quitar sin dejar al alumno sin salida. Todo lo que va por
// debajo de esa barra sí es idéntico.
// ---------------------------------------------------------------

export default function Ficha({
  nivel,
  horasSemanales,
  clasesContadas,
  estimacion,
  objetivo,
  puntosFuertes,
  puntosDebiles,
  focoRecomendado,
  clases,
  urlAmpliar,
  nivelFiable,
  preparaExamen,
  diploma,
  hrefCurso,
}: {
  /** Ya no se muestra (la entradilla con el saludo se quitó). Sigue en la firma. */
  nombre: string;
  nivel: NivelMcer | null;
  /**
   * Si el nivel viene de una medición —profesor, ficha o prueba— o solo
   * de la casilla del alta. Con false se enseña la nota de «estimado».
   * Ver `origenDelNivel` en `lib/estimacion.ts`.
   */
  nivelFiable: boolean;
  /**
   * El alumno prepara el examen de su propio nivel, así que no hay
   * estimación posible pero sí banner que enseñar. Ver
   * `preparaSuPropioExamen`.
   */
  preparaExamen: boolean;
  horasSemanales: number | null;
  /** Las clases que cuenta la cifra: todas, con informe o sin él. */
  clasesContadas: number;
  estimacion: Estimacion | null;
  objetivo: string | null;
  puntosFuertes: string | null;
  puntosDebiles: string | null;
  focoRecomendado: string | null;
  clases: ClaseDelRecorrido[];
  urlAmpliar: string;
  /** El estado del diploma del curso principal. Con "sin-curso" no se pinta nada. */
  diploma: EstadoDiploma;
  /** A dónde lleva "Empezar mi curso": la misma ruta que la pestaña «Mi curso», con el foco. */
  hrefCurso: string;
}) {
  const t = textosActuales().progreso;
  // Todo lo que sale de la ficha pasa por el cortafuegos: está escrita
  // para el profesor y, con el formulario a medias, la IA deja ahí notas
  // de trabajo que no puede leer un cliente. Ver `lib/texto-alumno.ts`.
  const fuertes = soloParaElAlumno(enViñetas(puntosFuertes));
  const debiles = soloParaElAlumno(enViñetas(puntosDebiles));
  const objetivoVisible = textoParaElAlumno(objetivo);
  const foco = textoParaElAlumno(focoRecomendado);

  const hito = proximoHito(clasesContadas);

  return (
    <div className="pg-page">
      <EstilosFicha />

      <main className="pg-main">
        {/* Sin encabezado: lo primero que ve el alumno es la escalera de niveles. */}
        <section className="pg-card pg-hero pg-rise" style={{ animationDelay: "0ms" }}>
          {/* La bandera de meta solo cuando de verdad hay un peldaño al
              que subir. En la estimación de preparación la meta ES su
              propio nivel —está preparando su examen, no subiendo— y
              marcarlo pondría la banderita sobre la casilla donde ya
              está, que se lee como que le falta llegar a donde está. */}
          <Escalera
            nivel={nivel}
            meta={estimacion?.tipo === "subir-nivel" ? estimacion.meta.nivel : null}
          />

          <div className="pg-stats">
            <div className="pg-stat">
              <span className="pg-stat-num">{clasesContadas}</span>
              <span className="pg-stat-label">
                {t.clasesHechas(clasesContadas)}
              </span>
            </div>
            {/* ---------------------------------------------------------------
                EL NIVEL DICE DE DÓNDE SALE

                125 de los 174 alumnos tienen el nivel puesto por quien
                les dio de alta, sin que nadie lo haya confirmado —y 70
                de esos están en B1, que es el valor por defecto—. Sobre
                ese dato se elige su curso, se filtran sus ejercicios y
                se calcula la estimación del banner de abajo.

                Enseñarlo a secas lo convierte en un hecho. La nota lo
                devuelve a lo que es: una hipótesis, y con la manera de
                resolverla al lado.

                NO ES UN AVISO Y NO DEBE PARECERLO. Ni rojo, ni icono de
                alerta, ni «atención»: el alumno no ha hecho nada mal y
                no hay nada roto. Es la misma tinta apagada que el resto
                de rótulos, una línea más pequeña, debajo. Quien no la
                lea no se pierde nada; quien la lea sabe qué preguntar
                en su próxima clase.

                Y desaparece sola en cuanto el profesor confirma el
                nivel, que es lo que de verdad la hace útil: la marca
                sobra el día que el dato está bien.
                --------------------------------------------------------------- */}
            <div className="pg-stat">
              <span className="pg-stat-num">{nivel ?? "—"}</span>
              <span className="pg-stat-label">{t.nivelActual}</span>
              {nivel && !nivelFiable && (
                <span className="pg-stat-nota">{t.nivelEstimado}</span>
              )}
            </div>
            <div className="pg-stat">
              <span className="pg-stat-num">
                {horasSemanales != null ? horasSemanales : "—"}
                {horasSemanales != null && <span className="pg-stat-unit">h</span>}
              </span>
              <span className="pg-stat-label">{t.cadaSemana}</span>
            </div>
            <div className="pg-stat">
              <span className="pg-stat-num">
                {hito ? (
                  <>
                    <span className="pg-stat-pre">{t.clase}</span>
                    {hito}
                  </>
                ) : (
                  "✓"
                )}
              </span>
              <span className="pg-stat-label">{hito ? t.proximoHito : t.hitosCompletos}</span>
            </div>
          </div>
        </section>

        <BannerDiplomaFicha diploma={diploma} hrefCurso={hrefCurso} />

        {/* ---------------------------------------------------------------
            DOS BANNERS, Y NINGÚN ALUMNO SIN UNO

            Hasta ahora esto era `estimacion && <BannerAmpliar/>`, y 41
            de los 174 alumnos no veían nada. Los 41 son el mismo caso:
            preparan el examen del nivel que ya tienen —22 en B1, 13 en
            B2, 6 en C1—, así que no hay peldaño que prometer y
            `calcularEstimacion` devuelve null. No es un fallo, es la
            regla de `lib/estimacion.ts`, que sigue en pie.

            Lo que cambia es que quedarse callado no era la única
            respuesta. A quien prepara su propio examen la ampliación le
            sirve igual, solo que por otro motivo: no llega ANTES, llega
            MÁS PREPARADO. Y eso se puede decir sin inventar una sola
            cifra, que es justo lo que la regla protegía. */}
        {estimacion ? (
          <BannerAmpliar estimacion={estimacion} urlAmpliar={urlAmpliar} />
        ) : preparaExamen ? (
          <BannerAmpliar
            estimacion={null}
            preparaExamen
            horasSemanales={horasSemanales}
            urlAmpliar={urlAmpliar}
          />
        ) : null}

        {/* La caja de objetivo va DEBAJO del banner (antes iba encima): así el
            botón "Amplía tu plan" queda más arriba. Misma caja, mismo estilo. */}
        {objetivoVisible && (
          <section className="pg-card pg-goal pg-rise" style={{ animationDelay: "120ms" }}>
            <p className="pg-kicker">{t.tuObjetivo}</p>
            <blockquote className="pg-goal-text">{objetivoVisible}</blockquote>
          </section>
        )}

        {(fuertes.length > 0 || debiles.length > 0) && (
          <section className="pg-split pg-rise" style={{ animationDelay: "240ms" }}>
            {fuertes.length > 0 && (
              <div className="pg-card">
                <p className="pg-kicker">{t.loQueYaHacesBien}</p>
                <ul className="pg-list">
                  {fuertes.map((texto, i) => (
                    <li key={i}>
                      <span className="pg-mark pg-mark-ok" aria-hidden>
                        ✓
                      </span>
                      <span>{texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {debiles.length > 0 && (
              <div className="pg-card">
                <p className="pg-kicker">{t.loQueEstamosReforzando}</p>
                <ul className="pg-list">
                  {debiles.map((texto, i) => (
                    <li key={i}>
                      <span className="pg-mark pg-mark-up" aria-hidden>
                        ↗
                      </span>
                      <span>{texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {foco && (
          <section className="pg-card pg-focus pg-rise" style={{ animationDelay: "300ms" }}>
            <div className="pg-focus-head">
              <p className="pg-kicker">{t.enQueTrabajamosAhora}</p>
              <span className="pg-badge">{t.focoActual}</span>
            </div>
            <p className="pg-body">{foco}</p>
          </section>
        )}

        <Recorrido clases={clases} titulo={t.tuRecorrido} vacio={t.recorridoVacio} />

        <p className="pg-foot">
          {t.informePrivado}
        </p>
      </main>
    </div>
  );
}

/**
 * La escalera del MCER con el alumno en su peldaño y la bandera en el
 * objetivo. Es la pieza que hace entender de un vistazo dónde está y a
 * dónde va.
 *
 * LA BANDERA "TU META" SOLO SALE SI HAY ESTIMACIÓN, igual que en
 * Gestión: el nivel meta se calcula, no está guardado. Sin las horas
 * semanales no hay estimación, y sin estimación no hay meta que marcar.
 */
function Escalera({ nivel, meta }: { nivel: NivelMcer | null; meta: NivelMcer | null }) {
  const t = textosActuales().progreso;
  const actual = nivel ? ESCALERA_MCER.indexOf(nivel) : -1;
  const objetivo = meta ? ESCALERA_MCER.indexOf(meta) : -1;

  return (
    <div className="pg-ladder-wrap">
      <p className="pg-kicker">{t.tuNivel}</p>
      <ol className="pg-ladder">
        {ESCALERA_MCER.map((etiqueta, i) => {
          const hecho = actual >= 0 && i < actual;
          const aqui = actual >= 0 && i === actual;
          const esMeta = objetivo >= 0 && i === objetivo;
          const clases = ["pg-rung", hecho && "is-done", aqui && "is-current", esMeta && "is-target"]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={etiqueta} className={clases} aria-current={aqui ? "step" : undefined}>
              <span className="pg-rung-label">{etiqueta}</span>
              {aqui && <span className="pg-rung-note">{t.estasAqui}</span>}
              {esMeta && <span className="pg-rung-note pg-rung-note-target">{t.tuMeta}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

