import type { Metadata } from "next";
import Image from "next/image";
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
    case "error":
      // El sobre era bueno y la ficha existe: lo que falló fue abrir la
      // sesión. No es culpa de quien entra, así que no se le manda a
      // hablar con nadie, se le dice que reintente.
      return "No hemos podido abrir tu sesión. Vuelve a intentarlo en un momento.";
    case "salida":
      return "Has cerrado sesión. Pide un enlace cuando quieras volver.";
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
      {/* Aquí el logotipo no está dentro de una cabecera con altura fija:
          es lo primero de la pantalla de entrar, sobre el fondo #F4F3EF
          del body. El verde del archivo da 4,74:1 contra ese fondo. */}
      <div className="mb-9 flex items-center">
        <Image
          src="/logo-drc.png"
          alt="DRC Academy"
          width={121}
          height={32}
          priority
          className="h-[28px] w-auto sm:h-8"
        />
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
