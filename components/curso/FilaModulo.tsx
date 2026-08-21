import Link from "next/link";
import type { ModuloTemario } from "@/lib/temario";
import { textoDeEspera } from "@/lib/drip";

/**
 * Un módulo dentro de su semana.
 *
 * Dos formas en el mismo componente: en escritorio va todo en una línea
 * —código, título, contador— y en móvil se apila en tres, con el check a
 * la izquierda. El corte es el mismo que el del resto de la pantalla.
 *
 * EL MÓDULO EN CURSO LLEVA BORDE VERDE, y es lo único de la lista que
 * lo lleva. Antes era fondo crema con borde discontinuo y punto ámbar:
 * un tercer color para decir «estás aquí» cuando el verde ya significa
 * exactamente eso en toda la aplicación —es el color del botón que lleva
 * a esta misma fila—. Ahora el borde, el punto, el número y el
 * «Continuar →» son la misma cosa y el mismo verde.
 *
 * LO YA HECHO VA EN GRIS. Misma fila, sin blanco de tarjeta y sin check
 * verde: se lee como archivo, no como tarea. Y no se pinta aquí en
 * medio, sino dentro del desplegable de completados que monta
 * `Temario`.
 */
export default function FilaModulo({
  modulo,
  slug,
}: {
  modulo: ModuloTemario;
  slug: string;
}) {
  const { esActual, hecho, totalLecciones, completadas, disponible } = modulo;

  const meta = `${totalLecciones} ${totalLecciones === 1 ? "lección" : "lecciones"} · ${completadas} ${
    completadas === 1 ? "hecha" : "hechas"
  }`;

  const contenido = (
    <>
      {/* Punto ámbar en el actual; check redondo en el resto. Ocupan lo
          mismo para que las filas no se desalineen entre sí. */}
      {!disponible ? (
        // Círculo hueco y apagado: ni hecho ni por hacer todavía. Es el
        // mismo peso visual que los demás para que la fila no se hunda.
        <span
          aria-hidden
          className="mt-[1px] block h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-dashed border-temario-circulo min-[900px]:mt-0"
        />
      ) : esActual ? (
        <span
          aria-hidden
          className="mt-[3px] block h-[7px] w-[7px] shrink-0 rounded-full bg-temario-verde min-[900px]:mt-0"
        />
      ) : hecho ? (
        <span
          aria-hidden
          className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-temario-circulo text-[10px] font-extrabold text-white min-[900px]:mt-0"
        >
          ✓
        </span>
      ) : (
        <span
          aria-hidden
          className="mt-[1px] block h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-temario-circulo min-[900px]:mt-0"
        />
      )}

      <div className="min-w-0 flex-1 min-[900px]:flex min-[900px]:items-center min-[900px]:gap-4">
        <span
          className={`block text-[12px] font-extrabold leading-none min-[900px]:w-[78px] min-[900px]:shrink-0 ${
            esActual ? "text-temario-verdeTexto" : "text-temario-tenue"
          }`}
        >
          MÓDULO {modulo.numero}
        </span>

        <span
          className={`mt-1 block text-pretty text-[14px] leading-[1.3] min-[900px]:mt-0 min-[900px]:flex-1 min-[900px]:text-[15.5px] ${
            esActual ? "font-bold" : "font-semibold"
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
      </div>

      {!disponible ? (
        <span className="mt-[2px] shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-temario-suave min-[900px]:mt-0">
          {textoDeEspera(modulo.diasParaAbrir ?? 1)}
        </span>
      ) : esActual ? (
        <span className="mt-[2px] shrink-0 whitespace-nowrap text-[13px] font-bold text-temario-verdeTexto min-[900px]:mt-0">
          Continuar →
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
    ? // Se ve, con su título y su sitio, pero no invita a pulsar: sin
      // hover, sin blanco de tarjeta. Lo que retiene es saber que está
      // ahí y cuándo llega, no que se pueda tocar.
      "border border-temario-borde bg-temario-rail/50 text-temario-suave"
    : esActual
      ? "border-[1.5px] border-temario-verde bg-white"
      : hecho
        ? // En gris y sin blanco: sigue siendo un enlace —se repasa
          // desde aquí— pero no compite con lo que queda por hacer.
          "border border-temario-bordeFila bg-temario-rail/40 text-temario-suave hover:border-temario-bordeHover"
        : "border border-temario-bordeFila bg-white hover:border-temario-bordeHover hover:bg-temario-filaHover";

  // Sin lecciones no hay a dónde entrar: se pinta apagado en vez de
  // llevar a una pantalla vacía.
  if (!modulo.destino) {
    return (
      <li className={`${base} ${aspecto}`} aria-disabled>
        {contenido}
        {!disponible && (
          <span className="sr-only">
            Se abre en {modulo.diasParaAbrir} días
          </span>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link href={`/curso/${slug}/${modulo.destino}`} className={`${base} ${aspecto} w-full`}>
        {contenido}
        <span className="sr-only">
          {hecho ? "Repasar" : esActual ? "Continuar" : "Empezar"} el módulo {modulo.numero}
        </span>
      </Link>
    </li>
  );
}
