import { peldanos, proximoHito, type NivelMcer } from "@/lib/recorrido";

/**
 * LA CABECERA DE DATOS: la escalera del MCER y las cifras.
 *
 * Va en UNA sola tarjeta y arriba del todo, apretada a propósito. Es
 * contexto —dónde estoy— y se lee en dos segundos; el recorrido de abajo
 * es el contenido y se lee despacio. Si estas cifras crecieran hasta
 * llenar la primera pantalla, el alumno se quedaría con los números y no
 * llegaría a lo único que no puede darle una aplicación.
 *
 * FALTAN DOS COSAS Y SE VERÁ EL HUECO: las horas semanales, que serían la
 * cuarta cifra, y la bandera de "tu meta" en la escalera. Las dos salen
 * de `assignments`, que no está en el contrato del LMS (ver la nota de
 * `lib/recorrido.ts`). La rejilla de cifras está escrita para admitir la
 * cuarta sin tocar nada más.
 */
export default function Resumen({
  nivel,
  totalClases,
}: {
  /** null cuando el texto de Gestión no trae un código reconocible. */
  nivel: NivelMcer | null;
  totalClases: number;
}) {
  const hito = proximoHito(totalClases);

  return (
    <section className="rounded-[18px] border border-marca-borde bg-white px-[18px] py-[18px] min-[900px]:px-[26px] min-[900px]:py-6">
      {nivel && <Escalera nivel={nivel} />}

      <dl
        className={`grid grid-cols-3 gap-3 ${
          nivel ? "mt-5 border-t border-marca-nieblaOscura pt-5" : ""
        }`}
      >
        <Cifra valor={String(totalClases)} etiqueta={totalClases === 1 ? "Clase hecha" : "Clases hechas"} />
        <Cifra valor={nivel ?? "—"} etiqueta="Nivel actual" />
        <Cifra
          valor={hito ? String(hito) : "✓"}
          antes={hito ? "Clase" : undefined}
          etiqueta={hito ? "Próximo hito" : "Hitos completos"}
        />
      </dl>
    </section>
  );
}

function Cifra({
  valor,
  etiqueta,
  antes,
}: {
  valor: string;
  etiqueta: string;
  /** Palabra pequeña delante del número, como en "Clase 15". */
  antes?: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <dd className="text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums text-marca-tinta min-[900px]:text-[30px]">
        {antes && (
          <span className="mr-1 align-middle text-[12px] font-semibold uppercase tracking-[0.04em] text-marca-grisSuave">
            {antes}
          </span>
        )}
        {valor}
      </dd>
      <dt className="mt-1.5 text-[12px] leading-[1.3] text-marca-gris min-[900px]:text-[12.5px]">
        {etiqueta}
      </dt>
    </div>
  );
}

/**
 * LA ESCALERA. Seis peldaños con el alumno colocado en el suyo.
 *
 * Es la pieza que explica de un vistazo que esto es una escala y no una
 * nota: hay un antes y un después de donde está.
 *
 * `aria-current="step"` en el peldaño actual, que es lo que convierte una
 * fila de cajas en información para quien no la ve.
 */
function Escalera({ nivel }: { nivel: NivelMcer }) {
  return (
    <div>
      <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-marca-grisSuave">
        Tu nivel
      </p>

      {/* EL `pb` RESERVA LA LÍNEA DE "Estás aquí", que va absoluta.
          A 375px cada peldaño mide unos 46px y ese rótulo unos 58: en
          flujo normal partía en dos líneas y descuadraba la fila entera.
          Absoluto y sin partir, se desborda por igual a los dos lados
          sobre el hueco de los peldaños vecinos, que está vacío. */}
      <ol className="relative mt-2.5 flex gap-1.5 pb-[19px]">
        {peldanos(nivel).map((peldano) => (
          <li
            key={peldano.nivel}
            aria-current={peldano.estado === "actual" ? "step" : undefined}
            className="relative flex-1"
          >
            <div
              className={`grid h-[38px] place-items-center rounded-[9px] text-[13.5px] font-bold min-[900px]:h-[42px] min-[900px]:text-[15px] ${
                peldano.estado === "actual"
                  ? "bg-marca-verde text-white"
                  : peldano.estado === "superado"
                    ? "bg-marca-verdePalido text-marca-verdeOsc"
                    : "bg-marca-pista text-marca-grisTenue"
              }`}
            >
              {peldano.nivel}
            </div>

            {peldano.estado === "actual" && (
              <p className="absolute inset-x-0 top-full mt-1.5 whitespace-nowrap text-center text-[11.5px] font-semibold leading-none text-marca-verdeOsc">
                Estás aquí
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
