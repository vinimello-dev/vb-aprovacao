import { NextResponse } from 'next/server';
import { updatePostStatus } from '@/lib/services/post-service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { status } = await request.json();

    if (!['PENDENTE', 'AJUSTES', 'APROVADO'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const updated = await updatePostStatus(postId, status);
    if (!updated) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error('Erro ao atualizar status do post:', error);
    return NextResponse.json({ error: 'Erro ao atualizar status.' }, { status: 500 });
  }
}
