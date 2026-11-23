import { NextResponse } from 'next/server';
import { updatePostThumbnail } from '@/lib/services/post-service';
import { parseThumbnailUrl } from '@/lib/utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { thumbnailUrl } = await request.json();

    if (!thumbnailUrl || typeof thumbnailUrl !== 'string') {
      return NextResponse.json(
        { error: 'URL da capa é obrigatória.' },
        { status: 400 }
      );
    }

    const parsed = parseThumbnailUrl(thumbnailUrl);
    const updated = await updatePostThumbnail(postId, parsed);

    if (!updated) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post: updated, thumbnailUrl: parsed });
  } catch (error) {
    console.error('Erro ao atualizar capa do vídeo:', error);
    return NextResponse.json({ error: 'Erro ao salvar capa do vídeo.' }, { status: 500 });
  }
}
