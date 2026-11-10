"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import IconoPrueba from "@/components/prueba-nivel/IconoPrueba";
import { pruebaEnBarra } from "@/lib/prueba-nivel/barra";
import type { EstadoBloque } from "@/lib/prueba-nivel/servidor";

// ---------------------------------------------------------------
// LA PRUEBA DE NIVEL, CORTA: EN LA BARRA DE ESCRITORIO Y EN LA HOJA DEL
// PERFIL EN MÓVIL
//
// El estado llega hecho con los datos del marco (el mismo que pinta el
// bloque del inicio); qué versión toca lo decide `pruebaEnBarra`. Null en
// el marco —interruptor apagado o con plan con profesor— y aquí no hay nada.
//
// BARRA (escritorio): debajo del anillo del curso. Plegada, un botón
// redondo verde con la diana (o el nivel, si ya la hizo); abierta, a su
// lado, el botón con su texto y la línea de debajo, como el anillo.
//
// HOJA (móvil): arriba de la hoja del perfil, el botón a lo ancho.
//
// Todo el texto en tinta; el botón, el verde de acción (`btn-verde`).
// ---------------------------------------------------------------

export type PruebaDelMarco = { estado: EstadoBloque; href: string };

export default function PruebaEnLaBarra({
  prueba,
  variante,
  alPulsar,
}: {
  prueba: PruebaDelMarco | null | undefined;
  variante: "barra" | "hoja";
  /** En la hoja: cerrarla al ir a la prueba. */
  alPulsar?: () => void;
}) {
  const t = usarIdioma().t.pruebaNivel;
  const ruta = usePathname() ?? "/";
  const que = pruebaEnBarra(prueba?.estado, ruta);
  if (!prueba || !que) return null;

  const boton = que.tipo === "nueva" ? t.barraNuevaBoton : que.tipo === "en_curso" ? t.barraEnCursoBoton : null;
  const linea =
    que.tipo === "nueva" ? t.barraNuevaTexto : que.tipo === "en_curso" ? t.barraEnCursoTexto(que.respondidas, que.total) : t.barraNivel(que.nivel);

  if (variante === "hoja") {
    return (
      <div data-prueba-barra={que.tipo} className="mb-5 rounded-[14px] border border-marca-borde bg-white px-4 py-3.5">
        {boton ? (
          <>
            <Link
              href={prueba.href}
              onClick={alPulsar}
              className="btn-verde inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold"
            >
              <IconoPrueba tamano={20} />
              {boton}
            </Link>
            <p className="mt-2 text-center text-[13.5px] leading-[1.4] text-marca-tinta">{linea}</p>
          </>
        ) : (
          <p className="flex items-center gap-2.5 text-[15px] font-semibold text-marca-tinta">
            <span aria-hidden className="text-marca-verdeOsc">
              <IconoPrueba tamano={20} />
            </span>
            {linea}
          </p>
        )}
      </div>
    );
  }

  // La barra. Plegada solo se ve el círculo; el texto de al lado es
  // absoluto y de ancho fijo, como el del anillo: al abrirse no salta nada.
  if (!boton) {
    return (
      <div data-prueba-barra={que.tipo} className="relative mb-[18px] px-[18px]">
        <p className="sr-only">{linea}</p>
        <span
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-full border border-marca-borde bg-white font-display text-[14px] font-bold text-marca-tinta"
        >
          {que.tipo === "nivel" ? que.nivel : null}
        </span>
        <p aria-hidden className="barra-rotulo absolute left-[74px] top-0 flex h-11 w-[180px] items-center font-display text-[14.5px] font-bold leading-tight text-marca-tinta">
          {linea}
        </p>
      </div>
    );
  }

  return (
    <div data-prueba-barra={que.tipo} className="relative mb-[18px] px-[18px]">
      <Link
        href={prueba.href}
        aria-label={`${boton}. ${linea}`}
        className="group flex w-fit rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
      >
        <span aria-hidden className="btn-verde grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <IconoPrueba tamano={22} />
        </span>
        <span aria-hidden className="barra-rotulo absolute left-[74px] top-0 w-[180px]">
          <span className="btn-verde flex min-h-[32px] w-fit items-center rounded-full px-3.5 text-[13.5px] font-bold leading-tight">{boton}</span>
          <span className="mt-1 block text-[12.5px] leading-snug text-marca-tinta">{linea}</span>
        </span>
      </Link>
    </div>
  );
}
