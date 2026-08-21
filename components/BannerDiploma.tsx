import { textoDiploma, type EstadoDiploma } from "@/lib/diploma";

/**
 * EL DIPLOMA, EN SU PROPIO BANNER.
 *
 * Va entre el saludo y la rejilla, a lo ancho: es lo primero que se ve
 * al entrar. Lo tuvo dentro de la franja del curso —como su cifra
 * grande— y ahí se leía como un dato más del curso; el sitio no era el
 * problema, era compartir caja.
 *
 * UNA SOLA LÍNEA DE TEXTO: "12 lecciones para tu diploma". Tuvo cuatro
 * —la etiqueta con el nombre del curso, la cifra, el pie con el avance y
 * la nota del lateral— y las tres que sobraban no añadían ningún dato:
 * el avance ya lo enseña la barra, el curso lo dice la franja de debajo
 * y la regla de emisión no cambia nada de lo que el alumno hace hoy. La
 * redacción de lo que queda vive en `lib/diploma.ts`.
 *
 * PERGAMINO Y NO OTRA FRANJA. La superficie crema con doble filete es la
 * única de ese color en la pantalla, así que se separa sola de la franja
 * en tinta y de las tarjetas blancas. Se probó también en tinta —más
 * contundente— y deja dos bandas oscuras seguidas: la tinta dejaría de
 * significar «la pieza principal» y el ámbar pasaría de acento a
 * superficie, que es justo la excepción que se quitó de la aplicación al
 * pasar la franja a tinta.
 *
 * NI UN BOTÓN. El verde de acción es de la franja y de la práctica, y un
 * tercer botón aquí daría una pantalla con tres llamadas discutiendo.
 * Cuando exista la descarga del diploma, este es su sitio: entonces
 * habrá algo que pulsar y será lo único que se pueda pulsar aquí.
 *
 * DOS ANCHOS, UN SOLO ORDEN. En móvil el icono y la cifra van en una
 * fila y la barra debajo, a ancho completo; a partir de `min-[900px]`
 * los tres se ponen en línea. Nada cambia de sitio entre los dos: se
 * estira.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerDiploma({ estado }: { estado: EstadoDiploma }) {
  const texto = textoDiploma(estado);
  if (texto === null) return null;

  const conseguido = estado.estado === "conseguido";

  // Solo para el lector de pantalla: la barra sin narrar es un
  // porcentaje suelto, y el número de al lado no dice de cuántas.
  const descripcion = conseguido
    ? "Curso completado"
    : `Te ${texto.cifra === 1 ? "falta" : "faltan"} ${texto.cifra} de ${
        estado.estado === "en-curso" ? estado.total : 0
      } lecciones para tu diploma`;

  return (
    <section
      aria-label="Tu diploma"
      className={`rounded-[16px] px-[18px] py-[18px] min-[900px]:px-7 min-[900px]:py-[22px] ${
        conseguido
          ? "border border-marca-verde bg-marca-verdeFondo shadow-[inset_0_0_0_3px_#F0FAF2,inset_0_0_0_4px_#A9DFB7] min-[900px]:shadow-[inset_0_0_0_4px_#F0FAF2,inset_0_0_0_5px_#A9DFB7]"
          : "border border-marca-perfilBorde bg-marca-perfil shadow-[inset_0_0_0_3px_#FFFDF5,inset_0_0_0_4px_#EFE3C0] min-[900px]:shadow-[inset_0_0_0_4px_#FFFDF5,inset_0_0_0_5px_#EFE3C0]"
      }`}
    >
      <div className="flex flex-col gap-3.5 min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-[26px]">
        {/* ----------------------- ICONO Y CIFRA -----------------------
            Juntos en la misma fila también en móvil: el icono solo no
            dice nada y la cifra sola no dice de qué. */}
        <div className="flex items-center gap-3.5 min-[900px]:contents">
          <IconoDiploma conseguido={conseguido} />

          {texto.cifra === null ? (
            <p className="min-w-0 flex-1 font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.02em] text-marca-tinta min-[900px]:flex-none min-[900px]:text-[32px]">
              {texto.unidad}
            </p>
          ) : (
            <p className="flex min-w-0 flex-1 items-baseline gap-2 min-[900px]:flex-none min-[900px]:gap-2.5">
              <span className="font-display text-[32px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-marca-tinta min-[900px]:text-[42px]">
                {texto.cifra}
              </span>
              <span className="text-pretty text-[14px] font-semibold leading-[1.25] text-marca-tintaMedia min-[900px]:text-[17px]">
                {texto.unidad}
              </span>
            </p>
          )}
        </div>

        {/* La barra se lleva lo que sobre: a ancho completo en móvil,
            y en escritorio todo lo que quede a la derecha de la cifra.
            No lleva pie —el porcentaje no se escribe— porque la
            distancia se ve mejor de lo que se lee. */}
        {!conseguido && (
          <div className="min-[900px]:flex-1">
            <Barra relleno={texto.relleno} descripcion={descripcion} />
          </div>
        )}
      </div>
    </section>
  );
}

/** La barra del curso entero. El porcentaje solo se ve, no se escribe. */
function Barra({ relleno, descripcion }: { relleno: number; descripcion: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={relleno}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={descripcion}
      className="h-[7px] overflow-hidden rounded-[4px] bg-marca-calidoBadge min-[900px]:h-2"
    >
      <div
        className="h-full rounded-[4px] bg-marca-verde transition-[width] duration-500"
        style={{ width: `${relleno}%` }}
      />
    </div>
  );
}

/**
 * EL DIPLOMA, NO UNA MEDALLA. Aquí hubo un medallón con su cinta, que es
 * el icono de ganar una carrera: premia un resultado y lo compara con el
 * de otros. Un diploma no es eso —acredita que has hecho un curso— y
 * además el medallón repetía la forma del círculo que lo envuelve.
 *
 * Ahora es un pergamino: la hoja con su rollo a la izquierda, que es la
 * forma en la que se dibuja un diploma desde antes de que hubiera
 * iconos. Dentro lleva dos renglones mientras se persigue, y una marca
 * de visto cuando ya está: el documento es el mismo, cambia lo escrito.
 *
 * Relleno y en verde cuando el diploma ya está; de contorno y en ámbar
 * mientras se persigue.
 */
function IconoDiploma({ conseguido }: { conseguido: boolean }) {
  const trazo = conseguido ? "#FFFFFF" : "#9A7B00";

  return (
    <span
      aria-hidden
      className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border min-[900px]:h-[68px] min-[900px]:w-[68px] ${
        conseguido ? "border-marca-verdeOsc bg-marca-verde" : "border-[#E9DCA9] bg-[#FFF8E1]"
      }`}
    >
      <svg
        viewBox="0 0 18 18"
        className="h-[27px] w-[27px] min-[900px]:h-[34px] min-[900px]:w-[34px]"
        fill="none"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* La hoja. Se cierra sola por la izquierda, donde va el rollo. */}
        <path
          d="M4.6 3.6h8.7a1.8 1.8 0 0 1 1.8 1.8v7.2a1.8 1.8 0 0 1-1.8 1.8H4.6"
          stroke={trazo}
          fill={conseguido ? "#FFFFFF" : "none"}
          fillOpacity={conseguido ? 0.18 : 1}
        />
        {/* El rollo. */}
        <ellipse cx="4.6" cy="9" rx="1.7" ry="5.4" stroke={trazo} />
        {conseguido ? (
          <path d="M8.2 9.3l1.6 1.6 3-3.2" stroke={trazo} />
        ) : (
          <path d="M7.8 7.4h4.6M7.8 10.4h3" stroke={trazo} />
        )}
      </svg>
    </span>
  );
}
