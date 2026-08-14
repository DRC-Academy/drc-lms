import Link from "next/link";
import { redirect } from "next/navigation";
import { BLOQUES } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { nivelDeBloque } from "@/lib/perfil";
import { calcularTarjetas, urlFormulario } from "@/lib/modos";
import { exigirSesion } from "@/lib/sesion-servidor";
import {
  leerAvanceAlumno,
  leerBloquesGenerados,
  leerProgresoAlumno,
  leerUltimaGeneracionPorModo,
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
 */
export default async function PaginaPractica() {
  const sesion = await exigirSesion();
  if (sesion.rol !== "alumno") redirect("/");

  const alumnoId = sesion.alumnoId;

  const [datos, progreso, avance, generados, ultimasGeneraciones] = await Promise.all([
    obtenerAlumno(alumnoId),
    leerProgresoAlumno(alumnoId),
    leerAvanceAlumno(alumnoId),
    leerBloquesGenerados(alumnoId),
    leerUltimaGeneracionPorModo(alumnoId),
  ]);

  // Sin ficha en Gestión no hay perfil del que generar nada. No es un
  // 404: el alumno existe, es su ficha la que falta.
  const perfil = datos?.perfil ?? null;
  const ultimaClase = datos?.ultimaClase ?? null;

  const tarjetas = calcularTarjetas(perfil, ultimaClase, ultimasGeneraciones);
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(perfil.nivel)) : [];

  // Solo para que la cabecera pueda pintar "Mi curso" sin cambiar de
  // forma entre pantallas.
  const cursos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel) : [];

  return (
    <>
      <Cabecera
        nombre={perfil?.nombre.trim() || undefined}
        alumnoId={alumnoId}
        cursoSlug={cursos[0]?.slug ?? null}
        seccion="practica"
      />

      <main className="mx-auto flex max-w-columna flex-col gap-10 px-6 pb-[140px] pt-7">
        <header>
          <h1 className="text-balance font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.01em] text-marca-tinta sm:text-[38px]">
            Tu práctica
          </h1>
          <p className="mt-3 max-w-[52ch] text-pretty text-[16px] leading-[1.55] text-drc-cuerpo">
            Ejercicios hechos para ti a partir de tu perfil y de lo último que diste en clase. No es
            el curso: es lo que te toca a ti hoy.
          </p>
        </header>

        <PanelPractica
          alumnoId={alumnoId}
          tarjetas={tarjetas}
          bloques={bloques}
          progreso={progreso}
          avance={avance}
          generadosIniciales={generados}
          urlFormulario={urlFormulario(process.env.URL_FORMULARIO_BASE, perfil?.formToken ?? null)}
        />

        <p className="text-[14px] text-drc-cuerpo">
          <Link
            href={`/alumno/${alumnoId}`}
            className="transition-colors hover:text-drc-verde-texto"
          >
            ← Volver al inicio
          </Link>
        </p>
      </main>
    </>
  );
}
