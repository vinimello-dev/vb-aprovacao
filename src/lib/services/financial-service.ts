import { prisma } from '../prisma';

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

// Cache em memória de alta performance e fallback para conexões offline
export let localFinancialStore: FinancialEntryItem[] = [];
export let localFinancialExtras: Record<string, FinancialMonthExtra> = {};

let isTableInitialized = false;

/**
 * Garante que as tabelas financeiras existam no PostgreSQL Neon
 */
async function ensureFinancialTables() {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS financial_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PAID',
        category TEXT,
        client_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_financial_entries_month_year ON financial_entries(year, month);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_financial_entries_type ON financial_entries(type);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_financial_entries_created_at ON financial_entries(created_at ASC);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS financial_extras (
        month_year TEXT PRIMARY KEY,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        extra_card_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    isTableInitialized = true;
  } catch (err) {
    console.error('[Financial] Erro ao garantir tabelas no PostgreSQL:', err);
  }
}

/**
 * Busca todos os lançamentos financeiros e dados do mês do PostgreSQL Neon
 */
export async function getFinancialMonthData(month: number, year: number): Promise<{
  entries: FinancialEntryItem[];
  extra: FinancialMonthExtra;
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    extraAmount: number;
    finalTotal: number;
  };
}> {
  await ensureFinancialTables();

  const key = `${month}-${year}`;
  let entries: FinancialEntryItem[] = [];
  let extra: FinancialMonthExtra = { extraCardAmount: 0 };

  try {
    // 1. Consultar lançamentos do mês no PostgreSQL Neon
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, type, description, amount, month, year, status, category, client_id, created_at, updated_at
      FROM financial_entries
      WHERE month = $1 AND year = $2
      ORDER BY created_at ASC
      `,
      month,
      year
    );

    if (Array.isArray(rows)) {
      entries = rows.map((r) => ({
        id: String(r.id),
        type: r.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME',
        description: String(r.description || '').trim() || 'Sem descrição',
        amount: Number(r.amount) || 0,
        month: Number(r.month),
        year: Number(r.year),
        status: r.status === 'PENDING' ? 'PENDING' : 'PAID',
        category: r.category || (r.type === 'EXPENSE' ? 'Fixos' : 'Empresas'),
        clientId: r.client_id || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));
    }

    // 2. Consultar saldo extra / cartão do mês
    const extraRows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT month_year, month, year, extra_card_amount, notes
      FROM financial_extras
      WHERE month = $1 AND year = $2
      LIMIT 1
      `,
      month,
      year
    );

    if (Array.isArray(extraRows) && extraRows.length > 0) {
      extra = {
        extraCardAmount: Number(extraRows[0].extra_card_amount) || 0,
        notes: extraRows[0].notes || undefined,
      };
    } else if (localFinancialExtras[key]) {
      extra = localFinancialExtras[key];
    }

    // Atualiza cache em memória
    localFinancialExtras[key] = extra;
    // Mescla no store local
    localFinancialStore = [
      ...localFinancialStore.filter((e) => !(e.month === month && e.year === year)),
      ...entries,
    ];
  } catch (err) {
    console.error('[Financial] Erro ao buscar do PostgreSQL, usando fallback em memória:', err);
    entries = localFinancialStore.filter((e) => e.month === month && e.year === year);
    extra = localFinancialExtras[key] || { extraCardAmount: 0 };
  }

  // 3. Cálculos de Balanço
  const totalIncome = entries
    .filter((e) => e.type === 'INCOME')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalExpense = entries
    .filter((e) => e.type === 'EXPENSE')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const balance = totalIncome - totalExpense;
  const finalTotal = balance + (Number(extra.extraCardAmount) || 0);

  return {
    entries,
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

/**
 * Cria um novo lançamento financeiro (Recebimento ou Conta a Pagar) no PostgreSQL Neon
 */
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
  await ensureFinancialTables();

  const id = 'fin-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const type = data.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
  const desc = data.description ? data.description.trim() : 'Sem descrição';
  const amount = Number(data.amount) || 0;
  const month = Number(data.month);
  const year = Number(data.year);
  const status = data.status === 'PENDING' ? 'PENDING' : 'PAID';
  const category = data.category || (type === 'INCOME' ? 'Empresas' : 'Fixos');
  const clientId = data.clientId || null;

  const nowIso = new Date().toISOString();

  const newEntry: FinancialEntryItem = {
    id,
    type,
    description: desc,
    amount,
    month,
    year,
    status,
    category,
    clientId: clientId || undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO financial_entries (
        id, type, description, amount, month, year, status, category, client_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      )
      `,
      id,
      type,
      desc,
      amount,
      month,
      year,
      status,
      category,
      clientId
    );
  } catch (err) {
    console.error('[Financial] Erro ao salvar lançamento no PostgreSQL:', err);
  }

  // Atualiza cache em memória
  localFinancialStore.push(newEntry);
  return newEntry;
}

/**
 * Atualiza um lançamento financeiro no PostgreSQL Neon
 */
export async function updateFinancialEntry(
  id: string,
  data: Partial<Omit<FinancialEntryItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<FinancialEntryItem | null> {
  await ensureFinancialTables();

  try {
    // 1. Busca registro atual para garantir integridade
    const existingRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM financial_entries WHERE id = $1 LIMIT 1`,
      id
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const current = existingRows[0];
      const newDesc =
        data.description !== undefined && data.description !== null && data.description.trim() !== ''
          ? data.description.trim()
          : String(current.description || '');
      const newAmount =
        data.amount !== undefined && data.amount !== null && !isNaN(Number(data.amount))
          ? Number(data.amount)
          : Number(current.amount) || 0;
      const newStatus =
        data.status !== undefined && data.status !== null ? data.status : current.status;
      const newCategory =
        data.category !== undefined && data.category !== null ? data.category : current.category;

      await prisma.$executeRawUnsafe(
        `
        UPDATE financial_entries
        SET description = $2,
            amount = $3,
            status = $4,
            category = $5,
            updated_at = NOW()
        WHERE id = $1
        `,
        id,
        newDesc,
        newAmount,
        newStatus,
        newCategory
      );

      const updatedItem: FinancialEntryItem = {
        id: String(current.id),
        type: current.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME',
        description: newDesc,
        amount: newAmount,
        month: Number(current.month),
        year: Number(current.year),
        status: newStatus === 'PENDING' ? 'PENDING' : 'PAID',
        category: newCategory || undefined,
        clientId: current.client_id || undefined,
        createdAt: current.created_at ? new Date(current.created_at).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Atualiza cache em memória
      const idx = localFinancialStore.findIndex((e) => e.id === id);
      if (idx !== -1) {
        localFinancialStore[idx] = updatedItem;
      } else {
        localFinancialStore.push(updatedItem);
      }

      return updatedItem;
    }
  } catch (err) {
    console.error('[Financial] Erro ao atualizar no PostgreSQL:', err);
  }

  // Fallback em memória se banco falhar
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

/**
 * Exclui um lançamento financeiro do PostgreSQL Neon
 */
export async function deleteFinancialEntry(id: string): Promise<boolean> {
  await ensureFinancialTables();

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM financial_entries WHERE id = $1`, id);
    localFinancialStore = localFinancialStore.filter((e) => e.id !== id);
    return true;
  } catch (err) {
    console.error('[Financial] Erro ao excluir do PostgreSQL:', err);
    const initialLen = localFinancialStore.length;
    localFinancialStore = localFinancialStore.filter((e) => e.id !== id);
    return localFinancialStore.length < initialLen;
  }
}

/**
 * Atualiza o saldo extra / reserva / cartão do mês no PostgreSQL Neon
 */
export async function updateFinancialExtra(
  month: number,
  year: number,
  extra: FinancialMonthExtra
): Promise<FinancialMonthExtra> {
  await ensureFinancialTables();

  const key = `${month}-${year}`;
  const amount = Number(extra.extraCardAmount) || 0;
  const notes = extra.notes ? extra.notes.trim() : 'cartão';

  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO financial_extras (month_year, month, year, extra_card_amount, notes, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (month_year)
      DO UPDATE SET extra_card_amount = EXCLUDED.extra_card_amount,
                    notes = COALESCE(EXCLUDED.notes, financial_extras.notes),
                    updated_at = NOW()
      `,
      key,
      month,
      year,
      amount,
      notes
    );
  } catch (err) {
    console.error('[Financial] Erro ao salvar extra no PostgreSQL:', err);
  }

  localFinancialExtras[key] = {
    extraCardAmount: amount,
    notes,
  };

  return localFinancialExtras[key];
}
