"use client";

import type { Textos } from "@/lib/textos-ejercicios";

/**
 * EL BOTÓN QUE CAMBIA DE IDIOMA.
 *
 * Sale en dos sitios y por eso vive aquí: arriba del ejercicio, en la
 * fila de la salida, y otra vez en la pantalla de cierre. El segundo no
 * es un adorno — el cierre es la única pantalla del recorrido a la que
 * se llega sin poder volver atrás sin repetir el bloque, así que sin él
 * el alumno que termina en el idioma equivocado se queda encerrado.
 *
 * NOMBRA EL IDIOMA AL QUE LLEVA, no el que está puesto, por lo mismo que
 * la salida nombra su destino: un botón que ponga "English" mientras se
 * lee inglés no se sabe si informa o si ofrece.
 *
 * NO SE DESACTIVA MIENTRAS TRADUCE. El mueble ya ha cambiado —sus dos
 * idiomas están en el código— así que el botón sí ha hecho algo, y
 * volver atrás tiene que seguir siendo posible mientras el contenido
 * viene de camino. Lo único que cambia es que lo dice.
 */
export default function BotonIdioma({
  t,
  traduccion,
  alPulsar,
  className = "",
}: {
  t: Textos;
  /** Cómo va la traducción del contenido. Ausente donde no hay que traducir nada. */
  traduccion?: { pidiendo: boolean; fallo: boolean };
  alPulsar: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={t.otroIdiomaAria}
      aria-busy={traduccion?.pidiendo || undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-marca-borde bg-white px-3.5 py-[7px] text-[13px] font-semibold text-marca-gris transition-colors hover:bg-marca-niebla hover:text-marca-tinta min-[1100px]:text-[13.5px] ${className}`}
    >
      <span aria-hidden className={traduccion?.pidiendo ? "gira" : undefined}>
        {traduccion?.pidiendo ? "◌" : "↔"}
      </span>
      {traduccion?.pidiendo ? t.traduciendo : t.otroIdioma}
    </button>
  );
}
