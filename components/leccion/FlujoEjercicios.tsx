"use client";

import { useMemo } from "react";
import { desdeCurso } from "@/lib/ejercicio-unificado";
import type { EjercicioVista } from "@/lib/ejercicios";
import VisorEjercicios, { type SucesoVisor } from "@/components/ejercicios/VisorEjercicios";
import CierreEjercicios from "@/components/ejercicios/CierreEjercicios";
import type { EstadoEjerciciosActual } from "@/components/leccion/PanelCurso";
import BotonCompletar from "@/components/leccion/BotonCompletar";

/**
 * Los ejercicios de la lección.
 *
 * EL VISOR YA NO ESTÁ AQUÍ. Es `components/ejercicios/VisorEjercicios`,
 * compartido con la práctica generada: había dos y divergían en cada
 * cambio. De este archivo solo queda lo que es del curso y de nadie
 * más —el registro de intentos y la pantalla de cierre, con su botón de
 * completar la lección— más la traducción de los ejercicios a la forma
 * única.
 *
 * Los textos del cierre salen de `t`, que baja del visor: es donde vive
 * el botón de idioma, así que pulsarlo aquí cambia también esta
 * pantalla. La lista de números escritos que había aquí —la misma once
 * palabras que en el visor— se fue a `lib/textos-ejercicios.ts`.
 */

/**
 * Deja constancia del intento sin que el alumno espere: la corrección ya
 * está pintada cuando esto sale. `keepalive` para que sobreviva si
 * responde el último y sigue en el mismo gesto. Que falle no se le
 * cuenta a nadie: perder un intento no puede cortar la lección.
 */
function registrarIntento(ejercicioId: string, correcto: boolean) {
  void fetch("/api/intento-ejercicio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ejercicioId, correcto }),
    keepalive: true,
  }).catch((error) => {
    console.error("[leccion] No se pudo registrar el intento:", error);
  });
}

export default function FlujoEjercicios({
  ejercicios,
  registrarIntentos,
  profesor,
  leccionId,
  cursoSlug,
  siguienteId,
  alSalir,
  alEstado,
  foco = null,
}: {
  ejercicios: EjercicioVista[];
  /** false para el equipo: revisa el curso, no lo cursa. */
  registrarIntentos: boolean;
  /** Va en el cierre: es lo que hace que esto no parezca una app genérica. */
  profesor: string;
  leccionId: string;
  cursoSlug: string;
  siguienteId: string | null;
  /**
   * Vuelve a la TEORÍA de esta lección. No es la salida de la pantalla
   * —esa la pone el visor y lleva al curso— sino el camino de vuelta al
   * texto que los ejercicios acompañan, que es otro sitio y otra cosa.
   */
  alSalir: () => void;
  /**
   * Por dónde van los ejercicios, para el panel del curso: por cuál se
   * va y cuáles llevan respuesta. Lo emite el visor tal cual.
   */
  alEstado?: (estado: EstadoEjerciciosActual) => void;
  /** Contexto de revisión. Ver `lib/foco.ts`. */
  foco?: string | null;
}) {
  const unificados = useMemo(() => ejercicios.map(desdeCurso), [ejercicios]);

  function alSuceso(suceso: SucesoVisor) {
    // El curso solo guarda intentos. Ni avance ni producción: la lección
    // no lleva un "iba por la mitad", y su cierre es marcarla completada.
    if (suceso.tipo === "intento") registrarIntento(suceso.ejercicio.id, suceso.correcto);
  }

  return (
    <VisorEjercicios
      ejercicios={unificados}
      alSuceso={alSuceso}
      alEstado={alEstado}
      guardarIntentos={registrarIntentos}
      cierre={({ aciertos, total, repetir, verEjercicio, acertado, t }) => (
        <CierreEjercicios
          etiqueta={t.ejerciciosTerminados}
          // El diseño decía "Los cinco, correctos", pero cinco es la
          // media y no la regla: hay lecciones de uno y de quince.
          titulo={t.resultadoLeccion(aciertos, total)}
          texto={t.cierreLeccion(aciertos, total, profesor)}
          ejercicios={unificados}
          acertado={acertado}
          verEjercicio={verEjercicio}
          t={t}
          acciones={
            <>
              <BotonCompletar
                leccionId={leccionId}
                cursoSlug={cursoSlug}
                siguienteId={siguienteId}
                foco={foco}
                className="w-full rounded-full btn-verde px-8 py-[15px] text-[16px] font-semibold min-[900px]:order-2 min-[900px]:w-auto"
              >
                {t.completarYSeguir}
              </BotonCompletar>

              <button
                type="button"
                onClick={repetir}
                className="w-full rounded-full btn-verde-linea px-8 py-[13.5px] text-[16px] font-semibold min-[900px]:order-1 min-[900px]:w-auto"
              >
                {t.repetirLosEjercicios}
              </button>
            </>
          }
          pie={
            <button
              type="button"
              onClick={alSalir}
              className="mt-5 text-[14px] text-marca-grisSuave transition-colors hover:text-marca-tinta"
            >
              {t.volverALaTeoria}
            </button>
          }
        />
      )}
    />
  );
}
