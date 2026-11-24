export interface FinancialEntryItem {
  id: string;
  type: 'INCOME' | 'EXPENSE'; // INCOME = Recebimento de Empresa, EXPENSE = Conta a Pagar
  description: string;
  amount: number;
  month: number; // 1 a 12
  year: number; // Ex: 2026
  status: 'PAID' | 'PENDING'; // PAID = Recebido/Pago, PENDING = Pendente
  category?: string;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialMonthExtra {
  extraCardAmount: number; // "cartão: 2000" na planilha
  notes?: string;
}

// Armazenamento em memória com os dados exatos da planilha do usuário para Novembro 2026
export let localFinancialStore: FinancialEntryItem[] = [
  // --- RECEBIMENTOS (EMPRESAS) NOVEMBRO ---
  {
    id: 'inc-1',
    type: 'INCOME',
    description: 'IN Forma',
    amount: 1000,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-2',
    type: 'INCOME',
    description: 'Deep fitness',
    amount: 750,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-3',
    type: 'INCOME',
    description: 'Divina terra',
    amount: 1400,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-4',
    type: 'INCOME',
    description: 'Rocca',
    amount: 500,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-5',
    type: 'INCOME',
    description: 'Stábilita FISIO',
    amount: 1300,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-6',
    type: 'INCOME',
    description: 'Garage Burguer',
    amount: 700,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-7',
    type: 'INCOME',
    description: 'Cristiano Kelln',
    amount: 1300,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-8',
    type: 'INCOME',
    description: 'Palmares',
    amount: 700,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-9',
    type: 'INCOME',
    description: 'Alemão',
    amount: 700,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-10',
    type: 'INCOME',
    description: 'Contrato Adicional',
    amount: 2900,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-11',
    type: 'INCOME',
    description: 'trópico',
    amount: 2500,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-12',
    type: 'INCOME',
    description: 'varada',
    amount: 500,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // --- CONTAS A PAGAR (DESPESAS) NOVEMBRO ---
  {
    id: 'exp-1',
    type: 'EXPENSE',
    description: 'cartão 1',
    amount: 1100,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-2',
    type: 'EXPENSE',
    description: 'cartão 2',
    amount: 550,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-3',
    type: 'EXPENSE',
    description: 'cartão 3',
    amount: 400,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-4',
    type: 'EXPENSE',
    description: 'escola liz',
    amount: 410,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-5',
    type: 'EXPENSE',
    description: 'aluguel',
    amount: 1850,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-6',
    type: 'EXPENSE',
    description: 'faculdade alice',
    amount: 285,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-7',
    type: 'EXPENSE',
    description: 'faculdade vini',
    amount: 185,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-8',
    type: 'EXPENSE',
    description: 'carro',
    amount: 850,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-9',
    type: 'EXPENSE',
    description: 'unha',
    amount: 150,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-10',
    type: 'EXPENSE',
    description: 'internet',
    amount: 185,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-11',
    type: 'EXPENSE',
    description: 'agua',
    amount: 150,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-12',
    type: 'EXPENSE',
    description: 'luz',
    amount: 200,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-13',
    type: 'EXPENSE',
    description: 'mercado',
    amount: 0,
    month: 11,
    year: 2026,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-14',
    type: 'EXPENSE',
    description: 'suplemento',
    amount: 0,
    month: 11,
    year: 2026,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-15',
    type: 'EXPENSE',
    description: 'scheila',
    amount: 250,
    month: 11,
    year: 2026,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Saldo extra configurável por mês (ex: "cartão: 2000" na imagem)
export let localFinancialExtras: Record<string, FinancialMonthExtra> = {
  '11-2026': {
    extraCardAmount: 2000,
    notes: 'Reserva / Cartão',
  },
};

export async function getFinancialMonthData(month: number, year: number): Promise<{
  entries: FinancialEntryItem[];
  extra: FinancialMonthExtra;
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number; // sobra em dinheiro
    extraAmount: number; // cartão/reserva
    finalTotal: number; // sobra + extra
  };
}> {
  const monthEntries = localFinancialStore.filter(
    (e) => e.month === month && e.year === year
  );

  const key = `${month}-${year}`;
  const extra = localFinancialExtras[key] || { extraCardAmount: 0 };

  const totalIncome = monthEntries
    .filter((e) => e.type === 'INCOME')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalExpense = monthEntries
    .filter((e) => e.type === 'EXPENSE')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const balance = totalIncome - totalExpense;
  const finalTotal = balance + (Number(extra.extraCardAmount) || 0);

  return {
    entries: monthEntries,
    extra,
    summary: {
      totalIncome,
      totalExpense,
      balance,
      extraAmount: extra.extraCardAmount,
      finalTotal,
    },
  };
}

export async function createFinancialEntry(data: {
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  month: number;
  year: number;
  status?: 'PAID' | 'PENDING';
  category?: string;
  clientId?: string;
}): Promise<FinancialEntryItem> {
  const newEntry: FinancialEntryItem = {
    id: 'fin-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type: data.type,
    description: data.description.trim(),
    amount: Number(data.amount) || 0,
    month: Number(data.month),
    year: Number(data.year),
    status: data.status || 'PAID',
    category: data.category || (data.type === 'INCOME' ? 'Empresas' : 'Fixos'),
    clientId: data.clientId || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  localFinancialStore.push(newEntry);
  return newEntry;
}

export async function updateFinancialEntry(
  id: string,
  data: Partial<Omit<FinancialEntryItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<FinancialEntryItem | null> {
  const idx = localFinancialStore.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const current = localFinancialStore[idx];
  localFinancialStore[idx] = {
    ...current,
    description:
      data.description !== undefined && data.description !== null && data.description.trim() !== ''
        ? data.description.trim()
        : current.description,
    amount:
      data.amount !== undefined && data.amount !== null && !isNaN(Number(data.amount))
        ? Number(data.amount)
        : current.amount,
    status: data.status !== undefined ? data.status : current.status,
    category: data.category !== undefined ? data.category : current.category,
    clientId: data.clientId !== undefined ? data.clientId : current.clientId,
    month: data.month !== undefined ? Number(data.month) : current.month,
    year: data.year !== undefined ? Number(data.year) : current.year,
    updatedAt: new Date().toISOString(),
  };

  return localFinancialStore[idx];
}

export async function deleteFinancialEntry(id: string): Promise<boolean> {
  const initialLength = localFinancialStore.length;
  localFinancialStore = localFinancialStore.filter((e) => e.id !== id);
  return localFinancialStore.length < initialLength;
}

export async function updateFinancialExtra(
  month: number,
  year: number,
  extra: FinancialMonthExtra
): Promise<FinancialMonthExtra> {
  const key = `${month}-${year}`;
  localFinancialExtras[key] = {
    ...localFinancialExtras[key],
    ...extra,
    extraCardAmount: Number(extra.extraCardAmount) || 0,
  };
  return localFinancialExtras[key];
}
