import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendClientNotificationEmail } from '@/lib/services/email-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { type = 'CYCLE_READY', cycleName, postTitle, postsCount } = body;

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, email: true, pin: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const result = await sendClientNotificationEmail({
      to: client.email,
      clientName: client.name,
      clientSlug: client.slug,
      pin: client.pin,
      type,
      cycleName,
      postTitle,
      postsCount,
    });

    if (!result.sent) {
      return NextResponse.json(
        { sent: false, error: result.reason || 'Não foi possível enviar o e-mail.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      sent: true,
      email: client.email,
      message: `E-mail enviado com sucesso para ${client.email}!`,
    });
  } catch (error) {
    console.error('Erro ao notificar cliente por e-mail:', error);
    return NextResponse.json({ error: 'Erro ao enviar notificação por e-mail.' }, { status: 500 });
  }
}
