"use client";

import BotonIdioma from "@/components/BotonIdioma";

/**
 * EL IDIOMA, SIEMPRE A LA VISTA, arriba a la derecha de cada pantalla.
 *
 * Vivía dentro del perfil —el avatar al pie de la barra, la última
 * pestaña en móvil— y costaba encontrarlo: es lo primero que busca quien
 * no entiende la pantalla, y justo por eso no puede estar detrás de un
 * menú.
 *
 * ES UNA FILA, NO UN BOTÓN FLOTANTE. El curso, el progreso y la ruta de
 * «Para ti» empiezan pegados arriba y a todo lo ancho: un botón encima
 * les taparía algo. La fila se lleva su alto y la pantalla empieza debajo.
 *
 * DONDE YA HAY ESQUINA, NO SE PINTA. La lección y el bloque
 * (`PantallaConPanel`, marcada con `data-esquina-idioma`) tienen su
 * propia fila arriba —la salida, dónde estás y el idioma— y dos botones
 * iguales serían ruido. Lo decide el CSS con `:has()` (`globals.css`) y
 * no la ruta: así vale también mientras la lección carga. Las medidas de
 * aquí copian las de esa esquina, para que el botón no cambie de sitio
 * al entrar en una lección.
 */
export default function CabeceraIdioma() {
  return (
    <div className="cabecera-idioma flex justify-end px-3.5 pt-3 min-[900px]:px-6 min-[900px]:pt-5 min-[1200px]:px-10">
      <BotonIdioma />
    </div>
  );
}

/**
 * La misma esquina en las pantallas que no tienen marco —la entrada, la
 * baja de los avisos—: ahí todo va centrado y no hay nada que tapar, así
 * que puede ir fija.
 */
export function IdiomaEnEsquina() {
  return (
    <div className="fixed right-3.5 top-3 z-10 min-[900px]:right-6 min-[900px]:top-5">
      <BotonIdioma />
    </div>
  );
}
