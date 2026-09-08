import type { Metadata } from "next";
import "./globals.css";
import ProveedorIdioma from "@/components/ProveedorIdioma";
import { idiomaActual } from "@/lib/idioma-servidor";

export const metadata: Metadata = {
  title: "Práctica · DRC Academy",
  description: "Tu práctica personalizada, hecha con tus clases.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Se lee AQUÍ, una vez, y baja por contexto a todo lo que es de
  // cliente. Los componentes de servidor de más abajo lo vuelven a pedir
  // con `idiomaActual()`, que va en `cache()` y no relee nada.
  const idioma = idiomaActual();

  return (
    // `lang` de verdad y no un "es" fijo: es lo que hace que el lector de
    // pantalla pronuncie el texto con la fonética correcta y que el
    // navegador ofrezca —o no— traducir la página. Con el atributo
    // mintiendo, un alumno con lector de pantalla oye inglés leído en
    // español, que es peor que no tenerlo.
    <html lang={idioma}>
      <body className="font-sans antialiased">
        <ProveedorIdioma idioma={idioma}>{children}</ProveedorIdioma>
      </body>
    </html>
  );
}
