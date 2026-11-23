import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { createPost } from '@/lib/services/post-service';
import { parseMediaUrl, parseThumbnailUrl, getAutoThumbnail } from '@/lib/utils';

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, title, caption, format, scheduledDate, mediaUrls, thumbnailUrl } = body;

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
