import type { ClaseDelRecorrido } from "@/lib/gestion";
import { textosActuales } from "@/lib/idioma-servidor";
import { formatearFechaLarga } from "@/lib/perfil";
import { esHito } from "@/lib/recorrido";

// ---------------------------------------------------------------
// EL RECORRIDO CLASE A CLASE
//
// La pieza de la ficha de progreso que enseña cada clase con su resumen.
// Vivía dentro de `Ficha.tsx`; sale a su archivo porque la usan dos
// pantallas y tiene que ser la misma:
//
//   · la ficha de progreso («Mi progreso»), que es una réplica de la
//     página pública de Gestión y enseña solo las clases con informe;
//   · el historial de «Clases», que enseña TODAS las pasadas con su
//     `detalle`: quién la dio y los temas y el vocabulario trabajados.
//     Una clase sin análisis sale con su fecha y su profesor, sin
//     inventarle contenido.
//
// LO QUE NO SALE NUNCA: el transcript, las frases sueltas del alumno y
// sus errores. `obtenerRecorrido` ni siquiera los pide. El tono es "lo
// que trabajaste", nunca "lo que fallaste".
//
// El CSS es el `pg-*` de la ficha (`components/progreso/estilos.tsx`):
// quien monta esta pieza monta también `EstilosFicha`.
// ---------------------------------------------------------------

/**
 * El "VER LAS N CLASES" ES UN `<details>` Y NO UN BOTÓN. En Gestión es un
 * `useState` que cambia el recorte; aquí no hay estado de cliente, y
 * meterlo por esto costaría el arranque de React. El `<summary>` lleva la
 * misma clase `pg-more`, así que se ve igual, y al abrirlo se oculta y
 * quedan todas las clases a la vista.
 */
const VISIBLES = 6;

/** Lo que el historial añade a cada tarjeta. */
export type DetalleRecorrido = {
  /** El nombre de cada profesor por `teacher_id`. */
  profesores: Map<string, string>;
  /** "con Ignacio" */
  conProfesor: (nombre: string) => string;
  /** El rótulo de los temas: "Temas y vocabulario". */
  temas: string;
};

export default function Recorrido({
  clases,
  titulo,
  vacio,
  detalle,
  retraso = "360ms",
}: {
  /** Las clases, de la más reciente a la más antigua. */
  clases: ClaseDelRecorrido[];
  /** El rótulo de la sección. Sin él, la pantalla pone el suyo. */
  titulo?: string;
  /** La frase cuando no hay ninguna. */
  vacio: string;
  /** Solo en el historial: profesor y temas. La ficha va sin él. */
  detalle?: DetalleRecorrido;
  /** El paso de la entrada escalonada de la ficha. */
  retraso?: string;
}) {
  const t = textosActuales().progreso;
  const primeras = clases.slice(0, VISIBLES);
  const resto = clases.slice(VISIBLES);
  const tarjeta = (clase: ClaseDelRecorrido) => <Tarjeta key={clase.id} clase={clase} detalle={detalle} />;

  return (
    <section className="pg-rise" style={{ animationDelay: retraso }}>
      {titulo && <p className="pg-section-title">{titulo}</p>}

      {clases.length === 0 ? (
        <div className="pg-card pg-empty">{vacio}</div>
      ) : (
        <>
          <ol className="pg-timeline">{primeras.map(tarjeta)}</ol>

          {resto.length > 0 && (
            <details className="pg-more-wrap">
              <summary className="pg-more">{t.verLasClases(clases.length)}</summary>
              <ol className="pg-timeline pg-timeline-resto">{resto.map(tarjeta)}</ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function Tarjeta({ clase, detalle }: { clase: ClaseDelRecorrido; detalle?: DetalleRecorrido }) {
  const t = textosActuales().progreso;
  const numero = clase.numero ?? 0;
  const marcado = numero > 0 && esHito(numero);
  // `fecha_clase` llega como `YYYY-MM-DD`. Se formatea partiendo la
  // cadena y no con `new Date()`: construir una fecha desde un ISO corto
  // la ancla a UTC y en España puede retroceder un día. Gestión usa
  // `new Date()` y se salva por estar en UTC+1; esto no depende de eso.
  const fecha = clase.fechaClase !== "" ? formatearFechaLarga(clase.fechaClase, t.fechaLarga) : null;
  const profesor = detalle && clase.teacherId ? detalle.profesores.get(clase.teacherId) : undefined;

  return (
    <li className={`pg-tl-item${marcado ? " is-milestone" : ""}`}>
      <span className="pg-tl-node" aria-hidden />
      <div className="pg-card pg-tl-card">
        {/* Muchas filas no traen número de clase. Antes salía "Clase —",
            que parecía un fallo; sin número manda la fecha. */}
        <div className="pg-tl-head">
          {numero > 0 && <span className="pg-tl-num">{t.claseNumero(numero)}</span>}
          {fecha && <span className={numero > 0 ? "pg-tl-date" : "pg-tl-num"}>{fecha}</span>}
          {profesor && detalle && <span className="pg-tl-date">{detalle.conProfesor(profesor)}</span>}
          {marcado && <span className="pg-badge pg-badge-sm">{t.hito}</span>}
        </div>
        {clase.titulo !== "" && <p className="pg-tl-title">{clase.titulo}</p>}
        {clase.resumen !== "" && <p className="pg-body">{clase.resumen}</p>}
        {detalle && clase.temas !== "" && (
          <div className="pg-tl-temas">
            <p className="pg-tl-temas-rotulo">{detalle.temas}</p>
            <p className="pg-body">{clase.temas}</p>
          </div>
        )}
      </div>
    </li>
  );
}
