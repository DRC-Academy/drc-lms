import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import FormularioAcceso from "@/components/FormularioAcceso";
import { profesorConectado } from "@/lib/panel-profesor";
import { sesionActual } from "@/lib/sesion-servidor";
import { ENTRADA } from "@/lib/textos/entrada";
import { destinoSeguro, esRutaDeProfesor } from "@/lib/volver";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de profesores · DRC Práctica",
  description: "Entra en tu panel de profesor de DRC Práctica.",
};

/** Siempre en español, aunque la cookie de idioma diga otra cosa. */
const T = ENTRADA.es;

/**
 * Por qué se ha acabado aquí. Un `switch`, como en `/acceso`: el motivo lo
 * escribe quien quiera en la barra de direcciones.
 */
function avisoDe(motivo: unknown): string | null {
  switch (motivo) {
    case "caducado":
      return "Ese enlace ya no vale. Pide otro y entrarás en un momento.";
    case "sinficha":
      return "Con ese email no hemos podido abrir tu panel. Si crees que es un error, escríbenos.";
    case "error":
      return "No hemos podido abrir tu sesión. Vuelve a intentarlo en un momento.";
    case "salida":
      return "Has cerrado tu sesión.";
    case "sesion":
      return "Tu sesión ha terminado. Pide un enlace para volver a entrar.";
    default:
      return null;
  }
}

/**
 * LA ENTRADA DE LOS PROFESORES. Otro texto sobre EL MISMO FLUJO que
 * `/acceso`: `FormularioAcceso` y `solicitarEnlace`, con la misma respuesta
 * y el mismo tiempo exista o no el email.
 *
 * ESTA URL NO CONCEDE NADA. El rol lo sigue decidiendo el email, con el
 * orden admin, profesor, alumno: un alumno que entre por aquí recibe su
 * enlace normal de alumno.
 */
export default async function Profes({ searchParams }: { searchParams: { motivo?: string; volver?: string } }) {
  const volver = destinoSeguro(searchParams.volver);

  if (await profesorConectado()) redirect(volver && esRutaDeProfesor(volver) ? volver : "/profesor");
  if (await sesionActual()) redirect(volver ?? "/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-5 py-16">
      <div className="mb-9 flex items-center">
        <Image src="/logo-drc.png" alt="DRC Academy" width={121} height={32} priority className="h-[28px] w-auto sm:h-8" />
      </div>

      <h1 className="text-balance font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-drc-titular">
        Panel de profesores de DRC Práctica
      </h1>
      <p className="mb-8 mt-3.5 text-pretty text-[16px] leading-[1.55] text-drc-cuerpo">
        Escribe tu email de @drcacademy.com y te enviaremos un enlace para entrar.
      </p>

      <FormularioAcceso aviso={avisoDe(searchParams.motivo)} volver={volver} textos={T} />
    </main>
  );
}
