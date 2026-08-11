import { notFound } from "next/navigation";
import { BLOQUES } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { nivelDeBloque } from "@/lib/perfil";
import { calcularTarjetas } from "@/lib/modos";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import {
  leerAvanceAlumno,
  leerBloquesGenerados,
  leerProgresoAlumno,
} from "@/lib/progreso-servidor";
import PanelAlumno from "@/components/PanelAlumno";

// La ficha se arma con datos de Gestión en cada visita: no hay nada que
// prerenderizar y los datos cambian en cuanto se analiza una clase nueva.
export const dynamic = "force-dynamic";

export default async function PerfilAlumno({ params }: { params: { id: string } }) {
  // Antes de leer nada: un alumno solo abre su propia ficha, aunque
  // escriba otro id en la barra de direcciones. El equipo, cualquiera.
  const sesion = await exigirAccesoAFicha(params.id);

  // El progreso ya no vive en el navegador, así que se puede pedir aquí
  // y llegar a la interfaz en el primer render. Antes el panel se pintaba
  // vacío y se rellenaba en un efecto, que es lo que hacía que las
  // etiquetas de estado parpadearan al entrar.
  //
  // Las cuatro consultas van en paralelo: tres a la base del LMS y una a
  // Gestión, y ninguna depende de las otras.
  const [datos, progreso, avance, generados] = await Promise.all([
    obtenerAlumno(params.id),
    leerProgresoAlumno(params.id),
    leerAvanceAlumno(params.id),
    leerBloquesGenerados(params.id),
  ]);

  // Solo es 404 cuando el id no corresponde a nadie. Un alumno con clase
  // pero sin perfil ve su ficha con lo que haya.
  if (!datos) notFound();

  const { perfil, ultimaClase } = datos;
  const tarjetas = calcularTarjetas(perfil, ultimaClase);

  // Los bloques estáticos se filtran por nivel exacto. Un A2 no recibe
  // material B1: su contenido sale del banco A2 al generar.
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(perfil.nivel)) : [];

  return (
    <PanelAlumno
      alumnoId={params.id}
      perfil={perfil}
      ultimaClase={ultimaClase}
      tarjetas={tarjetas}
      bloques={bloques}
      progresoInicial={progreso}
      avanceInicial={avance}
      generadosIniciales={generados}
      esAdministrador={sesion.rol === "admin"}
    />
  );
}
