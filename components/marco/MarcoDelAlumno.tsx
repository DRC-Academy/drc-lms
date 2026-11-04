"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { usarDatosPublicados } from "@/components/marco/DatosDelMarco";
import { PiezasDelMarco, type DatosNavegacion } from "@/components/marco/PiezasDelMarco";
import { focoDeLaUrl } from "@/lib/foco";
import { alumnoEsperado, datosQueSirven } from "@/lib/marco";

/**
 * LA BARRA DE LAS PANTALLAS DEL ALUMNO, montada una vez en el layout.
 *
 * Como el layout no se vuelve a pedir al navegar, la barra se queda quieta
 * entre pantallas y no hay una petición aparte para ella: los datos llegan
 * con cada página (`MarcoDeLaPagina`).
 *
 * LO QUE SE PINTA LO DECIDE LA URL DE AHORA (`lib/marco.ts`), en cada
 * render. Mientras la página nueva llega, siguen a la vista los datos de la
 * anterior SOLO si son del mismo alumno. Si el equipo cambia de ficha no
 * lo son: la carcasa, sin nombre ni cifras, hasta que publique la nueva.
 *
 * `inicial` es lo que resolvió el layout en la primera carga. Next puede
 * reutilizar ese layout más tarde con otra ficha en la URL, así que pasa
 * por la misma comprobación que todo lo demás.
 */
export default function MarcoDelAlumno({
  inicial,
  alumnoPropio,
}: {
  inicial: DatosNavegacion | null;
  /** Con rol de alumno, su id: la URL no cambia de quién habla. Null para el equipo. */
  alumnoPropio: string | null;
}) {
  const foco = focoDeLaUrl(usePathname() ?? "/", useSearchParams());
  const publicados = usarDatosPublicados();

  const esperado = alumnoEsperado(alumnoPropio, foco);
  const datos = datosQueSirven(esperado, publicados, inicial);
  if (datos) return <PiezasDelMarco datos={datos} />;

  const revisando = alumnoPropio === null && esperado !== "";
  return (
    <PiezasDelMarco
      cargando
      datos={{ alumnoId: esperado, nombre: "", miCurso: null, foco: revisando ? esperado : null, revisando, estadisticas: null }}
    />
  );
}
