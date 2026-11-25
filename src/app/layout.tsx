import type { Metadata } from 'next';
import './globals.css';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'VB HUB | Central de Conteúdos & Aprovações',
  description: 'VB HUB — Central de Conteúdos, Roteiros e Aprovações',
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-vb.png" type="image/png" />
        <link rel="shortcut icon" href="/logo-vb.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-vb.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(window.location.pathname.startsWith('/admin')&&localStorage.getItem('vb-admin-theme')==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased bg-[#EEEDEA] text-[#111111] min-h-screen selection:bg-brand-500 selection:text-white transition-colors duration-200">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
