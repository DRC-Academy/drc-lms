import Link from "next/link";
import { alumnoDeLaPagina } from "@/lib/sesion-servidor";
import { conFoco } from "@/lib/foco";
import { idiomaActual, textosActuales } from "@/lib/idioma-servidor";
import { enlaceWhatsAppSala } from "@/lib/soporte";
import { BotonWhatsApp } from "@/components/clases/autoservicio/Piezas";

export const dynamic = "force-dynamic";

/**
 * A DONDE LLEGA «UNIRSE A LA CLASE» CUANDO NO HAY SALA.
 *
 * `/clase/entrar` manda aquí cuando ni la clase, ni la próxima, ni la
 * ficha tienen un enlace que valga. El botón no suele llevar aquí —sin
 * enlace no se pinta—, así que quien llega es una pestaña vieja o una
 * sala que se borró en Gestión entre una cosa y otra.
 *
 * SIN LENGUAJE DE ERROR: el alumno no ha hecho nada mal y su clase sigue
 * en pie. Lo que necesita es el enlace, y eso se pide por WhatsApp.
 */
export default async function SinEnlace() {
  const { paraEnlaces } = await alumnoDeLaPagina();
  const t = textosActuales().clases;

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <main className="mx-auto w-full max-w-contenido flex-1 px-4 pb-8 pt-[18px] min-[900px]:px-9 min-[900px]:pb-11 min-[900px]:pt-8">
        <section className="entra flex flex-col items-start gap-3 rounded-[16px] border border-marca-borde bg-white p-5 shadow-[0_10px_24px_rgba(18,33,26,0.07)] min-[900px]:rounded-[20px] min-[900px]:p-8">
          <h1 className="font-display text-[22px] font-bold leading-tight text-marca-tinta min-[900px]:text-[28px]">{t.sinSalaTitulo}</h1>
          <p className="max-w-[560px] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[16px]">{t.sinSalaTexto}</p>
          <div className="mt-2 flex w-full flex-col gap-3 min-[500px]:w-auto min-[500px]:flex-row min-[500px]:items-center">
            <BotonWhatsApp href={enlaceWhatsAppSala(idiomaActual())} texto={t.sinSalaWhatsApp} principal />
            <Link
              href={conFoco("/clases", paraEnlaces)}
              className="inline-flex min-h-[48px] items-center justify-center px-2 text-[15px] font-semibold text-marca-verdeOsc hover:text-marca-tinta"
            >
              {t.sinSalaVolver}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
