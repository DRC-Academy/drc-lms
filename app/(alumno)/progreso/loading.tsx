import { Bloque, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/**
 * «Mi progreso» mientras llega: el saludo con la tarjeta del diploma, el
 * banner de ritmo y el nivel con el objetivo. Las medidas son las de la
 * hoja `p2-*` (`components/progreso/estilos.tsx`): 920px, 880 de contenido
 * y la misma separación entre bloques.
 */
export default function Cargando() {
  return (
    <div aria-busy="true" className="flex min-h-screen flex-col bg-marca-niebla">
      <main className="mx-auto w-full max-w-[920px] px-4 pb-[72px] pt-5 min-[900px]:px-5 min-[900px]:pt-8">
        <div className="flex flex-col gap-5 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_420px] min-[900px]:items-end min-[900px]:gap-8">
          <div className="min-w-0">
            <Bloque className="h-8 w-[150px] min-[900px]:h-10 min-[900px]:w-[190px]" />
            <Bloque className="mt-2 h-[44px] w-full max-w-[340px] min-[900px]:h-[26px]" />
          </div>
          <Bloque className="h-[68px] rounded-[16px] min-[900px]:h-[116px]" />
        </div>

        <Bloque className="mt-5 h-[433px] rounded-[24px] min-[900px]:mt-[26px] min-[900px]:h-[282px]" />

        <div className="mt-10 grid gap-10 min-[900px]:mt-[52px] min-[900px]:grid-cols-2 min-[900px]:gap-14">
          <div>
            <Bloque className="h-6 w-[100px]" />
            <div className="mt-4 flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <TarjetaEsqueleto key={n} className="h-14 w-[50px] rounded-[14px] min-[900px]:w-[62px] min-[900px]:rounded-[14px]" />
              ))}
            </div>
          </div>
          <div>
            <Bloque className="h-6 w-[110px]" />
            <Bloque className="mt-4 h-5 w-full" />
            <Bloque className="mt-2 h-5 w-5/6" />
            <Bloque className="mt-2 h-5 w-2/3" />
          </div>
        </div>
      </main>
    </div>
  );
}
