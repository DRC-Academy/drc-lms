"use client";

import { textoDeEspera } from "@/lib/drip";
import type { MesTemario } from "@/lib/temario";

/**
 * EL RECORRIDO DEL CURSO, EN UNA LÍNEA.
 *
 * Hereda el trabajo de la rejilla de puntos que vivía DENTRO de la
 * franja: enseñar los seis meses de un vistazo y saltar a uno. Lo que no
 * hereda es el tamaño.
 *
 * QUÉ PASABA ANTES. La franja abría su columna de cifra de 210px a 520
 * para que cupieran seis celdas de mes con una casilla por lección —191
 * cuadritos blancos sobre tinta—. Con eso el titular se quedaba con
 * 528px y se partía, el botón perdía la mitad de su peso, y la mancha se
 * llevaba la mirada antes que ninguno de los dos. Era una pantalla
 * dentro de una franja.
 *
 * Aquí lo mismo se cuenta en 86px y fuera de la franja, que vuelve a ser
 * lo que es en el resto de la aplicación.
 *
 * SEIS TRAMOS IGUALES, Y ES UNA DECISIÓN. Los meses no tienen las mismas
 * lecciones —32, 31, 32…— así que esto es una regla de capítulos y no
 * una escala. Se eligió así porque el trabajo de esta línea es orientar
 * («vas por el tercero de seis»), y a esa pregunta un tramo por mes
 * responde mejor que un reparto proporcional donde los seis miden
 * prácticamente igual de todas formas. La escala real la da el diploma,
 * justo debajo.
 *
 * NO REPITE NINGUNA CIFRA DE LA PANTALLA. La franja dice qué toca ahora,
 * el diploma cuánto falta para la meta y esto dónde estás. Tres
 * preguntas, tres respuestas.
 */
export default function LineaProgreso({
  meses,
  actual,
  onIrAlMes,
}: {
  meses: MesTemario[];
  /** El mes en el que está el alumno, o null con el curso terminado. */
  actual: number | null;
  onIrAlMes: (numero: number) => void;
}) {
  if (meses.length === 0) return null;

  const mesActual = meses.find((mes) => mes.numero === actual) ?? null;

  // El primero que todavía no se ha abierto. Es lo que se cuenta en
  // móvil, donde no cabe una nota por tramo.
  const proximo = meses.find((mes) => mes.diasParaAbrir !== null) ?? null;

  return (
    <section
      aria-label="Tu recorrido por el curso"
      className="mt-4 rounded-[14px] border border-temario-borde bg-white px-4 pb-3.5 pt-4 min-[900px]:mt-4 min-[900px]:px-[22px] min-[900px]:pb-4 min-[900px]:pt-[18px]"
    >
      {/* ------------------------------ MÓVIL ------------------------------
          A 358px los seis tramos siguen cabiendo; lo que no cabe es una
          nota debajo de cada uno. Así que la cuenta del mes en curso sube
          aquí y el aviso del próximo baja al pie. */}
      {mesActual && (
        <div className="mb-3 flex items-baseline justify-between gap-3 min-[900px]:hidden">
          <p className="text-[13px] font-semibold text-temario-tinta">
            Vas por el <span className="text-temario-ambarTexto">mes {mesActual.numero}</span>
          </p>
          <p className="shrink-0 text-[12.5px] tabular-nums text-temario-medio">
            {mesActual.completadas} de {mesActual.totalLecciones} este mes
          </p>
        </div>
      )}

      <div className="grid grid-cols-6 gap-[7px] min-[900px]:gap-3">
        {meses.map((mes) => (
          <Tramo
            key={mes.numero}
            mes={mes}
            esActual={mes.numero === actual}
            onIr={() => onIrAlMes(mes.numero)}
          />
        ))}
      </div>

      {proximo && (
        <p className="mt-3 text-[12.5px] text-temario-tenue min-[900px]:hidden">
          El mes {proximo.numero} se abre {textoDeEspera(proximo.diasParaAbrir ?? 1).toLowerCase().replace("disponible ", "")}.
        </p>
      )}
    </section>
  );
}

/**
 * Un mes.
 *
 * Es un botón y no un enlace porque no navega: abre ese mes en el
 * temario de abajo y baja hasta él, igual que hacía cada celda de la
 * rejilla. Nunca lo cierra —se usa para ir a un sitio, no para
 * alternar—, que es la misma regla que ya tenía `PanelPlan`.
 */
function Tramo({
  mes,
  esActual,
  onIr,
}: {
  mes: MesTemario;
  esActual: boolean;
  onIr: () => void;
}) {
  const bloqueado = mes.diasParaAbrir !== null;
  const completado = mes.estado === "completado";

  return (
    <button
      type="button"
      onClick={onIr}
      className="group block rounded-[6px] text-left"
    >
      {/* La pista. Bloqueada va con traza discontinua y sin relleno: lo
          que aún no se abre no puede enseñar avance. */}
      <span
        className={`block overflow-hidden rounded-full transition-colors ${
          bloqueado
            ? "h-[7px] border border-dashed border-temario-circulo bg-temario-mesPendiente min-[900px]:h-2"
            : `h-[9px] bg-temario-rail min-[900px]:h-2.5 ${
                esActual ? "shadow-[0_0_0_2px_#FDFBEE,0_0_0_3px_#DFD4A2]" : ""
              }`
        }`}
      >
        {!bloqueado && (
          <span
            className="block h-full rounded-full bg-temario-verde transition-[width] duration-500"
            style={{ width: `${mes.porcentaje}%` }}
          />
        )}
      </span>

      {/* En móvil solo el número: "Mes 3" a 50px de ancho se parte. */}
      <span
        className={`mt-[7px] block text-center text-[11px] font-bold leading-none tabular-nums min-[900px]:hidden ${
          esActual
            ? "font-extrabold text-temario-ambarTexto"
            : completado
              ? "text-temario-verdeTexto"
              : "text-temario-suave"
        }`}
      >
        {mes.numero}
      </span>

      {/* Y en escritorio, el rótulo entero con su nota. */}
      <span className="hidden min-[900px]:block">
        <span
          className={`mt-[9px] flex items-center gap-1.5 text-[11px] font-bold uppercase leading-none tracking-[0.1em] transition-colors ${
            esActual
              ? "text-temario-ambarTexto"
              : completado
                ? "text-temario-verdeTexto"
                : "text-temario-suave group-hover:text-temario-medio"
          }`}
        >
          {esActual && (
            <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-temario-ambar" />
          )}
          Mes {mes.numero}
          {esActual && <span className="font-semibold normal-case tracking-normal">· vas por aquí</span>}
        </span>

        <span
          className={`mt-[5px] block text-[12px] leading-none ${
            esActual
              ? "text-temario-ambarTexto"
              : completado
                ? "text-temario-verdeTexto"
                : "text-temario-tenue"
          }`}
        >
          {bloqueado ? (
            textoDeEspera(mes.diasParaAbrir ?? 1)
          ) : (
            <span className="tabular-nums">
              {mes.completadas} de {mes.totalLecciones}
            </span>
          )}
        </span>
      </span>

      <span className="sr-only">
        {mes.completadas} de {mes.totalLecciones} lecciones hechas. Ir al mes {mes.numero}.
      </span>
    </button>
  );
}
