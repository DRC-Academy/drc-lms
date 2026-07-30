import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Práctica · DRC Academy",
  description: "Tu práctica personalizada, hecha con tus clases.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
