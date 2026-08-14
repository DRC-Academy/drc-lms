import type { AvisoFormulario } from "@/lib/modos";

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
 * ---------------------------------------------------------------
 * DOS CARAS: LA QUE SE PULSA Y LA QUE SOLO INFORMA
 *
 * Con `url` es una acción: el alumno tiene un formulario esperándole y
 * el botón lo abre. Son 45 de los 136 sin perfil.
 *
 * Sin `url` la tarjeta NO desaparece, se convierte en un aviso: los
 * otros 91 no tienen a dónde ir, pero sí tienen algo que saber —que esto
 * llega por correo y de quién—. Enseñarles el hueco vacío no les cuenta
 * nada; enseñarles un botón que abre una pantalla rota, peor.
 *
 * El texto del aviso lo redacta el servidor (`avisoFormulario()` en
 * `lib/modos.ts`): depende del profesor y de si ya se lo mandaron, y eso
 * aquí no se sabe. Aquí solo se pinta.
 *
 * Y sin botón se cae también el pie: "Un minuto. Desbloquea una tercera
 * práctica" promete algo que ahora mismo el alumno no puede hacer.
 * ---------------------------------------------------------------
 */
export default function TarjetaPerfil({
  url,
  aviso,
}: {
  /** El enlace con su token, o null si no tiene ninguno utilizable. */
  url: string | null;
  /** Qué decirle cuando no hay enlace. */
  aviso: AvisoFormulario;
}) {
  return (
    <section className="rounded-[16px] border-[1.5px] border-dashed border-marca-perfilBorde bg-marca-perfil p-[18px] lg:p-5">
      <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-amarilloTexto lg:text-[11px]">
        Tu perfil
      </span>

      <h2 className="mt-2 text-pretty font-display text-[17px] font-bold leading-[1.2] text-marca-tinta lg:mt-2.5 lg:text-[19px]">
        {url === null ? aviso.titulo : "¿Nos cuentas a qué te dedicas?"}
      </h2>

      <p className="mt-1.5 text-pretty text-[13.5px] leading-[1.45] text-marca-gris lg:mt-[7px] lg:text-[14px]">
        {url === null
          ? aviso.cuerpo
          : "Con eso preparamos también ejercicios con tus situaciones del día a día."}
      </p>

      {url !== null && (
        <>
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
        </>
      )}
    </section>
  );
}
