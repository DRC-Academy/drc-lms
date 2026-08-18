/**
 * Lo que se ve mientras carga una lección.
 *
 * QUÉ NO ESTÁ AQUÍ, Y ES LO IMPORTANTE: la cabecera. Antes esto pintaba
 * una barra blanca vacía para tapar el hueco que dejaba la cabecera real
 * al desmontarse, y ese hueco —logotipo incluido— era la mitad de la
 * sensación de fallo. Ahora la cabecera vive en el layout del curso y no
 * se desmonta al cambiar de lección, así que aquí no hay nada que
 * sustituir: esto se pinta DEBAJO de la cabecera de verdad.
 *
 * Lo demás sigue la misma regla. Solo va en gris lo que se está
 * trayendo de la base; lo que no depende de ningún dato —los marcos, las
 * separaciones, el ancho de la columna de texto, la barra de acciones—
 * se pinta ya, porque no hay nada que esperar para saber cómo es.
 *
 * Las medidas no son decorativas: son las de `VistaLeccion` y
 * `LateralLecciones`. La rejilla es la misma `300px + resto`, el lateral
 * tiene su cabecera de módulo y su pie, y la columna de texto arranca en
 * el mismo `pt` con el mismo kicker encima del título. Si esto no cuadra
 * al píxel, el contenido salta al llegar y el salto se nota más que la
 * espera.
 *
 * Sin animación de pulso: es una espera de décimas, y un parpadeo en
 * mitad de la lectura molesta más de lo que informa.
 */

/** Una línea de texto en gris. `w` va en clase de Tailwind. */
function Linea({ ancho, alto = "h-4" }: { ancho: string; alto?: string }) {
  return <div className={`${alto} ${ancho} rounded bg-marca-nieblaOscura`} />;
}

/**
 * Una lección del lateral: el punto de estado y una o dos líneas de
 * título. Los títulos reales ocupan hasta tres líneas y no se truncan
 * —ver `ItemLeccion`—, así que alternar una y dos se parece más a la
 * lista que va a llegar que cinco filas idénticas.
 */
function ItemFantasma({ dosLineas }: { dosLineas: boolean }) {
  return (
    <div className="mb-0.5 flex items-start gap-[11px] border-l-[2.5px] border-transparent py-3 pl-3.5 pr-3">
      <span
        aria-hidden
        className="mt-px h-4 w-4 shrink-0 rounded-full border-[1.5px] border-marca-puntoPendiente"
      />
      <span className="min-w-0 flex-1">
        <Linea ancho="w-full" alto="h-[11px]" />
        {dosLineas && (
          <span className="mt-[7px] block">
            <Linea ancho="w-2/3" alto="h-[11px]" />
          </span>
        )}
      </span>
    </div>
  );
}

export default function Cargando() {
  return (
    <div className="flex flex-1 flex-col bg-marca-niebla">
      {/* ------------------------------ MÓVIL ------------------------------
          Esta sí hay que dibujarla: la cabecera de móvil la pinta la
          página, no el layout —lleva el botón del panel y la tira del
          módulo, que son de la lección—, así que al cambiar de lección
          desaparece y aquí hay un hueco real que tapar. Misma altura y
          mismas dos filas para que no salte nada al llegar. */}
      <div className="sticky top-0 z-30 border-b border-marca-borde bg-white/[0.94] backdrop-blur-md min-[1100px]:hidden">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center text-[17px] leading-none text-marca-grisTenue"
          >
            ←
          </span>
          <Linea ancho="w-[150px]" alto="h-[13px]" />
        </div>
        <div className="flex items-center gap-2.5 px-3.5 pb-[11px]">
          <Linea ancho="w-[74px]" alto="h-[11px]" />
          <div className="h-1 flex-1 rounded-[3px] bg-marca-pista" />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 min-[1100px]:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---------------------------- LATERAL ----------------------------
            La misma columna de 300px, con su cabecera de módulo, su lista
            y su pie. Antes era un rectángulo blanco sin nada dentro. */}
        <aside className="sticky top-[68px] hidden h-[calc(100dvh-68px)] flex-col border-r border-marca-borde bg-white min-[1100px]:flex">
          <div className="border-b border-marca-nieblaOscura px-[22px] pb-4 pt-[22px]">
            <Linea ancho="w-[92px]" alto="h-[10px]" />
            <div className="mt-[13px] flex flex-col gap-2">
              <Linea ancho="w-full" alto="h-[13px]" />
              <Linea ancho="w-3/5" alto="h-[13px]" />
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="h-[5px] flex-1 rounded-[3px] bg-marca-pista" />
              <Linea ancho="w-[38px]" alto="h-[11px]" />
            </div>
          </div>

          <div className="flex-1 px-3 pb-4 pt-3">
            {[true, false, true, true, false].map((dosLineas, i) => (
              <ItemFantasma key={i} dosLineas={dosLineas} />
            ))}
          </div>

          <div className="border-t border-marca-nieblaOscura px-[18px] pb-4 pt-3.5">
            <div className="h-[41px] w-full rounded-[10px] border border-marca-borde bg-marca-niebla" />
            <div className="mt-2 flex justify-center">
              <Linea ancho="w-[150px]" alto="h-[11px]" />
            </div>
          </div>
        </aside>

        {/* ---------------------------- CONTENIDO ---------------------------- */}
        <div className="flex min-w-0 flex-col">
          {/* La misma clase que usa la lección, no una copia de sus
              medidas: `columna-leccion` es la rejilla de tres calles con
              el texto en la del medio a 680px. Así el título aterriza
              donde estaba su silueta. */}
          <div className="columna-leccion flex-1 px-4 pb-6 pt-7 min-[1100px]:px-14 min-[1100px]:pb-6 min-[1100px]:pt-10">
            {/* Kicker, título en dos líneas y el cuerpo. Las alturas son
                las del `h1` de la lección: 24px en móvil, 33 en
                escritorio, con su interlineado. */}
            <Linea ancho="w-[104px]" alto="h-[11px]" />

            <div className="mt-3.5 flex flex-col gap-2.5">
              <Linea ancho="w-full" alto="h-[26px] min-[1100px]:h-[34px]" />
              <Linea ancho="w-4/5" alto="h-[26px] min-[1100px]:h-[34px]" />
            </div>

            <div className="mt-8 flex flex-col gap-[10px] min-[1100px]:mt-[34px]">
              <Linea ancho="w-full" />
              <Linea ancho="w-full" />
              <Linea ancho="w-11/12" />
              <Linea ancho="w-3/4" />
            </div>

            <div className="mt-7 flex flex-col gap-[10px]">
              <Linea ancho="w-full" />
              <Linea ancho="w-full" />
              <Linea ancho="w-2/3" />
            </div>

            <div className="mt-7 flex flex-col gap-[10px]">
              <Linea ancho="w-5/6" />
              <Linea ancho="w-full" />
            </div>
          </div>

          {/* La barra de acciones no depende de ningún dato: es la misma
              flecha y el mismo botón verde en el mismo sitio, siempre. Se
              pinta entera y sin texto, para que no aparezca de golpe. */}
          <div data-barra-inferior className="sticky bottom-0 border-t border-marca-borde bg-white/[0.94] backdrop-blur-md">
            <div className="mx-auto w-full max-w-[calc(680px+7rem)] px-3.5 pb-4 pt-3 min-[1100px]:px-14 min-[1100px]:py-3.5">
              <div className="flex items-center gap-3 min-[1100px]:gap-4">
                <div className="h-11 w-11 shrink-0 rounded-full border border-marca-borde min-[1100px]:h-[43px] min-[1100px]:w-[104px]" />
                <div className="h-[47px] flex-1 rounded-full bg-marca-verde/30 min-[1100px]:h-[49px]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only">Cargando la lección…</span>
    </div>
  );
}
