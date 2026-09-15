"use client";

import { etiquetaPosicion, type Temario } from "@/lib/temario";
import { usarIdioma } from "@/components/ProveedorIdioma";
import Banner from "@/components/Banner";
import { conFoco } from "@/lib/foco";
import { textoDeEspera } from "@/lib/drip";

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
  const { actual, meses, espera } = temario;

  // ---------------------------------------------------------------
  // SIN ACTUAL HAY DOS ESTADOS, NO UNO
  //
  // Esto decía «Has terminado el curso» siempre que no había módulo
  // actual, y desde que el actual se elige solo entre los abiertos eso
  // le pasaba también al alumno que ha hecho todo lo que tiene abierto y
  // espera al siguiente: le mandaban aquí desde el inicio —«Ver mi
  // curso»— y aquí leía que había terminado en el mes 2.
  //
  // Lo separa el recuento, igual que en el banner del inicio, y se dice
  // con las MISMAS tres frases que allí: «Estás al día», «Has hecho todo
  // lo que tienes abierto» y cuándo se abre lo siguiente. Sin botón,
  // porque no hay lección a la que ir; la fecha es la respuesta.
  // ---------------------------------------------------------------
  const terminado = temario.totalLecciones > 0 && temario.completadas >= temario.totalLecciones;
  const esperando = actual === null && !terminado && temario.totalLecciones > 0;

  const titulo = actual
    ? etiquetaPosicion(actual, tb)
    : esperando
      ? tb.todoLoAbierto
      : temario.totalLecciones > 0
        ? t.hasTerminadoElCurso
        : t.todaviaSinContenido;

  // Sin margen arriba: desde que la pantalla no tiene cabecera propia,
  // esta franja es lo primero que hay bajo la barra de navegación.
  return (
    <div>
      <Banner
        eyebrow={esperando ? tb.estasAlDia : t.tuPlanDeMeses(meses.length)}
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
            : esperando && espera
              ? textoDeEspera(espera.diasParaAbrir, espera.abreEl, tb)
              : undefined
        }
      />
    </div>
  );
}
