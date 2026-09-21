import Geckonoid, { type EstadoMascota } from "@/components/mascota/Geckonoid";

/**
 * LA MASCOTA DE BIENVENIDA: la que recibe al alumno en el inicio —en la
 * franja de «Continúa donde lo dejaste»— o, si no tiene curso y esa
 * franja no se pinta, en la cabecera de «Para ti».
 *
 * Idle: respira, parpadea, hace sus micro-gestos y sigue el cursor.
 * Con el curso terminado lleva el diploma en la mano
 * (`nivel_superado`) y no lo suelta: al entrar da su salto con
 * estrellas y se queda así, que es lo único que el producto celebra.
 *
 * DOS TAMAÑOS Y UNA SOLA INSTANCIA. Geckonoid mide en píxeles, no en
 * CSS, así que el tamaño no puede cambiar con un breakpoint: se pinta al
 * alto mayor y se escala por debajo. El envoltorio de fuera reserva el
 * sitio escalado, porque `transform` no cambia lo que ocupa. Pintar dos
 * —una por anchura, ocultando la otra— sería el doble de relojes y de
 * animaciones por una que no se ve.
 *
 *   franja   la del inicio: 200 desde 1200, 150 entre 900 y 1199 (ahí
 *            la franja comparte fila con la tarjeta de 416px), 90 en
 *            móvil, encima del texto.
 *   saludo   la de «Para ti»: 120 en escritorio, 90 en móvil.
 */
const VARIANTES = {
  franja: {
    size: 200,
    sitio: "h-[90px] w-[70px] min-[900px]:h-[150px] min-[900px]:w-[117px] min-[1200px]:h-[200px] min-[1200px]:w-[155px]",
    escala: "scale-[0.45] min-[900px]:scale-75 min-[1200px]:scale-100",
  },
  saludo: {
    size: 120,
    sitio: "h-[90px] w-[70px] min-[900px]:h-[120px] min-[900px]:w-[93px]",
    escala: "scale-75 min-[900px]:scale-100",
  },
} as const;

export default function MascotaBienvenida({
  estado = "idle",
  variante = "saludo",
  className = "",
}: {
  estado?: EstadoMascota;
  variante?: keyof typeof VARIANTES;
  className?: string;
}) {
  const v = VARIANTES[variante];
  return (
    <div className={`${v.sitio} ${className}`}>
      <div className={`origin-top-left ${v.escala}`}>
        <Geckonoid estado={estado} size={v.size} volverAIdle={false} etiqueta={null} />
      </div>
    </div>
  );
}
