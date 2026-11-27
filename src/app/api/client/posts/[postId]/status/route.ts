import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updatePostStatus } from '@/lib/services/post-service';
import { sendAgencyNotificationEmail } from '@/lib/services/email-service';

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

    if (status === 'AJUSTES' || status === 'APROVADO') {
      try {
        const client = await prisma.client.findUnique({
          where: { id: updated.clientId },
          select: { id: true, name: true },
        });
        if (client) {
          await sendAgencyNotificationEmail({
            clientId: client.id,
            clientName: client.name,
            postTitle: updated.title,
            status,
            comments: (updated.comments || []).filter((c) => !c.resolved),
          });
        }
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail de notificação para agência:', emailErr);
      }
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error('Erro ao atualizar status do post:', error);
    return NextResponse.json({ error: 'Erro ao atualizar status.' }, { status: 500 });
  }
}
