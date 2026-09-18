import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EstudioJurídico - Tu compañero de estudio con IA",
  description:
    "Plataforma de estudio con IA para estudiantes de Abogacía. Mapas conceptuales, cuestionarios, resúmenes, flashcards y más.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <a href="#main-content" className="skip-nav">
            Saltar al contenido
          </a>
          <Navbar />
          <main id="main-content" className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
