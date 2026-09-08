import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion-servidor";
import FormularioAcceso from "@/components/FormularioAcceso";
import { textosActuales } from "@/lib/idioma-servidor";
import type { TextosEntrada } from "@/lib/textos/entrada";

// Lee la cookie, así que no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

// Los metadatos NO siguen la cookie: `generateMetadata` correría antes
// de saber quién pide la página en la mitad de los casos, y el título de
// la pestaña de la pantalla de entrar no compensa esa complicación. Se
// quedan en español, que es lo que ve el buscador.
export const metadata: Metadata = {
  title: "Entrar · DRC Academy",
  description: "Pide un enlace para entrar en tu práctica.",
};

/**
 * Por qué se ha acabado aquí, cuando se sabe.
 *
 * DE DÓNDE SALE CADA UNO, porque están repartidos y sin esta lista no
 * hay forma de encontrarlos:
 *
 *   caducado · sinficha · error  — `lib/entrada.ts`, que es la puerta de
 *              `/entrar` y `/entrar/woo`. Son los tres de `MotivoRechazo`.
 *   salida   — `app/salir`.
 *   sesion   — `app/api/progreso-leccion`.
 *
 * Es un `switch` y no un objeto indexado a propósito: el motivo lo
 * escribe quien quiera en la barra de direcciones, y buscarlo en un
 * objeto devolvería las propiedades heredadas de `Object.prototype`
 * —`?motivo=constructor` sacaría una función en vez de un texto y
 * tumbaría la página de acceso, que es justo la que no puede caerse.
 */
function avisoDe(motivo: unknown, t: TextosEntrada): string | null {
  switch (motivo) {
    case "caducado":
      return t.avisoCaducado;
    case "sinficha":
      return t.avisoSinFicha;
    case "error":
      // El sobre era bueno y la ficha existe: lo que falló fue abrir la
      // sesión. No es culpa de quien entra, así que no se le manda a
      // hablar con nadie, se le dice que reintente.
      return t.avisoError;
    case "salida":
      return t.avisoSalida;
    case "sesion":
      // ESTE NO LO PUEDE PONER EL MIDDLEWARE, aunque manda aquí a mucha
      // más gente. La cookie dura 30 días y el navegador la borra al
      // caducar, así que desde fuera "se le caducó la sesión" y "no ha
      // entrado nunca" son la misma petición sin cookie, y a un visitante
      // nuevo esta frase le hablaría de algo que no le ha pasado.
      //
      // La ruta de la lección sí lo sabe: ese formulario no se envía sin
      // haber estado dentro. Por eso el motivo lo pone ella y no la
      // puerta de la calle.
      return t.avisoSesion;
    default:
      return null;
  }
}

export default async function Acceso({ searchParams }: { searchParams: { motivo?: string } }) {
  // Quien ya ha entrado no tiene nada que hacer aquí. A la home, que
  // ya sabe si le toca el buscador o su propia ficha.
  if (await sesionActual()) redirect("/");

  const t = textosActuales().entrada;
  const aviso = avisoDe(searchParams.motivo, t);

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
        {t.entraEnTuPractica}
      </h1>
      <p className="mb-8 mt-3.5 text-pretty text-[16px] leading-[1.55] text-drc-cuerpo">
        {t.ponTuEmail}
      </p>

      <FormularioAcceso aviso={aviso} />

      <p className="mt-10 border-t border-drc-borde pt-6 text-[13px] leading-[1.55] text-drc-cuerpo">
        {t.problemasParaEntrar}
      </p>
    </main>
  );
}
