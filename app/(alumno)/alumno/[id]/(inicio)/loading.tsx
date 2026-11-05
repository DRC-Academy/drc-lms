import { Bloque, PantallaEsqueleto, SemanaEsqueleto, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/**
 * El inicio mientras llega: el saludo con la cara del profesor, «Cómo vas»
 * (solo en móvil), la franja del curso con la tarjeta de práctica al lado,
 * el calendario y los bloques.
 *
 * Va en el grupo `(inicio)` para que valga solo para esta pantalla: un
 * `loading.tsx` en `[id]` también se pintaría al entrar en un bloque.
 */
export default function Cargando() {
  return (
    <PantallaEsqueleto>
      <div className="mb-4 flex items-start gap-3.5 min-[900px]:mb-[22px] min-[900px]:gap-4">
        <Bloque className="mt-[3px] h-11 w-11 shrink-0 rounded-full min-[900px]:mt-0 min-[900px]:h-[52px] min-[900px]:w-[52px]" />
        <div className="min-w-0 flex-1">
          <Bloque className="h-[25px] w-[160px] min-[900px]:h-[35px] min-[900px]:w-[220px]" />
          <Bloque className="mt-[5px] h-[39px] w-full max-w-[420px] min-[900px]:mt-1.5 min-[900px]:h-[22px]" />
        </div>
      </div>

      {/* «Cómo vas»: en escritorio vive en la barra lateral. */}
      <Bloque className="mb-4 h-[255px] rounded-[16px] min-[900px]:hidden" />

      <div className="grid items-start gap-3 min-[900px]:grid-cols-[minmax(0,1fr)_416px] min-[900px]:gap-5">
        <Bloque className="h-[345px] rounded-[16px] min-[900px]:h-[235px] min-[900px]:rounded-[20px]" />
        <TarjetaEsqueleto className="h-[237px] p-5 min-[900px]:h-[222px] min-[900px]:p-6">
          <Bloque className="h-6 w-[170px] rounded-full" />
          <Bloque className="mt-4 h-[26px] w-3/4" />
          <Bloque className="mt-3 h-4 w-full" />
          <Bloque className="mt-2 h-4 w-5/6" />
        </TarjetaEsqueleto>
      </div>

      <SemanaEsqueleto className="mt-[26px] min-[900px]:mt-9" />

      <TarjetaEsqueleto className="mt-[26px] h-[361px] min-[900px]:mt-9 min-[900px]:h-[231px]" />
    </PantallaEsqueleto>
  );
}
