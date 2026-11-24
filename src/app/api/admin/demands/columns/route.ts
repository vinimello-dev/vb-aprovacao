import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { createDemandColumn, deleteDemandColumn } from '@/lib/services/demand-service';

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json({ error: 'Título da coluna é obrigatório.' }, { status: 400 });
    }

    const column = await createDemandColumn(title);
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar coluna:', error);
    return NextResponse.json({ error: 'Erro ao criar coluna no banco de dados.' }, { status: 500 });
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
      return NextResponse.json({ error: 'ID da coluna é obrigatório.' }, { status: 400 });
    }

    await deleteDemandColumn(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir coluna:', error);
    return NextResponse.json({ error: 'Erro ao excluir coluna.' }, { status: 500 });
  }
}
