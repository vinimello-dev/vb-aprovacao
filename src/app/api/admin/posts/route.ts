import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPost, updatePost, deletePost, getAllPosts } from '@/lib/services/post-service';
import { sendClientNotificationEmail } from '@/lib/services/email-service';
import { parseMediaUrl, parseThumbnailUrl, getAutoThumbnail, parseDateInput } from '@/lib/utils';

export async function GET(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const clientId = searchParams.get('clientId') || undefined;

    const posts = await getAllPosts({ status, clientId });
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Erro ao listar posts no admin:', error);
    return NextResponse.json({ error: 'Erro ao buscar publicações.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, cycleId, title, caption, format, scheduledDate, scheduledTime, mediaUrls, thumbnailUrl, notifyClient } = body;

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
      scheduledDate: parseDateInput(scheduledDate) || new Date(),
      scheduledTime: scheduledTime || null,
      mediaUrls: parsedMedia,
    });

    let emailNotification = null;
    if (notifyClient) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { name: true, slug: true, email: true, pin: true },
      });
      if (client) {
        emailNotification = await sendClientNotificationEmail({
          to: client.email,
          clientName: client.name,
          clientSlug: client.slug,
          pin: client.pin,
          type: 'NEW_POST',
          postTitle: post.title,
        });
      }
    }

    return NextResponse.json({ success: true, post, emailNotification }, { status: 201 });
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
    const { id, title, caption, scheduledDate, scheduledTime, status, resolveComments, incrementRevision, format, cycleId, mediaUrl, thumbnailUrl, mediaUrls, notifyClient } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do post é obrigatório.' }, { status: 400 });
    }

    const parsedMediaUrls = Array.isArray(mediaUrls)
      ? mediaUrls.map((m: any, idx: number) => ({
          url: parseMediaUrl(m.url),
          mediaType: m.mediaType || 'IMAGE',
          order: typeof m.order === 'number' ? m.order : idx,
          thumbnailUrl: m.thumbnailUrl ? parseThumbnailUrl(m.thumbnailUrl) : undefined,
        }))
      : undefined;

    const resolvedThumb =
      thumbnailUrl !== undefined
        ? (thumbnailUrl ? parseThumbnailUrl(thumbnailUrl) : null)
        : (mediaUrl ? getAutoThumbnail(mediaUrl) : undefined);

    const post = await updatePost(id, {
      title,
      caption,
      scheduledDate: scheduledDate !== undefined ? parseDateInput(scheduledDate) : undefined,
      scheduledTime,
      status,
      resolveComments: Boolean(resolveComments),
      incrementRevision: Boolean(incrementRevision),
      format,
      cycleId,
      mediaUrl: mediaUrl ? parseMediaUrl(mediaUrl) : undefined,
      thumbnailUrl: resolvedThumb,
      mediaUrls: parsedMediaUrls,
    });

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }

    let emailNotification = null;
    if (notifyClient) {
      const client = await prisma.client.findUnique({
        where: { id: post.clientId },
        select: { name: true, slug: true, email: true, pin: true },
      });
      if (client) {
        emailNotification = await sendClientNotificationEmail({
          to: client.email,
          clientName: client.name,
          clientSlug: client.slug,
          pin: client.pin,
          type: 'VIDEO_REVISED',
          postTitle: post.title,
          revisionVersion: post.revisionVersion,
        });
      }
    }

    return NextResponse.json({ success: true, post, emailNotification });
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
