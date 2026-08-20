import Link from "next/link";
import type { EstadoCurso } from "@/lib/cursos-servidor";
import { partirModulo } from "@/lib/modulo";
import Banner from "@/components/Banner";

/**
 * La pieza principal del inicio.
 *
 * La idea que lo ordena: quien tiene cinco minutos no debería tener que
 * decidir nada. El botón lleva a LA LECCIÓN exacta donde se quedó, no al
 * índice del curso, porque el índice es otra decisión más.
 *
 * SIN COLUMNA DE CIFRA. La tuvo: primero "12% · del curso completado",
 * después la cuenta del diploma. Las dos contaban el avance del curso, y
 * el diploma —que ahora tiene banner propio encima— cuenta exactamente
 * lo mismo desde el otro lado. Dos cuentas del mismo hecho a dos
 * centímetros no es insistir: es hacer dudar de cuál de las dos es la
 * buena.
 *
 * Así que la franja se queda con lo suyo, que no lo dice nadie más:
 * dónde lo dejaste, en qué módulo estás y el botón exacto para seguir.
 * Al perder la columna, el titular gana el ancho entero y una lección de
 * título largo deja de partirse en cuatro palabras por línea.
 *
 * La forma la pone `components/Banner.tsx`: este archivo decide QUÉ se
 * cuenta —qué lección toca, qué llamada— y el banner cómo se ve. Hoy eso
 * es una franja en tinta con botón verde; pasó por el verde de marca con
 * botón amarillo y ha vuelto, porque el verde no puede ser a la vez el
 * fondo y el color de «pulsa aquí».
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerCurso({ estados }: { estados: EstadoCurso[] }) {
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

  // El curso se nombra AQUÍ, junto al módulo, que es la otra mitad del
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

  return (
    <section>
      <Banner
        eyebrow={etiqueta}
        title={titulo}
        meta={contexto !== "" ? contexto : undefined}
        action={{ label: llamada, href: destino, srSuffix: titulo }}
        // Dónde cae esta lección dentro del curso. Es lo único que
        // sobrevive de la columna de cifra, y sobrevive porque no lo dice
        // nadie más: el banner del diploma cuenta el curso entero, no en
        // qué punto de él estás ahora mismo.
        secondaryText={siguiente ? `Lección ${siguiente.posicion} de ${total}` : undefined}
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
