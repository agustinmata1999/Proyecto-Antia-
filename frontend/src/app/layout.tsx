import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antia - Plataforma de Pronósticos',
  description: 'Monetiza tu contenido con Antia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
