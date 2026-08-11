/**
 * Los cuatro números del inicio.
 *
 * Se esconde entera cuando el alumno todavía no ha hecho nada. Cuatro
 * ceros no informan de nada y lo único que consiguen es recibir a quien
 * acaba de entrar con un boletín de notas en blanco.
 *
 * El nivel no cuenta como dato para esa decisión: lo tiene todo el mundo
 * desde el primer día y no dice nada de lo que el alumno ha hecho.
 *
 * Sin gráficos ni librerías: un número grande y su etiqueta.
 */
export default function TiraEstadisticas({
  porcentajeCurso,
  dominados,
  aciertos,
  nivel,
}: {
  /** % de lecciones del curso completadas, o null si no tiene curso. */
  porcentajeCurso: number | null;
  /** Bloques de práctica dominados, o null si nunca practicó. */
  dominados: number | null;
  /** % de acierto medio en práctica, o null si nunca practicó. */
  aciertos: number | null;
  nivel: string;
}) {
  const hayDatos = porcentajeCurso !== null || dominados !== null || aciertos !== null;
  if (!hayDatos) return null;

  const casillas: { valor: string; etiqueta: string }[] = [
    { valor: porcentajeCurso === null ? "—" : `${porcentajeCurso}%`, etiqueta: "Del curso" },
    { valor: dominados === null ? "—" : String(dominados), etiqueta: "Bloques dominados" },
    { valor: aciertos === null ? "—" : `${aciertos}%`, etiqueta: "De aciertos" },
    { valor: nivel.trim() === "" ? "—" : nivel.trim(), etiqueta: "Tu nivel" },
  ];

  return (
    <section aria-label="Tu progreso" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {casillas.map((casilla) => (
        <div
          key={casilla.etiqueta}
          className="rounded-2xl border border-marca-borde bg-white px-4 py-5 text-center"
        >
          <p className="font-display text-[26px] font-semibold leading-none tabular-nums text-marca-tinta sm:text-[30px]">
            {casilla.valor}
          </p>
          {/* leading-[1.35] para que "Bloques dominados" parta en dos
              líneas en móvil sin recortarse. */}
          <p className="mt-2.5 text-[11px] font-semibold uppercase leading-[1.35] tracking-[0.1em] text-drc-cuerpo">
            {casilla.etiqueta}
          </p>
        </div>
      ))}
    </section>
  );
}
