/**
 * La invitación a completar el perfil.
 *
 * Sube del final de la página a la columna de la derecha, a la altura
 * del banner, porque es una de las acciones de más valor: desbloquea la
 * tercera tarjeta de práctica, la que usa la vida real del alumno.
 *
 * Presencia sin gritar. Es la única superficie con borde discontinuo de
 * toda la pantalla: eso basta para que se note que está pendiente, sin
 * un color de alarma ni un candado.
 *
 * El formulario vive en Gestión —el LMS no escribe en esa base—, así que
 * esto es un enlace externo y no una ruta de la aplicación.
 *
 * `url` LLEGA HECHA Y NUNCA ES NULL. Quien decide si hay enlace es la
 * página, en el servidor, y si no lo hay no llega a montar esta tarjeta:
 * sin el botón no queda nada que enseñar, solo una promesa sin puerta.
 */
export default function TarjetaPerfil({ url }: { url: string }) {
  return (
    <section className="rounded-[16px] border-[1.5px] border-dashed border-marca-perfilBorde bg-marca-perfil p-[18px] lg:p-5">
      <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-amarilloTexto lg:text-[11px]">
        Tu perfil
      </span>

      <h2 className="mt-2 text-pretty font-display text-[17px] font-bold leading-[1.2] text-marca-tinta lg:mt-2.5 lg:text-[19px]">
        ¿Nos cuentas a qué te dedicas?
      </h2>

      <p className="mt-1.5 text-pretty text-[13.5px] leading-[1.45] text-marca-gris lg:mt-[7px] lg:text-[14px]">
        Con eso preparamos también ejercicios con tus situaciones del día a día.
      </p>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block rounded-full border-[1.5px] border-marca-verde px-[18px] py-3 text-center text-[14.5px] font-semibold text-marca-verdeOsc transition-colors hover:bg-marca-verde hover:text-white lg:mt-3.5 lg:inline-block lg:py-[9px] lg:text-[14px]"
      >
        Completar mi perfil
      </a>

      {/* En móvil la tarjeta va al final de todo y esta línea sobra: ya
          se ha visto la práctica que hay, no hay nada que anticipar. */}
      <p className="mt-3 hidden text-[12.5px] text-marca-grisTenue lg:block">
        Un minuto. Desbloquea una tercera práctica.
      </p>
    </section>
  );
}
