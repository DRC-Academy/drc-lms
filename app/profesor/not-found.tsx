import Link from "next/link";

/**
 * EL 404 DEL PANEL. El mismo para un alumno ajeno, uno que no existe y uno
 * cuya asignación ya no está activa: no dice cuál de ellos es.
 */
export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-5 py-16">
      <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta">No encontramos esta página</h1>
      <p className="mt-3 text-[15px] leading-[1.5] text-marca-tintaMedia">Vuelve a tu lista para seguir.</p>
      <Link href="/profesor" className="mt-5 inline-flex min-h-[44px] items-center text-[14.5px] font-semibold text-marca-verdeOsc hover:text-marca-tinta">
        Ir a Mis alumnos
      </Link>
    </main>
  );
}
