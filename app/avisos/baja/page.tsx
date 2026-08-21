import { redirect } from "next/navigation";
import { abrirTokenBaja } from "@/lib/sesion";
import { guardarPreferenciaAvisos, recibeAvisos } from "@/lib/avisos-servidor";

export const dynamic = "force-dynamic";

/**
 * LA PANTALLA DE BAJA DE LOS AVISOS.
 *
 * A donde lleva el enlace del pie del correo. No pide sesión: el alumno
 * abre el correo en el móvil, muchas veces sin haber entrado nunca en
 * la plataforma. Lo que autoriza es el token firmado del enlace, que no
 * abre nada más —ver `crearTokenBaja` en `lib/sesion.ts`—.
 *
 * PREGUNTA ANTES DE DAR DE BAJA, y no es una fricción caprichosa: los
 * escáneres de correo abren los enlaces del mensaje con GET, así que
 * una baja que ocurriera al abrir la página daría de baja a alumnos que
 * no han pulsado nada. Aquí se pulsa un botón, que es un POST. Quien
 * quiera la baja de un clic la tiene en el botón que enseña Gmail, que
 * va por `app/api/avisos/baja`.
 *
 * Y SE PUEDE DESHACER en la misma pantalla, que es lo que convierte
 * esto en un interruptor y no en una puerta de salida.
 */
export default async function BajaDeAvisos({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  const token = (searchParams.t ?? "").trim();
  const alumnoId = await abrirTokenBaja(token);

  if (alumnoId === null) {
    return (
      <Marco>
        <h1 className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-marca-tinta">
          Este enlace no vale
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-marca-tintaMedia">
          Puede que esté incompleto por cómo lo ha cortado el cliente de correo. Abre el enlace
          desde el correo original, o escríbenos y lo cambiamos nosotros.
        </p>
      </Marco>
    );
  }

  const recibe = await recibeAvisos(alumnoId);

  async function cambiar(datos: FormData) {
    "use server";

    // El alumno vuelve a salir del token, nunca del formulario: si
    // viniera de un campo, cualquiera daría de baja a cualquiera.
    const suToken = String(datos.get("t") ?? "");
    const id = await abrirTokenBaja(suToken);
    if (id === null) return;

    await guardarPreferenciaAvisos(id, String(datos.get("activar") ?? "") === "1", "alumno");
    redirect(`/avisos/baja?t=${encodeURIComponent(suToken)}`);
  }

  return (
    <Marco>
      <p className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-marca-verdeOsc">
        DRC Academy
      </p>

      <h1 className="mt-4 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-marca-tinta">
        {recibe ? "Avisos de contenido nuevo" : "Ya no recibes estos avisos"}
      </h1>

      <p className="mt-3 text-[15px] leading-[1.55] text-marca-tintaMedia">
        {recibe
          ? "Es el correo que te llega cuando se abre contenido nuevo de tu curso, más o menos una vez por semana. Puedes dejar de recibirlo aquí."
          : "No te mandaremos más avisos de contenido nuevo. Seguirás recibiendo los correos que pidas tú, como el enlace para entrar."}
      </p>

      <form action={cambiar} className="mt-7">
        <input type="hidden" name="t" value={token} />
        <input type="hidden" name="activar" value={recibe ? "0" : "1"} />
        <button
          type="submit"
          className={`flex min-h-[48px] w-full items-center justify-center rounded-full px-8 text-[15.5px] font-bold transition-colors ${
            recibe
              ? "border-[1.5px] border-marca-borde text-marca-tinta hover:border-marca-grisTenue"
              : "btn-verde"
          }`}
        >
          {recibe ? "Dejar de recibir estos avisos" : "Volver a recibirlos"}
        </button>
      </form>

      <p className="mt-5 text-[13.5px] leading-[1.5] text-marca-grisSuave">
        {recibe
          ? "Esto no toca nada más: tu curso y tu práctica siguen igual."
          : "Si cambias de idea, este mismo enlace los vuelve a activar."}
      </p>
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-marca-niebla px-4 py-12">
      <div className="w-full max-w-[520px] rounded-[20px] border border-marca-borde bg-white px-7 py-9 sm:px-9 sm:py-10">
        {children}
      </div>
    </main>
  );
}
