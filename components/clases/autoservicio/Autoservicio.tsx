"use client";

import Link from "next/link";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { TARJETA, TITULO_SECCION } from "@/components/base/Seccion";
import { horaFin } from "@/lib/autoservicio/franjas";
import type { EstadoAutoservicio, LecturaAutoservicio } from "@/lib/autoservicio/tipos";
import { Aviso, BOTON_APAGADO, BOTON_LINEA, BOTON_VERDE, BotonWhatsApp, PieWhatsApp } from "@/components/clases/autoservicio/Piezas";

/**
 * «TU HORARIO» EN «MIS CLASES»: sus clases de cada semana, los dos
 * enlaces y el WhatsApp.
 *
 * Lo que se enseña lo decide el estado de Gestión, no esta tarjeta, y
 * cada enlace por su lado:
 *
 *   · «Cambiar de horario» (principal), con AUTOSERVICIO_ACTIVO y si es
 *     `elegible`. Lleva a /clases/cambiar-horario.
 *   · «Cambiar de profesor» (secundario), con AUTOSERVICIO_PROFESOR_ACTIVO
 *     y si `puede_cambiar_profesor` lo dice. Lleva a
 *     /clases/cambiar-profesor. Si todavía no puede pero Gestión dice
 *     desde cuándo, el botón sale DESACTIVADO, en gris, con esa fecha
 *     debajo: que no parezca que no existe. Si no puede sin fecha, solo
 *     la razón. Con Gestión en v1 no viene, y no sale.
 *
 *   Pueden ir por separado: con el calendario de su profesor sin
 *   actualizar no puede cambiar de horario pero sí de profesor.
 *
 *   · Sin ninguno de los dos: por qué —con el texto de su código— y el
 *     WhatsApp como botón principal.
 *   · El equipo mirando la ficha: una frase, ningún botón. Sin estado:
 *     no se le pregunta a Gestión.
 */
export default function Autoservicio({
  estado,
  whatsapp,
  soloLectura,
  conHorario = true,
  conProfesor = false,
}: {
  /** Null solo en solo lectura: entonces no se pregunta a Gestión. */
  estado: LecturaAutoservicio<EstadoAutoservicio> | null;
  whatsapp: string;
  soloLectura: boolean;
  /** «Cambiar de horario», con su interruptor (AUTOSERVICIO_ACTIVO). */
  conHorario?: boolean;
  /** «Cambiar de profesor», con el suyo (AUTOSERVICIO_PROFESOR_ACTIVO). */
  conProfesor?: boolean;
}) {
  const t = usarIdioma().t.autoservicio;

  const leido = estado?.ok ? estado.datos : null;
  const horario = conHorario && leido?.elegible ? leido : null;
  const cambio = conProfesor ? leido?.cambioProfesor ?? null : null;
  const puedeProfesor = cambio?.puede === true;
  /** Todavía no, pero con fecha: el botón se ve, desactivado. */
  const profesorEnEspera = cambio !== null && !cambio.puede && cambio.disponibleDesde !== null;
  /** Por qué no puede cambiar de profesor ahora, cuando Gestión lo dice. */
  const profesorNo = cambio && !cambio.puede ? t.profesorNoDisponible(cambio) : null;
  const motivo = !estado ? "GENERICO" : estado.ok ? estado.datos.motivoNoElegible ?? "GENERICO" : estado.codigo;
  const sesiones = leido?.sesiones ?? [];

  return (
    <section aria-labelledby="titulo-autoservicio" className={`${TARJETA} mt-[26px] flex flex-col gap-4 p-[18px] min-[900px]:mt-9 min-[900px]:p-6`}>
      <h2 id="titulo-autoservicio" className={TITULO_SECCION}>
        {t.titulo}
      </h2>

      {soloLectura ? (
        <p className="text-[14px] italic text-marca-gris">{t.soloLectura}</p>
      ) : (
        <>
          {sesiones.length > 0 && (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-col gap-2">
                {sesiones.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-3 rounded-[12px] bg-marca-niebla px-3.5 py-3">
                    <span className="text-[17px] font-semibold text-marca-tinta">{t.sesionCorta(s.dia, s.hora, horaFin(s.hora, s.duracion))}</span>
                    <span className="shrink-0 text-[14px] text-marca-gris">{t.horas(s.duracion)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[14px] text-marca-gris">
                {leido?.profesor ? `${t.conProfesor(leido.profesor)} · ` : ""}
                {t.horaPeninsular}
              </p>
            </div>
          )}

          {horario || puedeProfesor || profesorEnEspera ? (
            <>
              {/* Con el horario cerrado y el profesor abierto, por qué el
                  horario no: que no parezca que falta un botón. */}
              {conHorario && !horario && <Aviso>{t.motivoAlLeer(motivo)}</Aviso>}
              <div className="flex flex-col gap-2.5 min-[500px]:flex-row">
                {horario && (
                  <Link href="/clases/cambiar-horario" className={`${BOTON_VERDE} min-[500px]:flex-1`}>
                    {t.cambiarHorario}
                  </Link>
                )}
                {puedeProfesor && (
                  <Link href="/clases/cambiar-profesor" className={`${horario ? BOTON_LINEA : BOTON_VERDE} min-[500px]:flex-1`}>
                    {t.cambiarProfesor}
                  </Link>
                )}
                {profesorEnEspera && (
                  <button type="button" disabled aria-describedby="profesor-no-disponible" className={`${BOTON_APAGADO} min-[500px]:flex-1`}>
                    {t.cambiarProfesor}
                  </button>
                )}
              </div>
              {profesorNo && (
                <p id="profesor-no-disponible" className="-mt-1 flex items-start gap-2 text-[15px] leading-snug text-marca-tintaMedia">
                  <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <span>{profesorNo}</span>
                </p>
              )}
              <PieWhatsApp href={whatsapp} pregunta={t.noEncuentras} texto={t.escribenos} />
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Aviso>{conHorario || !profesorNo ? t.motivoAlLeer(motivo) : profesorNo}</Aviso>
              <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
            </div>
          )}
        </>
      )}
    </section>
  );
}
