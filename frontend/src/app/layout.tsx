import type { Metadata } from 'next';
import './globals.css';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

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
      <body>
        <CurrencyProvider>
          {children}
        </CurrencyProvider>
      </body>
    </html>
  );
}
