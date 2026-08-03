// ---------------------------------------------------------------
// BARRA DE FASES
// Muestra los cinco ejercicios del bloque agrupados en las tres
// fases. Es informativa, no navegable: dentro de un bloque el orden
// es secuencial y no se puede saltar.
// El objetivo es que el alumno vea desde el primer ejercicio que el
// último le va a pedir escribir, y no llegue de sorpresa.
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
  completado: "bg-drc-chip-verde/50 text-drc-titular",
  actual: "bg-drc-chip-verde font-medium text-drc-titular",
  pendiente: "text-drc-cuerpo",
  produccion: "bg-drc-amarillo/10 text-drc-titular",
};

const CIRCULO: Record<EstadoPaso, string> = {
  completado: "bg-drc-verde-solido text-white",
  actual: "bg-drc-verde-solido text-white",
  pendiente: "border-2 border-drc-borde text-drc-cuerpo",
  produccion: "border-2 border-drc-amarillo bg-drc-amarillo/20 text-drc-titular",
};

const PUNTO: Record<EstadoPaso, string> = {
  completado: "bg-drc-verde-solido",
  actual: "bg-drc-verde-solido ring-2 ring-drc-verde-solido/25",
  pendiente: "bg-drc-discontinuo",
  produccion: "bg-drc-amarillo",
};

// leading-[1.2] en vez de leading-none: con `truncate` (overflow hidden)
// un interlineado de 1 puede recortar la caja del texto.
const ETIQUETA_FASE = "text-[10px] font-semibold uppercase leading-[1.2] tracking-widest";

type Props = {
  titulo: string;
  minutos: number;
  /** Índice del ejercicio en curso, empezando en 0. */
  indice: number;
  ejercicios: Ejercicio[];
  profesor?: string;
};

/** Columna izquierda, solo a partir de `lg`. */
export function BarraFases({ titulo, minutos, indice, ejercicios, profesor }: Props) {
  const grupos = agrupar(ejercicios, indice);

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-drc-borde bg-drc-superficie lg:block">
      <div className="sticky top-14 flex min-h-[calc(100vh-3.5rem)] flex-col px-5 py-7">
        <div>
          <h2 className="font-display text-[15px] font-semibold leading-[1.25] text-drc-titular">
            {titulo}
          </h2>
          <p className="mt-1.5 text-[12px] tabular-nums text-drc-cuerpo">
            {minutos} min · {indice + 1} de {ejercicios.length}
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-5">
          {grupos.map((grupo) => (
            <div key={grupo.tipo}>
              <h3 className={`${ETIQUETA_FASE} text-drc-cuerpo`}>{FASES[grupo.tipo].nombre}</h3>
              <ol className="mt-2.5 flex flex-col gap-1">
                {grupo.pasos.map((paso) => (
                  <li
                    key={paso.indice}
                    aria-current={paso.estado === "actual" ? "step" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${FILA[paso.estado]}`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold leading-none tabular-nums ${
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

        {profesor && (
          <p className="mt-auto border-t border-drc-borde pt-4 text-[12px] leading-[1.45] text-drc-cuerpo">
            {profesor} verá tu respuesta antes de tu próxima clase.
          </p>
        )}
      </div>
    </aside>
  );
}

/**
 * Por debajo de `lg` la barra no puede robar ancho: se colapsa en una
 * fila de nombres de fase con un punto por ejercicio. Va oculta a
 * lectores de pantalla porque el contenido ya lleva la fase en texto
 * y el contador "1 de 5".
 */
export function FasesCompactas({ indice, ejercicios }: Pick<Props, "indice" | "ejercicios">) {
  const grupos = agrupar(ejercicios, indice);

  return (
    <div
      aria-hidden
      className="flex items-start gap-4 overflow-hidden border-b border-drc-borde bg-drc-superficie px-5 py-3 sm:gap-6 lg:hidden"
    >
      {grupos.map((grupo) => (
        // min-w-0 + truncate: en pantallas muy estrechas el nombre se
        // recorta antes que provocar scroll horizontal.
        <div key={grupo.tipo} className="min-w-0">
          <p className={`${ETIQUETA_FASE} truncate text-drc-cuerpo`}>{FASES[grupo.tipo].nombre}</p>
          <div className="mt-2 flex items-center gap-1.5">
            {grupo.pasos.map((paso) => (
              <span
                key={paso.indice}
                className={`h-2 w-2 shrink-0 rounded-full ${PUNTO[paso.estado]}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
