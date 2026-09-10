/**
 * La flecha de las filas que se pulsan en móvil.
 *
 * Solo sale en móvil, y por eso es el único SVG del panel: en escritorio
 * las métricas ya dicen que se pulsan con el hover y con la fila
 * seleccionada, y en el teléfono no hay ni una cosa ni la otra. Apunta
 * a la derecha en lo que ABRE una lista y a la izquierda en la barra
 * que VUELVE de ella; es la misma forma girada, para que se lean como
 * las dos mitades del mismo gesto.
 *
 * Es distinta de la «→» de las filas de alumno a propósito: aquella
 * lleva a otra pantalla —la ficha—, esta baja un nivel dentro de la
 * misma.
 */
export default function Chevron({
  direccion = "derecha",
  className = "",
}: {
  direccion?: "derecha" | "izquierda";
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width={direccion === "izquierda" ? 18 : 14}
      height={direccion === "izquierda" ? 18 : 14}
      className={className}
    >
      <path
        d={direccion === "izquierda" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth={direccion === "izquierda" ? 1.8 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
