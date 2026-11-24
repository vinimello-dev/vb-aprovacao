import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, month, year, targetDate } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'O nome da entrega / ciclo é obrigatório.' }, { status: 400 });
    }

    const cycle = await prisma.clientCycle.create({
      data: {
        clientId: id,
        name: name.trim(),
        month: month ? Number(month) : null,
        year: year ? Number(year) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
      include: {
        posts: true,
      },
    });

    return NextResponse.json({ cycle }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ciclo de entrega:', error);
    return NextResponse.json({ error: 'Erro ao criar ciclo.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');

    if (!cycleId) {
      return NextResponse.json({ error: 'ID do ciclo é obrigatório.' }, { status: 400 });
    }

    await prisma.clientCycle.delete({
      where: { id: cycleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir ciclo:', error);
    return NextResponse.json({ error: 'Erro ao excluir ciclo.' }, { status: 500 });
  }
}
