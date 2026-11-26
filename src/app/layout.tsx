import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeToggle } from '@/components/theme-toggle';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VB Hub | Central de Conteúdos & Aprovações',
  description: 'VB Hub — Central de Conteúdos, Roteiros, Métricas e Aprovações',
  openGraph: {
    title: 'VB Hub | Central de Conteúdos & Aprovações',
    description: 'Acesse seus conteúdos, roteiros, métricas e aprovações no VB Hub.',
    siteName: 'VB Hub',
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: '/logo-vb.png' }],
  },
  twitter: {
    card: 'summary',
    title: 'VB Hub | Central de Conteúdos & Aprovações',
    description: 'Acesse seus conteúdos, roteiros, métricas e aprovações no VB Hub.',
    images: ['/logo-vb.png'],
  },
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
      <body className={`${inter.className} antialiased bg-[#EEEDEA] text-[#111111] min-h-screen selection:bg-brand-500 selection:text-white transition-colors duration-200`}>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
