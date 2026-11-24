'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Falha ao autenticar.');
        setLoading(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Erro de conexão ao tentar fazer login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEEDEA] px-4 relative overflow-hidden">
      {/* Detalhes de luz suave ao fundo */}
      <div className="absolute w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none -top-32 -left-32" />
      <div className="absolute w-[400px] h-[400px] bg-[#111111]/5 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white border border-[#DCD6CC] rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          {/* Logo e Título */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-24 flex items-center justify-center mb-4">
              <img
                src="/logo-vb.png?v=3"
                alt="Logo VB"
                className="h-24 w-auto object-contain"
              />
            </div>
            
            <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[11px] font-bold tracking-wide uppercase border border-brand-200 mb-2">
              Painel Administrativo
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#111111] uppercase">
              VB <span style={{ color: '#FD3100' }}>HUB</span>
            </h1>
            <p className="text-agency-muted text-xs mt-1">
              Central de Conteúdos, Roteiros e Aprovações
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-medium animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#88857F]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha de admin"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F7] border border-[#DCD6CC] rounded-2xl text-[#111111] placeholder-[#A09D96] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
              className="btn-vb-primary w-full py-3.5 px-4 rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#EEEDEA] text-center text-xs text-agency-muted">
            Senha configurada no <code className="text-[#111111] bg-[#F2F0EB] px-1.5 py-0.5 rounded font-mono font-semibold">.env</code>: <code className="text-brand-600 font-bold font-mono">admin</code>
          </div>
        </div>
      </div>
    </div>
  );
}
