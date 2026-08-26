import { BLOQUES } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { nivelDeBloque } from "@/lib/perfil";
import {
  avisoFormulario,
  calcularTarjeta,
  resumenUltimaClase,
  tieneContexto,
  urlFormulario,
} from "@/lib/modos";
import { exigirFoco } from "@/lib/sesion-servidor";
import {
  leerBloquesGenerados,
  leerProgresoAlumno,
  leerUltimaGeneracion,
} from "@/lib/progreso-servidor";
import { cursosAsignados } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";
import PanelPractica from "@/components/PanelPractica";

export const dynamic = "force-dynamic";

/**
 * La práctica, como sección propia.
 *
 * SIGUE SIN HABER `/practica/{id}`, y ahora hay que explicar por qué.
 * La práctica se genera del perfil y de las clases de UN alumno, así que
 * durante mucho tiempo bastó con sacarlo de la cookie y mandar al equipo
 * al buscador. Eso dejaba media revisión sin hacer: el equipo podía ver
 * la ficha de alguien pero no lo que esa persona se encuentra en "Para
 * ti", que es lo que distingue al producto.
 *
 * El alumno viaja ahora en `?alumno=`, no en la ruta, y la diferencia no
 * es cosmética: una ruta propia sugeriría que hay una práctica "de otro"
 * que se puede visitar, y lo que hay es la MISMA pantalla mirada desde
 * fuera. Ver `lib/foco.ts`.
 *
 * MISMO MARCO QUE EL INICIO: fondo `marca-niebla`, columna
 * `max-w-contenido` y los mismos márgenes laterales. Esta pantalla vivía
 * en una columna de 720px con otra paleta, y llegar aquí desde el inicio
 * se sentía como salir de la aplicación. Lo que cambia entre las dos es
 * el contenido, no el mueble.
 *
 * El enlace de "volver al inicio" que cerraba la página se ha ido: la
 * navegación ya lleva a Inicio —arriba en escritorio, abajo en móvil— y
 * repetirlo al final solo añadía una salida justo donde el alumno acaba
 * de elegir por dónde seguir.
 */
export default async function PaginaPractica() {
  // El alumno del que habla la pantalla: él mismo, o el que el equipo
  // está revisando. Sin ninguno de los dos —equipo sin ficha elegida—
  // esto redirige al buscador, que es lo que ya hacía.
  //
  // LO QUE SE GENERE AQUÍ REVISANDO NO ES DEL ALUMNO. No hace falta
  // ninguna comprobación en esta página: `app/api/generar-bloque` mira
  // la cookie, ve que quien pide no es alumno y marca el bloque como
  // `generado_por_equipo`, que lo deja fuera de la lista del alumno, de
  // su espera entre generaciones y del panel.
  const { sesion, alumnoId, revisando, paraEnlaces } = await exigirFoco();

  const [datos, progreso, generados, ultimaGeneracion] = await Promise.all([
    obtenerAlumno(alumnoId),
    leerProgresoAlumno(alumnoId),
    // Con el rol, igual que en la ficha: los bloques que el equipo
    // genera para revisar solo salen en la lista de quien los generó.
    leerBloquesGenerados(alumnoId, sesion.rol === "admin"),
    leerUltimaGeneracion(alumnoId),
  ]);

  // Sin ficha en Gestión no hay perfil del que generar nada. No es un
  // 404: el alumno existe, es su ficha la que falta.
  const perfil = datos?.perfil ?? null;
  const ultimaClase = datos?.ultimaClase ?? null;

  const tarjeta = calcularTarjeta(perfil, ultimaClase, ultimaGeneracion);
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(perfil.nivel)) : [];

  // Solo para que la cabecera pueda pintar "Mi curso" sin cambiar de
  // forma entre pantallas.
  const cursos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel, alumnoId) : [];

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <Cabecera
        nombre={perfil?.nombre.trim() || undefined}
        alumnoId={alumnoId}
        cursoSlug={cursos[0]?.slug ?? null}
        seccion="practica"
        foco={paraEnlaces}
        revisando={revisando}
      />

      {/* El hueco de abajo es para la barra fija: 120px es lo que mide con
          su margen, así que la última tarjeta nunca queda debajo. En
          móvil se suma el que `globals.css` reserva para la navegación
          inferior. */}
      {/* SIN ENCABEZADO DE PÁGINA. Aquí había un «Para ti» con su
          bajada de dos líneas, y debajo, a dos dedos, el saludo con el
          titular de la ruta: dos titulares seguidos para decir dónde
          estás, cuando la pestaña de la navegación ya va marcada.

          El titular de la pantalla es ahora el de la ruta, que además
          nombra al profesor —que es de quien sale todo esto—. */}
      <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col px-4 pb-[120px] pt-[18px] lg:px-9 lg:pt-8">
        <PanelPractica
          alumnoId={alumnoId}
          // El nombre y el profesor van al saludo y al pie de la parada
          // de hoy: son lo que hace que la ruta se lea como suya y no
          // como una pantalla más del producto.
          nombre={perfil?.nombre.trim() ?? ""}
          profesor={perfil?.profesor.trim() ?? ""}
          tarjeta={tarjeta}
          conContexto={tieneContexto(perfil)}
          bloques={bloques}
          progreso={progreso}
          generadosIniciales={generados}
          urlFormulario={urlFormulario(process.env.URL_FORMULARIO_BASE, perfil?.formToken ?? null)}
          avisoFormulario={avisoFormulario(
            perfil?.profesor ?? "",
            perfil?.formTokenEnviadoEn ?? null
          )}
        />
      </main>
    </div>
  );
}
