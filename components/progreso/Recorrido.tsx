import type { ClaseDelRecorrido } from "@/lib/gestion";
import { formatearFechaLarga } from "@/lib/perfil";
import { esHito } from "@/lib/recorrido";

/**
 * EL RECORRIDO CLASE A CLASE. La pieza con más peso de la pantalla, y no
 * por tamaño: es lo único del producto que ninguna aplicación puede
 * copiar. Un curso lo tiene cualquiera y los ejercicios los genera una
 * máquina; que alguien se acuerde de lo que hiciste el 19 de agosto y lo
 * escriba con tu nombre dentro, no.
 *
 * Por eso va SIN TARJETA CONTENEDORA y a ancho completo, mientras las
 * cifras de arriba viven apretadas en una sola caja. La jerarquía de la
 * pantalla se lee antes de leer una palabra.
 *
 * LAS SEIS PRIMERAS Y EL RESTO EN UN `<details>`. La mediana es de tres
 * clases, así que a la mayoría se le enseña entero sin desplegar nada; el
 * desplegable existe para el alumno de 22 clases, cuyo recorrido llenaría
 * cuatro pantallas de móvil. `<details>` nativo, como el resto de la
 * aplicación: funciona sin JavaScript y el lector de pantalla lo anuncia
 * solo.
 */
const VISIBLES = 6;

export default function Recorrido({
  clases,
  totalClases,
  profesor,
}: {
  clases: ClaseDelRecorrido[];
  /** Todas las registradas, con informe o sin él. */
  totalClases: number;
  profesor: string;
}) {
  const primeras = clases.slice(0, VISIBLES);
  const resto = clases.slice(VISIBLES);

  return (
    <section className="mt-7 min-[900px]:mt-9">
      <h2 className="text-[19px] font-bold tracking-[-0.01em] text-marca-tinta min-[900px]:text-[22px]">
        Tu recorrido, clase a clase
      </h2>

      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-marca-gris min-[900px]:text-[14.5px]">
        {textoDelPie(clases.length, totalClases, profesor)}
      </p>

      {clases.length === 0 ? (
        <Vacio />
      ) : (
        <>
          <Lista clases={primeras} />

          {resto.length > 0 && (
            <details className="group mt-3">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-center gap-2 rounded-[14px] border border-marca-borde bg-white px-5 text-[14px] font-semibold text-marca-verdeOsc transition-colors hover:bg-marca-niebla [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">
                  Ver las {resto.length} clases anteriores
                </span>
                <span className="hidden group-open:inline">Ver menos</span>
                <span aria-hidden className="text-[11px]">
                  <span className="group-open:hidden">▾</span>
                  <span className="hidden group-open:inline">▴</span>
                </span>
              </summary>

              <Lista clases={resto} />
            </details>
          )}
        </>
      )}
    </section>
  );
}

/**
 * La bajada dice de dónde sale esto y, si hace falta, por qué el número
 * de clases hechas no cuadra con el de tarjetas.
 *
 * ESA DIFERENCIA HAY QUE NOMBRARLA. Hoy 351 de 867 informes fallaron, y
 * a un alumno con 18 clases hechas y 9 resúmenes el silencio le deja
 * pensar que perdimos la mitad de sus clases. La frase no le cuenta
 * nuestra tubería de análisis: le dice qué está mirando.
 */
function textoDelPie(conResumen: number, totalClases: number, profesor: string): string {
  const nombreProfesor = profesor.trim().split(/\s+/)[0] ?? "";
  const firma = nombreProfesor ? `${nombreProfesor} escribe` : "Tu profesor escribe";

  if (conResumen === 0) {
    return `${firma} un resumen después de cada clase. Aquí irán apareciendo.`;
  }

  if (totalClases > conResumen) {
    return `${firma} un resumen después de cada clase. Aquí están los ${conResumen} que ya tienes.`;
  }

  return `${firma} un resumen después de cada clase. Este es el tuyo, entero.`;
}

function Vacio() {
  return (
    <p className="mt-3.5 rounded-[16px] border border-dashed border-marca-bordeSuave bg-white px-[18px] py-6 text-center text-[14px] leading-[1.6] text-marca-gris min-[900px]:px-[22px]">
      Todavía no hay ninguno. Después de tu próxima clase, aquí aparecerá lo que hayáis
      trabajado.
    </p>
  );
}

/**
 * LA LÍNEA DE TIEMPO. El punto y la línea vertical van en el `<li>` con
 * pseudo-elementos y no como columna aparte, para que el trazo no se
 * corte entre la lista de arriba y la del desplegable.
 */
function Lista({ clases }: { clases: ClaseDelRecorrido[] }) {
  return (
    <ol className="mt-3.5 space-y-3">
      {clases.map((clase) => {
        const hito = clase.numero !== null && esHito(clase.numero);

        return (
          <li key={clase.id} className="relative pl-6 min-[900px]:pl-7">
            {/* El punto. Verde relleno en un hito, hueco el resto. */}
            <span
              aria-hidden
              className={`absolute left-0 top-[19px] h-[11px] w-[11px] rounded-full border-2 ${
                hito ? "border-marca-verde bg-marca-verde" : "border-marca-puntoPendiente bg-white"
              }`}
            />
            {/* El trazo que une un punto con el siguiente. */}
            <span
              aria-hidden
              className="absolute bottom-[-12px] left-[5px] top-[30px] w-[1.5px] bg-marca-pista"
            />

            <article className="rounded-[16px] border border-marca-borde bg-white px-[18px] py-4 min-[900px]:px-[22px] min-[900px]:py-[18px]">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {/* Casi ninguna fila trae número de clase, así que manda
                    la fecha. Cuando lo trae, va delante. */}
                {clase.numero !== null && (
                  <span className="text-[12.5px] font-bold uppercase tracking-[0.04em] text-marca-verdeOsc">
                    Clase {clase.numero}
                  </span>
                )}

                {clase.fechaClase !== "" && (
                  <span
                    className={
                      clase.numero !== null
                        ? "text-[12.5px] text-marca-grisSuave"
                        : "text-[12.5px] font-bold uppercase tracking-[0.04em] text-marca-verdeOsc"
                    }
                  >
                    {formatearFechaLarga(clase.fechaClase)}
                  </span>
                )}

                {hito && (
                  <span className="rounded-full bg-marca-verdeFondo px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-marca-verdeOsc">
                    Hito
                  </span>
                )}
              </div>

              {clase.titulo !== "" && (
                <h3 className="mt-2 text-[15.5px] font-bold leading-[1.35] text-marca-tinta min-[900px]:text-[16.5px]">
                  {clase.titulo}
                </h3>
              )}

              {clase.resumen !== "" && (
                <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-marca-tintaCuerpo min-[900px]:text-[15px]">
                  {clase.resumen}
                </p>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
