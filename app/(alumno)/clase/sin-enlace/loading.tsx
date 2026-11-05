import { Bloque, PantallaEsqueleto, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/** La tarjeta de «no hay sala» mientras llega. */
export default function Cargando() {
  return (
    <PantallaEsqueleto>
      <TarjetaEsqueleto className="p-5 min-[900px]:p-8">
        <Bloque className="h-7 w-3/5" />
        <Bloque className="mt-3 h-11 w-full max-w-[560px]" />
        <Bloque className="mt-5 h-12 w-full rounded-full min-[500px]:w-[220px]" />
      </TarjetaEsqueleto>
    </PantallaEsqueleto>
  );
}
