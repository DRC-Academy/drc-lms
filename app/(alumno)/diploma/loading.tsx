import { Bloque, TarjetaEsqueleto } from "@/components/esqueleto/Piezas";

/**
 * «Mi diploma» mientras llega, centrado como la pantalla: el titular, la
 * imagen, la frase, la tarjeta del progreso y las tres promesas.
 *
 * El fondo blanco no se pinta aquí: lo pone el marco en toda la columna
 * (`fondoDeRuta`), igual que en `PantallaDiploma`. Solo la franja de las
 * promesas va en niebla, así que el color no cambia al llegar el contenido.
 */
export default function Cargando() {
  return (
    <main aria-busy="true" className="w-full flex-1">
      <div className="flex flex-col items-center px-5 pt-6 min-[900px]:pt-10">
        <Bloque className="h-[94px] w-full max-w-[620px] min-[900px]:h-[82px]" />
        <Bloque className="mt-5 h-[200px] w-[300px] max-w-full" />
        <Bloque className="mt-4 h-[41px] w-full max-w-[460px] min-[900px]:h-[44px]" />
      </div>

      <div className="px-5 pb-12 pt-6 min-[900px]:pb-16">
        <TarjetaEsqueleto className="mx-auto h-[234px] w-full max-w-[330px] rounded-[14px] px-5 py-5 min-[900px]:rounded-[14px]">
          <Bloque className="mx-auto h-[35px] w-[150px]" />
          <Bloque className="mt-3 h-2.5 rounded-full" />
          <Bloque className="mx-auto mt-3 h-3 w-[110px]" />
          <Bloque className="mx-auto mt-5 h-4 w-4/5" />
          <Bloque className="mx-auto mt-2 h-3 w-full" />
        </TarjetaEsqueleto>
      </div>

      <div className="bg-marca-niebla px-5 py-12 min-[900px]:py-16">
        <Bloque className="mx-auto h-[60px] w-full max-w-[520px] min-[900px]:h-[38px]" />
        <div className="mx-auto mt-7 grid max-w-[1000px] gap-4 min-[900px]:mt-9 min-[900px]:grid-cols-3 min-[900px]:gap-5">
          {[0, 1, 2].map((n) => (
            <TarjetaEsqueleto key={n} className="h-[203px] rounded-[14px] min-[900px]:h-[222px] min-[900px]:rounded-[14px]" />
          ))}
        </div>
      </div>
    </main>
  );
}
