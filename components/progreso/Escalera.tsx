import { ESCALERA_MCER, type NivelMcer } from "@/lib/recorrido";

/**
 * La escalera del MCER: superados, «Estás aquí» y «Tu meta» (si no es su
 * propio peldaño). Los dos rótulos los pone quien la pinta: el alumno lee
 * «Estás aquí» y su profesor, «Está aquí». Sus estilos (`.p2-*`) viven en
 * `components/progreso/estilos.tsx`.
 */
export default function Escalera({
  nivel,
  meta,
  estasAqui,
  tuMeta,
}: {
  nivel: NivelMcer | null;
  meta: NivelMcer | null;
  estasAqui: string;
  tuMeta: string;
}) {
  const actual = nivel ? ESCALERA_MCER.indexOf(nivel) : -1;
  const objetivo = meta ? ESCALERA_MCER.indexOf(meta) : -1;
  return (
    <ol className="p2-escalera">
      {ESCALERA_MCER.map((etiqueta, i) => {
        const hecho = actual >= 0 && i < actual;
        const aqui = actual >= 0 && i === actual;
        const esMeta = objetivo >= 0 && i === objetivo && !aqui;
        const clases = ["p2-peldano", hecho && "is-hecho", aqui && "is-actual", esMeta && "is-meta"].filter(Boolean).join(" ");
        return (
          <li key={etiqueta} className={clases} aria-current={aqui ? "step" : undefined}>
            <span>{etiqueta}</span>
            {aqui && <span className="p2-peldano-nota">{estasAqui}</span>}
            {esMeta && <span className="p2-peldano-nota">{tuMeta}</span>}
          </li>
        );
      })}
    </ol>
  );
}
