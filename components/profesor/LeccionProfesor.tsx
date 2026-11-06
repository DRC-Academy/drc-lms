"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CierreEjercicios from "@/components/ejercicios/CierreEjercicios";
import VisorEjercicios from "@/components/ejercicios/VisorEjercicios";
import ProveedorIdioma from "@/components/ProveedorIdioma";
import { desdeCurso } from "@/lib/ejercicio-unificado";
import type { EjercicioVista } from "@/lib/ejercicios";

// ---------------------------------------------------------------
// UNA LECCIÓN, PARA EL PROFESOR
//
// El mismo texto, el mismo vídeo y el mismo visor de ejercicios que ve el
// alumno, para que lo que se revisa sea lo que hay. Lo que cambia:
//
//   · Se responde y se corrige igual, pero NO SE GUARDA NADA: sin `alSuceso`
//     el visor no avisa a nadie, y aquí no hay botón de completar.
//   · Sin mascota, y el texto de la lección de una vez, sin el paso a paso,
//     que solo deja avanzar en orden.
//   · En español siempre, sea cual sea la cookie de idioma: de ahí el
//     proveedor propio. No hay botón para cambiarlo.
//
// Los enlaces llegan ya hechos del servidor, con el `?como=` de «Ver como»
// si lo hay: aquí no se decide nada.
// ---------------------------------------------------------------

type Vista = "contenido" | "ejercicios";

const TARJETA = "rounded-[16px] border border-marca-borde bg-white px-5 py-6 min-[900px]:px-11 min-[900px]:py-8";

export default function LeccionProfesor(props: {
  titulo: string;
  videoIncrustado: string | null;
  html: string | null;
  ejercicios: EjercicioVista[];
  anteriorHref: string | null;
  siguienteHref: string | null;
}) {
  return (
    <ProveedorIdioma idioma="es">
      <Dentro {...props} />
    </ProveedorIdioma>
  );
}

function Dentro({
  titulo,
  videoIncrustado,
  html,
  ejercicios,
  anteriorHref,
  siguienteHref,
}: {
  titulo: string;
  videoIncrustado: string | null;
  html: string | null;
  ejercicios: EjercicioVista[];
  anteriorHref: string | null;
  siguienteHref: string | null;
}) {
  const hayContenido = videoIncrustado !== null || html !== null;
  const hayEjercicios = ejercicios.length > 0;
  const [vista, setVista] = useState<Vista>(hayContenido ? "contenido" : "ejercicios");
  const unificados = useMemo(() => ejercicios.map(desdeCurso), [ejercicios]);

  return (
    <div className="mt-5">
      {hayContenido && hayEjercicios && (
        <div className="mb-4 flex gap-2">
          <BotonVista activo={vista === "contenido"} alPulsar={() => setVista("contenido")}>
            Contenido
          </BotonVista>
          <BotonVista activo={vista === "ejercicios"} alPulsar={() => setVista("ejercicios")}>
            Ejercicios ({ejercicios.length})
          </BotonVista>
        </div>
      )}

      {!hayContenido && !hayEjercicios && (
        <section className={TARJETA}>
          <p className="text-[15px] leading-[1.5] text-marca-tintaMedia">Esta lección todavía no tiene contenido.</p>
        </section>
      )}

      {hayContenido && vista === "contenido" && (
        <section className={TARJETA}>
          {videoIncrustado && (
            <div className="relative aspect-video overflow-hidden rounded-[12px] border border-marca-bordeSuave bg-marca-pista">
              <iframe
                src={videoIncrustado}
                title={titulo}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          )}
          {html && <div className={videoIncrustado ? "leccion mt-5" : "leccion"} dangerouslySetInnerHTML={{ __html: html }} />}
        </section>
      )}

      {hayEjercicios && vista === "ejercicios" && (
        <VisorEjercicios
          ejercicios={unificados}
          sinMascota
          cierre={({ aciertos, total, repetir, verEjercicio, acertado, t }) => (
            <CierreEjercicios
              etiqueta={t.ejerciciosTerminados}
              titulo={t.resultadoLeccion(aciertos, total)}
              texto="Esto es una revisión: no se ha guardado nada."
              ejercicios={unificados}
              acertado={acertado}
              verEjercicio={verEjercicio}
              t={t}
              acciones={
                <button type="button" onClick={repetir} className="btn-verde-linea w-full rounded-full px-8 py-[13.5px] text-[16px] font-semibold min-[900px]:w-auto">
                  {t.repetirLosEjercicios}
                </button>
              }
            />
          )}
        />
      )}

      {(anteriorHref || siguienteHref) && (
        <nav aria-label="Lecciones del curso" className="mt-5 flex items-center justify-between gap-3">
          {anteriorHref ? <EnlaceLeccion href={anteriorHref}>← Anterior</EnlaceLeccion> : <span />}
          {siguienteHref && <EnlaceLeccion href={siguienteHref}>Siguiente →</EnlaceLeccion>}
        </nav>
      )}
    </div>
  );
}

function BotonVista({ activo, alPulsar, children }: { activo: boolean; alPulsar: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-pressed={activo}
      className={`min-h-[44px] rounded-full border px-4 text-[14px] font-semibold transition-colors ${
        activo ? "border-marca-tinta bg-marca-tinta text-white" : "border-marca-borde bg-white text-marca-tinta hover:bg-marca-niebla"
      }`}
    >
      {children}
    </button>
  );
}

function EnlaceLeccion({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex min-h-[44px] items-center rounded-full border border-marca-borde bg-white px-5 text-[14px] font-semibold text-marca-tinta transition-colors hover:bg-marca-niebla"
    >
      {children}
    </Link>
  );
}
