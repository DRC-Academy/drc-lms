import { PantallaConPanelEsqueleto } from "@/components/esqueleto/Piezas";
import { textosActuales } from "@/lib/idioma-servidor";

/**
 * Lo que se ve mientras carga una lección.
 *
 * LA BARRA DE ICONOS NO ESTÁ AQUÍ: vive en el layout común y sigue a la
 * vista mientras tanto, igual que sus datos. El marco ya no retrasa este
 * esqueleto: sale al pulsar, y lo que tarde el marco en calcularse llega
 * por detrás sin retener nada (`components/marco/MarcoDeLaPagina.tsx`).
 * Hasta noviembre de 2026 era un slot que sí lo retenía: el esqueleto no
 * llegaba a verse.
 *
 * Solo va en gris lo que se está trayendo de la base; los marcos, las
 * separaciones y el ancho de la columna se pintan ya. Las medidas son las
 * de `VistaLeccion` y `PanelCurso`: si no cuadran al píxel, el contenido
 * salta al llegar y el salto se nota más que la espera.
 */
export default function Cargando() {
  return <PantallaConPanelEsqueleto textoLector={textosActuales().curso.cargandoLaLeccion} />;
}
