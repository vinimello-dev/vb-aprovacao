import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getFinancialMonthData,
  createFinancialEntry,
  updateFinancialEntry,
  deleteFinancialEntry,
  updateFinancialExtra,
} from '@/lib/services/financial-service';

export async function GET(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = Number(searchParams.get('month')) || now.getMonth() + 1;
    const year = Number(searchParams.get('year')) || now.getFullYear();

    const data = await getFinancialMonthData(month, year);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Erro ao buscar dados financeiros:', err);
    return NextResponse.json({ error: 'Erro ao buscar dados financeiros.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Se for atualização do saldo extra / cartão
    if (body.action === 'UPDATE_EXTRA') {
      const { month, year, extraCardAmount, notes } = body;
      const updatedExtra = await updateFinancialExtra(Number(month), Number(year), {
        extraCardAmount: Number(extraCardAmount) || 0,
        notes,
      });
      return NextResponse.json({ success: true, extra: updatedExtra });
    }

    // Criação de nova entrada (Recebimento ou Conta a pagar)
    const { type, description, amount, month, year, status, category, clientId } = body;
    if (!type || !description) {
      return NextResponse.json({ error: 'Tipo e descrição são obrigatórios.' }, { status: 400 });
    }

    const entry = await createFinancialEntry({
      type,
      description,
      amount: Number(amount) || 0,
      month: Number(month) || new Date().getMonth() + 1,
      year: Number(year) || new Date().getFullYear(),
      status: status || 'PAID',
      category,
      clientId,
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err) {
    console.error('Erro ao criar registro financeiro:', err);
    return NextResponse.json({ error: 'Erro ao criar registro financeiro.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, description, amount, status, category } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do registro é obrigatório.' }, { status: 400 });
    }

    const updated = await updateFinancialEntry(id, {
      description,
      amount: amount !== undefined ? Number(amount) : undefined,
      status,
      category,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, entry: updated });
  } catch (err) {
    console.error('Erro ao atualizar registro financeiro:', err);
    return NextResponse.json({ error: 'Erro ao atualizar registro financeiro.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do registro é obrigatório.' }, { status: 400 });
    }

    const success = await deleteFinancialEntry(id);
    return NextResponse.json({ success });
  } catch (err) {
    console.error('Erro ao excluir registro financeiro:', err);
    return NextResponse.json({ error: 'Erro ao excluir registro financeiro.' }, { status: 500 });
  }
}
