import { Suspense } from "react";
import { focoActual, sesionActual } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { cursoPorSlug, estadoDelCurso, fechaDelDrip } from "@/lib/cursos-servidor";
import { rutaDeMiCurso } from "@/lib/cursos";
import { textosActuales } from "@/lib/idioma-servidor";
import { conFoco } from "@/lib/foco";
import Cabecera, { NavegacionInferior, TiraRevision, enlacesDeSecciones } from "@/components/Cabecera";
import ChatAyuda from "@/components/ChatAyuda";
import { CabeceraCargando } from "@/components/leccion/CabeceraLeccion";
import MarcoCurso from "@/components/leccion/MarcoCurso";
import BarraLateral, { BarraLateralCargando } from "@/components/leccion/BarraLateral";
import MenuPerfil from "@/components/leccion/MenuPerfil";

/**
 * El marco del curso: la cabecera en el temario, la barra de iconos en
 * la lección, y debajo lo que toque.
 *
 * POR QUÉ ES UN LAYOUT Y NO PARTE DE CADA PÁGINA
 *
 * Antes la cabecera la pintaba cada página, así que al pulsar una lección
 * desaparecía entera —logotipo incluido— y volvía a aparecer un segundo
 * después. El `loading.tsx` intentaba tapar el hueco con una barra blanca
 * vacía, que es exactamente lo que se veía como un fallo: la aplicación
 * parpadeaba de arriba abajo para cambiar una columna de texto.
 *
 * Un layout no se vuelve a montar mientras no cambie su segmento. Como
 * este cuelga de `[slug]`, al saltar de lección a lección —y al ir al
 * temario y volver— el marco NO se re-renderiza: se queda quieto y solo
 * cambia lo de dentro.
 *
 * DOS MARCOS, UNO POR PANTALLA. El temario lleva la cabecera de siempre;
 * la lección, una barra de iconos a la izquierda y ninguna barra arriba.
 * Los dos se renderizan aquí y `MarcoCurso` —cliente— enseña el que
 * toca mirando qué segmento hay debajo. Así la barra de la lección
 * tampoco parpadea al cambiar de lección: es del layout, no de la página.
 *
 * POR QUÉ NO ES `async`
 *
 * Si este componente esperara sus datos, `children` no empezaría a
 * renderizarse hasta que la cabecera los tuviera, y eso encadenaría una
 * espera más justo delante de la página —lo contrario de lo que acabamos
 * de arreglar—. Siendo síncrono, la página arranca sus consultas a la vez
 * que la cabecera las suyas, y el `Suspense` deja que cada una llegue
 * cuando pueda.
 *
 * Y las consultas no se duplican: `cursoPorSlug`, `obtenerPerfil` y las
 * tres lecturas del curso —módulos, lecciones y progreso— van por
 * `cache()`, así que layout y página se reparten los mismos viajes.
 */
export default function LayoutCurso({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    // La columna de altura completa vive aquí y no en cada página: es lo
    // que hace que la barra de iconos y el panel de la lección midan lo
    // que mide la ventana.
    <div className="flex min-h-dvh flex-col">
      <Suspense
        fallback={
          <MarcoCurso cabecera={<CabeceraCargando />} barra={<BarraLateralCargando />} navegacionMovil={null}>
            {children}
          </MarcoCurso>
        }
      >
        <MarcoDelCurso slug={params.slug}>{children}</MarcoDelCurso>
      </Suspense>
    </div>
  );
}

/**
 * Los dos marcos con sus datos.
 *
 * No hace de guard: quien decide si este alumno puede ver este curso es
 * la página, que es la que redirige. Aquí solo se pinta un título y un
 * contador, y si la sesión no da para eso se pinta la versión de carga y
 * ya está —la página habrá redirigido antes de que nada de esto importe—.
 */
async function MarcoDelCurso({ slug, children }: { slug: string; children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) {
    return (
      <MarcoCurso cabecera={<CabeceraCargando />} barra={<BarraLateralCargando />} navegacionMovil={null}>
        {children}
      </MarcoCurso>
    );
  }

  // De quién habla la pantalla. Para el alumno es él; para el equipo que
  // llegó desde una ficha, el alumno revisado; y para el equipo que abrió
  // un curso a pelo, nadie —cadena vacía— que es el caso de revisar el
  // contenido sin mirar a ninguna persona en concreto.
  //
  // El layout NO recibe `searchParams`, así que el parámetro llega por la
  // cabecera que pone el middleware. Ver `lib/foco.ts`.
  const { alumnoId, revisando, paraEnlaces } = await focoActual();

  const [curso, perfil] = await Promise.all([
    cursoPorSlug(slug),
    alumnoId ? obtenerPerfil(alumnoId) : Promise.resolve(null),
  ]);

  if (!curso) {
    return (
      <MarcoCurso cabecera={<CabeceraCargando />} barra={<BarraLateralCargando />} navegacionMovil={null}>
        {children}
      </MarcoCurso>
    );
  }

  // DÓNDE VA EL ALUMNO EN ESTE CURSO, que es lo que la pestaña «Mi curso»
  // necesita ahora: ya no lleva al temario sino a la lección que toca,
  // y dentro del curso la resuelve contra EL CURSO DE LA URL, no contra
  // el principal del inicio. Un alumno con dos cursos que entró en el
  // segundo tiene que poder seguir en el segundo.
  //
  // El drip se aplica igual que en las páginas: si apuntara a una
  // lección de un módulo cerrado, la pestaña llevaría a una pantalla
  // que rechaza al alumno. Y no cuesta viajes de más: las tres lecturas
  // van por `cache()` y la página que cuelga de aquí las pide también.
  const estado = await estadoDelCurso(
    alumnoId,
    curso,
    await fechaDelDrip(alumnoId, curso.id, perfil?.fechaInicio)
  );
  const nombre = perfil?.nombre.trim() ?? "";
  const t = textosActuales().navegacion;

  // Vacío solo para el equipo revisando contenido sin ficha: ahí no hay
  // secciones que ofrecer porque no hay alumno del que hablar.
  const enlaces = enlacesDeSecciones({
    alumnoId: alumnoId || null,
    miCurso: rutaDeMiCurso(estado),
    foco: paraEnlaces,
    t,
  });

  return (
    <MarcoCurso
      // LA MISMA `Cabecera` QUE EL RESTO DE LAS PANTALLAS DEL ALUMNO, con
      // el curso añadido: `seccion="curso"` marca la pestaña activa, y
      // `miCurso` es lo que hace que el enlace "Mi curso" exista.
      cabecera={
        <Cabecera
          nombre={nombre || undefined}
          alumnoId={alumnoId || null}
          miCurso={rutaDeMiCurso(estado)}
          seccion="curso"
          contexto={{
            slug: curso.slug,
            titulo: curso.titulo,
            completadas: estado.completadas,
            total: estado.total,
          }}
          foco={paraEnlaces}
          revisando={revisando}
        />
      }
      barra={
        <BarraLateral
          enlaces={enlaces}
          nombre={nombre}
          inicioHref={alumnoId ? conFoco(`/alumno/${alumnoId}`, paraEnlaces) : "/"}
        />
      }
      tiraRevision={revisando ? <TiraRevision nombre={nombre || undefined} t={t} /> : null}
      navegacionMovil={
        enlaces.length > 0 ? (
          <>
            {/* La navegación de abajo con una quinta pestaña, el perfil:
                en la lección no hay cabecera y el nombre, el idioma y la
                salida tienen que caber en algún sitio. */}
            <NavegacionInferior
              enlaces={enlaces}
              seccion="curso"
              secciones={t.secciones}
              extra={<MenuPerfil nombre={nombre} variante="movil" />}
            />
            {/* La ayuda flota solo en móvil: en escritorio la abre el
                icono de la barra. */}
            <ChatAyuda nombre={nombre} botonFlotante="movil" />
          </>
        ) : null
      }
    >
      {children}
    </MarcoCurso>
  );
}
