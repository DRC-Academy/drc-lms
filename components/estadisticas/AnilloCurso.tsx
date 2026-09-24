/**
 * El anillo del curso: cuánto llevas, en un círculo.
 *
 * Sin hooks ni estado, así que lo pinta igual el servidor (la fila del
 * inicio) que la barra lateral, que es de cliente.
 *
 * CON CERO LECCIONES NO HAY CIFRA. El aro queda en su pista, con una
 * flecha dentro que dice «por aquí se empieza»: el «0 %» se lee como una
 * nota y es lo que ve la mayoría de los alumnos al llegar. Con el curso
 * entero, una marca en vez del «100 %».
 *
 * `aria-hidden`: el anillo es dibujo. Lo que dice lo pone en texto quien
 * lo usa, al lado.
 */
export default function AnilloCurso({
  porcentaje,
  tamaño = 44,
  grosor = 4,
  className = "",
}: {
  /** 0–100. */
  porcentaje: number;
  tamaño?: number;
  grosor?: number;
  className?: string;
}) {
  const valor = Math.max(0, Math.min(100, Math.round(porcentaje)));
  const radio = (tamaño - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  // Un 1 % pintado con su parte proporcional sería un punto que no se ve:
  // cualquier avance real ocupa al menos un trozo que se distingue.
  const visible = valor === 0 ? 0 : Math.max(valor, 4);
  const cifra = tamaño >= 56 ? "text-[15px]" : "text-[11.5px]";

  return (
    <span aria-hidden className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: tamaño, height: tamaño }}>
      <svg viewBox={`0 0 ${tamaño} ${tamaño}`} width={tamaño} height={tamaño} className="-rotate-90">
        <circle cx={tamaño / 2} cy={tamaño / 2} r={radio} fill="none" stroke="#E8EEE9" strokeWidth={grosor} />
        {visible > 0 && (
          <circle
            cx={tamaño / 2}
            cy={tamaño / 2}
            r={radio}
            fill="none"
            stroke="#1E9E3A"
            strokeWidth={grosor}
            strokeLinecap="round"
            strokeDasharray={`${(visible / 100) * circunferencia} ${circunferencia}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        {valor === 0 ? (
          <svg viewBox="0 0 16 16" className="h-[40%] w-[40%]" fill="none" stroke="#1E9E3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10m-4-4 4 4-4 4" />
          </svg>
        ) : valor === 100 ? (
          <svg viewBox="0 0 16 16" className="h-[42%] w-[42%]" fill="none" stroke="#1E9E3A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        ) : (
          <span className={`font-display font-bold tabular-nums leading-none tracking-[-0.02em] text-marca-tinta ${cifra}`}>
            {valor}
            <span className="text-[0.7em]">%</span>
          </span>
        )}
      </span>
    </span>
  );
}
