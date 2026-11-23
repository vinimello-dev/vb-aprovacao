import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VB Aprovação | Plataforma de Conteúdo',
  description: 'Painel da Agência e Portal de Aprovação de Conteúdo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-[#EEEDEA] text-[#111111] min-h-screen selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
