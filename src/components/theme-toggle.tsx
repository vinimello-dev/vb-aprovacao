'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;

  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAdminRoute) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
      return;
    }

    const saved = localStorage.getItem('vb-admin-theme');
    const prefersDark = saved === 'dark';
    setIsDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, [isAdminRoute]);

  const toggleTheme = () => {
    if (!isAdminRoute) return;
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('vb-admin-theme', next ? 'dark' : 'light');
  };

  if (!mounted || !isAdminRoute) return null;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Noturno'}
      className={`fixed bottom-5 left-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full border-2 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 text-[11px] font-black uppercase tracking-wider ${
        isDark
          ? 'bg-[#1C1F2A]/95 border-[#323748] text-[#F3F4F6] hover:border-[#FD3100]'
          : 'bg-white/95 border-[#DCD6CC] text-[#111111] hover:border-[#FD3100]'
      }`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-[#FF7C5E] stroke-[2]" />
          <span className="hidden sm:inline">Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#FD3100] stroke-[2]" />
          <span className="hidden sm:inline">Modo Noturno</span>
        </>
      )}
    </button>
  );
}
