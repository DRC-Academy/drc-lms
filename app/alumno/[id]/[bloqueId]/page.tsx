import Link from "next/link";
import { notFound } from "next/navigation";
import { getBloque } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { buscarBloqueGenerado } from "@/lib/progreso-servidor";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import Cabecera from "@/components/Cabecera";
import Practica from "@/components/Practica";

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

  const datos = await obtenerAlumno(params.id);
  if (!datos) notFound();

  // Si el bloque no está en `lib/data.ts` es uno generado. Antes esos
  // solo existían en el localStorage del navegador y había que buscarlos
  // desde el cliente, con su pantalla de carga; ahora están en la base y
  // se resuelven aquí, así que la página llega ya con los ejercicios.
  const bloque = getBloque(params.bloqueId) ?? (await buscarBloqueGenerado(params.id, params.bloqueId));

  const nombre = datos.perfil?.nombre ?? "";

  if (!bloque) {
    return (
      <>
        <Cabecera nombre={nombre} />
        <div className="mx-auto max-w-md px-6 pt-16 text-center">
          <div className="tarjeta">
            <h1 className="font-display text-[24px] font-semibold leading-tight text-drc-titular">
              {sesion.rol === "admin" ? "Este bloque no se guardó" : "Este bloque ya no está aquí"}
            </h1>
            {/* Para el equipo el motivo es otro y conviene decirlo: los
                bloques que genera un administrador no se persisten, para
                que no aparezcan en la práctica del alumno. Sin esta
                distinción, el aviso de "ya no está aquí" le haría buscar
                una avería que no existe. */}
            <p className="mt-3 text-[15px] leading-[1.55] text-drc-cuerpo">
              {sesion.rol === "admin"
                ? "Los bloques que genera el equipo no se guardan: así no aparecen en la práctica del alumno. Puedes verlo en la ficha, pero no abrirlo."
                : "No encontramos este bloque entre los tuyos. Genera uno nuevo y seguimos donde lo dejaste."}
            </p>
            <Link href={`/alumno/${params.id}`} className="btn btn-primario mt-7 min-h-[48px] w-full">
              Volver a mis bloques
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Cabecera nombre={nombre} />
      <Practica bloque={bloque} alumnoId={params.id} profesor={datos.perfil?.profesor ?? ""} />
    </>
  );
}
