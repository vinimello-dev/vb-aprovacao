import { NextResponse } from 'next/server';
import { getClientBySlug } from '@/lib/services/client-service';
import { getPostsByClientId, updatePost } from '@/lib/services/post-service';
import { parseDateInput } from '@/lib/utils';

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

    const posts = await getPostsByClientId(client.id);
    return NextResponse.json({ posts, client });
  } catch (error) {
    console.error('Erro ao buscar posts do cliente:', error);
    return NextResponse.json({ error: 'Erro ao carregar os posts.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { postId, scheduledDate, scheduledTime } = body;

    if (!postId || !scheduledDate) {
      return NextResponse.json(
        { error: 'ID do post e data de agendamento são obrigatórios.' },
        { status: 400 }
      );
    }

    const updated = await updatePost(postId, {
      scheduledDate: parseDateInput(scheduledDate),
      scheduledTime,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error('Erro ao reagendar post no portal do cliente:', error);
    return NextResponse.json({ error: 'Erro ao reagendar publicação.' }, { status: 500 });
  }
}
