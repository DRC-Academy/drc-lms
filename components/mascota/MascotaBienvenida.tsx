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
 * 120 px en escritorio y 90 en móvil, CON UNA SOLA INSTANCIA. Geckonoid
 * mide en píxeles, no en CSS, así que el tamaño no puede cambiar con un
 * breakpoint: se pinta a 120 y se escala a 0,75 por debajo de 900. El
 * envoltorio de fuera reserva el sitio escalado, porque `transform` no
 * cambia lo que ocupa. Pintar dos —una por anchura, ocultando la otra—
 * sería el doble de relojes y de animaciones por una que no se ve.
 */
export default function MascotaBienvenida({
  estado = "idle",
  className = "",
}: {
  estado?: EstadoMascota;
  className?: string;
}) {
  return (
    <div className={`h-[90px] w-[70px] min-[900px]:h-[120px] min-[900px]:w-[93px] ${className}`}>
      <div className="origin-top-left scale-75 min-[900px]:scale-100">
        <Geckonoid estado={estado} size={120} volverAIdle={false} etiqueta={null} />
      </div>
    </div>
  );
}
