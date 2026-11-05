import type { ReactNode } from "react";

/**
 * LAS PIEZAS DE LOS ESQUELETOS (`app/(alumno)/…/loading.tsx`).
 *
 * Lo que no depende de ningún dato —las tarjetas, las separaciones, el
 * ancho de la columna— se pinta ya, igual que en la pantalla de verdad. Lo
 * que se está trayendo de la base va en un bloque gris con un pulso suave
 * (`.esq` en `globals.css`, quieto con movimiento reducido).
 *
 * Las medidas salen de la pantalla real con su contenido, en móvil y en
 * escritorio: si no cuadran, el contenido salta al llegar y el salto se
 * nota más que la espera. Sin textos y sin datos de nadie: Next guarda
 * este HTML unos minutos para poder enseñarlo al instante.
 */

/** Un bloque gris. Las medidas, en clases de Tailwind. */
export function Bloque({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`esq ${className}`} />;
}

/** Una tarjeta blanca, como las de la pantalla. */
export function TarjetaEsqueleto({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={`rounded-[16px] border border-marca-borde bg-white min-[900px]:rounded-[20px] ${className}`}>{children}</div>;
}

/**
 * El mueble común del inicio, «Clases» y «Para ti»: fondo niebla y la misma
 * columna que el `<main>` de esas pantallas. `aria-busy` es lo que dice a
 * los lectores de pantalla que el contenido está por llegar.
 */
export function PantallaEsqueleto({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true" className="flex min-h-screen flex-col bg-marca-niebla">
      <main className="mx-auto w-full max-w-contenido flex-1 px-4 pb-8 pt-[18px] min-[900px]:px-9 min-[900px]:pb-11 min-[900px]:pt-8">{children}</main>
    </div>
  );
}

/** El título y la línea de debajo con los que abren «Clases» y el saludo. */
export function CabeceraEsqueleto({ anchoTitulo = "w-[170px] min-[900px]:w-[240px]", anchoLinea = "w-[230px] min-[900px]:w-[340px]" }: { anchoTitulo?: string; anchoLinea?: string }) {
  return (
    <div className="mb-4 min-[900px]:mb-[22px]">
      <Bloque className={`h-[25px] min-[900px]:h-[35px] ${anchoTitulo}`} />
      <Bloque className={`mt-[5px] h-5 min-[900px]:mt-1.5 min-[900px]:h-[22px] ${anchoLinea}`} />
    </div>
  );
}

/** El título y los días de la semana: el calendario del inicio y de «Clases». */
export function SemanaEsqueleto({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between">
        <div>
          <Bloque className="h-6 w-[150px] min-[900px]:h-7 min-[900px]:w-[170px]" />
          <Bloque className="mt-2 h-4 w-[210px] min-[900px]:w-[280px]" />
        </div>
        <Bloque className="hidden h-12 w-[150px] rounded-full min-[900px]:block" />
      </div>
      <TarjetaEsqueleto className="mt-4 h-[120px] px-1.5 py-3 min-[900px]:h-[268px] min-[900px]:px-4 min-[900px]:py-4">
        <div className="grid grid-cols-7 gap-1 min-[900px]:gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((dia) => (
            <div key={dia} className="flex flex-col items-center gap-2.5">
              <Bloque className="h-3 w-7 min-[900px]:w-9" />
              <Bloque className="h-9 w-9 rounded-full min-[900px]:h-11 min-[900px]:w-11" />
            </div>
          ))}
        </div>
      </TarjetaEsqueleto>
      {/* En móvil las clases de la semana van debajo, una por fila. */}
      <div className="mt-3 flex flex-col gap-3 min-[900px]:hidden">
        <TarjetaEsqueleto className="h-[92px]" />
        <TarjetaEsqueleto className="h-[92px]" />
        <TarjetaEsqueleto className="h-[92px]" />
      </div>
    </section>
  );
}

/** Una lección del panel: el punto y una o dos líneas de título. */
function ItemPanel({ dosLineas }: { dosLineas: boolean }) {
  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2.5">
      <span aria-hidden className="mt-[2px] h-4 w-4 shrink-0 rounded-full border-[1.5px] border-marca-puntoPendiente" />
      <span className="min-w-0 flex-1">
        <Bloque className="h-[11px] w-full" />
        {dosLineas && <Bloque className="mt-[7px] h-[11px] w-2/3" />}
        <Bloque className="mt-[9px] h-[9px] w-1/3" />
      </span>
    </div>
  );
}

/**
 * LA LECCIÓN Y EL BLOQUE: panel a la izquierda y columna de 760px con el
 * título, el paso a paso y el contenedor. Las medidas son las de
 * `PantallaConPanel` y `PanelCurso`.
 *
 * La barra de iconos no está aquí: vive en el layout y sigue a la vista.
 */
export function PantallaConPanelEsqueleto({ textoLector }: { textoLector?: string }) {
  return (
    <div className="flex flex-1 items-stretch bg-marca-niebla" aria-busy="true">
      {/* ------------------------------ EL PANEL ------------------------------ */}
      <aside
        aria-hidden
        className="hidden w-[330px] shrink-0 border-r border-marca-borde bg-white min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:block min-[1200px]:h-dvh"
      >
        <div className="px-4 pb-6 pt-7">
          <Bloque className="h-[22px] w-[110px]" />
          <Bloque className="mt-3 h-[11px] w-[220px]" />

          <div className="mt-[22px] flex flex-col gap-2">
            <div className="rounded-[12px] border border-marca-borde bg-white px-4 py-3.5">
              <Bloque className="h-[9px] w-[90px]" />
              <Bloque className="mt-2.5 h-[13px] w-4/5" />
            </div>

            <div className="rounded-[12px] border border-marca-borde bg-white">
              <div className="px-4 py-3.5">
                <Bloque className="h-[9px] w-[90px]" />
                <Bloque className="mt-2.5 h-[13px] w-full" />
                <Bloque className="mt-2 h-[13px] w-1/2" />
              </div>
              <div className="px-2.5 pb-2.5">
                <div className="flex items-start gap-4 rounded-[12px] bg-marca-niebla p-3.5">
                  <div className="flex flex-1 flex-col gap-3">
                    <Bloque className="h-[11px] w-[120px]" />
                    <Bloque className="h-[5px] w-full" />
                    <Bloque className="h-[5px] w-full" />
                    <Bloque className="h-[10px] w-3/4" />
                  </div>
                  <span aria-hidden className="h-16 w-16 shrink-0 rounded-full border-[6px] border-marca-pista" />
                </div>
                <div className="mt-2 px-1.5 py-2.5">
                  <Bloque className="h-[11px] w-[70px]" />
                </div>
                <ItemPanel dosLineas />
                <ItemPanel dosLineas={false} />
                <ItemPanel dosLineas />
                <ItemPanel dosLineas />
                <ItemPanel dosLineas={false} />
                <ItemPanel dosLineas />
              </div>
            </div>

            <div className="rounded-[12px] border border-marca-borde bg-white px-4 py-3.5">
              <Bloque className="h-[9px] w-[90px]" />
              <Bloque className="mt-2.5 h-[13px] w-3/4" />
            </div>
          </div>
        </div>
      </aside>

      {/* ----------------------------- LA PANTALLA ---------------------------- */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {textoLector && <span className="sr-only">{textoLector}</span>}

        {/* El idioma va en la esquina de esta pantalla: `data-esquina-idioma`
            esconde la fila común, igual que en la de verdad. Sin esto, todo
            bajaría 44px en el esqueleto y subiría al llegar el contenido. */}
        <span
          data-esquina-idioma
          aria-hidden
          className="absolute right-6 top-5 hidden h-8 w-[72px] rounded-full border border-marca-borde bg-white min-[900px]:block"
        />

        {/* La fila de móvil: la X, el rótulo y el idioma. */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3 min-[900px]:hidden">
          <span aria-hidden className="h-10 w-10 shrink-0 rounded-full border border-marca-borde bg-white" />
          <div className="flex flex-1 justify-center">
            <Bloque className="h-[10px] w-[110px]" />
          </div>
          <span aria-hidden className="h-[30px] w-[72px] rounded-full border border-marca-borde bg-white" />
        </div>

        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-8 pt-5 min-[900px]:px-8 min-[900px]:pb-10 min-[900px]:pt-[76px]">
          <div className="relative flex flex-col items-center">
            <span aria-hidden className="absolute left-0 top-1 hidden h-10 w-10 rounded-full border border-marca-borde bg-white min-[900px]:block" />
            <Bloque className="hidden h-[10px] w-[180px] min-[900px]:block" />
            <Bloque className="mt-3 h-[26px] w-4/5 min-[900px]:mt-5 min-[900px]:h-[30px]" />
            <Bloque className="mt-2 h-[26px] w-3/5 min-[900px]:h-[30px]" />
            <Bloque className="mt-4 h-[12px] w-2/3" />
          </div>

          {/* El paso a paso: seis círculos vacíos unidos por la línea. */}
          <div className="mt-6 hidden items-center min-[900px]:mt-9 min-[900px]:flex">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="relative flex h-8 flex-1 items-center justify-center">
                {i > 0 && <span aria-hidden className="absolute left-0 right-1/2 top-[15px] h-[2px] bg-marca-pista" />}
                {i < 5 && <span aria-hidden className="absolute left-1/2 right-0 top-[15px] h-[2px] bg-marca-pista" />}
                <span aria-hidden className="relative h-8 w-8 rounded-full border-[1.5px] border-marca-puntoPendiente bg-white" />
              </div>
            ))}
          </div>
          <div className="mt-6 min-[900px]:hidden">
            <div className="flex justify-between">
              <Bloque className="h-[11px] w-[80px]" />
              <Bloque className="h-[11px] w-[120px]" />
            </div>
            <Bloque className="mt-2.5 h-[5px] w-full" />
          </div>

          {/* El contenedor de la parte, con sus líneas. */}
          <div className="mt-5 rounded-[16px] border border-marca-borde bg-white px-5 py-6 min-[900px]:mt-7 min-[900px]:px-11 min-[900px]:py-8">
            <Bloque className="h-[10px] w-[90px]" />
            <Bloque className="mt-3 h-[22px] w-1/2" />
            <div className="mt-6 flex flex-col gap-3">
              <Bloque className="h-4 w-full" />
              <Bloque className="h-4 w-full" />
              <Bloque className="h-4 w-11/12" />
              <Bloque className="mt-4 h-4 w-full" />
              <Bloque className="h-4 w-4/5" />
              <Bloque className="mt-4 h-4 w-full" />
              <Bloque className="h-4 w-full" />
              <Bloque className="h-4 w-2/3" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 min-[900px]:mt-5 min-[900px]:gap-3.5">
            <span aria-hidden className="h-12 w-12 shrink-0 rounded-full border border-marca-borde bg-white min-[900px]:h-[46px] min-[900px]:w-[110px]" />
            <Bloque className="h-12 flex-1 rounded-full min-[900px]:h-[48px]" />
          </div>
        </div>
      </main>
    </div>
  );
}
