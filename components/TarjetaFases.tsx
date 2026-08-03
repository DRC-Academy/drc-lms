// ---------------------------------------------------------------
// TARJETA DE FASES
// Los cinco ejercicios del bloque agrupados en las tres fases.
// No es un rail de navegación: es una pieza de contenido acotada,
// con la altura de su contenido. Por eso nunca lleva h-full,
// min-h-screen ni flex-1.
// Informa, no navega: dentro de un bloque el orden es secuencial.
// Solo se muestra a partir de `lg`.
// ---------------------------------------------------------------

import type { Ejercicio } from "@/lib/data";

type Tipo = Ejercicio["tipo"];

const FASES = {
  reconocer: { nombre: "Reconocer", numero: 1, accion: "Elige la forma" },
  transformar: { nombre: "Transformar", numero: 2, accion: "Reescribe" },
  producir: { nombre: "Producir", numero: 3, accion: "Escribe tú" },
} as const;

const ORDEN: Tipo[] = ["reconocer", "transformar", "producir"];

export const nombreFase = (tipo: Tipo) => FASES[tipo].nombre;
export const numeroFase = (tipo: Tipo) => FASES[tipo].numero;

/**
 * "produccion" es un pendiente distinto: se pinta en amarillo para
 * avisar de antemano de que ese ejercicio es el exigente.
 */
type EstadoPaso = "completado" | "actual" | "pendiente" | "produccion";

type Paso = { indice: number; tipo: Tipo; estado: EstadoPaso };
type Grupo = { tipo: Tipo; pasos: Paso[] };

function agrupar(ejercicios: Ejercicio[], actual: number): Grupo[] {
  const pasos: Paso[] = ejercicios.map((ejercicio, indice) => ({
    indice,
    tipo: ejercicio.tipo,
    estado:
      indice < actual
        ? "completado"
        : indice === actual
        ? "actual"
        : ejercicio.tipo === "producir"
        ? "produccion"
        : "pendiente",
  }));

  return ORDEN.map((tipo) => ({ tipo, pasos: pasos.filter((p) => p.tipo === tipo) })).filter(
    (grupo) => grupo.pasos.length > 0
  );
}

const FILA: Record<EstadoPaso, string> = {
  completado: "bg-marca-verde/5 text-marca-tinta",
  actual: "bg-marca-verde/10 font-medium text-marca-tinta",
  pendiente: "text-drc-cuerpo",
  produccion: "bg-marca-amarillo/10 text-marca-tinta",
};

const CIRCULO: Record<EstadoPaso, string> = {
  completado: "bg-marca-verde text-white",
  actual: "bg-marca-verde text-white",
  pendiente: "border-2 border-marca-borde text-drc-cuerpo",
  produccion: "border-2 border-marca-amarillo bg-marca-amarillo/20 text-marca-tinta",
};

export function TarjetaFases({
  titulo,
  indice,
  ejercicios,
  profesor,
}: {
  titulo: string;
  /** Índice del ejercicio en curso, empezando en 0. */
  indice: number;
  ejercicios: Ejercicio[];
  profesor?: string;
}) {
  const grupos = agrupar(ejercicios, indice);

  return (
    <aside className="hidden w-[230px] shrink-0 grow-0 rounded-2xl border border-marca-borde bg-white p-5 lg:block">
      <h2 className="font-display text-[15px] font-semibold leading-[1.25] text-marca-tinta">
        {titulo}
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        {grupos.map((grupo) => (
          <div key={grupo.tipo}>
            <h3 className="text-[10px] font-semibold uppercase leading-[1.2] tracking-widest text-drc-cuerpo">
              {FASES[grupo.tipo].nombre}
            </h3>
            <ol className="mt-2 flex flex-col gap-0.5">
              {grupo.pasos.map((paso) => (
                <li
                  key={paso.indice}
                  aria-current={paso.estado === "actual" ? "step" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${FILA[paso.estado]}`}
                >
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold leading-none tabular-nums ${
                      CIRCULO[paso.estado]
                    }`}
                  >
                    {paso.estado === "completado" ? "✓" : paso.indice + 1}
                  </span>
                  <span className="truncate text-[13px] leading-snug">
                    {FASES[paso.tipo].accion}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* Va justo debajo de la lista, no anclado al fondo de la tarjeta. */}
      {profesor && (
        <div className="mt-5 flex items-center gap-2 border-t border-marca-borde pt-4">
          <span
            aria-hidden
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-marca-verde text-[10px] font-semibold leading-none text-white"
          >
            {profesor[0]}
          </span>
          <p className="text-[11px] leading-[1.4] text-drc-cuerpo">
            {profesor} verá tu respuesta antes de la clase.
          </p>
        </div>
      )}
    </aside>
  );
}
