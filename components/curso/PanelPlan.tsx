"use client";

import { etiquetaPosicion, type Temario } from "@/lib/temario";
import { usarIdioma } from "@/components/ProveedorIdioma";
import Banner from "@/components/Banner";
import { conFoco } from "@/lib/foco";

/**
 * La franja del plan, arriba del temario.
 *
 * SIN COLUMNA DERECHA, y esa es toda la historia de este archivo. Ahí
 * vivía una rejilla con una casilla por lección —191 cuadritos blancos
 * sobre tinta— agrupada en seis celdas de mes, y para que cupiera la
 * franja tenía que abrir su columna de cifra de los 210px que mide en el
 * resto de la aplicación hasta 520.
 *
 * Lo que costaba: el titular se quedaba con 528px y se partía en tres
 * palabras por línea, el botón —que es el destino de la franja— perdía
 * la mitad de su peso, y la mancha de puntos se llevaba la mirada antes
 * que ninguno de los dos. Era una pantalla dentro de una franja.
 *
 * Lo que la rejilla SÍ hacía bien —enseñar el recorrido de los seis
 * meses y saltar a uno— vive ahora en `LineaProgreso`, justo debajo y en
 * 86px. Y la escala del curso entero la da el banner del diploma, que va
 * después. Aquí queda lo que solo puede decir la franja: qué toca ahora
 * y el botón para seguir.
 *
 * Ya no necesita ser cliente: sin la rejilla no hay nada que pulsar
 * dentro. Se renderiza en el servidor como el resto de banners.
 */
export default function PanelPlan({
  temario,
  slug,
  foco = null,
}: {
  temario: Temario;
  slug: string;
  /** Contexto de revisión. Ver `lib/foco.ts`. */
  foco?: string | null;
}) {
  const { curso: t, banners: tb } = usarIdioma().t;
  const { actual, meses } = temario;

  const titulo = actual
    ? etiquetaPosicion(actual, tb)
    : temario.totalLecciones > 0
      ? t.hasTerminadoElCurso
      : t.todaviaSinContenido;

  // Sin margen arriba: desde que la pantalla no tiene cabecera propia,
  // esta franja es lo primero que hay bajo la barra de navegación.
  return (
    <div>
      <Banner
        eyebrow={t.tuPlanDeMeses(meses.length)}
        title={titulo}
        subtitle={actual?.titulo}
        action={
          actual?.destino
            ? {
                label: t.continuar,
                href: conFoco(`/curso/${slug}/${actual.destino}`, foco),
                srSuffix: actual.titulo,
              }
            : undefined
        }
        secondaryText={
          actual
            ? t.leccionesEnEsteModulo(actual.completadas, actual.totalLecciones)
            : undefined
        }
      />
    </div>
  );
}
