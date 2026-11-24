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
    const { title, recordingDate, hook, content, status, scenesCount } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Título e conteúdo do roteiro são obrigatórios.' },
        { status: 400 }
      );
    }

    const script = await prisma.recordingScript.create({
      data: {
        clientId: id,
        title: title.trim(),
        recordingDate: recordingDate ? new Date(recordingDate) : null,
        hook: hook?.trim() || null,
        content: content.trim(),
        status: status || 'A_GRAVAR',
        scenesCount: scenesCount ? Number(scenesCount) : 1,
      },
    });

    return NextResponse.json({ script }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar roteiro de gravação:', error);
    return NextResponse.json({ error: 'Erro ao criar roteiro.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { scriptId, title, recordingDate, hook, content, status, scenesCount } = body;

    if (!scriptId) {
      return NextResponse.json({ error: 'ID do roteiro é obrigatório.' }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (recordingDate !== undefined) updateData.recordingDate = recordingDate ? new Date(recordingDate) : null;
    if (hook !== undefined) updateData.hook = hook?.trim() || null;
    if (content !== undefined) updateData.content = content.trim();
    if (status !== undefined) updateData.status = status;
    if (scenesCount !== undefined) updateData.scenesCount = Number(scenesCount);

    const script = await prisma.recordingScript.update({
      where: { id: scriptId },
      data: updateData,
    });

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Erro ao atualizar roteiro:', error);
    return NextResponse.json({ error: 'Erro ao atualizar roteiro.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get('scriptId');

    if (!scriptId) {
      return NextResponse.json({ error: 'ID do roteiro é obrigatório.' }, { status: 400 });
    }

    await prisma.recordingScript.delete({
      where: { id: scriptId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir roteiro:', error);
    return NextResponse.json({ error: 'Erro ao excluir roteiro.' }, { status: 500 });
  }
}
