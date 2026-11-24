import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VB Aprovação | Plataforma de Conteúdo',
  description: 'Painel da Agência e Portal de Aprovação de Conteúdo',
  icons: {
    icon: [
      { url: '/logo-vb.png', sizes: 'any' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/logo-vb.png',
    apple: '/logo-vb.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/logo-vb.png" type="image/png" />
        <link rel="shortcut icon" href="/logo-vb.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-vb.png" />
      </head>
      <body className="antialiased bg-[#EEEDEA] text-[#111111] min-h-screen selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
