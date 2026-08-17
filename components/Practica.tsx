"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Bloque } from "@/lib/data";
import { UMBRAL_DOMINADO } from "@/lib/progreso";
import { desdePractica } from "@/lib/ejercicio-unificado";
import LateralFases from "@/components/ejercicios/LateralFases";
import VisorEjercicios, { type SucesoVisor } from "@/components/ejercicios/VisorEjercicios";

/**
 * Un bloque de práctica generada.
 *
 * EL VISOR ES EL MISMO QUE EL DEL CURSO. Antes esta pantalla tenía el
 * suyo: apilaba el enunciado, las opciones y la corrección dentro de una
 * tarjeta, y cada mejora del curso —de uno en uno, teclado, segmentos de
 * progreso— se quedaba en el curso. Ahora las dos pintan con
 * `components/ejercicios/VisorEjercicios` y lo que llega aquí es solo lo
 * que de verdad es de la práctica:
 *
 *   - el lateral de las tres fases, con el aviso del profesor
 *   - el guardado de avance, progreso y producción
 *   - la pantalla de cierre con el porcentaje
 *
 * Los ejercicios se traducen a la forma única en `desdePractica`, así
 * que el visor no distingue un `reconocer` generado de un `single` del
 * curso: son lo mismo.
 */
export default function Practica({
  bloque,
  alumnoId,
  profesor,
}: {
  bloque: Bloque;
  alumnoId: string;
  profesor?: string;
}) {
  const router = useRouter();
  const unificados = useMemo(() => bloque.ejercicios.map(desdePractica), [bloque.ejercicios]);

  /**
   * Manda a guardar sin esperar respuesta.
   *
   * El alumno no tiene por qué esperar a una escritura para pasar al
   * ejercicio siguiente: la interfaz avanza y esto viaja por detrás.
   *
   * `keepalive` es lo que hace que la petición sobreviva a la
   * navegación. Sin él, terminar un bloque y volver a la ficha en el
   * mismo gesto cancelaría el guardado del último intento, que es justo
   * el que importa.
   *
   * El `alumnoId` NO se envía: lo pone el servidor a partir de la
   * cookie. Ver la cabecera de `app/api/progreso`.
   */
  function guardar(cuerpo: Record<string, unknown>) {
    void fetch("/api/progreso", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...cuerpo, bloqueId: bloque.id }),
      keepalive: true,
    })
      .then((respuesta) => {
        if (!respuesta.ok) {
          console.error(`[practica] El guardado respondió ${respuesta.status}`);
        }
      })
      .catch((error) => {
        // Se pierde este guardado y no se le dice al alumno: cortarle la
        // práctica por esto sería peor que perder un intento.
        console.error("[practica] No se pudo guardar:", error);
      });
  }

  function alSuceso(suceso: SucesoVisor) {
    switch (suceso.tipo) {
      // Deja constancia de por dónde iba: el bloque queda "en progreso".
      case "avance":
        guardar({ tipo: "avance", indice: suceso.indice, total: suceso.total });
        break;

      // El texto libre de la fase de producir, que es lo que llega al
      // profesor.
      case "produccion":
        guardar({ tipo: "produccion", ejercicioId: suceso.ejercicio.id, texto: suceso.texto });
        break;

      // El servidor borra el avance al recibir el intento: cerrar el
      // bloque y quitar la marca de "iba por la mitad" son lo mismo.
      case "final":
        guardar({ tipo: "progreso", aciertos: suceso.aciertos, total: suceso.total });
        break;

      // Los intentos sueltos no se guardan en la práctica: aquí lo que
      // cuenta es el resultado del bloque, que va en "final".
      case "intento":
        break;
    }
  }

  return (
    // El mismo fondo y la misma columna que la lección del curso. El
    // visor pone dentro la rejilla de 300px + contenido.
    <div className="flex flex-1 flex-col bg-marca-niebla">
      <VisorEjercicios
        ejercicios={unificados}
        textoSalir="Salir"
      alSalir={() => router.push(`/alumno/${alumnoId}`)}
      alSuceso={alSuceso}
      // Ancla el ejercicio a la clase de la que salió. Dato secundario:
      // una línea, sin adornos. En la fase de producir no se enseña,
      // porque ahí el alumno ya no está repasando nada concreto.
      notaAlPie={(ejercicio) =>
        bloque.claseOrigen && ejercicio.fase !== "producir" ? (
          <p className="mt-4 text-[12.5px] leading-[1.5] text-marca-grisSuave">
            Lo viste con {bloque.claseOrigen.profesor} el {bloque.claseOrigen.fecha}.
          </p>
        ) : null
      }
      lateral={({ indice, respondido, acertado }) => (
        <LateralFases
          titulo={bloque.titulo}
          ejercicios={unificados}
          indice={indice}
          respondido={respondido}
          acertado={acertado}
          profesor={profesor}
        />
      )}
      cierre={({ aciertos, total }) => {
        const pct = total > 0 ? Math.round((aciertos / total) * 100) : 0;
        const dominado = pct >= UMBRAL_DOMINADO;

        return (
          <div className="mx-auto max-w-md px-6 pt-14 text-center">
            <div className="tarjeta px-7 py-9">
              <div
                className={`celebra mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full font-display text-[20px] font-bold tabular-nums ${
                  dominado
                    ? "bg-drc-amarillo text-drc-titular"
                    : "bg-drc-chip-verde text-drc-verde-texto"
                }`}
              >
                {pct}%
              </div>
              <h2 className="font-display text-[26px] font-semibold leading-tight text-drc-titular">
                {bloque.titulo}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.55] text-drc-cuerpo">
                {pct === 100
                  ? "Bloque impecable. Esto ya lo tienes dominado."
                  : dominado
                    ? "Muy bien. Lo tienes cogido; un repaso en unos días y queda fijado."
                    : pct >= 60
                      ? "Buen avance. Lo que se resistió hoy vuelve la semana que viene."
                      : "Bloque exigente. Repítelo en un par de días y verás el salto."}
              </p>
              <Link
                href={`/alumno/${alumnoId}`}
                className="btn btn-primario mt-8 min-h-[50px] w-full text-[15px]"
              >
                Volver a mis bloques
              </Link>
            </div>
          </div>
        );
        }}
      />
    </div>
  );
}
