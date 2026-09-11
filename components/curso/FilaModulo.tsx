"use client";

import { usarIdioma } from "@/components/ProveedorIdioma";
import Link from "next/link";
import type { ModuloTemario } from "@/lib/temario";
import { textoDeEspera } from "@/lib/drip";
import { conFoco } from "@/lib/foco";
import { IconoCandado, IconoCheck } from "@/components/curso/Iconos";

/**
 * Un módulo dentro de su semana.
 *
 * Dos formas en el mismo componente: en escritorio va todo en una línea
 * —código, título, contador— y en móvil se apila en tres, con la marca a
 * la izquierda. El corte es el mismo que el del resto de la pantalla.
 *
 * ---------------------------------------------------------------
 * CUATRO ESTADOS QUE SE DISTINGUEN SIN LEER
 *
 * Antes lo cerrado y lo abierto casi no se distinguían: un círculo
 * discontinuo frente a uno continuo, y un texto algo más claro. Había
 * que leer cada fila para saber cuál se podía abrir, y quien no leía
 * pulsaba una cerrada y no entendía por qué no pasaba nada.
 *
 * Ahora cada estado cambia TRES cosas a la vez —la marca de la
 * izquierda, el contenedor y el peso del título—, y sin opacidad: los
 * colores son explícitos, que a los sesenta un texto al 50% no se lee.
 *
 *   EN CURSO       anillo verde con punto, borde verde, título bold y
 *                  «Continuar →». Lo único con borde verde de la lista.
 *
 *   DISPONIBLE     tarjeta blanca —es lo que dice «se puede pulsar»— con
 *                  un anillo vacío, un tono más visible que antes.
 *
 *   COMPLETADO     check en verde pálido, el mismo verde con el que el
 *                  mes completado lleva su círculo, un tono más abajo.
 *                  Sin blanco de tarjeta: es archivo, no tarea. Vive en
 *                  el desplegable de completados que monta `Temario`.
 *
 *   SE ABRE        deja de ser una tarjeta: sin blanco y con el borde
 *   DESPUÉS        discontinuo, la forma de lo que todavía no está. El
 *                  candado va fino y del gris de los rótulos, nunca de
 *                  color de aviso, y el texto dice cuándo: «Se abre en 5
 *                  días», «Se abre el 26 de sept.». Nada que hacer para
 *                  abrirlo; solo llega.
 *
 * EN MÓVIL LA FECHA BAJA BAJO EL TÍTULO, donde en las demás filas va «4
 * lecciones · 0 hechas», y la derecha queda vacía. Es lo que le deja al
 * título su ancho a 375px: con la fecha a la derecha, un título largo
 * partía en tres líneas.
 * ---------------------------------------------------------------
 */
export default function FilaModulo({
  modulo,
  slug,
  foco = null,
}: {
  modulo: ModuloTemario;
  slug: string;
  /** Contexto de revisión, para no perder al alumno al abrir la lección. */
  foco?: string | null;
}) {
  const { curso: t, banners: tb } = usarIdioma().t;
  const { esActual, hecho, totalLecciones, completadas, disponible } = modulo;

  const meta = t.metaModulo(totalLecciones, completadas);
  const espera = disponible ? null : textoDeEspera(modulo.diasParaAbrir ?? 1, modulo.abreEl, tb);

  // La marca ocupa 18×18 en los cuatro estados para que las filas no se
  // desalineen entre sí.
  const cajaMarca =
    "mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full min-[900px]:mt-0";

  const contenido = (
    <>
      {!disponible ? (
        <span aria-hidden className={`${cajaMarca} text-temario-tenue`}>
          <IconoCandado />
        </span>
      ) : esActual ? (
        <span aria-hidden className={`${cajaMarca} border-[1.5px] border-temario-verde`}>
          <span className="block h-[7px] w-[7px] rounded-full bg-temario-verde" />
        </span>
      ) : hecho ? (
        <span aria-hidden className={`${cajaMarca} bg-temario-verdePalido text-temario-verdeTexto`}>
          <IconoCheck />
        </span>
      ) : (
        <span aria-hidden className={`${cajaMarca} border-[1.5px] border-temario-separador`} />
      )}

      <div className="min-w-0 flex-1 min-[900px]:flex min-[900px]:items-center min-[900px]:gap-4">
        <span
          className={`block text-[12px] font-extrabold uppercase leading-none min-[900px]:w-[78px] min-[900px]:shrink-0 ${
            esActual
              ? "text-temario-verdeTexto"
              : !disponible
                ? "text-temario-puntoSuave"
                : "text-temario-tenue"
          }`}
        >
          {/* La misma función que la cabecera del mes: era el único sitio
              que escribía la palabra a mano, y seguía en español con el
              idioma en inglés. Las mayúsculas las pone el CSS. */}
          {t.moduloNumero(modulo.numero)}
        </span>

        {/* El peso del título es uno de los tres rasgos del estado: bold
            en curso, semibold en lo que se puede abrir, medium en lo que
            todavía no. */}
        <span
          className={`mt-1 block text-pretty text-[14px] leading-[1.3] min-[900px]:mt-0 min-[900px]:flex-1 min-[900px]:text-[15.5px] ${
            esActual
              ? "font-bold text-temario-tinta"
              : !disponible
                ? "font-medium text-temario-suave"
                : hecho
                  ? "font-semibold text-temario-medio"
                  : "font-semibold text-temario-tinta"
          }`}
        >
          {modulo.titulo}
        </span>

        {/* Lo completado no lleva cuenta: «5 lecciones · 5 hechas» es
            decir dos veces lo que ya dice el check. */}
        {disponible && !hecho && (
          <span className="mt-[5px] block text-[11.5px] font-medium text-temario-medio min-[900px]:mt-0 min-[900px]:whitespace-nowrap min-[900px]:text-[12.5px]">
            {meta}
          </span>
        )}

        {/* La fecha, en el sitio de la cuenta, solo en móvil. */}
        {espera && (
          <span className="mt-[5px] block text-[11.5px] font-medium text-temario-suave min-[900px]:hidden">
            {espera}
          </span>
        )}
      </div>

      {espera ? (
        <span className="hidden shrink-0 whitespace-nowrap text-[12.5px] font-medium text-temario-suave min-[900px]:block">
          {espera}
        </span>
      ) : esActual ? (
        <span className="mt-[2px] shrink-0 whitespace-nowrap text-[13px] font-bold text-temario-verdeTexto min-[900px]:mt-0">
          {t.continuarFlecha}
        </span>
      ) : (
        <span aria-hidden className="mt-[2px] shrink-0 text-[13px] text-temario-separador min-[900px]:mt-0">
          ›
        </span>
      )}
    </>
  );

  // 44px de alto mínimo: es zona táctil, y en móvil la fila de una sola
  // línea se quedaba por debajo.
  const base =
    "flex min-h-[44px] items-start gap-3 rounded-[12px] px-4 py-3 transition-colors min-[900px]:items-center min-[900px]:gap-4 min-[900px]:px-[18px] min-[900px]:py-[14px]";

  const aspecto = !disponible
    ? // Ni blanco ni borde continuo: no es una tarjeta, y por eso no
      // invita a pulsar. Sin hover, por lo mismo.
      "border border-dashed border-temario-discontinuo bg-transparent"
    : esActual
      ? "border-[1.5px] border-temario-verde bg-white"
      : hecho
        ? // Sin blanco: sigue siendo un enlace —se repasa desde aquí—
          // pero no compite con lo que queda por hacer.
          "border border-temario-bordeFila bg-temario-rail/40 hover:border-temario-bordeHover"
        : "border border-temario-bordeFila bg-white hover:border-temario-bordeHover hover:bg-temario-filaHover";

  // Sin lecciones no hay a dónde entrar: se pinta apagado en vez de
  // llevar a una pantalla vacía.
  if (!modulo.destino) {
    return (
      // La fecha ya va en el propio contenido —visible en un tamaño u
      // otro—, así que el lector de pantalla la lee sin duplicarla.
      <li className={`${base} ${aspecto}`} aria-disabled>
        {contenido}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={conFoco(`/curso/${slug}/${modulo.destino}`, foco)}
        className={`${base} ${aspecto} w-full`}
      >
        {contenido}
        <span className="sr-only">
          {hecho
            ? t.repasarElModulo(modulo.numero)
            : esActual
              ? t.continuarElModulo(modulo.numero)
              : t.empezarElModulo(modulo.numero)}
        </span>
      </Link>
    </li>
  );
}
