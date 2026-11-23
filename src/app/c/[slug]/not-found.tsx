import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function ClientNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEEDEA] px-4">
      <div className="max-w-md w-full bg-white border border-[#DCD6CC] rounded-3xl p-8 text-center shadow-lg">
        <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
          <AlertCircle className="w-7 h-7 stroke-[2.5]" />
        </div>
        <h2 className="text-xl font-black text-[#111111] uppercase tracking-tight mb-2">
          Cliente não encontrado
        </h2>
        <p className="text-sm text-agency-muted mb-6 font-medium">
          O link de acesso informado não corresponde a nenhum cliente cadastrado na plataforma.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md shadow-brand-500/25"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
