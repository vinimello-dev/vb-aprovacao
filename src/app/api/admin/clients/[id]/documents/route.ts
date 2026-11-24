import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseMediaUrl } from '@/lib/utils';

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
    const { title, type, fileUrl, notes } = body;

    if (!title?.trim() || !fileUrl?.trim()) {
      return NextResponse.json(
        { error: 'Título e link do documento são obrigatórios.' },
        { status: 400 }
      );
    }

    const document = await prisma.clientDocument.create({
      data: {
        clientId: id,
        title: title.trim(),
        type: type || 'CONTRATO',
        fileUrl: parseMediaUrl(fileUrl.trim()),
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar documento:', error);
    return NextResponse.json({ error: 'Erro ao salvar documento.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'ID do documento é obrigatório.' }, { status: 400 });
    }

    await prisma.clientDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json({ error: 'Erro ao excluir documento.' }, { status: 500 });
  }
}
