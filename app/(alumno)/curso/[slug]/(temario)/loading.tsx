import { Bloque, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/**
 * El temario mientras llega: la franja del plan, la línea de los meses, el
 * diploma y la lista de meses.
 *
 * Va en el grupo `(temario)` para que valga solo para esta pantalla: un
 * `loading.tsx` en `[slug]` también se pintaría al entrar en una lección, en
 * lugar del suyo.
 */
export default function Cargando() {
  return (
    <div aria-busy="true" className="flex-1 bg-marca-niebla">
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-14 pt-6 min-[900px]:px-11 min-[900px]:pb-16 min-[900px]:pt-10">
        <Bloque className="h-[271px] rounded-[16px] min-[900px]:h-[235px]" />
        <TarjetaEsqueleto className="mt-4 h-[122px] rounded-[14px] px-[17px] py-[17px] min-[900px]:h-[83px] min-[900px]:rounded-[14px] min-[900px]:px-[23px]">
          <div className="grid grid-cols-6 gap-[7px]">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <Bloque key={n} className="h-[9px] rounded-full" />
            ))}
          </div>
        </TarjetaEsqueleto>
        <TarjetaEsqueleto className="mt-3 h-[263px] min-[900px]:h-[218px] min-[900px]:rounded-[16px]" />

        <div className="mt-[22px] flex h-[11px] items-center min-[900px]:mt-[34px] min-[900px]:h-[33px]">
          <Bloque className="h-[11px] w-[126px]" />
        </div>

        <div className="mt-2.5 flex flex-col gap-2 min-[900px]:mt-4 min-[900px]:gap-0">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="min-[900px]:grid min-[900px]:grid-cols-[58px_1fr]">
              <div className="hidden pt-1 min-[900px]:flex min-[900px]:justify-center">
                <Bloque className="h-[34px] w-[34px] rounded-full" />
              </div>
              <div className="min-[900px]:pb-3.5 min-[900px]:pl-1">
                <TarjetaEsqueleto className="h-16 min-[900px]:h-[84px] min-[900px]:rounded-[16px]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
