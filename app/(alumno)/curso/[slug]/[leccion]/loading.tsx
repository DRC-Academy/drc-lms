import { textosActuales } from "@/lib/idioma-servidor";

/**
 * Lo que se ve mientras carga una lección.
 *
 * QUÉ NO ESTÁ AQUÍ, Y ES LO IMPORTANTE: la barra de iconos. Vive en el
 * layout común del alumno y no se desmonta al cambiar de lección, así que aquí
 * no hay nada que sustituir: esto se pinta AL LADO de la barra de
 * verdad.
 *
 * Lo demás sigue la misma regla que siempre. Solo va en gris lo que se
 * está trayendo de la base; lo que no depende de ningún dato —los
 * marcos, las separaciones, el ancho de la columna, el contenedor de la
 * parte— se pinta ya, porque no hay nada que esperar para saber cómo es.
 *
 * Las medidas son las de `VistaLeccion` y `PanelCurso`: el panel de
 * 330px con su título y su acordeón, y la columna de 760px con el
 * kicker, el título centrado, la línea de instrucción, el paso a paso y
 * el contenedor. Si esto no cuadra al píxel, el contenido salta al
 * llegar y el salto se nota más que la espera.
 *
 * Sin animación de pulso: es una espera de décimas, y un parpadeo en
 * mitad de la lectura molesta más de lo que informa.
 */

/** Una línea de texto en gris. `ancho` va en clase de Tailwind. */
function Linea({ ancho, alto = "h-4", extra = "" }: { ancho: string; alto?: string; extra?: string }) {
  return <div className={`${alto} ${ancho} rounded bg-marca-nieblaOscura ${extra}`} />;
}

/** Una lección del panel: el punto y una o dos líneas de título. */
function ItemFantasma({ dosLineas }: { dosLineas: boolean }) {
  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2.5">
      <span
        aria-hidden
        className="mt-[2px] h-4 w-4 shrink-0 rounded-full border-[1.5px] border-marca-puntoPendiente"
      />
      <span className="min-w-0 flex-1">
        <Linea ancho="w-full" alto="h-[11px]" />
        {dosLineas && <Linea ancho="w-2/3" alto="h-[11px]" extra="mt-[7px]" />}
        <Linea ancho="w-1/3" alto="h-[9px]" extra="mt-[9px]" />
      </span>
    </div>
  );
}

export default function Cargando() {
  return (
    <div className="flex flex-1 items-stretch bg-marca-niebla" aria-busy="true">
      {/* ------------------------------ EL PANEL ------------------------------ */}
      <aside
        aria-hidden
        className="hidden w-[330px] shrink-0 border-r border-marca-borde bg-white min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:block min-[1200px]:h-dvh"
      >
        <div className="px-4 pb-6 pt-7">
          <Linea ancho="w-[110px]" alto="h-[22px]" />
          <Linea ancho="w-[220px]" alto="h-[11px]" extra="mt-3" />

          <div className="mt-[22px] flex flex-col gap-2">
            <div className="rounded-[12px] border border-marca-borde bg-white px-4 py-3.5">
              <Linea ancho="w-[90px]" alto="h-[9px]" />
              <Linea ancho="w-4/5" alto="h-[13px]" extra="mt-2.5" />
            </div>

            <div className="rounded-[12px] border border-marca-borde bg-white">
              <div className="px-4 py-3.5">
                <Linea ancho="w-[90px]" alto="h-[9px]" />
                <Linea ancho="w-full" alto="h-[13px]" extra="mt-2.5" />
                <Linea ancho="w-1/2" alto="h-[13px]" extra="mt-2" />
              </div>
              <div className="px-2.5 pb-2.5">
                <div className="flex items-start gap-4 rounded-[12px] bg-marca-niebla p-3.5">
                  <div className="flex flex-1 flex-col gap-3">
                    <Linea ancho="w-[120px]" alto="h-[11px]" />
                    <Linea ancho="w-full" alto="h-[5px]" />
                    <Linea ancho="w-full" alto="h-[5px]" />
                    <Linea ancho="w-3/4" alto="h-[10px]" />
                  </div>
                  <span aria-hidden className="h-16 w-16 shrink-0 rounded-full border-[6px] border-marca-pista" />
                </div>
                <div className="mt-2 px-1.5 py-2.5">
                  <Linea ancho="w-[70px]" alto="h-[11px]" />
                </div>
                <ItemFantasma dosLineas />
                <ItemFantasma dosLineas={false} />
                <ItemFantasma dosLineas />
                <ItemFantasma dosLineas />
                <ItemFantasma dosLineas={false} />
                <ItemFantasma dosLineas />
              </div>
            </div>

            <div className="rounded-[12px] border border-marca-borde bg-white px-4 py-3.5">
              <Linea ancho="w-[90px]" alto="h-[9px]" />
              <Linea ancho="w-3/4" alto="h-[13px]" extra="mt-2.5" />
            </div>
          </div>
        </div>
      </aside>

      {/* ----------------------------- LA LECCIÓN ----------------------------- */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <span className="sr-only">{textosActuales().curso.cargandoLaLeccion}</span>

        {/* La fila de móvil: la X, el rótulo y el idioma. */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3 min-[900px]:hidden">
          <span aria-hidden className="h-10 w-10 shrink-0 rounded-full border border-marca-borde bg-white" />
          <div className="flex flex-1 justify-center">
            <Linea ancho="w-[110px]" alto="h-[10px]" />
          </div>
          <span aria-hidden className="h-[30px] w-[72px] rounded-full border border-marca-borde bg-white" />
        </div>

        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-8 pt-5 min-[900px]:px-8 min-[900px]:pb-10 min-[900px]:pt-[76px]">
          <div className="relative flex flex-col items-center">
            <span
              aria-hidden
              className="absolute left-0 top-1 hidden h-10 w-10 rounded-full border border-marca-borde bg-white min-[900px]:block"
            />
            <Linea ancho="w-[180px]" alto="h-[10px]" extra="hidden min-[900px]:block" />
            <Linea ancho="w-4/5" alto="h-[26px]" extra="mt-3 min-[900px]:mt-5 min-[900px]:h-[30px]" />
            <Linea ancho="w-3/5" alto="h-[26px]" extra="mt-2 min-[900px]:h-[30px]" />
            <Linea ancho="w-2/3" alto="h-[12px]" extra="mt-4" />
          </div>

          {/* El paso a paso: seis círculos vacíos unidos por la línea. */}
          <div className="mt-6 hidden items-center min-[900px]:mt-9 min-[900px]:flex">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="relative flex h-8 flex-1 items-center justify-center">
                {i > 0 && <span aria-hidden className="absolute left-0 right-1/2 top-[15px] h-[2px] bg-marca-pista" />}
                {i < 5 && <span aria-hidden className="absolute left-1/2 right-0 top-[15px] h-[2px] bg-marca-pista" />}
                <span aria-hidden className="relative h-8 w-8 rounded-full border-[1.5px] border-marca-puntoPendiente bg-white" />
              </div>
            ))}
          </div>
          <div className="mt-6 min-[900px]:hidden">
            <div className="flex justify-between">
              <Linea ancho="w-[80px]" alto="h-[11px]" />
              <Linea ancho="w-[120px]" alto="h-[11px]" />
            </div>
            <Linea ancho="w-full" alto="h-[5px]" extra="mt-2.5" />
          </div>

          {/* El contenedor de la parte, con sus líneas. */}
          <div className="mt-5 rounded-[16px] border border-marca-borde bg-white px-5 py-6 min-[900px]:mt-7 min-[900px]:px-11 min-[900px]:py-8">
            <Linea ancho="w-[90px]" alto="h-[10px]" />
            <Linea ancho="w-1/2" alto="h-[22px]" extra="mt-3" />
            <div className="mt-6 flex flex-col gap-3">
              <Linea ancho="w-full" />
              <Linea ancho="w-full" />
              <Linea ancho="w-11/12" />
              <Linea ancho="w-full" extra="mt-4" />
              <Linea ancho="w-4/5" />
              <Linea ancho="w-full" extra="mt-4" />
              <Linea ancho="w-full" />
              <Linea ancho="w-2/3" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 min-[900px]:mt-5 min-[900px]:gap-3.5">
            <span
              aria-hidden
              className="h-12 w-12 shrink-0 rounded-full border border-marca-borde bg-white min-[900px]:h-[46px] min-[900px]:w-[110px]"
            />
            <span aria-hidden className="h-12 flex-1 rounded-full bg-marca-pista min-[900px]:h-[48px]" />
          </div>
        </div>
      </main>
    </div>
  );
}
