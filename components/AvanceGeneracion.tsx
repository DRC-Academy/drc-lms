"use client";

import { textoDeEtapa, type EtapaGeneracion } from "@/lib/generacion";
import type { FuentesDelBloque } from "@/lib/textos/practica";
import { usarIdioma } from "@/components/ProveedorIdioma";
import AnclaMascota from "@/components/mascota/AnclaMascota";

/**
 * Lo que ve el alumno mientras se prepara su bloque.
 *
 * Sustituye a un spinner sin final. Con diez ejercicios la espera son
 * entre cuarenta y tres y cincuenta y dos segundos medidos, y ese rato
 * mirando algo que gira sin decir nada no se distingue de una pantalla
 * rota: es la lectura que acaba haciendo cualquiera.
 *
 * Tres decisiones que sostienen la pieza:
 *
 *   1. El texto lo manda el servidor. Cambia cuando cambia la etapa de
 *      verdad, no cuando lo dice un temporizador. Si pone "revisando",
 *      el revisor está corriendo.
 *   2. La barra no llega al 100% hasta que el bloque está. Plantada en
 *      el 95% es honesta; llegando al 100% y siguiendo a la espera
 *      convierte cada segundo siguiente en sospecha.
 *   3. Si se pasa de lo previsto se dice. Reconocer la espera cuesta una
 *      frase y evita que el alumno se pregunte si aquello sigue vivo.
 *
 * Ya no recibe `modo`: había un juego de textos por cada uno de los tres
 * y ahora hay uno solo, porque el bloque es uno solo.
 *
 * LA MASCOTA, con los anteojos puestos, trabaja al lado de la barra
 * mientras dura la espera. Es la primera pantalla del producto donde
 * aparece, y está aquí porque es el único rato en que el alumno mira
 * fijo sin nada que hacer: en «estudiando» no vuelve sola a idle, y se
 * mueve lo justo —respira, la cola, un balanceo de vez en cuando— para
 * que se vea que está en ello sin distraer de la etapa que dice el
 * texto. Decorativa para el lector de pantalla: la etapa ya la anuncia
 * el `aria-live`.
 */
export default function AvanceGeneracion({
  etapa,
  progreso,
  tardando,
  fuentes,
  anclaId,
}: {
  etapa: EtapaGeneracion;
  progreso: number;
  tardando: boolean;
  /**
   * De qué está hecho el bloque, para que la línea de abajo nombre
   * solo lo que este alumno tiene. Sin tarjeta no se promete nada más
   * que el nivel, que es lo único que siempre hay.
   */
  fuentes?: FuentesDelBloque;
  /**
   * El ancla de la mascota mientras se genera: prioridad 3, la más alta
   * de su pantalla, así que la mascota viene aquí a estudiar y vuelve a
   * su sitio al acabar.
   */
  anclaId: string;
}) {
  const t = usarIdioma().t.practica;
  const texto = textoDeEtapa(etapa, t);

  return (
    <div className="aparece mt-4 flex items-end gap-4 rounded-[14px] border border-marca-borde bg-white px-5 py-5 lg:px-6">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-marca-verdeOsc">
          {t.preparandoTuBloque}
        </p>

        <div className="mt-3 flex items-baseline justify-between gap-4">
          {/* `aria-live` y no `role="status"` en el contenedor: así el lector
              de pantalla anuncia el cambio de etapa sin repetir el resto. */}
          <p aria-live="polite" className="font-display text-[17px] font-bold text-marca-tinta">
            {texto}
          </p>
          <span aria-hidden className="shrink-0 text-[13px] tabular-nums text-marca-gris">
            {progreso}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progreso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.progresoPreparacion}
          className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-marca-pista"
        >
          <div
            className="h-full rounded-full bg-marca-verde"
            style={{ width: `${progreso}%`, transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </div>

        <p className="mt-3 text-[14px] leading-[1.5] text-marca-gris">
          {tardando
            ? t.seHaceDeRogar
            : t.preparadoConLoTuyo(fuentes ?? { clase: false, contexto: false })}
        </p>
      </div>

      <AnclaMascota id={anclaId} prioridad={3} tamaño={112} estado="estudiando" />
    </div>
  );
}
