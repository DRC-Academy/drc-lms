import type { Lista, Recuperacion } from "@/lib/recuperaciones";
import type { TextosRecuperaciones } from "@/lib/textos/recuperaciones";
import { TARJETA, FlechaDesplegable, RESUMEN_DESPLEGABLE } from "@/components/base/Seccion";
import TarjetaRecuperacion from "@/components/clases/TarjetaRecuperacion";
import TraerRecuperacion from "@/components/clases/TraerRecuperacion";

/**
 * LAS RECUPERACIONES, ARRIBA DE «MIS CLASES».
 *
 * Las que piden algo o dicen algo —esperando al alumno, esperando al
 * profesor, confirmada, sin acuerdo— como tarjetas; las recuperadas y
 * anuladas de los últimos 30 días, en gris, en un desplegable debajo.
 * Sin ninguna, no se pinta nada: la pantalla es la de siempre.
 *
 * Si Gestión no contesta, una línea en el hueco y el resto de la página
 * sigue como si nada.
 *
 * Es de servidor y no carga nada: los datos llegan hechos, de la página
 * (que los pide a Gestión) o de la pantalla de prueba (que se los
 * inventa).
 */

const ACTIVOS = new Set(["esperando_alumno", "alumno_propuso", "confirmada", "sin_acuerdo"]);

/** Primero lo que pide al alumno que haga algo; dentro, por fecha de la clase y parte. */
function orden(a: Recuperacion, b: Recuperacion): number {
  const pide = (r: Recuperacion) => (r.estado === "esperando_alumno" ? 0 : 1);
  return (
    pide(a) - pide(b) ||
    `${a.claseCancelada.fecha}${a.claseCancelada.hora}`.localeCompare(`${b.claseCancelada.fecha}${b.claseCancelada.hora}`) ||
    a.parte.numero - b.parte.numero
  );
}

export default function Recuperaciones({
  lista,
  dias,
  resaltada = null,
  soloLectura = false,
  t,
}: {
  lista: Lista;
  /** Los días que se pueden proponer (`diasParaProponer`). */
  dias: string[];
  /** El id del enlace del correo (`?recuperacion=`). Si no es de este alumno, no está en la lista y no pasa nada. */
  resaltada?: string | null;
  soloLectura?: boolean;
  t: TextosRecuperaciones;
}) {
  if (!lista.ok) {
    return (
      <section className={`${TARJETA} entra mb-4 px-5 py-4 min-[900px]:mb-6`} role="status">
        <p className="text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">{t.noSePuedeCargar}</p>
      </section>
    );
  }

  const activas = lista.recuperaciones.filter((r) => ACTIVOS.has(r.estado)).sort(orden);
  const historial = lista.recuperaciones.filter((r) => !ACTIVOS.has(r.estado));
  if (activas.length === 0 && historial.length === 0) return null;

  const enDosPartes = activas.some((r) => r.estado === "esperando_alumno" && r.parte.de > 1);
  const resaltadaEnHistorial = resaltada !== null && historial.some((r) => r.id === resaltada);
  const existeResaltada = resaltada !== null && lista.recuperaciones.some((r) => r.id === resaltada);

  return (
    <section aria-labelledby="titulo-recuperaciones" className="entra mb-6 min-[900px]:mb-9">
      <h2 id="titulo-recuperaciones" className="font-display text-[20px] font-bold leading-tight text-marca-tinta">
        {t.titulo}
      </h2>
      {enDosPartes && <p className="mt-1 text-pretty text-[15px] leading-snug text-marca-tintaMedia">{t.dosPartes}</p>}

      {activas.length > 0 && (
        <div className="mt-3 grid gap-3 min-[900px]:grid-cols-2 min-[900px]:gap-5">
          {activas.map((r) => (
            <TarjetaRecuperacion key={r.id} rec={r} dias={dias} resaltada={r.id === resaltada} soloLectura={soloLectura} />
          ))}
        </div>
      )}

      {historial.length > 0 && (
        <details className="group mt-3" open={resaltadaEnHistorial}>
          <summary className={`${RESUMEN_DESPLEGABLE} text-marca-gris`}>
            {t.historial}
            <FlechaDesplegable />
          </summary>
          <ul className="mt-1 flex flex-col gap-2">
            {historial.map((r) => {
              const final = r.estado === "recuperada" ? r.fechaConfirmada ?? r.claseCancelada : r.claseCancelada;
              return (
                <li
                  key={r.id}
                  id={`recuperacion-${r.id}`}
                  className={`scroll-mt-24 rounded-[12px] border border-marca-borde bg-marca-niebla px-4 py-3 text-[14.5px] leading-snug text-marca-grisSuave ${
                    r.id === resaltada ? "ring-2 ring-marca-verde ring-offset-2 ring-offset-marca-niebla" : ""
                  }`}
                >
                  {r.estado === "recuperada" ? t.recuperada(final.fecha, final.hora) : t.anulada(final.fecha, final.hora)}
                  {r.parte.de > 1 && ` · ${t.parte(r.parte.numero, r.parte.de)}`}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {existeResaltada && <TraerRecuperacion id={resaltada} />}
    </section>
  );
}
