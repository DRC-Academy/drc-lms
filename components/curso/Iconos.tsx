/**
 * Los dos únicos iconos del temario, dibujados aquí para no depender de
 * ninguna librería: el check de lo hecho y el candado de lo que viene
 * después. Los dos van en trazo, sin relleno, y heredan el color del
 * texto que los rodea (`currentColor`), así que quien los pinta decide
 * el tono con una clase y no con un prop.
 *
 * EL CANDADO ES FINO Y NUNCA ROJO. No dice «prohibido»: dice «todavía
 * no», y la fecha que va a su lado dice cuándo. Un candado grueso o de
 * color de aviso leería lo contrario de lo que quiere el curso, que se
 * abre solo, semana a semana.
 */
export function IconoCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function IconoCandado({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="7" width="10" height="7" rx="2" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
