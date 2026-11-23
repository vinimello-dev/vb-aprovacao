import { NextResponse } from 'next/server';
import { addComment, toggleCommentResolved } from '@/lib/services/post-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const body = await request.json();

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'O comentário não pode ser vazio.' }, { status: 400 });
    }

    const comment = await addComment(postId, {
      author: body.author?.trim() || 'Cliente',
      authorRole: body.authorRole || 'CLIENT',
      content: body.content.trim(),
      timestampSeconds: typeof body.timestampSeconds === 'number' ? body.timestampSeconds : undefined,
      slideIndex: typeof body.slideIndex === 'number' ? body.slideIndex : undefined,
    });

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    return NextResponse.json({ error: 'Erro ao salvar comentário.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: 'ID do comentário não informado.' }, { status: 400 });
    }

    const success = await toggleCommentResolved(commentId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Erro ao alternar status do comentário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar comentário.' }, { status: 500 });
  }
}
