import { Bloque, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/** Elegir curso mientras llega: el titular y las filas de los cursos. */
export default function Cargando() {
  return (
    <div aria-busy="true" className="flex min-h-screen flex-col bg-marca-niebla">
      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-[120px] pt-6 min-[900px]:pt-10">
        <Bloque className="h-8 w-full max-w-[420px]" />
        <Bloque className="mt-3 h-4 w-full max-w-[480px]" />
        <div className="mt-10 flex flex-col gap-3">
          <TarjetaEsqueleto className="h-[126px] min-[520px]:h-[80px]" />
          <TarjetaEsqueleto className="h-[126px] min-[520px]:h-[80px]" />
          <TarjetaEsqueleto className="h-[126px] min-[520px]:h-[80px]" />
          <TarjetaEsqueleto className="h-[126px] min-[520px]:h-[80px]" />
        </div>
      </main>
    </div>
  );
}
