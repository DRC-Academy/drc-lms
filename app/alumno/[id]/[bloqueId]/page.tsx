import { nivelDelAlumno } from "@/lib/estimacion";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBloque } from "@/lib/data";
import { textosActuales } from "@/lib/idioma-servidor";
import { obtenerAlumno } from "@/lib/gestion";
import { buscarBloqueGenerado } from "@/lib/progreso-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { rutaDeMiCurso } from "@/lib/cursos";
import { comoFecha } from "@/lib/fechas";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import { conFoco } from "@/lib/foco";
import Cabecera, { NavegacionInferior, TiraRevision, enlacesDeSecciones } from "@/components/Cabecera";
import ChatAyuda from "@/components/ChatAyuda";
import { MarcoBarra } from "@/components/leccion/MarcoCurso";
import BarraLateral from "@/components/leccion/BarraLateral";
import MenuPerfil from "@/components/leccion/MenuPerfil";
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
  // Con su estado y no solo su fila: la pestaña lleva a la lección que
  // toca, y cuál es la decide el mismo cálculo que en el inicio.
  const principal = datos.perfil
    ? (
        await cursosDelInicio(
          params.id,
          datos.perfil.plan,
          nivelDelAlumno(params.id, datos.perfil),
          comoFecha(datos.perfil.fechaInicio)
        )
      )[0]
    : undefined;
  const miCurso = principal ? rutaDeMiCurso(principal) : null;

  if (!bloque) {
    return (
      <>
        <Cabecera
          nombre={nombre}
          alumnoId={params.id}
          miCurso={miCurso}
          seccion="practica"
          foco={foco}
          revisando={revisando}
        />
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

  // EL MISMO MARCO QUE LA LECCIÓN DEL CURSO: la barra de iconos a la
  // izquierda en escritorio, la navegación de abajo con el perfil en
  // móvil, y ninguna cabecera arriba. Es lo que `app/curso/[slug]`
  // monta desde su layout; aquí no hay layout con segmentos que mirar,
  // así que se monta directamente con `MarcoBarra`, que es la misma
  // pieza. Los enlaces son los de la cabecera de siempre, calculados por
  // la misma función.
  const t = textosActuales();
  const enlaces = enlacesDeSecciones({ alumnoId: params.id, miCurso, foco, t: t.navegacion });

  return (
    // La columna de altura completa, igual que en el layout del curso: es
    // lo que hace que la barra y el panel midan lo que mide la ventana.
    <div className="flex min-h-dvh flex-col">
      <MarcoBarra
        clave={params.bloqueId}
        barra={
          <BarraLateral
            enlaces={enlaces}
            nombre={nombre}
            inicioHref={conFoco(`/alumno/${params.id}`, foco)}
            seccion="practica"
            panel={{ rotulo: t.ejercicios.tuPractica, aria: t.ejercicios.abrirElPanel }}
          />
        }
        tiraRevision={revisando ? <TiraRevision nombre={nombre || undefined} t={t.navegacion} /> : null}
        navegacionMovil={
          <>
            <NavegacionInferior
              enlaces={enlaces}
              seccion="practica"
              secciones={t.navegacion.secciones}
              extra={<MenuPerfil nombre={nombre} variante="movil" />}
            />
            <ChatAyuda nombre={nombre} botonFlotante="movil" />
          </>
        }
      >
        <VistaBloque
          bloque={bloque}
          alumnoId={params.id}
          profesor={datos.perfil?.profesor ?? ""}
          foco={foco}
        />
      </MarcoBarra>
    </div>
  );
}
