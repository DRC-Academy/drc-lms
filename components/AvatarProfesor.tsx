/**
 * LA CARA DEL PROFESOR, JUNTO AL SALUDO.
 *
 * La pantalla ya sabía lo más humano que tiene —quién da la clase— y lo
 * decía en gris de 14px, en la segunda línea. El propio saludo lo
 * defiende: «para el alumno la persona con la que da clase es la mitad
 * del producto» (ver `app/alumno/[id]/page.tsx`). Estaba escrito y no
 * estaba dibujado.
 *
 * Con esto, lo primero de la pantalla deja de ser un rectángulo y pasa a
 * ser alguien. Y no es una mascota, ni un icono de usuario, ni una
 * carita: es la cara correcta, la de la persona real con la que estudia.
 * Un producto de clases particulares que no enseña a nadie se parece a
 * una aplicación de autoestudio, que es justo lo que no es.
 *
 * ---------------------------------------------------------------
 * HOY ES LA INICIAL. MAÑANA ES LA FOTO, Y NO SE MUEVE NADA.
 *
 * `vista_perfil_alumno` da el nombre del profesor y nada más, así que
 * esto no añade ni una consulta: sale del mismo dato que ya se lee para
 * el subtítulo.
 *
 * El día que exista una columna con la foto, el cambio entero es pasar
 * `foto` y pintar un `<Image>` dentro de este mismo círculo. Por eso el
 * hueco es redondo y de medida fija desde ahora: la pantalla ya está
 * dibujada alrededor del sitio donde va a ir una cara, y cuando llegue
 * no se recoloca nada.
 *
 * LO QUE HARÁ FALTA CUANDO LLEGUE, anotado aquí que es donde se mira:
 *   · Una columna `foto_url` en el perfil del profesor, o un bucket.
 *   · Recorte cuadrado y centrado en la cara: un retrato en horizontal
 *     metido en un círculo corta frentes.
 *   · Un tamaño servido de 96px para que no se vea blanda en pantallas
 *     de doble densidad.
 *   · Y el mismo respaldo que hay hoy: sin foto, la inicial.
 * ---------------------------------------------------------------
 *
 * EN CÁLIDO, NO EN VERDE. El verde de la aplicación significa «pulsa
 * aquí» y esto no se pulsa; gastarlo en un adorno lo debilita en los dos
 * botones que sí importan. El par cálido —el de los sellos— no compite
 * con nadie y da 6,2:1 sobre su propio fondo.
 *
 * NO LO LEE EL LECTOR DE PANTALLA. El nombre del profesor va entero en
 * el subtítulo, a dos centímetros: narrar aquí la inicial sería decir la
 * misma cosa dos veces y la segunda peor.
 *
 * Sin nombre no hay avatar. Nunca un círculo con «?»: un hueco con forma
 * de persona y nadie dentro es peor que no poner nada.
 */
export default function AvatarProfesor({ nombre }: { nombre: string }) {
  const inicial = nombre.trim().charAt(0).toUpperCase();
  if (!inicial) return null;

  return (
    <span
      aria-hidden
      className="relative mt-[3px] grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-marca-calidoBadge bg-marca-calidoFondo min-[900px]:h-[52px] min-[900px]:w-[52px]"
    >
      {/* EL HOMBRO, DETRÁS DE LA INICIAL. Es lo que separa esto de una
          ficha de contacto: un círculo con una letra dentro es un dato,
          y una silueta es una persona. Va recortada por el `overflow` del
          círculo, así que se lee como un retrato de busto y no como un
          icono flotando.

          Muy tenue a propósito —el cálido de los segmentos, no el de la
          tinta—: tiene que estar y no tiene que leerse antes que la
          inicial. */}
      <svg
        viewBox="0 0 52 52"
        className="absolute inset-x-0 bottom-0 h-[62%] w-full"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 52c0-9.4 8.9-15 20-15s20 5.6 20 15"
          fill="#EFE3C0"
          stroke="#E3D3A8"
          strokeWidth="1.2"
        />
      </svg>

      <span className="relative font-display text-[17px] font-bold leading-none text-marca-calidoBadgeTexto min-[900px]:text-[20px]">
        {inicial}
      </span>
    </span>
  );
}
