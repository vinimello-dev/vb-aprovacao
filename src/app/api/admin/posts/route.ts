import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { createPost, updatePost, deletePost } from '@/lib/services/post-service';
import { parseMediaUrl, parseThumbnailUrl, getAutoThumbnail } from '@/lib/utils';

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, cycleId, title, caption, format, scheduledDate, mediaUrls, thumbnailUrl } = body;

    if (!clientId || !title) {
      return NextResponse.json(
        { error: 'Cliente e Título são obrigatórios.' },
        { status: 400 }
      );
    }

    // Processar URLs de mídia convertendo links do Google Drive e Dropbox
    const parsedMedia = (mediaUrls || []).map((m: { url: string; mediaType: string; order?: number; thumbnailUrl?: string }, idx: number) => {
      const mediaType = m.mediaType || (format === 'VIDEO' || format === 'REELS' ? 'VIDEO' : 'IMAGE');
      const directUrl = parseMediaUrl(m.url);
      
      // Capa da mídia: pode vir de thumbnailUrl direto, de m.thumbnailUrl ou do Google Drive
      let thumb = m.thumbnailUrl ? parseThumbnailUrl(m.thumbnailUrl) : (thumbnailUrl ? parseThumbnailUrl(thumbnailUrl) : null);
      if (!thumb && mediaType === 'VIDEO') {
        thumb = getAutoThumbnail(m.url);
      }

      return {
        url: directUrl,
        mediaType,
        order: typeof m.order === 'number' ? m.order : idx,
        thumbnailUrl: thumb,
      };
    });

    const post = await createPost({
      clientId,
      cycleId: cycleId || null,
      title,
      caption,
      format: format || 'VIDEO',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      mediaUrls: parsedMedia,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar post:', error);
    return NextResponse.json({ error: 'Erro ao criar publicação.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, caption, scheduledDate, format, cycleId, mediaUrl, thumbnailUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do post é obrigatório.' }, { status: 400 });
    }

    const post = await updatePost(id, {
      title,
      caption,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      format,
      cycleId,
      mediaUrl: mediaUrl ? parseMediaUrl(mediaUrl) : undefined,
      thumbnailUrl: thumbnailUrl ? parseThumbnailUrl(thumbnailUrl) : undefined,
    });

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    return NextResponse.json({ error: 'Erro ao salvar alterações do post.' }, { status: 500 });
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
      return NextResponse.json({ error: 'ID do post é obrigatório.' }, { status: 400 });
    }

    const ok = await deletePost(id);
    if (!ok) {
      return NextResponse.json({ error: 'Erro ao excluir post.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir post:', error);
    return NextResponse.json({ error: 'Erro ao excluir publicação.' }, { status: 500 });
  }
}
