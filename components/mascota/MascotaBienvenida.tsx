"use client";

import AnclaMascota from "@/components/mascota/AnclaMascota";
import type { EstadoMascota } from "@/components/mascota/estados";

/**
 * EL SITIO DE LA MASCOTA DE BIENVENIDA: la que recibe al alumno en el
 * inicio —en la franja del curso o de la clase— o, si no tiene curso y
 * esa franja no se pinta, en la cabecera de «Para ti».
 *
 * No pinta la mascota: es un ancla (ver AnclaMascota). La mascota es
 * una sola para toda la app y la pone aquí CapaMascota cuando esta es
 * el ancla que manda. Con el curso terminado lleva el diploma en la mano
 * (`nivel_superado`) y no lo suelta: al llegar da su salto con estrellas
 * y se queda así, que es lo único que el producto celebra.
 *
 * Los tamaños son los que ya tenía la maqueta, por breakpoint:
 *   franja   200 desde 1200, 150 entre 900 y 1199 (ahí la franja
 *            comparte fila con la tarjeta de 416px), 90 en móvil,
 *            encima del texto.
 *   saludo   la de «Para ti»: 120 en escritorio, 84 en móvil (0,7).
 */
const SITIOS = {
  franja: "h-[90px] w-[70px] min-[900px]:h-[150px] min-[900px]:w-[117px] min-[1200px]:h-[200px] min-[1200px]:w-[155px]",
  saludo: "h-[84px] w-[65px] min-[900px]:h-[120px] min-[900px]:w-[93px]",
} as const;

export default function MascotaBienvenida({
  id,
  prioridad,
  estado = "idle",
  variante = "saludo",
  escena,
  className = "",
}: {
  /** El id del ancla: único entre las montadas a la vez. */
  id: string;
  prioridad: number;
  estado?: EstadoMascota;
  variante?: keyof typeof SITIOS;
  /** «inicio»: al posarse aquí la primera vez en la sesión, saluda y dice por dónde seguir. */
  escena?: "inicio";
  className?: string;
}) {
  return <AnclaMascota id={id} prioridad={prioridad} estado={estado} escena={escena} className={`${SITIOS[variante]} ${className}`} />;
}
