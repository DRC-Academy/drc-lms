import Image from "next/image";
import Link from "next/link";

/**
 * Lo que queda de la cabecera propia del curso.
 *
 * AQUÍ HABÍA DOS CABECERAS Y ESE ERA EL PROBLEMA. El curso tenía la suya
 * —logotipo, nombre del curso y progreso— y el resto de las pantallas
 * del alumno tenían `components/Cabecera.tsx`, con la navegación. Al
 * entrar en el curso se cambiaba una por otra, y con ella desaparecían
 * Inicio, Mi curso y Práctica: el alumno se quedaba sin forma de salir
 * que no fuera el botón del navegador.
 *
 * Ahora la cabecera es UNA, `components/Cabecera.tsx`, y el contexto del
 * curso se le pasa en la prop `contexto`: se añade a la navegación en
 * vez de sustituirla. De este archivo solo sobreviven las dos piezas que
 * no eran cabecera:
 *
 *   - `CabeceraCargando`, el hueco del `Suspense` mientras el layout lee
 *     el nombre y el progreso del curso.
 *   - `TiraProgreso`, la barra fina del módulo que la lección pinta en
 *     su propia fila de móvil.
 */

/**
 * El hueco de la cabecera mientras se leen sus datos.
 *
 * MISMA ALTURA Y MISMO LOGOTIPO que la cabecera de verdad, para que al
 * llegar no salte nada. En gris solo lo que hay que ir a buscar; el
 * logotipo no depende de ninguna consulta y no tiene ninguna razón para
 * no estar pintado ya.
 *
 * No lleva navegación porque todavía no se sabe de qué alumno es la
 * sesión. Dura lo que tarda una consulta y solo al entrar en el curso
 * desde fuera: como la cabecera vive en el layout, saltar de lección a
 * lección no vuelve a pasar por aquí.
 */
export function CabeceraCargando() {
  return (
    <header className="sticky top-0 z-30 border-b border-marca-borde bg-white/[0.96] backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-contenido items-center gap-4 px-4 sm:h-[68px] sm:gap-10 sm:px-9">
        <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-70">
          <Image
            src="/logo-drc.png"
            alt="DRC Academy"
            width={121}
            height={32}
            priority
            className="h-[26px] w-auto sm:h-8"
          />
        </Link>

        <span aria-hidden className="hidden h-[13px] w-[190px] rounded bg-marca-nieblaOscura min-[900px]:block" />

        <div className="ml-auto flex shrink-0 items-center gap-3.5">
          <span aria-hidden className="hidden h-[5px] w-[120px] rounded-[3px] bg-marca-pista min-[900px]:block" />
          <span aria-hidden className="h-7 w-7 rounded-full bg-marca-nieblaOscura sm:h-[30px] sm:w-[30px]" />
        </div>
      </div>

      {/* La segunda línea del contexto, que en móvil sí existe. */}
      <div className="border-t border-marca-borde bg-marca-niebla px-4 py-[7px] min-[900px]:hidden">
        <div className="mx-auto flex max-w-contenido items-center gap-2.5">
          <span aria-hidden className="h-[11px] flex-1 rounded bg-marca-nieblaOscura" />
          <span aria-hidden className="h-[5px] w-16 rounded-[3px] bg-marca-pista" />
        </div>
      </div>

      <span className="sr-only">Cargando el curso…</span>
    </header>
  );
}

/**
 * La tira de progreso del módulo, en móvil.
 *
 * Es la respuesta de orientación cuando no hay lateral, y cambia de
 * contenido según se esté leyendo la teoría o respondiendo ejercicios.
 * La pinta `VistaLeccion` en su propia fila: es lo único que sabe la
 * lección y no el curso.
 */
export function TiraProgreso({ texto, hechos, total }: { texto: string; hechos: number; total: number }) {
  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 text-[11.5px] font-semibold text-marca-gris tabular-nums">{texto}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-[3px] bg-marca-pista">
        <div
          className="h-full rounded-[3px] bg-marca-verde transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
