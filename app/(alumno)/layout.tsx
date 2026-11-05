import { Suspense } from "react";
import type { Viewport } from "next";
import { alumnoDeLaUrl, sesionActual } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { datosDelMarco } from "@/lib/navegacion-servidor";
import { MarcoFijo, PiezasDeLaSesion } from "@/components/Navegacion";
import { ProveedorMarco } from "@/components/leccion/MarcoCurso";
import { ProveedorDatosMarco } from "@/components/marco/DatosDelMarco";
import MarcoDelAlumno from "@/components/marco/MarcoDelAlumno";
import PopupAlEntrar from "@/components/PopupAlEntrar";
import AvisoImpago from "@/components/impago/AvisoImpago";
import { estadoDeAcceso } from "@/lib/estado-acceso";
import { urlActualizarPago } from "@/lib/cuenta-woo";

/**
 * EL LAYOUT COMÚN DEL ALUMNO: la rejilla del marco y lo que solo depende
 * de la sesión.
 *
 * `(alumno)` es un grupo de rutas: no cambia ninguna URL. Cuelgan de él
 * el inicio y el bloque (`/alumno/…`), «Clases», el curso, «Para ti» y
 * «Mi progreso».
 *
 * NEXT NO VUELVE A RENDERIZAR UN LAYOUT AL NAVEGAR entre las páginas que
 * cuelgan de él. Por eso la barra puede vivir aquí sin parpadear, y por eso
 * nada de lo de aquí puede fiarse de seguir valiendo en la pantalla
 * siguiente. Los datos del alumno los trae cada página (`MarcoDeLaPagina`)
 * y `MarcoDelAlumno` los compara con la URL de ahora: ver `lib/marco.ts`.
 *
 * `viewport-fit=cover` es lo que hace que `env(safe-area-inset-bottom)`
 * valga algo en un iPhone: sin él, la barra de pestañas se quedaría
 * debajo de la barra de inicio del sistema.
 */
export const viewport: Viewport = { viewportFit: "cover" };

/**
 * `inert` para React 18, que no conoce el atributo: como cadena pasa tal
 * cual al HTML, y en HTML basta con que esté. (React 19 lo trata como
 * booleano y ahí "" sería false: al actualizar, pasar a `inert`.)
 */
const INERTE = { inert: "" } as Record<string, string>;

/**
 * PAGO PENDIENTE (`lib/estado-acceso.ts`). Si la suscripción del alumno
 * está en espera, la página se pinta igual pero con `inert` —ni clic, ni
 * tabulador, ni lector de pantalla— y encima solo el aviso: sin ayuda,
 * sin recorrido y sin valoración, que no tienen que competir con él. Lo
 * que de verdad cierra la puerta son las rutas y acciones, que rechazan
 * a quien está en espera; esto es lo que el alumno ve.
 *
 * El layout no se vuelve a pintar al navegar, pero con la página inerte
 * no hay navegación: sale de aquí con la recarga de «Ya lo he hecho».
 *
 * La URL de «Actualizar mi pago» se resuelve aquí, en el servidor. Hoy va
 * sin ID de suscripción (→ Perfil de Mi cuenta); cuando la vista de
 * Gestión lo exponga, se lee aquí y se le pasa a `urlActualizarPago`, y
 * el aviso no cambia.
 */
export default async function LayoutAlumno({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  const alumnoPropio = sesion?.rol === "alumno" ? sesion.alumnoId : null;

  if ((await estadoDeAcceso(sesion)) === "impago") {
    const urlPago = urlActualizarPago(null);

    return (
      <>
        <div className="flex min-h-dvh flex-col" {...INERTE}>
          <ProveedorMarco>
            <ProveedorDatosMarco>
              <MarcoFijo piezas={<PiezasConCarcasa alumnoPropio={alumnoPropio} />}>{children}</MarcoFijo>
            </ProveedorDatosMarco>
          </ProveedorMarco>
        </div>
        <AvisoImpago urlPago={urlPago} />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <ProveedorMarco>
        <ProveedorDatosMarco>
          <MarcoFijo piezas={<PiezasConCarcasa alumnoPropio={alumnoPropio} />}>{children}</MarcoFijo>
        </ProveedorDatosMarco>
        <Suspense fallback={null}>
          <DeLaSesion />
        </Suspense>
      </ProveedorMarco>
    </div>
  );
}

/**
 * La barra en la primera carga: su carcasa al instante y sus datos en
 * cuanto estén, sin que nadie los espere. A partir de ahí el layout no
 * vuelve a pintarse y los datos llegan con cada página.
 */
function PiezasConCarcasa({ alumnoPropio }: { alumnoPropio: string | null }) {
  return (
    <Suspense fallback={<MarcoDelAlumno inicial={null} alumnoPropio={alumnoPropio} />}>
      <MarcoInicial alumnoPropio={alumnoPropio} />
    </Suspense>
  );
}

async function MarcoInicial({ alumnoPropio }: { alumnoPropio: string | null }) {
  const alumno = await alumnoDeLaUrl();
  return <MarcoDelAlumno inicial={alumno ? await datosDelMarco(alumno) : null} alumnoPropio={alumnoPropio} />;
}

/**
 * La ayuda y el recorrido, con el nombre de quien ha entrado. El equipo
 * tiene la ayuda, sin nombre, y no el recorrido.
 *
 * Y el pop-up de entrada (valorar la última clase o, si no, el aviso de
 * «Para ti»; ver `PopupAlEntrar`), que es «al entrar»: va aquí, y
 * no en una página, porque el layout no se vuelve a pintar al navegar y
 * así sale en la primera pantalla que se abra, sea cual sea. En su propio
 * `<Suspense>`: lee Gestión y no tiene que esperar nadie por él.
 */
async function DeLaSesion() {
  const sesion = await sesionActual();
  if (!sesion) return null;
  if (sesion.rol !== "alumno") return <PiezasDeLaSesion nombre="" inicioHref={null} />;

  const perfil = await obtenerPerfil(sesion.alumnoId);
  return (
    <>
      <PiezasDeLaSesion nombre={perfil?.nombre.trim() ?? ""} inicioHref={`/alumno/${sesion.alumnoId}`} />
      <Suspense fallback={null}>
        <PopupAlEntrar alumnoId={sesion.alumnoId} />
      </Suspense>
    </>
  );
}
