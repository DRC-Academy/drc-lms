import { formatearFechaLarga } from "@/lib/perfil";
import { esHito } from "@/lib/recorrido";
import RecorridoPlegado, { type ClasePlegada } from "@/components/progreso/RecorridoPlegado";

export type ClaseParaRecorrido = {
  id: string;
  numero: number | null;
  fechaClase: string;
  titulo: string;
  temas: string;
  /** Solo en el panel del profesor. */
  resumen?: string | null;
  etiqueta?: string | null;
};

export type TextosRecorrido = {
  titulo: string;
  vacio: string;
  verTodas: string;
  plegar: string;
  rotuloHito: string;
  rotuloTemas: string;
  rotuloResumen?: string;
  claseNumero: (n: number) => string;
  fechaLarga: (dia: number, indiceMes: number, anio: number) => string;
  resumen: (clases: number, fecha: string | null, titulo: string | null) => string;
};

/**
 * Las clases con análisis, formateadas para el recorrido plegado. Los
 * textos los pone quien lo pinta: «Tu recorrido» en la ficha del alumno y
 * «Su recorrido» en la de su profesor.
 */
export default function Recorrido({
  clases,
  textos,
  abiertoDeEntrada = false,
}: {
  clases: ClaseParaRecorrido[];
  textos: TextosRecorrido;
  abiertoDeEntrada?: boolean;
}) {
  const conContenido = clases.filter((c) => c.titulo !== "" || c.temas !== "");

  const plegadas: ClasePlegada[] = conContenido.map((c) => {
    const n = c.numero ?? 0;
    return {
      id: c.id,
      numero: n > 0 ? textos.claseNumero(n) : null,
      // `fecha_clase` es AAAA-MM-DD: se parte la cadena, sin `new Date()`.
      fecha: c.fechaClase !== "" ? formatearFechaLarga(c.fechaClase, textos.fechaLarga) : null,
      hito: n > 0 && esHito(n),
      titulo: c.titulo,
      temas: c.temas,
      resumen: c.resumen ?? null,
      etiqueta: c.etiqueta ?? null,
    };
  });

  const ultima = plegadas[0];
  // En el resumen, la fecha sin el año: «el 25 de septiembre».
  const fechaCorta = ultima?.fecha ? ultima.fecha.replace(/ (de )?\d{4}$/, "") : null;

  return (
    <RecorridoPlegado
      titulo={textos.titulo}
      vacio={textos.vacio}
      resumen={ultima ? textos.resumen(plegadas.length, fechaCorta, ultima.titulo || null) : ""}
      verTodas={textos.verTodas}
      plegar={textos.plegar}
      rotuloHito={textos.rotuloHito}
      rotuloTemas={textos.rotuloTemas}
      rotuloResumen={textos.rotuloResumen}
      abiertoDeEntrada={abiertoDeEntrada}
      clases={plegadas}
    />
  );
}
