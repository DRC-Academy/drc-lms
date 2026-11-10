import { Bloque, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/** La prueba de nivel mientras llega: la barra, la pregunta y las opciones. */
export default function Cargando() {
  return (
    <div aria-busy="true" className="flex min-h-screen flex-col bg-marca-niebla">
      <main className="mx-auto w-full max-w-[680px] flex-1 px-5 pb-[120px] pt-6 min-[900px]:pt-10">
        <Bloque className="h-4 w-full max-w-[220px]" />
        <Bloque className="mt-3 h-2 w-full" />
        <Bloque className="mt-6 h-7 w-full max-w-[460px]" />
        <div className="mt-5 flex flex-col gap-2.5">
          <TarjetaEsqueleto className="h-[52px]" />
          <TarjetaEsqueleto className="h-[52px]" />
          <TarjetaEsqueleto className="h-[52px]" />
          <TarjetaEsqueleto className="h-[52px]" />
        </div>
      </main>
    </div>
  );
}
