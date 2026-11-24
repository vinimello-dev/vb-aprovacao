import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getDemandBoard,
  createDemand,
  updateDemand,
  deleteDemand,
  reorderDemands,
} from '@/lib/services/demand-service';

export async function GET() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { columns } = await getDemandBoard();
    return NextResponse.json({ columns });
  } catch (error) {
    console.error('Erro ao buscar demandas:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar o quadro de demandas.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, columnId, description, dueDate, clientId, priority } = body;

    if (!title || !columnId) {
      return NextResponse.json(
        { error: 'Título e coluna são obrigatórios.' },
        { status: 400 }
      );
    }

    const demand = await createDemand({
      title,
      columnId,
      description,
      dueDate,
      clientId,
      priority,
    });

    return NextResponse.json({ demand }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar demanda:', error);
    return NextResponse.json(
      { error: 'Erro ao criar demanda no banco de dados.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, columnId, description, dueDate, completed, clientId, priority, order } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da demanda é obrigatório.' },
        { status: 400 }
      );
    }

    const demand = await updateDemand(id, {
      title,
      columnId,
      description,
      dueDate,
      completed,
      clientId,
      priority,
      order,
    });

    return NextResponse.json({ demand });
  } catch (error) {
    console.error('Erro ao atualizar demanda:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar demanda no banco de dados.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Parâmetro items inválido.' },
        { status: 400 }
      );
    }

    await reorderDemands(items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao reordenar demandas:', error);
    return NextResponse.json(
      { error: 'Erro ao reordenar demandas no banco de dados.' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'ID da demanda é obrigatório.' },
        { status: 400 }
      );
    }

    await deleteDemand(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir demanda:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir demanda.' },
      { status: 500 }
    );
  }
}
