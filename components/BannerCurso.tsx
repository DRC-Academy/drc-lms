import Link from "next/link";
import type { EstadoCurso } from "@/lib/cursos-servidor";
import { apoyoDiploma, textoDiploma, type EstadoDiploma } from "@/lib/diploma";
import { partirModulo } from "@/lib/modulo";
import Banner from "@/components/Banner";

/**
 * La pieza principal del inicio.
 *
 * La idea que lo ordena: quien tiene cinco minutos no debería tener que
 * decidir nada. El botón lleva a LA LECCIÓN exacta donde se quedó, no al
 * índice del curso, porque el índice es otra decisión más.
 *
 * LA MITAD DERECHA ES EL DIPLOMA, y ese es el cambio que trae este
 * archivo. Antes era "12% · del curso completado · llevas 12 de 191", y
 * justo debajo de la franja iba una fila que decía "179 lecciones para
 * tu diploma": el mismo hecho, dos veces y con dos aritméticas. Ahora la
 * cifra grande es lo que FALTA para el diploma y la fila de abajo cuenta
 * el paso de esta semana. Ni un píxel más de alto y el diploma pasa de
 * una fila de 50px a los 40px de tipografía más grandes de la pantalla.
 *
 * POR QUÉ AQUÍ Y NO EN UNA TARJETA PROPIA. El diploma es la palanca de
 * retención de la academia, pero una tarjeta suya en la columna derecha
 * empuja la práctica hacia abajo —ya se probó, y se revirtió—. Metido en
 * la franja gana prominencia SIN quitársela a nada: hereda el sitio del
 * porcentaje, que decía lo mismo peor.
 *
 * Y gana una cosa que no tenía en ninguno de sus sitios anteriores:
 * queda pegado al botón que lo acerca. De eso se encarga `secondaryText`,
 * que dice en una línea que esa lección descuenta de esa cifra.
 *
 * Las marcas —una por lección— se quedan: enseñan de un vistazo lo hecho
 * y lo que queda, que es lo que un número suelto no dice. En móvil no
 * caben —serían de menos de un píxel— y se sustituyen por una barra con
 * el mismo dato.
 *
 * La forma la pone `components/Banner.tsx`: este archivo decide QUÉ se
 * cuenta —qué lección toca, qué llamada, qué progreso— y el banner cómo
 * se ve. Hoy eso es una franja en tinta con botón verde; pasó por el
 * verde de marca con botón amarillo y ha vuelto, porque el verde no
 * puede ser a la vez el fondo y el color de «pulsa aquí».
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerCurso({
  estados,
  diploma,
  conLateral,
}: {
  estados: EstadoCurso[];
  /** El diploma del curso que manda, ya calculado en la página. */
  diploma: EstadoDiploma;
  /** Con la tarjeta de práctica al lado, la columna del diploma encoge. */
  conLateral: boolean;
}) {
  // Sin curso asignado no hay banner. En su lugar, una línea sobria: el
  // alumno no ha hecho nada mal y no se le habla como si fuera un error.
  // Esto es una tarjeta, no una franja: no lleva verde ni amarillo.
  if (estados.length === 0) {
    return (
      <section className="rounded-[18px] border border-marca-borde bg-white px-6 py-5 lg:rounded-[20px]">
        <p className="text-[15px] leading-[1.55] text-marca-gris">
          Tu plan todavía no tiene un curso asociado. Coméntaselo a tu profesor y lo activamos.
          Mientras tanto, tu práctica de abajo funciona con normalidad.
        </p>
      </section>
    );
  }

  const principal = estados[0];
  const otros = estados.slice(1);
  const { curso, total, completadas, siguiente } = principal;

  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const empezado = completadas > 0;
  const terminado = siguiente === null && total > 0;

  const destino = siguiente ? `/curso/${curso.slug}/${siguiente.id}` : `/curso/${curso.slug}`;

  const etiqueta = terminado
    ? "Curso completado"
    : empezado
      ? "Continúa donde lo dejaste"
      : "Empieza tu curso";

  const llamada = terminado ? "Repasar el curso" : empezado ? "Continuar" : "Empezar";

  const titulo = terminado || !siguiente ? curso.titulo : siguiente.titulo;

  // El curso se nombra AQUÍ desde que el pie del botón lo dejó libre para
  // la línea del diploma. Va junto al módulo, que es la otra mitad del
  // "dónde estoy", y con el prefijo de LearnDash ya quitado.
  const contexto = [
    // Con el curso terminado el titular YA es el nombre del curso:
    // repetirlo aquí sería decirlo dos veces en dos renglones.
    terminado ? "" : curso.titulo,
    siguiente && siguiente.moduloTitulo !== ""
      ? partirModulo(siguiente.moduloTitulo, 0).titulo
      : "",
  ]
    .filter((parte) => parte !== "")
    .join(" · ");

  const meta = textoDiploma(diploma);
  const apoyo = apoyoDiploma(diploma);

  return (
    <section>
      <Banner
        eyebrow={etiqueta}
        title={titulo}
        meta={contexto !== "" ? contexto : undefined}
        action={{ label: llamada, href: destino, srSuffix: titulo }}
        // La línea que ata el botón a la cifra de al lado. Sin ella, la
        // lección de la izquierda y el diploma de la derecha se leen como
        // dos cosas que solo comparten caja.
        secondaryText={apoyo ?? undefined}
        // Con la tarjeta de práctica al lado, la pantalla es más
        // estrecha y la columna del diploma encoge para que el titular
        // no se quede en tres palabras por línea.
        asideWidth={conLateral ? "190px" : "210px"}
        aside={
          meta ? (
            <>
              {meta.cifra !== null ? (
                <p className="flex items-baseline gap-[7px]">
                  <span className="font-display text-[40px] font-extrabold leading-none text-white tabular-nums">
                    {meta.cifra}
                  </span>
                  <span className="text-[14px] font-semibold text-white/[0.82]">{meta.unidad}</span>
                </p>
              ) : (
                <SelloGrande />
              )}

              {/* La meta, en el verde claro de las etiquetas del banner.
                  Es la palabra que carga con la retención: si se pinta
                  del mismo gris que el resto, la cifra de arriba vuelve a
                  ser un porcentaje cualquiera. */}
              <p className="mt-2 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-banner-etiqueta">
                {meta.meta}
              </p>

              {total > 0 && (
                <>
                  {/* Una marca por lección. Solo donde caben: a 191
                      lecciones en un móvil serían de menos de un píxel. */}
                  <div aria-hidden className="mt-[18px] hidden flex-wrap gap-[3px] min-[900px]:flex">
                    {Array.from({ length: total }, (_, i) => (
                      <span
                        key={i}
                        className={`h-[11px] w-[5px] rounded-[1.5px] ${
                          i < completadas ? "bg-white" : "bg-white/[0.32]"
                        }`}
                      />
                    ))}
                  </div>

                  {/* En móvil, el mismo dato en una barra. */}
                  <div
                    className="mt-[18px] h-[7px] overflow-hidden rounded-[4px] bg-white/[0.32] min-[900px]:hidden"
                    role="progressbar"
                    aria-valuenow={porcentaje}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progreso en ${curso.titulo}`}
                  >
                    <div className="h-full rounded-[4px] bg-white" style={{ width: `${porcentaje}%` }} />
                  </div>
                </>
              )}

              <p className="mt-3.5 text-[13px] text-white/[0.82]">{meta.pie}</p>
            </>
          ) : undefined
        }
      />

      {/* El segundo curso del alumno de examen. Discreto a propósito y
          FUERA del banner: el banner ya ha dicho cuál toca hoy, y una
          segunda acción dentro competiría con el botón. */}
      {otros.map((otro) => (
        <p key={otro.curso.id} className="mt-3 px-1 text-[14px] leading-[1.5] text-marca-gris">
          También tienes acceso a{" "}
          <Link
            href={`/curso/${otro.curso.slug}`}
            className="font-medium text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
          >
            {otro.curso.titulo}
          </Link>
          .
        </p>
      ))}
    </section>
  );
}

/**
 * El sello, al tamaño de la cifra a la que sustituye.
 *
 * Con el curso terminado no hay número que enseñar —no falta nada— y un
 * "0" ahí se leería como una carencia justo en el momento del logro.
 */
function SelloGrande() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[40px] w-[40px]"
      fill="none"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7" r="4.6" stroke="#FFFFFF" fill="#FFFFFF" fillOpacity="0.16" />
      <path d="M6.4 11.2 5.4 16l3.6-1.9 3.6 1.9-1-4.8" stroke="#FFFFFF" />
      <path d="M7 7l1.5 1.5L11 5.8" stroke="#FFFFFF" />
    </svg>
  );
}
