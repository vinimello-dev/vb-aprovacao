import { NextResponse } from 'next/server';
import {
  getChatMessages,
  sendChatMessage,
  markChatAsRead,
  getChatUnreadCountForAgency,
  getChatUnreadCountForClient,
} from '@/lib/services/chat-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const reader = (searchParams.get('reader') as 'AGENCY' | 'CLIENT') || 'AGENCY';

    if (clientId) {
      // Se solicitou as mensagens de um cliente específico
      const messages = await getChatMessages(clientId);
      // Marca como lidas se especificado
      await markChatAsRead(clientId, reader);

      const unreadForAgency = (await getChatUnreadCountForAgency()).byClient[clientId] || 0;
      const unreadForClient = await getChatUnreadCountForClient(clientId);

      return NextResponse.json({
        messages,
        unreadForAgency,
        unreadForClient,
      });
    }

    // Se não passou clientId, retorna contagem geral de não lidas para o painel admin
    const unread = await getChatUnreadCountForAgency();
    return NextResponse.json(unread);
  } catch (err) {
    console.error('Erro na rota de chat (GET):', err);
    return NextResponse.json({ error: 'Erro ao carregar mensagens.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, sender, senderName, content } = body;

    if (!clientId || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'ID do cliente e conteúdo da mensagem são obrigatórios.' },
        { status: 400 }
      );
    }

    const message = await sendChatMessage({
      clientId,
      sender: sender || 'AGENCY',
      senderName,
      content,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (err) {
    console.error('Erro ao enviar mensagem de chat (POST):', err);
    return NextResponse.json({ error: 'Erro ao enviar mensagem.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { clientId, reader } = body;

    if (!clientId || !reader) {
      return NextResponse.json(
        { error: 'Cliente e tipo de leitor (AGENCY | CLIENT) são obrigatórios.' },
        { status: 400 }
      );
    }

    await markChatAsRead(clientId, reader);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao marcar mensagens como lidas (PATCH):', err);
    return NextResponse.json({ error: 'Erro ao marcar mensagens.' }, { status: 500 });
  }
}
