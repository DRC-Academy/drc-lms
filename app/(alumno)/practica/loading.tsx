import { Bloque, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/**
 * «Para ti» mientras llega: el titular de la ruta, la tarjeta del camino y
 * la lista de lo hecho. Con el `<main>` de esta pantalla, que no es el de
 * las demás: deja abajo el hueco de la barra fija.
 */
export default function Cargando() {
  return (
    <div aria-busy="true" className="flex min-h-screen flex-col bg-marca-niebla">
      <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col px-4 pb-[120px] pt-[18px] lg:px-9 lg:pt-8">
        <div className="h-[106px] min-[900px]:h-[134px]">
          <Bloque className="h-3 w-[200px]" />
          <Bloque className="mt-3 h-8 w-[260px] min-[900px]:h-11 min-[900px]:w-[360px]" />
          <Bloque className="mt-3 h-[34px] w-full max-w-[520px] min-[900px]:h-6" />
        </div>

        <TarjetaEsqueleto className="mt-5 h-[943px] rounded-[24px] p-5 min-[900px]:mt-[26px] min-[900px]:h-[679px] min-[900px]:rounded-[24px] min-[900px]:p-7">
          <div className="flex items-center justify-between">
            <Bloque className="h-3 w-[130px]" />
            <Bloque className="h-3 w-[100px]" />
          </div>
          <Bloque className="mt-8 h-12 w-12 rounded-full" />
          <Bloque className="ml-auto mt-14 h-12 w-12 rounded-full" />
          <Bloque className="mt-14 h-12 w-12 rounded-full" />
          <Bloque className="mx-auto mt-10 h-[84px] w-[84px] rounded-full" />
          <Bloque className="mt-8 h-[260px] rounded-[20px]" />
        </TarjetaEsqueleto>

        <TarjetaEsqueleto className="mt-4 h-[58px] min-[900px]:h-[62px]" />
      </main>
    </div>
  );
}
