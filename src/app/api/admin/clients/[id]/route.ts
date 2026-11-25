import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseThumbnailUrl } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        cycles: {
          orderBy: { createdAt: 'desc' },
          include: {
            posts: {
              include: {
                media: { orderBy: { order: 'asc' } },
                comments: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        scripts: {
          orderBy: [{ recordingDate: 'desc' }, { createdAt: 'desc' }],
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        posts: {
          where: { cycleId: null },
          include: {
            media: { orderBy: { order: 'asc' } },
            comments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Erro ao buscar detalhes do cliente:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar as informações do cliente.' },
      { status: 500 }
    );
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

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name?.trim();
    if (body.pin !== undefined) updateData.pin = body.pin?.trim();
    if (body.logoUrl !== undefined) {
      updateData.logoUrl = body.logoUrl?.trim() ? parseThumbnailUrl(body.logoUrl) : null;
    }
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.cnpj !== undefined) updateData.cnpj = body.cnpj?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.responsible !== undefined) updateData.responsible = body.responsible?.trim() || null;
    if (body.instagram !== undefined) updateData.instagram = body.instagram?.trim() || null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ client, message: 'Dados do cliente atualizados com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar dados do cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar alterações do cliente.' },
      { status: 500 }
    );
  }
}
