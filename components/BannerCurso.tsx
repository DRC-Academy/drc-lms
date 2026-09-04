import Link from "next/link";
import { conFoco } from "@/lib/foco";
import { textoDeEspera } from "@/lib/drip";
import type { EstadoCurso } from "@/lib/cursos-servidor";
import { partirModulo } from "@/lib/modulo";
import { etiquetaPosicion, ubicarModulo } from "@/lib/temario";
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
 * Al perder la columna, el titular gana el ancho entero y el rótulo de
 * posición cabe entero en una línea.
 *
 * La forma la pone `components/Banner.tsx`: este archivo decide QUÉ se
 * cuenta —qué lección toca, qué llamada— y el banner cómo se ve. Hoy eso
 * es una franja en tinta con botón verde; pasó por el verde de marca con
 * botón amarillo y ha vuelto, porque el verde no puede ser a la vez el
 * fondo y el color de «pulsa aquí».
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerCurso({
  estados,
  foco = null,
}: {
  estados: EstadoCurso[];
  /**
   * El contexto de revisión que conservan los enlaces al curso, o null
   * cuando es el alumno en su ficha. Ver `lib/foco.ts`.
   */
  foco?: string | null;
}) {
  // Sin curso asignado no hay banner. En su lugar, una línea sobria: el
  // alumno no ha hecho nada mal y no se le habla como si fuera un error.
  // Esto es una tarjeta, no una franja: no lleva verde ni amarillo.
  if (estados.length === 0) {
    return (
      <section className="rounded-[18px] border border-marca-borde bg-white px-6 py-5 min-[900px]:rounded-[20px]">
        <p className="text-[15px] leading-[1.55] text-marca-gris">
          Tu plan todavía no tiene un curso asociado. Coméntaselo a tu profesor y lo activamos.
          Mientras tanto, tu práctica de abajo funciona con normalidad.
        </p>
      </section>
    );
  }

  const principal = estados[0];
  const otros = estados.slice(1);
  const { curso, total, completadas, siguiente, diasParaAbrir } = principal;

  const empezado = completadas > 0;

  // ---------------------------------------------------------------
  // SIN LECCIÓN SIGUIENTE HAY DOS ESTADOS, NO UNO
  //
  // Antes esto era `siguiente === null`, y bastaba porque `siguiente`
  // era la primera pendiente a secas: si no había ninguna, el curso
  // estaba hecho. Desde que respeta la apertura progresiva —igual que el
  // temario— puede no haberla también porque el alumno haya terminado
  // todo lo que tiene abierto y esté esperando al módulo siguiente.
  //
  // Son cosas opuestas y decirle "Curso completado" a quien va por el
  // mes 2 sería la frase más rara de la pantalla. Lo que las separa es
  // el recuento, que no depende del drip.
  // ---------------------------------------------------------------
  const terminado = total > 0 && completadas >= total;
  const esperando = siguiente === null && !terminado;

  const destino = conFoco(
    siguiente ? `/curso/${curso.slug}/${siguiente.id}` : `/curso/${curso.slug}`,
    foco
  );

  const etiqueta = terminado
    ? "Curso completado"
    : esperando
      ? "Estás al día"
      : empezado
        ? "Continúa donde lo dejaste"
        : "Empieza tu curso";

  // Al que espera se le lleva al temario, que es donde está dicho qué
  // viene y cuándo: es la regla 3 de `lib/drip.ts` —lo bloqueado se ve—
  // y el único sitio de la aplicación que la cumple entera.
  const llamada = terminado
    ? "Repasar el curso"
    : esperando
      ? "Ver mi curso"
      : empezado
        ? "Continuar"
        : "Empezar";

  // ---------------------------------------------------------------
  // EL TITULAR ES DÓNDE ESTÁS, NO QUÉ TOCA
  //
  // Era el nombre de la lección siguiente —"Estilo indirecto"—, que es
  // una frase distinta cada día y no sitúa a nadie: para saber si vas
  // adelantado o si llevas un mes parado, el nombre de una lección no
  // sirve. "Mes 1 · Semana 3 · Módulo 5" sí, y es EXACTAMENTE el mismo
  // rótulo que titula el plan dentro de «Mi curso» (ver
  // `etiquetaPosicion`): la primera pantalla y la del curso dicen lo
  // mismo con las mismas palabras.
  //
  // La lección baja a la segunda línea, que es su sitio: sigue haciendo
  // falta —el botón lleva a ella y hay que saber qué se abre— pero no es
  // lo que ordena la pantalla.
  //
  // Y con el módulo en el titular, la línea de contexto que había
  // debajo —"curso · módulo"— se queda sin la mitad de su contenido. La
  // otra mitad, el nombre del curso, se va con ella: lo dice la
  // navegación en «Mi curso», y aquí era un renglón más que leer antes
  // de llegar al botón.
  // ---------------------------------------------------------------
  const titulo = siguiente
    ? etiquetaPosicion(ubicarModulo(partirModulo(siguiente.moduloTitulo, siguiente.moduloOrden)))
    : esperando
      ? "Has hecho todo lo que tienes abierto"
      : curso.titulo;

  return (
    <section>
      <Banner
        eyebrow={etiqueta}
        title={titulo}
        subtitle={siguiente?.titulo}
        action={{ label: llamada, href: destino, srSuffix: siguiente?.titulo ?? titulo }}
        // Dónde cae esta lección dentro del curso. Es lo único que
        // sobrevive de la columna de cifra, y sobrevive porque no lo dice
        // nadie más: el banner del diploma cuenta el curso entero, no en
        // qué punto de él estás ahora mismo.
        //
        // Al que espera se le pone aquí cuándo se abre, con la misma
        // frase que usan el temario y las filas de módulo: es la única
        // pregunta que tiene, y va pegada al botón que le lleva a verlo.
        secondaryText={
          siguiente
            ? `Lección ${siguiente.posicion} de ${total}`
            : esperando && diasParaAbrir !== null
              ? textoDeEspera(diasParaAbrir)
              : undefined
        }
      />

      {/* El segundo curso del alumno de examen. Discreto a propósito y
          FUERA del banner: el banner ya ha dicho cuál toca hoy, y una
          segunda acción dentro competiría con el botón. */}
      {otros.map((otro) => (
        <p key={otro.curso.id} className="mt-3 px-1 text-[14px] leading-[1.5] text-marca-gris">
          También tienes acceso a{" "}
          <Link
            href={conFoco(`/curso/${otro.curso.slug}`, foco)}
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
