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
import { cursosAsignados } from "@/lib/cursos-servidor";
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
      />

      {/* El hueco de abajo es para la barra fija: 120px es lo que mide con
          su margen, así que la última tarjeta nunca queda debajo. En
          móvil se suma el que `globals.css` reserva para la navegación
          inferior. */}
      <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col gap-7 px-4 pb-[120px] pt-[18px] lg:gap-9 lg:px-9 lg:pt-8">
        <header>
          <h1 className="font-display text-[24px] font-extrabold leading-[1.15] tracking-[-0.02em] text-marca-tinta lg:text-[30px]">
            Tu práctica
          </h1>
          <p className="mt-[5px] max-w-[720px] text-pretty text-[14px] leading-[1.45] text-marca-gris lg:mt-1.5 lg:text-[15px]">
            Ejercicios hechos para ti a partir de tu perfil y de lo que trabajas en clase. No es el
            curso: es lo que te toca a ti hoy.
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
