import { Suspense } from "react";
import type { Viewport } from "next";
import { sesionActual } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { MarcoFijo, PiezasDeLaSesion } from "@/components/Navegacion";
import { ProveedorMarco } from "@/components/leccion/MarcoCurso";

/**
 * EL LAYOUT COMÚN DEL ALUMNO: la rejilla del marco y lo que solo depende
 * de la sesión.
 *
 * `(alumno)` es un grupo de rutas: no cambia ninguna URL. Cuelgan de él
 * el inicio y el bloque (`/alumno/…`), «Clases», el curso, «Para ti» y
 * «Mi progreso».
 *
 * AQUÍ NO VA NADA DEL ALUMNO. Next no vuelve a renderizar un layout al
 * navegar entre las páginas que cuelgan de él, así que todo lo que
 * dependa de qué ficha se está mirando —la tira de revisión, la barra con
 * «Cómo vas», el perfil— va en el slot `@marco`, que sí se renderiza con
 * cada URL. Aquí solo queda lo que depende de la cookie, que no cambia
 * sin una carga completa: la ayuda y el recorrido guiado, que tienen que
 * sobrevivir a la navegación.
 *
 * `viewport-fit=cover` es lo que hace que `env(safe-area-inset-bottom)`
 * valga algo en un iPhone: sin él, la barra de pestañas se quedaría
 * debajo de la barra de inicio del sistema.
 */
export const viewport: Viewport = { viewportFit: "cover" };

export default function LayoutAlumno({ children, marco }: { children: React.ReactNode; marco: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <ProveedorMarco>
        <MarcoFijo piezas={marco}>{children}</MarcoFijo>
        <Suspense fallback={null}>
          <DeLaSesion />
        </Suspense>
      </ProveedorMarco>
    </div>
  );
}

/**
 * La ayuda y el recorrido, con el nombre de quien ha entrado. El equipo
 * tiene la ayuda, sin nombre, y no el recorrido.
 */
async function DeLaSesion() {
  const sesion = await sesionActual();
  if (!sesion) return null;
  if (sesion.rol !== "alumno") return <PiezasDeLaSesion nombre="" inicioHref={null} />;

  const perfil = await obtenerPerfil(sesion.alumnoId);
  return <PiezasDeLaSesion nombre={perfil?.nombre.trim() ?? ""} inicioHref={`/alumno/${sesion.alumnoId}`} />;
}
