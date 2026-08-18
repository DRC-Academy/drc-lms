"use client";

import Link from "next/link";
import type { Bloque } from "@/lib/data";
import type { AvisoFormulario, TarjetaModo } from "@/lib/modos";
import { numerosDePractica } from "@/lib/progreso";
import { usarGenerador } from "@/components/usarGenerador";
import TarjetasGeneracion from "@/components/TarjetasGeneracion";
import ListaBloques, {
  type AvanceBloques,
  type ProgresoBloques,
} from "@/components/ListaBloques";
import FilaDestacada from "@/components/practica/FilaDestacada";
import SesionPractica from "@/components/practica/SesionPractica";

/**
 * La sección de práctica entera.
 *
 * Vive en su propia página y no en un ancla del inicio. La navegación
 * promete tres secciones y una de ellas tiene que ser una pantalla, no
 * un salto a mitad de otra —que además en móvil aterriza torcido.
 *
 * EL ORDEN RESPONDE A TRES PREGUNTAS, EN ESTE ORDEN: por dónde iba (la
 * fila destacada), cómo voy (las cuatro cifras) y qué más hay (las
 * tarjetas de hoy y la lista). Antes abría con las tarjetas de generar,
 * que es la pregunta que menos gente trae: la mayoría entra a seguir con
 * lo que dejó a medias, no a fabricarse un bloque nuevo.
 *
 * NI UN MINUTO EN TODA LA PANTALLA. Los bloques traen `minutos` en el
 * modelo y se ignora a propósito: es una estimación nuestra sobre lo que
 * tarda otra persona, y en una pantalla de práctica solo sirve para que
 * quien va más despacio lo lea como un suspenso. Lo que sí orienta —qué
 * llevas hecho, por qué fase vas, cuántos quedan— no necesita reloj.
 */
export default function PanelPractica({
  alumnoId,
  tarjetas,
  bloques,
  progreso,
  avance,
  generadosIniciales,
  nivel,
  urlFormulario,
  avisoFormulario,
}: {
  alumnoId: string;
  tarjetas: TarjetaModo[];
  bloques: Bloque[];
  progreso: ProgresoBloques;
  avance: AvanceBloques;
  generadosIniciales: Bloque[];
  /** El nivel MCER del alumno, para la cuarta casilla. Vacío sin perfil. */
  nivel: string;
  /** Enlace al formulario de Gestión con el token del alumno, o null. */
  urlFormulario: string | null;
  /** Qué decirle cuando no hay enlace. */
  avisoFormulario: AvisoFormulario;
}) {
  const {
    estado,
    modoActivo,
    generando,
    etapa,
    // `progreso` ya es en esta pantalla el de los bloques terminados.
    // El de la generación se renombra para que no se pisen.
    progreso: progresoGeneracion,
    tardando,
    mensajeError,
    esEspera,
    recienGenerados,
    todos,
    idsGenerados,
    generar,
    reintentar,
    zonaNuevos,
  } = usarGenerador({ alumnoId, bloques, generadosIniciales });

  // El último bloque estático llega bloqueado hasta la siguiente clase.
  const indiceBloqueado = bloques.length > 1 ? todos.length - 1 : -1;

  // LO QUE CUENTA COMO "HOY" ES LO QUE SE PUEDE ABRIR. El bloqueado sale
  // en la lista —apagado y diciendo de qué depende—, pero no entra en el
  // recuento: si entrara, terminar todo lo que se puede terminar daría
  // "3 de 4" para siempre, que es la cuenta que nunca se cierra.
  const disponibles = todos.filter((_, i) => i !== indiceBloqueado);
  const total = disponibles.length;

  const terminado = (bloque: Bloque) => (progreso[bloque.id]?.total ?? 0) > 0;
  const empezado = (bloque: Bloque) => terminado(bloque) || avance[bloque.id] !== undefined;

  const terminados = disponibles.filter(terminado).length;
  const enProgreso = disponibles.filter((b) => !terminado(b) && avance[b.id] !== undefined).length;
  const segmentos = disponibles.map(empezado);
  const empezados = segmentos.filter(Boolean).length;

  // El primero sin cerrar: es a donde apuntan la tarjeta oscura y la
  // barra de abajo. Null cuando ya no queda ninguno, y entonces las dos
  // cambian de mensaje en vez de mandar a repetir algo al azar.
  const indiceEnCurso = disponibles.findIndex((b) => !terminado(b));
  const enCurso = indiceEnCurso === -1 ? null : disponibles[indiceEnCurso];

  const { dominados, practicados } = numerosDePractica(progreso);

  // La tarjeta crema de arriba resume el estado de la última clase. El
  // dato —quién, qué y cuándo— viene redactado del servidor; lo que se
  // añade aquí es la consecuencia, que es copy fijo.
  const repaso = tarjetas.find((t) => t.modo === "repaso") ?? null;
  const ultimaClase = repaso
    ? repaso.espera
      ? {
          titulo: "Ya lo has repasado",
          cuerpo: `${repaso.descripcion} En cuanto tengas la siguiente clase, preparamos el próximo bloque.`,
        }
      : {
          titulo: "Tienes clase nueva",
          cuerpo: `${repaso.descripcion} Ahí abajo puedes prepararte el bloque con lo que trabajasteis.`,
        }
    : {
        titulo: "Todavía no hay clase que repasar",
        cuerpo:
          "En cuanto tu profesor analice tu primera clase, preparamos aquí un bloque con lo que trabajasteis.",
      };

  return (
    <>
      <FilaDestacada
        alumnoId={alumnoId}
        enCurso={enCurso}
        posicion={indiceEnCurso + 1}
        total={total}
        empezados={empezados}
        segmentos={segmentos}
        ultimaClase={ultimaClase}
      />

      {/* Sin bloques no hay sesión que medir: cuatro casillas a cero no
          son un dato, son un boletín en blanco delante de quien acaba de
          entrar. Con uno solo ya sí, porque entonces el cero significa
          "no lo has empezado" y eso empuja. */}
      {total > 0 && (
        <SesionPractica
          total={total}
          terminados={terminados}
          enProgreso={enProgreso}
          dominados={dominados}
          practicados={practicados}
          nivel={nivel}
        />
      )}

      <TarjetasGeneracion
        tarjetas={tarjetas}
        estado={estado}
        modoActivo={modoActivo}
        etapa={etapa}
        progreso={progresoGeneracion}
        tardando={tardando}
        mensajeError={mensajeError}
        esEspera={esEspera}
        onGenerar={generar}
        onReintentar={reintentar}
        urlFormulario={urlFormulario}
        avisoFormulario={avisoFormulario}
      />

      {/* ------------------------------ TUS BLOQUES ------------------------------
          `|| generando` porque el primer bloque de un alumno nace aquí:
          sin eso, la sección entera —hueco animado incluido— seguía
          oculta mientras se generaba, y quien no tenía ninguno no veía
          nada debajo de las tarjetas hasta que el bloque ya estaba
          hecho. */}
      <section ref={zonaNuevos} className="scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-marca-borde pb-4">
          <div className="min-w-0 lg:flex lg:items-baseline lg:gap-3.5">
            <h2 className="shrink-0 font-display text-[17px] font-bold text-marca-tinta lg:text-[19px]">
              Tus bloques
            </h2>
            <p className="mt-1 text-pretty text-[14px] leading-[1.4] text-marca-gris lg:mt-0 lg:text-[15px]">
              Cada bloque va de reconocer la forma a producirla tú solo.
            </p>
          </div>

          {total > 0 && (
            <p className="shrink-0 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-marca-gris">
              {total} {total === 1 ? "bloque" : "bloques"}
            </p>
          )}
        </div>

        {todos.length === 0 && !generando ? (
          // Nadie ha hecho nada mal: la práctica todavía no existe porque
          // aún no hay de dónde sacarla. Se cuenta de qué depende, con el
          // mismo mueble discontinuo que la invitación al perfil.
          <div className="mt-5 rounded-[16px] border-[1.5px] border-dashed border-marca-perfilBorde bg-marca-perfil p-[18px] lg:p-6">
            <h3 className="font-display text-[17px] font-bold leading-[1.2] text-marca-tinta lg:text-[19px]">
              Tu práctica se prepara después de tu primera clase
            </h3>
            <p className="mt-1.5 max-w-[560px] text-pretty text-[14px] leading-[1.5] text-marca-gris lg:text-[15px]">
              En cuanto tu profesor analice lo que trabajáis, aquí aparecen tus bloques: ejercicios
              hechos con lo tuyo, no material de catálogo.
            </p>
          </div>
        ) : (
          <>
            <ListaBloques
              bloques={todos}
              alumnoId={alumnoId}
              progreso={progreso}
              avance={avance}
              generados={idsGenerados}
              idsNuevos={recienGenerados.map((b) => b.id)}
              indiceBloqueado={indiceBloqueado}
              generando={generando}
            />

            {total > 0 && (
              <p className="mt-5 text-[14px] leading-[1.5] text-marca-grisSuave">
                Cuando termines {total === 1 ? "el bloque" : `los ${total}`}, tu práctica se vuelve a
                generar con lo de tu siguiente clase.
              </p>
            )}
          </>
        )}
      </section>

      {/* ------------------------------- BARRA FIJA -------------------------------
          Apunta siempre al primer bloque sin cerrar. Cuando no queda
          ninguno no desaparece: lo dice, que es la única forma de cerrar
          la sesión con algo en lugar de con un hueco.

          `bottom` no es 0 en móvil: ahí abajo está la navegación de
          secciones —`nav[data-nav-inferior]`, fija y con más z— y una
          barra a ras del suelo se le metía debajo. Se sube por encima de
          ella y en escritorio, donde esa navegación no existe, baja a su
          sitio. El envoltorio no recibe clics para no comerse el scroll. */}
      {total > 0 && !generando && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[86px] z-30 px-4 lg:bottom-6 lg:px-9">
          <div className="mx-auto w-full max-w-contenido">
            <div className="pointer-events-auto flex items-center gap-4 rounded-[12px] bg-marca-tinta py-3 pl-5 pr-3 shadow-[0_10px_30px_-12px_rgba(18,33,26,0.45)]">
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] text-marca-amarillo">
                  {enCurso ? "Sigue por aquí" : "Por hoy, hecho"}
                </p>
                <p className="mt-1.5 truncate font-display text-[15px] font-bold text-white lg:text-[17px]">
                  {enCurso ? enCurso.titulo : "Has terminado tu práctica de hoy"}
                </p>
              </div>

              {enCurso && (
                <Link
                  href={`/alumno/${alumnoId}/${enCurso.id}`}
                  className="flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-marca-verde px-6 text-[15px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc"
                >
                  Continuar
                  <span className="sr-only"> {enCurso.titulo}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
