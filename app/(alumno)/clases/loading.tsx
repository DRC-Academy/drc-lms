import { Bloque, CabeceraEsqueleto, PantallaEsqueleto, SemanaEsqueleto, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/**
 * «Mis clases» mientras llega: la cabecera, la próxima clase con la última
 * al lado, el calendario de la semana y el historial.
 */
export default function Cargando() {
  return (
    <PantallaEsqueleto>
      <CabeceraEsqueleto />

      <div className="grid items-stretch gap-3 min-[900px]:gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_416px]">
        <Bloque className="h-[74px] rounded-[16px] min-[900px]:h-[359px] min-[900px]:rounded-[20px]" />
        <TarjetaEsqueleto className="h-[139px] p-[18px] min-[900px]:h-[359px] min-[900px]:p-6">
          <Bloque className="h-6 w-[130px] rounded-full" />
          <Bloque className="mt-3 h-4 w-3/4" />
          <Bloque className="mt-3 h-[22px] w-5/6" />
        </TarjetaEsqueleto>
      </div>

      <SemanaEsqueleto className="mt-[26px] min-[900px]:mt-9" />

      <div className="mt-[26px] min-[900px]:mt-9">
        <Bloque className="h-6 w-[190px] min-[900px]:h-7" />
        <div className="mt-4 flex flex-col gap-3">
          <TarjetaEsqueleto className="h-[92px]" />
          <TarjetaEsqueleto className="h-[92px]" />
        </div>
      </div>
    </PantallaEsqueleto>
  );
}
