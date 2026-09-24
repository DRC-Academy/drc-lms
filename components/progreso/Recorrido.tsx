import type { ClaseDelRecorrido } from "@/lib/gestion";
import { textosActuales } from "@/lib/idioma-servidor";
import { formatearFechaLarga } from "@/lib/perfil";
import { esHito } from "@/lib/recorrido";

// ---------------------------------------------------------------
// EL RECORRIDO CLASE A CLASE
//
// La pieza que enseña cada clase con su título y sus temas y vocabulario.
// Vivía dentro de `Ficha.tsx`; sale a su archivo porque la usan dos
// pantallas y tiene que ser la misma:
//
//   · la ficha de progreso («Mi progreso»), que enseña solo las clases con
//     informe;
//   · el historial de «Clases», que enseña TODAS las pasadas con su
//     `detalle`: además, quién dio cada una. Una clase sin análisis sale
//     con su fecha y su profesor, sin inventarle contenido.
//
// LO QUE NO SALE NUNCA: el transcript, las frases sueltas del alumno, sus
// errores y el resumen (`class_summary`), que habla de él en tercera
// persona. `obtenerRecorrido` ni siquiera los pide. El tono es "lo que
// trabajaste", nunca "lo que fallaste".
//
// En esto la ficha se aparta de la página pública de Gestión, que sí
// enseña el resumen.
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
 *
 * Cuántas se ven antes del «ver más» lo decide cada pantalla: la ficha
 * enseña seis; el historial de «Clases», solo la última, porque encima
 * ya tiene el calendario y la tarjeta de la última clase.
 */
const VISIBLES = 6;

/** Lo que el historial añade a cada tarjeta. */
export type DetalleRecorrido = {
  /** El nombre de cada profesor por `teacher_id`. */
  profesores: Map<string, string>;
  /** "con Ignacio" */
  conProfesor: (nombre: string) => string;
};

export default function Recorrido({
  clases,
  titulo,
  vacio,
  rotuloTemas,
  detalle,
  retraso = "360ms",
  anclas = false,
  visibles = VISIBLES,
  verMas,
}: {
  /** Las clases, de la más reciente a la más antigua. */
  clases: ClaseDelRecorrido[];
  /** El rótulo de la sección. Sin él, la pantalla pone el suyo. */
  titulo?: string;
  /** La frase cuando no hay ninguna. */
  vacio: string;
  /** El rótulo de los temas: "Temas y vocabulario". */
  rotuloTemas: string;
  /** Solo en el historial: el profesor de cada clase. La ficha va sin él. */
  detalle?: DetalleRecorrido;
  /** El paso de la entrada escalonada de la ficha. */
  retraso?: string;
  /**
   * Un `id` por tarjeta (`clase-<id>`), para enlazar a una clase concreta
   * desde fuera: el calendario de «Clases» lleva de cada clase hecha a lo
   * que se trabajó en ella.
   */
  anclas?: boolean;
  /** Las clases a la vista antes del «ver más». */
  visibles?: number;
  /** El rótulo del «ver más», con las que quedan dentro. Sin él, "Ver las N clases". */
  verMas?: (restantes: number) => string;
}) {
  const t = textosActuales().progreso;
  const primeras = clases.slice(0, visibles);
  const resto = clases.slice(visibles);
  const tarjeta = (clase: ClaseDelRecorrido) => (
    <Tarjeta key={clase.id} clase={clase} rotuloTemas={rotuloTemas} detalle={detalle} ancla={anclas} />
  );

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
              <summary className="pg-more">{verMas ? verMas(resto.length) : t.verLasClases(clases.length)}</summary>
              <ol className="pg-timeline pg-timeline-resto">{resto.map(tarjeta)}</ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function Tarjeta({
  clase,
  rotuloTemas,
  detalle,
  ancla,
}: {
  clase: ClaseDelRecorrido;
  rotuloTemas: string;
  detalle?: DetalleRecorrido;
  ancla: boolean;
}) {
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
    <li
      id={ancla ? `clase-${clase.id}` : undefined}
      className={`pg-tl-item${marcado ? " is-milestone" : ""}`}
      style={ancla ? { scrollMarginTop: 24 } : undefined}
    >
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
        {clase.temas !== "" && (
          <div className="pg-tl-temas">
            <p className="pg-tl-temas-rotulo">{rotuloTemas}</p>
            <p className="pg-body">{clase.temas}</p>
          </div>
        )}
      </div>
    </li>
  );
}
