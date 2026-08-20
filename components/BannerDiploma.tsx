import { esRecta, textoDiploma, type EstadoDiploma } from "@/lib/diploma";

/**
 * EL DIPLOMA, EN SU PROPIO BANNER.
 *
 * Va entre el saludo y la rejilla, a lo ancho: es lo primero que se ve
 * al entrar. Lo tuvo dentro de la franja del curso —como su cifra
 * grande— y ahí se leía como un dato más del curso; el sitio no era el
 * problema, era compartir caja.
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
 * DOS ANCHOS, UN SOLO ORDEN. En móvil el sello y la cifra van en una
 * fila, y la barra con su pie debajo; el lateral se pliega bajo la barra
 * porque a 358px no cabe sin partir la cifra. A partir de `min-[900px]`
 * todo se pone en línea. Nada cambia de sitio entre los dos: se estira.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerDiploma({
  estado,
  tituloCurso,
}: {
  estado: EstadoDiploma;
  tituloCurso: string;
}) {
  const texto = textoDiploma(estado);
  if (texto === null) return null;

  const conseguido = estado.estado === "conseguido";
  const recta = esRecta(estado);

  const descripcion = conseguido
    ? `Has completado ${tituloCurso}`
    : `Te ${texto.cifra === 1 ? "falta" : "faltan"} ${texto.cifra} de ${
        estado.estado === "en-curso" ? estado.total : 0
      } lecciones para tu diploma de ${tituloCurso}`;

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
        {/* ----------------------- SELLO Y CIFRA -----------------------
            Juntos en la misma fila también en móvil: el sello solo no
            dice nada y la cifra sola no dice de qué. */}
        <div className="flex items-center gap-3.5 min-[900px]:contents">
          <Sello conseguido={conseguido} />

          <div className="min-w-0 flex-1 min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-2.5">
            <p
              className={`text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] min-[900px]:text-[11px] ${
                conseguido ? "text-marca-verdeOsc" : "text-marca-amarilloTexto"
              }`}
            >
              Tu diploma{tituloCurso !== "" && ` · ${tituloCurso}`}
            </p>

            {texto.cifra === null ? (
              <p className="mt-[7px] font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.02em] text-marca-tinta min-[900px]:mt-0 min-[900px]:text-[32px]">
                {texto.unidad}
              </p>
            ) : (
              <p className="mt-[7px] flex items-baseline gap-2 min-[900px]:mt-0 min-[900px]:gap-2.5">
                <span className="font-display text-[32px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-marca-tinta min-[900px]:text-[42px]">
                  {texto.cifra}
                </span>
                <span className="text-[14px] font-semibold text-marca-tintaMedia min-[900px]:text-[17px]">
                  {texto.unidad}
                </span>
              </p>
            )}

            {/* La barra vive dentro de esta columna solo en escritorio;
                en móvil sale fuera para poder ocupar el ancho entero. */}
            {!conseguido && (
              <div className="hidden items-center gap-4 min-[900px]:flex">
                <Barra relleno={texto.relleno} descripcion={descripcion} />
                <span className="shrink-0 text-[13.5px] tabular-nums text-marca-calidoBadgeTexto">
                  {texto.pie}
                </span>
              </div>
            )}

            {conseguido && (
              <p className="mt-2 text-[13px] tabular-nums text-marca-verdeOsc min-[900px]:mt-0 min-[900px]:text-[13.5px]">
                {texto.pie}
              </p>
            )}
          </div>
        </div>

        {/* ------------------------- EN MÓVIL -------------------------
            La barra a ancho completo, con el avance debajo. Encima de
            ella no cabe: la cifra ya se ha llevado la fila. */}
        {!conseguido && (
          <div className="min-[900px]:hidden">
            <Barra relleno={texto.relleno} descripcion={descripcion} />
            <p className="mt-2 text-[12.5px] leading-[1.45] text-marca-calidoBadgeTexto">
              <span className="tabular-nums">{texto.pie}</span> · {texto.nota}
            </p>
          </div>
        )}

        {/* ------------------------ EN ESCRITORIO ------------------------
            La nota se separa con un filete y se queda en una columna
            fija: a ancho libre se estira hasta empujar la barra. */}
        <div
          className={`hidden w-px shrink-0 self-stretch min-[900px]:block ${
            conseguido ? "bg-marca-verdePalido" : "bg-marca-examenBorde"
          }`}
        />
        <p
          className={`hidden w-[196px] shrink-0 text-pretty text-[13.5px] leading-[1.45] min-[900px]:block ${
            conseguido
              ? "text-marca-verdeOsc"
              : recta
                ? "font-semibold text-marca-tinta"
                : "text-marca-calidoBadgeTexto"
          }`}
        >
          {texto.nota}
        </p>
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
      className="h-[7px] flex-1 overflow-hidden rounded-[4px] bg-marca-calidoBadge min-[900px]:h-2"
    >
      <div
        className="h-full rounded-[4px] bg-marca-verde transition-[width] duration-500"
        style={{ width: `${relleno}%` }}
      />
    </div>
  );
}

/**
 * El sello, en su medallón. Relleno y en verde cuando el diploma ya
 * está; de contorno y en ámbar mientras se persigue.
 */
function Sello({ conseguido }: { conseguido: boolean }) {
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
        <circle cx="9" cy="7" r="4.6" stroke={trazo} fill={conseguido ? "#FFFFFF" : "none"} fillOpacity={conseguido ? 0.18 : 1} />
        <path d="M6.4 11.2 5.4 16l3.6-1.9 3.6 1.9-1-4.8" stroke={trazo} />
        {conseguido && <path d="M7 7l1.5 1.5L11 5.8" stroke={trazo} />}
      </svg>
    </span>
  );
}
