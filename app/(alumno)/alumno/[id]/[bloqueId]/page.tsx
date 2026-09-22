import Link from "next/link";
import { notFound } from "next/navigation";
import { textosActuales } from "@/lib/idioma-servidor";
import { obtenerAlumno } from "@/lib/gestion";
import { buscarBloqueGenerado } from "@/lib/progreso-servidor";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import VistaBloque from "@/components/practica/VistaBloque";

// Mismo motivo que la ficha: el alumno se resuelve contra Gestión.
export const dynamic = "force-dynamic";

export default async function PaginaBloque({
  params,
}: {
  params: { id: string; bloqueId: string };
}) {
  // El bloque enseña el nombre y el profesor del alumno: el mismo
  // guard que la ficha, o se colaría por aquí lo que se cierra allí.
  const sesion = await exigirAccesoAFicha(params.id);

  // Igual que en la ficha: el id ya está en la ruta, y el foco existe
  // para que los enlaces que salen de aquí no pierdan al alumno.
  const revisando = sesion.rol === "admin";
  const foco = revisando ? params.id : null;

  const datos = await obtenerAlumno(params.id);
  if (!datos) notFound();

  // Todos los bloques son generados y están en la base: se resuelven
  // aquí, así que la página llega ya con los ejercicios. Un bloque sin
  // `claseOrigen` no sale en la ruta pero sigue abriéndose por su enlace.
  //
  // El equipo abre además los que generó él para revisar, que son los
  // que no salen en la práctica del alumno.
  const bloque = await buscarBloqueGenerado(params.id, params.bloqueId, sesion.rol === "admin");

  if (!bloque) {
    return (
      <>
        <div className="mx-auto max-w-md px-6 pt-16 text-center">
          <div className="tarjeta">
            <h1 className="font-display text-[24px] font-semibold leading-tight text-drc-titular">
              {sesion.rol === "admin"
                ? "Este bloque ya no está aquí"
                : textosActuales().practica.bloquePerdidoTitulo}
            </h1>
            {/* Para el equipo el motivo casi siempre es otro y conviene
                decirlo: hasta hace poco los bloques que generaba un
                administrador no se guardaban, así que los de entonces no
                se pueden abrir. Los de ahora sí. Sin esta distinción, el
                aviso le haría buscar una avería que no existe. */}
            <p className="mt-3 text-[15px] leading-[1.55] text-drc-cuerpo">
              {sesion.rol === "admin"
                ? "Los bloques que el equipo generaba antes no llegaban a guardarse, así que no hay nada que abrir. Genera uno nuevo desde la ficha y ese sí se puede revisar entero."
                : textosActuales().practica.bloquePerdidoCuerpo}
            </p>
            <Link href={`/alumno/${params.id}`} className="btn btn-verde mt-7 min-h-[48px] w-full">
              {sesion.rol === "admin"
                ? "Volver a la ficha"
                : textosActuales().practica.volverAMisBloques}
            </Link>
          </div>
        </div>
      </>
    );
  }

  // EL MISMO MARCO QUE LA LECCIÓN: la barra de iconos, las pestañas de
  // abajo y el cajón del panel de fases los pone el layout común
  // (`app/(alumno)/layout.tsx`). Aquí solo va la pantalla.
  return (
    <VistaBloque
      bloque={bloque}
      alumnoId={params.id}
      profesor={datos.perfil?.profesor ?? ""}
      foco={foco}
    />
  );
}
