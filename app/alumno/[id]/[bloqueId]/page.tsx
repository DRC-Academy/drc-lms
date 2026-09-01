import { nivelDelAlumno } from "@/lib/estimacion";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBloque } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { buscarBloqueGenerado } from "@/lib/progreso-servidor";
import { cursosAsignados } from "@/lib/cursos-servidor";
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

  // Igual que en la ficha: el id ya está en la ruta, y el foco existe
  // para que los enlaces que salen de aquí no pierdan al alumno.
  const revisando = sesion.rol === "admin";
  const foco = revisando ? params.id : null;

  const datos = await obtenerAlumno(params.id);
  if (!datos) notFound();

  // Si el bloque no está en `lib/data.ts` es uno generado. Antes esos
  // solo existían en el localStorage del navegador y había que buscarlos
  // desde el cliente, con su pantalla de carga; ahora están en la base y
  // se resuelven aquí, así que la página llega ya con los ejercicios.
  //
  // El equipo abre además los que generó él para revisar, que son los
  // que no salen en la práctica del alumno.
  const bloque =
    getBloque(params.bloqueId) ??
    (await buscarBloqueGenerado(params.id, params.bloqueId, sesion.rol === "admin"));

  const nombre = datos.perfil?.nombre ?? "";

  // El curso principal, solo para que la cabecera pueda pintar "Mi curso".
  // Son 7 filas y evita que la navegación cambie de forma entre pantallas.
  const cursos = datos.perfil
    ? await cursosAsignados(datos.perfil.plan, nivelDelAlumno(params.id, datos.perfil), params.id)
    : [];
  const cursoSlug = cursos[0]?.slug ?? null;

  if (!bloque) {
    return (
      <>
        <Cabecera
          nombre={nombre}
          alumnoId={params.id}
          cursoSlug={cursoSlug}
          seccion="practica"
          foco={foco}
          revisando={revisando}
        />
        <div className="mx-auto max-w-md px-6 pt-16 text-center">
          <div className="tarjeta">
            <h1 className="font-display text-[24px] font-semibold leading-tight text-drc-titular">
              Este bloque ya no está aquí
            </h1>
            {/* Para el equipo el motivo casi siempre es otro y conviene
                decirlo: hasta hace poco los bloques que generaba un
                administrador no se guardaban, así que los de entonces no
                se pueden abrir. Los de ahora sí. Sin esta distinción, el
                aviso le haría buscar una avería que no existe. */}
            <p className="mt-3 text-[15px] leading-[1.55] text-drc-cuerpo">
              {sesion.rol === "admin"
                ? "Los bloques que el equipo generaba antes no llegaban a guardarse, así que no hay nada que abrir. Genera uno nuevo desde la ficha y ese sí se puede revisar entero."
                : "No encontramos este bloque entre los tuyos. Genera uno nuevo y seguimos donde lo dejaste."}
            </p>
            <Link href={`/alumno/${params.id}`} className="btn btn-verde mt-7 min-h-[48px] w-full">
              {sesion.rol === "admin" ? "Volver a la ficha" : "Volver a mis bloques"}
            </Link>
          </div>
        </div>
      </>
    );
  }

  // La columna de altura completa, igual que en el layout del curso: es
  // lo que deja la barra de acciones pegada al fondo de la ventana
  // cuando el ejercicio es corto.
  //
  // Y la cabecera va CON NAVEGACIÓN. Antes era `<Cabecera nombre={...} />`
  // a secas —sin `alumnoId` ni `seccion`—, así que dentro de un bloque
  // desaparecían Inicio, Mi curso y Práctica: el mismo agujero que había
  // en el curso, en la única pantalla que se había quedado sin arreglar.
  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecera
        nombre={nombre}
        alumnoId={params.id}
        cursoSlug={cursoSlug}
        seccion="practica"
        foco={foco}
        revisando={revisando}
      />
      <Practica
        bloque={bloque}
        alumnoId={params.id}
        profesor={datos.perfil?.profesor ?? ""}
        foco={foco}
      />
    </div>
  );
}
