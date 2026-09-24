import { notFound } from "next/navigation";

/**
 * LOS BANCOS DE PRUEBAS, SOLO EN DESARROLLO.
 *
 * `/dev/mascota` y `/dev/ruta` son mesas de trabajo: estados forzados,
 * clases falsas y controles que el alumno no tiene por qué ver. Hasta
 * ahora cualquiera con sesión podía abrirlos en producción. Las dos
 * páginas son de cliente, así que el corte va aquí, en un layout de
 * servidor que las cubre a las dos (y a las que se añadan).
 */
export default function LayoutDev({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
