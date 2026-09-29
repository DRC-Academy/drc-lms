import type { ReactNode } from "react";
import type { ClaseDelRecorrido } from "@/lib/gestion";
import { formatearFechaLarga } from "@/lib/perfil";
import { esHito } from "@/lib/recorrido";
import { textosActuales } from "@/lib/idioma-servidor";
import type { DetalleRecorrido } from "@/components/progreso/Recorrido";
import { FlechaDesplegable, RESUMEN_DESPLEGABLE, TARJETA } from "@/components/base/Seccion";

// ---------------------------------------------------------------
// LAS CLASES PASADAS, COMO UN SENDERO
//
// El lenguaje de la ruta de «Para ti» (`components/practica/Ruta.tsx`),
// en sobrio: una línea de puntos vertical que une las clases y una
// parada redonda en cada una. Sin la bota, sin candados y sin animación:
// aquí todo está hecho, no hay nada que desbloquear.
//
// POR CLASE, LA FECHA Y EL TÍTULO. Lo demás —con quién fue y los temas—
// va en un desplegable cerrado. En la tarjeta de antes todo iba abierto y
// una sola clase ocupaba media pantalla de móvil.
//
// La usan dos pantallas, igual que `Recorrido`, del que toma los datos:
//
//   · «Mis clases», a todos los anchos, con el profesor de cada clase
//     (`detalle`) y un ancla por clase para el calendario;
//   · «Mi progreso», SOLO EN MÓVIL: en escritorio la ficha sigue siendo
//     el calco de la de Gestión, con `Recorrido`.
//
// Lo que no sale nunca, igual que en `Recorrido`: el transcript, las
// frases del alumno, sus errores y el resumen en tercera persona.
//
// «VER MÁS» ES UN `<details>` con el `<summary>` como botón secundario
// que desaparece al abrirse, igual que el `pg-more` de la ficha. Sin
// estado de cliente.
// ---------------------------------------------------------------

export default function SenderoClases({
  clases,
  vacio,
  rotuloTemas,
  detalle,
  anclas = false,
  visibles,
  verMas,
}: {
  /** De la más reciente a la más antigua. */
  clases: ClaseDelRecorrido[];
  vacio: string;
  /** El rótulo del desplegable de cada clase: "Temas tratados". */
  rotuloTemas: string;
  /** Solo en «Mis clases»: el profesor de cada una. */
  detalle?: DetalleRecorrido;
  /** Un `id` por clase (`clase-<id>`), para enlazar desde el calendario. */
  anclas?: boolean;
  visibles: number;
  /** El rótulo del botón con las que quedan dentro. */
  verMas: (restantes: number) => string;
}) {
  if (clases.length === 0) {
    return <p className={`${TARJETA} px-5 py-5 text-[15px] leading-[1.5] text-marca-gris`}>{vacio}</p>;
  }

  const primeras = clases.slice(0, visibles);
  const resto = clases.slice(visibles);

  return (
    <div className={`${TARJETA} px-5 py-3`}>
      <Tramo>
        {primeras.map((clase, i) => (
          <Parada key={clase.id} clase={clase} primera={i === 0} rotuloTemas={rotuloTemas} detalle={detalle} ancla={anclas} />
        ))}
      </Tramo>

      {resto.length > 0 && (
        <details className="group/mas">
          <summary className="btn-verde-linea mb-2 mt-2 flex min-h-[44px] w-full cursor-pointer list-none items-center justify-center rounded-full px-6 text-[15px] font-bold group-open/mas:hidden [&::-webkit-details-marker]:hidden">
            {verMas(resto.length)}
          </summary>
          <Tramo>
            {resto.map((clase) => (
              <Parada key={clase.id} clase={clase} primera={false} rotuloTemas={rotuloTemas} detalle={detalle} ancla={anclas} />
            ))}
          </Tramo>
        </details>
      )}
    </div>
  );
}

/** Un tramo de sendero: la línea de puntos a la izquierda y las paradas. */
function Tramo({ children }: { children: ReactNode }) {
  return (
    <ol className="relative pl-8">
      {/* La línea de puntos, del centro de la primera parada al de la
          última. Puntos y no raya: es el camino de la ruta, ya andado. */}
      <span
        aria-hidden
        className="absolute bottom-7 left-[9px] top-7 w-[3px]"
        style={{ backgroundImage: "radial-gradient(circle, #9FBAAA 1.3px, transparent 1.7px)", backgroundSize: "3px 9px" }}
      />
      {children}
    </ol>
  );
}

function Parada({
  clase,
  primera,
  rotuloTemas,
  detalle,
  ancla,
}: {
  clase: ClaseDelRecorrido;
  /** La más reciente: la única parada rellena. */
  primera: boolean;
  rotuloTemas: string;
  detalle?: DetalleRecorrido;
  ancla: boolean;
}) {
  const t = textosActuales().progreso;
  const fecha = clase.fechaClase !== "" ? formatearFechaLarga(clase.fechaClase, t.fechaLarga) : null;
  const profesor = detalle && clase.teacherId ? detalle.profesores.get(clase.teacherId) : undefined;
  const conProfesor = profesor && detalle ? detalle.conProfesor(profesor) : null;
  const numero = clase.numero ?? 0;
  const hito = numero > 0 && esHito(numero);

  // El hito lleva el amarillo de acento, como en la ficha; la más
  // reciente, el verde relleno; el resto, el aro verde sobre blanco.
  const disco = hito
    ? "border-marca-amarillo bg-marca-amarillo"
    : primera
      ? "border-marca-verde bg-marca-verde"
      : "border-marca-verde bg-white";

  return (
    <li
      id={ancla ? `clase-${clase.id}` : undefined}
      className="relative py-3"
      style={ancla ? { scrollMarginTop: 64 } : undefined}
    >
      <span aria-hidden className={`absolute -left-8 top-[15px] h-[21px] w-[21px] rounded-full border-[3px] ${disco}`} />

      {fecha && <p className="text-[13px] leading-snug text-marca-gris first-letter:uppercase">{fecha}</p>}
      {clase.titulo !== "" ? (
        <p className="mt-0.5 text-pretty text-[15.5px] font-semibold leading-snug text-marca-tinta">{clase.titulo}</p>
      ) : (
        // Sin análisis no hay título: queda con quién fue, sin inventar nada.
        conProfesor && <p className="mt-0.5 text-[15px] text-marca-tintaMedia first-letter:uppercase">{conProfesor}</p>
      )}

      {clase.temas !== "" && (
        <details className="group">
          <summary className={RESUMEN_DESPLEGABLE}>
            {rotuloTemas}
            <FlechaDesplegable />
          </summary>
          <div className="pb-1">
            {conProfesor && clase.titulo !== "" && (
              <p className="text-[14px] text-marca-gris first-letter:uppercase">{conProfesor}</p>
            )}
            <p className="mt-1 whitespace-pre-line text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">{clase.temas}</p>
          </div>
        </details>
      )}
    </li>
  );
}
