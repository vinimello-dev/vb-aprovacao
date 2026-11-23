import { NextResponse } from 'next/server';
import { updatePostCaption } from '@/lib/services/post-service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { caption } = await request.json();

    const updated = await updatePostCaption(postId, caption);
    if (!updated) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error('Erro ao atualizar legenda:', error);
    return NextResponse.json({ error: 'Erro ao salvar legenda.' }, { status: 500 });
  }
}
