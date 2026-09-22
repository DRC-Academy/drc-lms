/**
 * Los iconos de las cinco secciones y sus tipos.
 *
 * Viven aparte de `Navegacion.tsx` porque los pintan la barra lateral y
 * las pestañas de abajo, que son componentes de cliente, y la navegación
 * importa cosas de servidor —las cookies del idioma— que un cliente no
 * puede arrastrar.
 */

export type SeccionActiva = "inicio" | "curso" | "clases" | "practica" | "progreso";

export type EnlaceSeccion = {
  clave: SeccionActiva;
  texto: string;
  /** La etiqueta de la barra de pestañas de móvil, donde `texto` no cabe. */
  corto: string;
  href: string;
};

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
      {/* Clases: un calendario. Es el único icono de los cinco que tiene
          que decir "cuándo", y a 18 píxeles el calendario es la forma
          que nadie confunde: la cabecera con las dos anillas se lee
          incluso rellena de verde. */}
      {seccion === "clases" && (
        <>
          <rect x="2.6" y="3.9" width="12.8" height="11.2" rx="1.6" stroke={trazo} fill={relleno} />
          <path d="M2.6 7.3h12.8" stroke={activo ? "#FFFFFF" : trazo} />
          <path d="M6.2 2.5v2.4M11.8 2.5v2.4" stroke={trazo} />
        </>
      )}
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

/**
 * La sección en la que está una ruta, para marcarla en la navegación.
 *
 * SE DEDUCE DE LA RUTA Y NO SE PASA DESDE LA PÁGINA porque la navegación
 * vive en el layout común (`app/(alumno)/layout.tsx`), y un layout no se
 * vuelve a renderizar al pasar de una página a otra: si la sección le
 * llegara del servidor, se quedaría marcada la primera.
 *
 * El bloque de práctica (`/alumno/<id>/<bloque>`) es «Para ti»: se abre
 * desde allí y es de allí.
 */
export function seccionDeRuta(ruta: string): SeccionActiva | undefined {
  if (ruta.startsWith("/clases")) return "clases";
  if (ruta.startsWith("/curso/")) return "curso";
  if (ruta.startsWith("/practica")) return "practica";
  if (ruta.startsWith("/progreso")) return "progreso";
  const alumno = ruta.match(/^\/alumno\/[^/]+(\/[^/]+)?\/?$/);
  if (alumno) return alumno[1] ? "practica" : "inicio";
  return undefined;
}

/**
 * Qué panel lateral tiene la pantalla, si tiene uno: el del curso en una
 * lección y el de las fases en un bloque. Entre 768 y 1200px ese panel
 * no cabe al lado del texto y lo abre un icono de la barra.
 */
export function panelDeRuta(ruta: string): "curso" | "practica" | null {
  if (/^\/curso\/[^/]+\/[^/]+/.test(ruta)) return "curso";
  if (/^\/alumno\/[^/]+\/[^/]+/.test(ruta)) return "practica";
  return null;
}
