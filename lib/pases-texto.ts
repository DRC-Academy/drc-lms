import type { Idioma } from "@/lib/idioma";

/** «19 de noviembre de 2027», en Madrid, que es donde se decide el fin del pase. */
export function fechaDePase(hasta: Date, idioma: Idioma): string {
  return new Intl.DateTimeFormat(idioma === "es" ? "es-ES" : "en-GB", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(hasta);
}
