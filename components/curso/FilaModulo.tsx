import Link from "next/link";
import type { ModuloTemario } from "@/lib/temario";

/**
 * Un módulo dentro de su semana.
 *
 * Dos formas en el mismo componente: en escritorio va todo en una línea
 * —código, título, contador— y en móvil se apila en tres, con el check a
 * la izquierda. El corte es el mismo que el del resto de la pantalla.
 *
 * El módulo en curso se distingue por fondo crema y borde discontinuo,
 * no por color de texto: tiene que reconocerse de un vistazo al abrir el
 * mes, sin leer nada.
 */
export default function FilaModulo({
  modulo,
  slug,
}: {
  modulo: ModuloTemario;
  slug: string;
}) {
  const { esActual, hecho, totalLecciones, completadas } = modulo;

  const meta = `${totalLecciones} ${totalLecciones === 1 ? "lección" : "lecciones"} · ${completadas} ${
    completadas === 1 ? "hecha" : "hechas"
  }`;

  const contenido = (
    <>
      {/* Punto ámbar en el actual; check redondo en el resto. Ocupan lo
          mismo para que las filas no se desalineen entre sí. */}
      {esActual ? (
        <span
          aria-hidden
          className="mt-[3px] block h-[7px] w-[7px] shrink-0 rounded-full bg-temario-ambar min-[900px]:mt-0"
        />
      ) : hecho ? (
        <span
          aria-hidden
          className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-temario-tinte text-[10px] font-extrabold text-temario-verdeTexto min-[900px]:mt-0"
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
            esActual ? "text-temario-ambarTexto" : "text-temario-tenue"
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

        <span className="mt-[5px] block text-[11.5px] font-medium text-temario-medio min-[900px]:mt-0 min-[900px]:whitespace-nowrap min-[900px]:text-[12.5px]">
          {meta}
        </span>
      </div>

      {esActual ? (
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

  const aspecto = esActual
    ? "border border-dashed border-temario-cremaBorde bg-temario-crema"
    : "border border-temario-bordeFila bg-white hover:border-temario-bordeHover hover:bg-temario-filaHover";

  // Sin lecciones no hay a dónde entrar: se pinta apagado en vez de
  // llevar a una pantalla vacía.
  if (!modulo.destino) {
    return (
      <li className={`${base} ${aspecto} opacity-60`}>
        {contenido}
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
