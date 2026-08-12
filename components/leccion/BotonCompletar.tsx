import type { ReactNode } from "react";

/**
 * Marcar la lección y seguir.
 *
 * Un formulario normal contra `/api/progreso-leccion`, que escribe y
 * redirige: sin JavaScript de por medio, la acción principal de la
 * pantalla funciona aunque el bundle no haya cargado todavía.
 *
 * Aparece en dos sitios —la barra de acciones y el cierre de los
 * ejercicios— y por eso vive aquí en vez de repetido en cada uno.
 */
export default function BotonCompletar({
  leccionId,
  cursoSlug,
  siguienteId,
  className,
  children,
}: {
  leccionId: string;
  cursoSlug: string;
  siguienteId: string | null;
  className: string;
  children: ReactNode;
}) {
  return (
    <form action="/api/progreso-leccion" method="post" className="contents">
      <input type="hidden" name="leccionId" value={leccionId} />
      <input type="hidden" name="slug" value={cursoSlug} />
      <input type="hidden" name="siguiente" value={siguienteId ?? ""} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
