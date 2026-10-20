import Link from "next/link";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarMetricas } from "@/lib/panel-metricas";
import { leerRango } from "@/lib/panel-rango";
import { diaLocal } from "@/lib/fechas";
import { contraQue } from "@/lib/panel-formato";
import MarcoApp from "@/components/Navegacion";
import Chevron from "@/components/admin/Chevron";
import SelectorFechas from "@/components/panel/SelectorFechas";
import PanelMetricas from "@/components/panel/PanelMetricas";

export const dynamic = "force-dynamic";

/**
 * EL PANEL DEL EQUIPO, POR RANGO DE FECHAS.
 *
 * La pantalla del prototipo (`design/admin-dashboard-preview.html`) con
 * datos reales de `cargarMetricas` (`lib/panel-metricas.ts`).
 *
 * EL RANGO VIVE EN LA URL, `?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`, y es lo
 * único que hay en ella: la página se pinta entera en el servidor con
 * esas fechas, el botón de atrás deshace un cambio de rango y un enlace
 * copiado abre lo mismo. Sin parámetros, o con unos que no cumplen las
 * reglas (`leerRango`), la última semana completa.
 *
 * SE FUE EL PANEL ANTERIOR —`cargarPanel`, las siete cifras y la lista
 * filtrable con `?periodo=&ver=&orden=`—. Los enlaces viejos con esos
 * parámetros abren el rango por defecto; `#alumnos` sigue llevando a la
 * tabla de alumnos.
 */
export default async function Home({ searchParams }: { searchParams: { desde?: string | string[]; hasta?: string | string[] } }) {
  await exigirAdministrador();

  const ahora = new Date();
  const hoy = diaLocal(ahora);
  const { rango, porDefecto } = leerRango(searchParams.desde, searchParams.hasta, hoy);
  const pedidoMalo = porDefecto && (searchParams.desde !== undefined || searchParams.hasta !== undefined);
  const metricas = await cargarMetricas(rango);

  return (
    // La misma navegación que el alumno, sin secciones: el equipo no tiene
    // ninguna ficha de la que hablar. Le queda el símbolo y el perfil.
    <MarcoApp datos={{ alumnoId: "", nombre: "", miCurso: null, foco: null, revisando: false }}>
      {/* 20px de margen lateral en móvil: casi todo son filas que llegan
          hasta el borde de su tarjeta, y con 16 quedaban pegadas al canto. */}
      <main className="mx-auto w-full max-w-[1240px] px-5 pb-[72px] pt-7 lg:px-10 lg:pb-24 lg:pt-9">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verdeOsc">DRC Práctica · equipo</p>
            <h1 className="mt-2 font-display text-[30px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:text-[36px]">
              Cómo va la plataforma
            </h1>
            <nav aria-label="Otras secciones del equipo" className="mt-1 flex flex-wrap gap-x-4">
              <Link
                href="/entradas"
                className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold text-marca-verdeOsc hover:text-marca-tinta lg:min-h-0 lg:pt-2"
              >
                Entradas a clase
                <Chevron />
              </Link>
              <Link
                href="/garantia"
                className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold text-marca-verdeOsc hover:text-marca-tinta lg:min-h-0 lg:pt-2"
              >
                Garantía
                <Chevron />
              </Link>
            </nav>
          </div>
          <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
            <SelectorFechas rango={rango} hoy={hoy} />
            <p className="text-[13.5px] text-marca-tintaMedia sm:text-right">{contraQue(metricas.anterior, rango)}</p>
          </div>
        </header>

        {pedidoMalo && (
          <p className="mt-4 text-[13px] text-marca-grisSuave">Las fechas del enlace no eran válidas: se enseña la última semana completa.</p>
        )}

        <div className="mt-3">
          <PanelMetricas m={metricas} ahora={ahora} />
        </div>
      </main>
    </MarcoApp>
  );
}
