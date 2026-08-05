import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion-servidor";
import FormularioAcceso from "@/components/FormularioAcceso";

// Lee la cookie, así que no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar · DRC Academy",
  description: "Pide un enlace para entrar en tu práctica.",
};

/**
 * Los motivos con los que `/entrar` puede devolver aquí a alguien.
 *
 * Es un `switch` y no un objeto indexado a propósito: el motivo lo
 * escribe quien quiera en la barra de direcciones, y buscarlo en un
 * objeto devolvería las propiedades heredadas de `Object.prototype`
 * —`?motivo=constructor` sacaría una función en vez de un texto y
 * tumbaría la página de acceso, que es justo la que no puede caerse.
 */
function avisoDe(motivo: unknown): string | null {
  switch (motivo) {
    case "caducado":
      return "Ese enlace ya no es válido. Pide uno nuevo.";
    case "sinficha":
      return "Ese enlace es correcto, pero no encontramos tu ficha. Escribe a tu profesor y lo miramos.";
    default:
      return null;
  }
}

export default async function Acceso({ searchParams }: { searchParams: { motivo?: string } }) {
  // Quien ya ha entrado no tiene nada que hacer aquí. A la home, que
  // ya sabe si le toca el buscador o su propia ficha.
  if (await sesionActual()) redirect("/");

  const aviso = avisoDe(searchParams.motivo);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-16">
      <div className="mb-9 flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-[10px] bg-drc-verde-solido font-display text-[14px] font-bold leading-none text-white"
        >
          D
        </span>
        <span className="font-display text-[16px] font-semibold tracking-[-0.01em] text-drc-titular">
          DRC Academy
        </span>
      </div>

      <h1 className="text-balance font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-drc-titular">
        Entra en tu práctica
      </h1>
      <p className="mb-8 mt-3.5 text-pretty text-[16px] leading-[1.55] text-drc-cuerpo">
        Pon tu email y te enviamos un enlace para entrar. Sin contraseñas.
      </p>

      <FormularioAcceso aviso={aviso} />

      <p className="mt-10 border-t border-drc-borde pt-6 text-[13px] leading-[1.55] text-drc-cuerpo">
        ¿Problemas para entrar? Escribe a tu profesor.
      </p>
    </main>
  );
}
