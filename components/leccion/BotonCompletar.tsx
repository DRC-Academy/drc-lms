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
  foco = null,
}: {
  leccionId: string;
  cursoSlug: string;
  siguienteId: string | null;
  className: string;
  children: ReactNode;
  /**
   * El contexto de revisión, que viaja en el formulario para que la
   * ruta lo devuelva en su redirección. Sin esto, el equipo se cae de
   * la ficha en la primera lección que avanza.
   *
   * NO AUTORIZA NADA: la ruta decide si escribe mirando la cookie, no
   * este campo. Ver `app/api/progreso-leccion`.
   */
  foco?: string | null;
}) {
  return (
    <form action="/api/progreso-leccion" method="post" className="contents">
      <input type="hidden" name="leccionId" value={leccionId} />
      <input type="hidden" name="slug" value={cursoSlug} />
      <input type="hidden" name="siguiente" value={siguienteId ?? ""} />
      <input type="hidden" name="alumno" value={foco ?? ""} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
