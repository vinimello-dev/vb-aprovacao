import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientBySlug } from '@/lib/services/client-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug do cliente não informado.' }, { status: 400 });
    }

    const { client } = await getClientBySlug(slug);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const scripts = await prisma.recordingScript.findMany({
      where: { clientId: client.id },
      orderBy: [{ recordingDate: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('Erro ao buscar roteiros do cliente:', error);
    return NextResponse.json({ error: 'Erro ao carregar roteiros.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { slug, scriptId, hook, content, scenesCount } = body;

    if (!slug || !scriptId) {
      return NextResponse.json(
        { error: 'Slug do cliente e ID do roteiro são obrigatórios.' },
        { status: 400 }
      );
    }

    const { client } = await getClientBySlug(slug);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const existing = await prisma.recordingScript.findFirst({
      where: { id: scriptId, clientId: client.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Roteiro não encontrado para este cliente.' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (hook !== undefined) updateData.hook = hook ? String(hook).trim() : null;
    if (content !== undefined) updateData.content = String(content).trim();
    if (scenesCount !== undefined) updateData.scenesCount = Number(scenesCount);

    const updated = await prisma.recordingScript.update({
      where: { id: scriptId },
      data: updateData,
    });

    return NextResponse.json({ success: true, script: updated });
  } catch (error) {
    console.error('Erro ao salvar edição de roteiro pelo cliente:', error);
    return NextResponse.json({ error: 'Erro ao atualizar roteiro.' }, { status: 500 });
  }
}
