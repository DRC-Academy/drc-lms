"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Bloque } from "@/lib/data";
import { buscarBloqueGenerado } from "@/lib/progreso";
import Cabecera from "@/components/Cabecera";
import Practica from "@/components/Practica";

/**
 * La página de práctica se resuelve en el servidor contra `lib/data.ts`,
 * así que los bloques generados por la IA no existen ahí: viven en el
 * navegador. Cuando el bloque no es estático, lo buscamos aquí.
 */
export default function PracticaCargador({
  alumnoId,
  nombre,
  bloqueId,
  bloqueEstatico,
}: {
  alumnoId: string;
  nombre: string;
  bloqueId: string;
  bloqueEstatico: Bloque | null;
}) {
  const [bloque, setBloque] = useState<Bloque | null>(bloqueEstatico);
  const [buscando, setBuscando] = useState(bloqueEstatico === null);

  useEffect(() => {
    if (bloqueEstatico) return;
    setBloque(buscarBloqueGenerado(alumnoId, bloqueId));
    setBuscando(false);
  }, [alumnoId, bloqueId, bloqueEstatico]);

  return (
    <>
      <Cabecera nombre={nombre} />

      {bloque ? (
        <Practica bloque={bloque} alumnoId={alumnoId} />
      ) : buscando ? (
        <div className="esqueleto mx-auto max-w-2xl px-6 py-10" aria-label="Cargando el bloque">
          <div className="h-1.5 w-full rounded-full bg-drc-suave" />
          <div className="mt-9 h-[26px] w-[70%] rounded-md bg-drc-suave" />
          <div className="mt-3 h-[26px] w-[45%] rounded-md bg-drc-suave" />
          <div className="mt-8 flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="h-[58px] rounded-xl bg-drc-suave" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-md px-6 pt-16 text-center">
          <div className="tarjeta">
            <h1 className="font-display text-[24px] font-semibold leading-tight text-drc-titular">
              Este bloque ya no está aquí
            </h1>
            <p className="mt-3 text-[15px] leading-[1.55] text-drc-cuerpo">
              Los bloques que generas se guardan en este navegador. Si has cambiado de dispositivo o
              has borrado los datos, genera uno nuevo y seguimos donde lo dejaste.
            </p>
            <Link href={`/alumno/${alumnoId}`} className="btn btn-primario mt-7 min-h-[48px] w-full">
              Volver a mis bloques
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
