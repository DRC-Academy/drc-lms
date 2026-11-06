import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

// ---------------------------------------------------------------
// EL MARCO DEL PANEL DEL PROFESOR
//
// Propio y mínimo, a propósito: el del alumno lleva sus pestañas, la ayuda
// y el perfil, que enlaza a Mi cuenta. Recibe el nombre y el modo ya
// resueltos por el guard.
// ---------------------------------------------------------------

export default function MarcoProfesor({
  nombre,
  comoAdmin,
  pestanas,
  children,
}: {
  nombre: string;
  comoAdmin: boolean;
  pestanas: { alumnos: string; cursos: string; activa: "alumnos" | "cursos" };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      {comoAdmin && (
        <div className="bg-marca-tinta px-5 py-2.5 text-[13px] leading-[1.4] text-white">
          <div className="mx-auto flex w-full max-w-[1000px] flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p>
              Estás viendo el panel de <strong className="font-semibold">{nombre}</strong>. Solo lectura.
            </p>
            <Link href="/accesos-profesores" className="inline-flex min-h-[32px] items-center font-semibold underline underline-offset-2">
              Volver a Acceso profesores
            </Link>
          </div>
        </div>
      )}

      <header className="border-b border-marca-borde bg-white px-5">
        <div className="mx-auto flex min-h-[60px] w-full max-w-[1000px] items-center justify-between gap-4">
          <Image src="/logo-drc.png" alt="DRC Academy" width={121} height={32} priority className="h-[26px] w-auto" />
          {!comoAdmin && (
            <form action="/salir" method="post">
              <button type="submit" className="inline-flex min-h-[44px] items-center px-1 text-[14px] font-semibold text-marca-verdeOsc hover:text-marca-tinta">
                Salir
              </button>
            </form>
          )}
        </div>
        <nav aria-label="Panel del profesor" className="mx-auto flex w-full max-w-[1000px] gap-6">
          <Pestana href={pestanas.alumnos} activa={pestanas.activa === "alumnos"}>
            Mis alumnos
          </Pestana>
          <Pestana href={pestanas.cursos} activa={pestanas.activa === "cursos"}>
            Cursos
          </Pestana>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pb-16 pt-7 lg:pb-20 lg:pt-10">{children}</main>
    </div>
  );
}

function Pestana({ href, activa, children }: { href: string; activa: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={activa ? "page" : undefined}
      className={`-mb-px inline-flex min-h-[44px] items-center border-b-2 text-[14.5px] font-semibold transition-colors ${
        activa ? "border-marca-verde text-marca-tinta" : "border-transparent text-marca-tintaMedia hover:text-marca-tinta"
      }`}
    >
      {children}
    </Link>
  );
}
