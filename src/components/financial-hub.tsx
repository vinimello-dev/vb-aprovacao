'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  Receipt,
  Wallet,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { FinancialEntryItem, FinancialMonthExtra } from '@/lib/services/financial-service';

interface FinancialHubProps {
  clients: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  }>;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function FinancialHub({ clients }: FinancialHubProps) {
  const [currentMonth, setCurrentMonth] = useState(11); // Novembro padrão
  const [currentYear, setCurrentYear] = useState(2026);

  const [entries, setEntries] = useState<FinancialEntryItem[]>([]);
  const [extra, setExtra] = useState<FinancialMonthExtra>({ extraCardAmount: 2000 });
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    extraAmount: 0,
    finalTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  // Form Inline: Novo Recebimento (Empresa)
  const [newIncomeDesc, setNewIncomeDesc] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeClientId, setNewIncomeClientId] = useState('');
  const [submittingIncome, setSubmittingIncome] = useState(false);

  // Form Inline: Nova Conta a Pagar
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Edição Inline de Linha
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // Edição do Saldo Extra / Cartão
  const [isEditingExtra, setIsEditingExtra] = useState(false);
  const [editExtraAmount, setEditExtraAmount] = useState('2000');
  const [savingExtra, setSavingExtra] = useState(false);

  // Tab Mobile: 'all' | 'incomes' | 'expenses'
  const [mobileTab, setMobileTab] = useState<'all' | 'incomes' | 'expenses'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/financial?month=${currentMonth}&year=${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setExtra(data.extra || { extraCardAmount: 0 });
        setSummary(data.summary || {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          extraAmount: 0,
          finalTotal: 0,
        });
        setEditExtraAmount(String(data.extra?.extraCardAmount || 0));
      }
    } catch (err) {
      console.error('Erro ao buscar financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth, currentYear]);

  // Navegação de Mês
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Adicionar Recebimento
  const handleAddIncome = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const desc = newIncomeDesc.trim();
    if (!desc) return;

    setSubmittingIncome(true);
    try {
      const parsedAmount = parseFloat(newIncomeAmount.replace(',', '.')) || 0;
      const res = await fetch('/api/admin/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INCOME',
          description: desc,
          amount: parsedAmount,
          month: currentMonth,
          year: currentYear,
          clientId: newIncomeClientId || undefined,
          status: 'PAID',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.entry) {
          setEntries((prev) => [...prev, data.entry]);
        }
        setNewIncomeDesc('');
        setNewIncomeAmount('');
        setNewIncomeClientId('');
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao adicionar recebimento:', err);
    } finally {
      setSubmittingIncome(false);
    }
  };

  // Adicionar Conta a Pagar
  const handleAddExpense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const desc = newExpenseDesc.trim();
    if (!desc) return;

    setSubmittingExpense(true);
    try {
      const parsedAmount = parseFloat(newExpenseAmount.replace(',', '.')) || 0;
      const res = await fetch('/api/admin/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EXPENSE',
          description: desc,
          amount: parsedAmount,
          month: currentMonth,
          year: currentYear,
          status: 'PAID',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.entry) {
          setEntries((prev) => [...prev, data.entry]);
        }
        setNewExpenseDesc('');
        setNewExpenseAmount('');
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao adicionar conta:', err);
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Alternar Status (Pago / Pendente)
  const handleToggleStatus = async (item: FinancialEntryItem) => {
    const nextStatus = item.status === 'PAID' ? 'PENDING' : 'PAID';
    // Atualização otimista imediata para evitar atraso visual
    setEntries((prev) =>
      prev.map((e) => (e.id === item.id ? { ...e, status: nextStatus } : e))
    );

    try {
      await fetch('/api/admin/financial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: nextStatus,
        }),
      });
      fetchData();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      fetchData();
    }
  };

  // Excluir Linha
  const handleDeleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/admin/financial?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao excluir item:', err);
      fetchData();
    }
  };

  // Iniciar Edição
  const startEditing = (item: FinancialEntryItem) => {
    setEditingId(item.id);
    setEditDesc(item.description);
    setEditAmount(String(item.amount));
  };

  // Salvar Edição
  const saveEditing = async (id: string) => {
    try {
      const parsedAmount = parseFloat(editAmount.replace(',', '.')) || 0;
      const desc = editDesc.trim();
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, description: desc || e.description, amount: parsedAmount } : e
        )
      );

      await fetch('/api/admin/financial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          description: desc || undefined,
          amount: parsedAmount,
        }),
      });
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar item:', err);
    }
  };

  // Salvar Saldo Extra / Cartão
  const handleSaveExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExtra(true);
    try {
      const parsedAmount = parseFloat(editExtraAmount.replace(',', '.')) || 0;
      await fetch('/api/admin/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_EXTRA',
          month: currentMonth,
          year: currentYear,
          extraCardAmount: parsedAmount,
        }),
      });
      setIsEditingExtra(false);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar saldo extra:', err);
    } finally {
      setSavingExtra(false);
    }
  };

  // Formatação de Moeda
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Separar em recebimentos e contas
  const incomes = entries.filter((e) => e.type === 'INCOME');
  const expenses = entries.filter((e) => e.type === 'EXPENSE');

  // Cálculos dinâmicos em tempo real a partir de entries e extra
  const totalIncome = incomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const balance = totalIncome - totalExpense;
  const extraAmount = Number(extra?.extraCardAmount) || 0;
  const finalTotal = balance + extraAmount;

  return (
    <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-200">
      {/* 1. Barra de Navegação do Mês & Ações */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#DCD6CC] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span
            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md shrink-0"
          >
            💰
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#111111] uppercase tracking-tight flex items-center gap-2">
              Controle <span style={{ color: '#FD3100' }}>Financeiro</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#66635D] font-medium mt-0.5">
              Recebimentos de clientes, contas a pagar e balanço de caixa da agência
            </p>
          </div>
        </div>

        {/* Seletor do Mês */}
        <div className="flex items-center gap-2 bg-[#FAF9F7] border-2 border-[#DCD6CC] p-1.5 rounded-2xl shadow-sm self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-[#EEEDEA] text-[#111111] rounded-xl transition-colors"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4 stroke-[3]" />
          </button>

          <div className="flex items-center gap-2 px-3 text-sm font-black text-[#111111] uppercase tracking-wider">
            <Calendar className="w-4 h-4" style={{ color: '#FD3100' }} />
            <span>
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-[#EEEDEA] text-[#111111] rounded-xl transition-colors"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={() => {
              const now = new Date();
              setCurrentMonth(now.getMonth() + 1);
              setCurrentYear(now.getFullYear());
            }}
            className="hidden sm:inline-block ml-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-white border border-[#DCD6CC] hover:bg-[#EEEDEA] rounded-xl text-[#66635D]"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* 2. Cards de Resumo & Balanço do Mês (Estilo Planilha) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Recebimentos */}
        <div className="col-span-1 bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase text-[#66635D] tracking-wider">
              Recebimentos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(totalIncome)}
            </h3>
            <p className="text-[10px] text-[#66635D] font-bold mt-0.5">
              {incomes.length} empresas no mês
            </p>
          </div>
        </div>

        {/* Total Contas a Pagar */}
        <div className="col-span-1 bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase text-[#66635D] tracking-wider">
              Contas a Pagar
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-rose-600 tracking-tight">
              {formatCurrency(totalExpense)}
            </h3>
            <p className="text-[10px] text-[#66635D] font-bold mt-0.5">
              {expenses.length} despesas listadas
            </p>
          </div>
        </div>

        {/* Sobra Líquida (Dinheiro) */}
        <div className="col-span-1 bg-gradient-to-br from-[#FFF0EC] to-white p-4 sm:p-5 rounded-3xl border-2 border-[#FFCEBF] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase text-[#FD3100] tracking-wider">
              Sobra (Dinheiro)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FD3100] text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-[#111111] tracking-tight">
              {formatCurrency(balance)}
            </h3>
            <p className="text-[10px] text-[#FD3100] font-bold mt-0.5">
              Receitas - Contas
            </p>
          </div>
        </div>

        {/* Saldo Extra / Cartão (Editável com 1 clique) */}
        <div className="col-span-1 bg-white p-4 sm:p-5 rounded-3xl border-2 border-[#DCD6CC] shadow-sm flex flex-col justify-between relative group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase text-[#66635D] tracking-wider flex items-center gap-1">
              Cartão / Reserva
            </span>
            <button
              onClick={() => setIsEditingExtra(!isEditingExtra)}
              className="p-1 hover:bg-[#FAF9F7] text-[#FD3100] rounded-lg transition-colors"
              title="Alterar valor do cartão/reserva"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            {isEditingExtra ? (
              <form onSubmit={handleSaveExtra} className="flex items-center gap-1.5 mt-1">
                <input
                  type="number"
                  step="any"
                  value={editExtraAmount}
                  onChange={(e) => setEditExtraAmount(e.target.value)}
                  className="w-full px-2 py-1 text-sm font-black border border-[#FD3100] rounded-xl focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={savingExtra}
                  className="p-1.5 bg-[#FD3100] text-white rounded-xl"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>
              </form>
            ) : (
              <h3
                onClick={() => setIsEditingExtra(true)}
                className="text-lg sm:text-2xl font-black text-[#111111] tracking-tight cursor-pointer hover:text-[#FD3100] transition-colors"
                title="Clique para editar"
              >
                {formatCurrency(extraAmount)}
              </h3>
            )}
            <p className="text-[10px] text-[#66635D] font-bold mt-0.5">
              Saldo extra acumulado
            </p>
          </div>
        </div>

        {/* Total Final Disponível */}
        <div className="col-span-2 lg:col-span-1 bg-[#111111] text-white p-4 sm:p-5 rounded-3xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase text-white/70 tracking-wider">
              Total Líquido
            </span>
            <Sparkles className="w-4 h-4 text-[#FD3100]" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatCurrency(finalTotal)}
            </h3>
            <p className="text-[10px] text-white/60 font-bold mt-0.5">
              Sobra + Cartão
            </p>
          </div>
        </div>
      </div>

      {/* Tabs para telas menores de Smartphone */}
      <div className="flex sm:hidden bg-white p-1 rounded-2xl border-2 border-[#DCD6CC] text-xs font-black uppercase">
        <button
          onClick={() => setMobileTab('all')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            mobileTab === 'all' ? 'btn-vb-primary' : 'text-[#66635D]'
          }`}
        >
          Lado a Lado
        </button>
        <button
          onClick={() => setMobileTab('incomes')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            mobileTab === 'incomes' ? 'btn-vb-primary' : 'text-[#66635D]'
          }`}
        >
          Recebimentos
        </button>
        <button
          onClick={() => setMobileTab('expenses')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            mobileTab === 'expenses' ? 'btn-vb-primary' : 'text-[#66635D]'
          }`}
        >
          Contas a Pagar
        </button>
      </div>

      {/* 3. Estrutura das Duas Colunas Lado a Lado (Exatamente no estilo da planilha) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ==================== COLUNA 1: RECEBIMENTOS (EMPRESAS) ==================== */}
        {(mobileTab === 'all' || mobileTab === 'incomes') && (
          <div className="bg-white rounded-3xl border-2 border-[#DCD6CC] shadow-sm overflow-hidden flex flex-col">
            {/* Cabeçalho da Coluna */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FAF9F7] to-white border-b border-[#EEEDEA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  🏢
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#111111] uppercase tracking-tight">
                    Recebimentos {MONTH_NAMES[currentMonth - 1]}
                  </h3>
                  <p className="text-[11px] text-[#66635D] font-medium">
                    Empresas contratantes e mensalidades
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                {formatCurrency(totalIncome)}
              </span>
            </div>

            {/* Tabela de Recebimentos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EEEDEA] bg-[#FAF9F7] text-[10px] font-black uppercase text-[#66635D]">
                    <th className="py-2.5 px-4 w-10 text-center">Status</th>
                    <th className="py-2.5 px-4">Empresa / Descrição</th>
                    <th className="py-2.5 px-4 text-right">Valor (R$)</th>
                    <th className="py-2.5 px-3 w-16 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEDEA]">
                  {incomes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#97A0AF] font-medium">
                        Nenhum recebimento lançado neste mês.
                      </td>
                    </tr>
                  ) : (
                    incomes.map((item) => {
                      const isEditing = editingId === item.id;
                      const isPaid = item.status === 'PAID';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#FAF9F7]/80 transition-colors group ${
                            !isPaid ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Checkbox de Status (Recebido vs Pendente) */}
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors mx-auto ${
                                isPaid
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-[#DCD6CC] hover:border-emerald-500 bg-white'
                              }`}
                              title={isPaid ? 'Marcar como Pendente' : 'Marcar como Recebido'}
                            >
                              {isPaid && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          </td>

                          {/* Nome da Empresa */}
                          <td className="py-2.5 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-[#FD3100] rounded-lg text-xs font-black text-[#111111] focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => startEditing(item)}
                                  className="font-bold text-[#111111] text-xs cursor-pointer hover:text-[#FD3100] transition-colors"
                                  title="Clique para editar o nome da empresa"
                                >
                                  {item.description || 'Empresa sem nome (clique para editar)'}
                                </span>
                                {!isPaid && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-md font-black bg-amber-100 text-amber-800">
                                    A receber
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Valor em R$ */}
                          <td className="py-2.5 px-4 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 px-2 py-1 bg-white border border-[#FD3100] rounded-lg text-xs font-black text-right text-[#111111] focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(item)}
                                className="font-black text-xs text-[#111111] cursor-pointer hover:text-[#FD3100] transition-colors"
                                title="Clique para editar valor"
                              >
                                {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                              </span>
                            )}
                          </td>

                          {/* Ações (Editar / Salvar / Excluir) */}
                          <td className="py-2.5 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => saveEditing(item.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                                  title="Salvar"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-[#66635D] hover:bg-[#EEEDEA] rounded-md"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditing(item)}
                                  className="p-1 text-[#66635D] hover:text-[#111111] hover:bg-[#EEEDEA] rounded-md"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(item.id)}
                                  className="p-1 text-[#66635D] hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Linha Rápida de Adição de Empresa (Estilo Planilha) */}
            <form
              onSubmit={handleAddIncome}
              className="p-3 bg-[#FAF9F7] border-t border-[#EEEDEA] flex flex-wrap items-center gap-2"
            >
              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  value={newIncomeDesc}
                  onChange={(e) => setNewIncomeDesc(e.target.value)}
                  placeholder="+ Nome da Empresa ou Cliente..."
                  className="w-full px-3 py-2 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-medium text-[#111111] focus:outline-none"
                />
              </div>

              <div className="w-28">
                <input
                  type="number"
                  step="any"
                  value={newIncomeAmount}
                  onChange={(e) => setNewIncomeAmount(e.target.value)}
                  placeholder="R$ Valor"
                  className="w-full px-3 py-2 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none text-right"
                />
              </div>

              <button
                type="submit"
                disabled={submittingIncome || !newIncomeDesc.trim()}
                style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                className="btn-vb-primary px-3.5 py-2 rounded-xl text-xs uppercase font-black tracking-wider flex items-center gap-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </form>

            {/* Rodapé da Coluna com Total */}
            <div className="p-4 bg-emerald-50/60 border-t border-emerald-100 flex items-center justify-between text-xs font-black uppercase text-emerald-900">
              <span>Total Recebimentos:</span>
              <span className="text-sm font-black text-emerald-800">
                {formatCurrency(totalIncome)}
              </span>
            </div>
          </div>
        )}

        {/* ==================== COLUNA 2: CONTAS A PAGAR ==================== */}
        {(mobileTab === 'all' || mobileTab === 'expenses') && (
          <div className="bg-white rounded-3xl border-2 border-[#DCD6CC] shadow-sm overflow-hidden flex flex-col">
            {/* Cabeçalho da Coluna */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FAF9F7] to-white border-b border-[#EEEDEA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                  🧾
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#111111] uppercase tracking-tight">
                    Contas a Pagar
                  </h3>
                  <p className="text-[11px] text-[#66635D] font-medium">
                    Despesas, faturas, aluguel e custos fixos
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200">
                {formatCurrency(totalExpense)}
              </span>
            </div>

            {/* Tabela de Contas */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EEEDEA] bg-[#FAF9F7] text-[10px] font-black uppercase text-[#66635D]">
                    <th className="py-2.5 px-4 w-10 text-center">Status</th>
                    <th className="py-2.5 px-4">Descrição da Conta</th>
                    <th className="py-2.5 px-4 text-right">Valor (R$)</th>
                    <th className="py-2.5 px-3 w-16 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEDEA]">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#97A0AF] font-medium">
                        Nenhuma conta lançada neste mês.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((item) => {
                      const isEditing = editingId === item.id;
                      const isPaid = item.status === 'PAID';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#FAF9F7]/80 transition-colors group ${
                            !isPaid ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Checkbox de Status (Pago vs Pendente) */}
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors mx-auto ${
                                isPaid
                                  ? 'bg-rose-600 border-rose-600 text-white'
                                  : 'border-[#DCD6CC] hover:border-rose-500 bg-white'
                              }`}
                              title={isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                            >
                              {isPaid && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          </td>

                          {/* Descrição da Conta */}
                          <td className="py-2.5 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-[#FD3100] rounded-lg text-xs font-black text-[#111111] focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => startEditing(item)}
                                  className="font-bold text-[#111111] text-xs cursor-pointer hover:text-[#FD3100] transition-colors"
                                  title="Clique para editar o nome da conta"
                                >
                                  {item.description || 'Conta sem nome (clique para editar)'}
                                </span>
                                {!isPaid && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-md font-black bg-amber-100 text-amber-800">
                                    Pendente
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Valor em R$ */}
                          <td className="py-2.5 px-4 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 px-2 py-1 bg-white border border-[#FD3100] rounded-lg text-xs font-black text-right text-[#111111] focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(item)}
                                className="font-black text-xs text-[#111111] cursor-pointer hover:text-rose-600 transition-colors"
                                title="Clique para editar valor"
                              >
                                {item.amount > 0
                                  ? item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
                                  : '-'}
                              </span>
                            )}
                          </td>

                          {/* Ações (Editar / Salvar / Excluir) */}
                          <td className="py-2.5 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => saveEditing(item.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                                  title="Salvar"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-[#66635D] hover:bg-[#EEEDEA] rounded-md"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditing(item)}
                                  className="p-1 text-[#66635D] hover:text-[#111111] hover:bg-[#EEEDEA] rounded-md"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(item.id)}
                                  className="p-1 text-[#66635D] hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Linha Rápida de Adição de Conta (Estilo Planilha) */}
            <form
              onSubmit={handleAddExpense}
              className="p-3 bg-[#FAF9F7] border-t border-[#EEEDEA] flex flex-wrap items-center gap-2"
            >
              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  value={newExpenseDesc}
                  onChange={(e) => setNewExpenseDesc(e.target.value)}
                  placeholder="+ Descrição da Conta (ex: Aluguel, Luz...)"
                  className="w-full px-3 py-2 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-medium text-[#111111] focus:outline-none"
                />
              </div>

              <div className="w-28">
                <input
                  type="number"
                  step="any"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  placeholder="R$ Valor"
                  className="w-full px-3 py-2 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-bold text-[#111111] focus:outline-none text-right"
                />
              </div>

              <button
                type="submit"
                disabled={submittingExpense || !newExpenseDesc.trim()}
                style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
                className="px-3.5 py-2 rounded-xl text-xs uppercase font-black tracking-wider flex items-center gap-1 disabled:opacity-40 hover:bg-black transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </form>

            {/* Rodapé da Coluna com Total de Contas */}
            <div className="p-4 bg-rose-50/60 border-t border-rose-100 flex items-center justify-between text-xs font-black uppercase text-rose-900">
              <span>Total Contas:</span>
              <span className="text-sm font-black text-rose-800">
                {formatCurrency(totalExpense)}
              </span>
            </div>

            {/* Resumo Final da Planilha (Sobra + Cartão = Total) */}
            <div className="p-4 bg-[#FAF9F7] border-t-2 border-[#DCD6CC] space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase text-[#111111]">
                <span>Sobra (Dinheiro):</span>
                <span className="text-sm text-[#FD3100]">
                  {formatCurrency(balance)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-black uppercase text-[#66635D]">
                <span>Cartão / Reserva:</span>
                <span className="text-xs text-[#111111]">
                  {formatCurrency(extraAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-[#EEEDEA] flex items-center justify-between text-xs font-black uppercase text-[#111111]">
                <span>Total Disponível:</span>
                <span className="text-base text-emerald-700 font-black">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
