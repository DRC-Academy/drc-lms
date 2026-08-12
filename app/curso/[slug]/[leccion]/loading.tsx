/**
 * Lo que se ve mientras carga una lección.
 *
 * Cambiar de lección es una navegación de servidor: hay una espera real
 * mientras se leen el contenido y los ejercicios. Sin esto, el navegador
 * se queda en la lección anterior y parece que el clic no ha hecho nada.
 *
 * Se dibuja la misma silueta que va a aparecer —kicker, título y tres
 * bloques de texto— para que el salto al contenido no mueva la página.
 * Sin animación de pulso: es una espera de décimas, y un parpadeo en
 * mitad de la lectura molesta más de lo que informa.
 */
export default function Cargando() {
  return (
    <div className="min-h-screen bg-marca-niebla">
      <div className="h-[60px] border-b border-marca-borde bg-white min-[1100px]:h-16" />

      <div className="grid grid-cols-1 min-[1100px]:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden border-r border-marca-borde bg-white min-[1100px]:block" />

        <div className="mx-auto w-full max-w-[680px] px-4 pt-7 min-[1100px]:px-14 min-[1100px]:pt-10">
          <div className="h-3 w-24 rounded bg-marca-nieblaOscura" />
          <div className="mt-4 h-8 w-full rounded bg-marca-nieblaOscura" />
          <div className="mt-2.5 h-8 w-3/4 rounded bg-marca-nieblaOscura" />

          <div className="mt-9 flex flex-col gap-3">
            <div className="h-4 w-full rounded bg-marca-nieblaOscura" />
            <div className="h-4 w-full rounded bg-marca-nieblaOscura" />
            <div className="h-4 w-5/6 rounded bg-marca-nieblaOscura" />
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <div className="h-4 w-full rounded bg-marca-nieblaOscura" />
            <div className="h-4 w-2/3 rounded bg-marca-nieblaOscura" />
          </div>
        </div>
      </div>

      <span className="sr-only">Cargando la lección…</span>
    </div>
  );
}
