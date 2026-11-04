import { Suspense } from "react";
import { PublicarMarco } from "@/components/marco/DatosDelMarco";
import PopupAlEntrar from "@/components/PopupAlEntrar";
import { datosDelMarco } from "@/lib/navegacion-servidor";
import type { Foco } from "@/lib/sesion-servidor";

/**
 * LOS DATOS DEL MARCO, EN LA RESPUESTA DE CADA PÁGINA.
 *
 * Cada pantalla de `(alumno)` monta esto con el mismo alumno que ha
 * resuelto ella (`alumnoDeLaPagina`), de modo que página y barra hablan
 * siempre de la misma persona. `lib/marco.test.ts` falla si una pantalla
 * nueva se olvida.
 *
 * ANTES ERA UN SLOT (`@marco`), Y COSTABA EL DOBLE. Con dos hojas en el
 * árbol, cada clic lanzaba dos peticiones en serie y cada una renderizaba
 * página y marco enteros: en `/diploma`, una página de 2 ms tardaba 2,5 s
 * en cambiar la pantalla. Ahora hay una sola hoja y una sola petición.
 *
 * EN `<Suspense>`, QUE ES LO QUE HACE QUE EL MARCO NO RETRASE LA PÁGINA.
 * Lo que tarde en calcularse el marco —tres tandas de consultas— no retiene
 * ni el esqueleto ni el contenido: llega por el mismo flujo cuando esté, y
 * mientras tanto la barra sigue con lo que tenía.
 *
 * Al equipo revisando una ficha, también el pop-up de entrada (valorar la
 * clase o el aviso de «Para ti») tal como le saldría a ese alumno, sin
 * guardar nada. Al alumno se lo monta el layout, que solo depende de su
 * cookie.
 */
export default function MarcoDeLaPagina({ alumno }: { alumno: Foco }) {
  return (
    <Suspense fallback={null}>
      <Datos alumno={alumno} />
    </Suspense>
  );
}

async function Datos({ alumno }: { alumno: Foco }) {
  return (
    <>
      <PublicarMarco datos={await datosDelMarco(alumno)} />
      {alumno.revisando && alumno.alumnoId !== "" && (
        <Suspense fallback={null}>
          <PopupAlEntrar alumnoId={alumno.alumnoId} vistaPrevia />
        </Suspense>
      )}
    </>
  );
}
