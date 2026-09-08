"use client";

import { usarIdioma } from "@/components/ProveedorIdioma";

/**
 * EL BOTÓN QUE CAMBIA EL IDIOMA DE TODO.
 *
 * Vive en la cabecera, una sola vez, y desde ahí gobierna la aplicación
 * entera: la navegación, el curso, la ruta, el progreso y los
 * ejercicios. Antes había uno dentro del visor y otro en cada pantalla
 * de cierre, porque solo los ejercicios tenían dos idiomas; ahora que
 * los tiene todo, tres botones para una sola preferencia serían tres
 * sitios donde buscar lo mismo.
 *
 * NOMBRA EL IDIOMA AL QUE LLEVA, no el que está puesto. Un botón que
 * ponga "English" mientras se lee inglés no se sabe si informa o si
 * ofrece.
 *
 * NO DICE "TRADUCIR". Traducir es lo que hace la máquina por dentro; lo
 * que el alumno pide es leerlo en su idioma, y el rótulo nombra eso.
 */
export default function BotonIdioma({ className = "" }: { className?: string }) {
  const { t, alternar } = usarIdioma();

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={t.navegacion.otroIdiomaAria}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-marca-borde bg-white px-3 py-[6px] text-[12.5px] font-semibold text-marca-gris transition-colors hover:bg-marca-niebla hover:text-marca-tinta ${className}`}
    >
      <span aria-hidden>↔</span>
      {t.navegacion.otroIdioma}
    </button>
  );
}
