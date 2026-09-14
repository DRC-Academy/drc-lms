/**
 * Los iconos de las cuatro secciones y sus tipos.
 *
 * Viven aparte de `Cabecera.tsx` porque los pinta también la barra de
 * iconos de la lección, que es un componente de cliente, y la cabecera
 * importa cosas de servidor —las cookies del idioma— que un cliente no
 * puede arrastrar.
 */

export type SeccionActiva = "inicio" | "curso" | "practica" | "progreso";

export type EnlaceSeccion = { clave: SeccionActiva; texto: string; href: string };

export function Icono({
  seccion,
  activo,
  className = "h-[18px] w-[18px]",
}: {
  seccion: SeccionActiva;
  activo: boolean;
  className?: string;
}) {
  // Relleno verde cuando es la sección actual; contorno gris cuando no.
  const trazo = activo ? "#1E9E3A" : "#B7C4BC";
  const relleno = activo ? "#1E9E3A" : "none";

  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className={className}
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {seccion === "inicio" && (
        <path d="M2.5 7.2 9 2.2l6.5 5v7.3a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V7.2Z" stroke={trazo} fill={relleno} />
      )}
      {seccion === "curso" && (
        <path d="M2.5 3.6h4.2c1.3 0 2.3 1 2.3 2.2v8.6c0-1-.9-1.8-2-1.8H2.5V3.6Zm13 0h-4.2c-1.3 0-2.3 1-2.3 2.2v8.6c0-1 .9-1.8 2-1.8h4.5V3.6Z" stroke={trazo} fill={relleno} />
      )}
      {seccion === "practica" && (
        <>
          <circle cx="9" cy="9" r="6.5" stroke={trazo} fill={relleno} />
          <path d="M9 5.6v3.6l2.3 1.4" stroke={activo ? "#FFFFFF" : trazo} />
        </>
      )}
      {/* Progreso: tres barras que suben. Es la escalera de la pantalla
          reducida a lo que se distingue en 18 píxeles. Con trazo grueso y
          sin relleno, porque tres rectángulos rellenos a este tamaño se
          leen como un bloque macizo y no como una progresión. */}
      {seccion === "progreso" && (
        <>
          <path d="M3.4 14.6v-3.1" stroke={trazo} strokeWidth="2.2" />
          <path d="M9 14.6V7.8" stroke={trazo} strokeWidth="2.2" />
          <path d="M14.6 14.6V4.3" stroke={trazo} strokeWidth="2.2" />
        </>
      )}
    </svg>
  );
}
