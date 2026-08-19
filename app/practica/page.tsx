import { redirect } from "next/navigation";
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
import { exigirSesion } from "@/lib/sesion-servidor";
import {
  leerAvanceAlumno,
  leerBloquesGenerados,
  leerProgresoAlumno,
  leerUltimaGeneracion,
} from "@/lib/progreso-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { calcularDiploma } from "@/lib/diploma";
import Cabecera from "@/components/Cabecera";
import PanelPractica from "@/components/PanelPractica";

export const dynamic = "force-dynamic";

/**
 * La práctica, como sección propia.
 *
 * Siempre es la del alumno de la sesión: no hay `/practica/{id}` porque
 * la práctica se genera del perfil y la última clase de quien entra, y
 * no tiene sentido "ver la práctica de otro". El equipo, que no es
 * alumno de nada, se va al buscador.
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
  const sesion = await exigirSesion();
  if (sesion.rol !== "alumno") redirect("/");

  const alumnoId = sesion.alumnoId;

  const [datos, progreso, avance, generados, ultimaGeneracion] = await Promise.all([
    obtenerAlumno(alumnoId),
    leerProgresoAlumno(alumnoId),
    leerAvanceAlumno(alumnoId),
    leerBloquesGenerados(alumnoId),
    leerUltimaGeneracion(alumnoId),
  ]);

  // Sin ficha en Gestión no hay perfil del que generar nada. No es un
  // 404: el alumno existe, es su ficha la que falta.
  const perfil = datos?.perfil ?? null;
  const ultimaClase = datos?.ultimaClase ?? null;

  const tarjeta = calcularTarjeta(perfil, ultimaClase, ultimaGeneracion);
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(perfil.nivel)) : [];

  // Para que la cabecera pinte "Mi curso" y la barra fina del diploma.
  //
  // `cursosDelInicio` y no `cursosAsignados`: además de los cursos trae
  // su progreso, que es lo que la barra cuenta. Son un par de consultas
  // más en un paso que ya existía, no un viaje nuevo.
  const estadosCurso = perfil ? await cursosDelInicio(alumnoId, perfil.plan, perfil.nivel) : [];
  const principal = estadosCurso[0];

  // Mismo criterio que en el inicio: sin curso no hay barra.
  const barraDiploma =
    calcularDiploma(principal?.completadas ?? 0, principal?.total ?? 0).estado === "sin-curso"
      ? null
      : { completadas: principal?.completadas ?? 0, total: principal?.total ?? 0 };

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <Cabecera
        nombre={perfil?.nombre.trim() || undefined}
        alumnoId={alumnoId}
        cursoSlug={principal?.curso.slug ?? null}
        seccion="practica"
        diploma={barraDiploma}
      />

      {/* El hueco de abajo es para la barra fija: 120px es lo que mide con
          su margen, así que la última tarjeta nunca queda debajo. En
          móvil se suma el que `globals.css` reserva para la navegación
          inferior. */}
      <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col gap-7 px-4 pb-[120px] pt-[18px] lg:gap-9 lg:px-9 lg:pt-8">
        <header>
          {/* El mismo rótulo que la pestaña. Si la navegación dice una
              cosa y el título de la pantalla dice otra, el alumno duda de
              si ha llegado adonde quería. */}
          <h1 className="font-display text-[24px] font-extrabold leading-[1.15] tracking-[-0.02em] text-marca-tinta lg:text-[30px]">
            Para ti
          </h1>
          <p className="mt-[5px] max-w-[720px] text-pretty text-[14px] leading-[1.45] text-marca-gris lg:mt-1.5 lg:text-[15px]">
            Ejercicios hechos contigo dentro: tu perfil, tus clases y lo que se te viene repitiendo.
            No es el curso, que es igual para todos: es lo tuyo.
          </p>
        </header>

        <PanelPractica
          alumnoId={alumnoId}
          tarjeta={tarjeta}
          // La tarjeta crema de arriba habla solo de su clase, no de las
          // cuatro fuentes del bloque, así que se redacta aparte. Está
          // "ya practicada" cuando la tarjeta trae espera, que con la
          // regla única significa exactamente eso.
          resumenClase={resumenUltimaClase(perfil, ultimaClase, tarjeta?.espera != null)}
          conContexto={tieneContexto(perfil)}
          bloques={bloques}
          progreso={progreso}
          avance={avance}
          generadosIniciales={generados}
          nivel={perfil?.nivel ?? ""}
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
