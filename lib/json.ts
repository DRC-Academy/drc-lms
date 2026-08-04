/**
 * Rescata el primer objeto JSON de una respuesta del modelo.
 *
 * Aunque el prompt pida JSON puro, a veces llega envuelto en vallados de
 * markdown o con una frase de cortesía delante. Lo usan tanto la
 * generación de bloques como el revisor pedagógico.
 */
export function extraerJson(texto: string): unknown {
  let limpio = texto.trim();

  // ```json … ``` o ``` … ```
  const vallado = limpio.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (vallado) limpio = vallado[1].trim();

  // Cualquier cosa que el modelo haya escrito antes o después del objeto.
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin <= inicio) return null;

  try {
    return JSON.parse(limpio.slice(inicio, fin + 1)) as unknown;
  } catch {
    return null;
  }
}
