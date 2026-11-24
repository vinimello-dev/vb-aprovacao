import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getGoogleCalendarConnections,
  saveGoogleCalendarConnection,
  deleteGoogleCalendarConnection,
  fetchIcalEvents,
  getAgencyUnifiedEvents,
  getHiddenCalendarEventIds,
  deleteAgencyEventById,
  CalendarEventItem,
} from '@/lib/services/google-calendar-service';

export async function GET(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);

    // Janela ampliada: do dia 1 do mês anterior até o fim do próximo mês (para cobrir semanas de transição e próximos compromissos)
    const rangeStart = new Date(Date.UTC(year, month - 2, 1, 0, 0, 0));
    const rangeEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const connections = await getGoogleCalendarConnections();
    const googleEvents: CalendarEventItem[] = [];
    const syncErrors: string[] = [];

    for (const conn of connections) {
      if (!conn.isActive || !conn.icalUrl) continue;
      const { events, error } = await fetchIcalEvents(conn, rangeStart, rangeEnd);
      if (error) {
        syncErrors.push(`${conn.name}: ${error}`);
      } else {
        googleEvents.push(...events);
      }
    }

    const agencyEvents = await getAgencyUnifiedEvents(rangeStart, rangeEnd);
    const hiddenIds = await getHiddenCalendarEventIds();

    const allEvents = [...googleEvents, ...agencyEvents]
      .filter((ev) => !hiddenIds.has(ev.id))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({
      connections,
      events: allEvents,
      syncErrors,
    });
  } catch (error) {
    console.error('Erro na API do Google Agenda:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar agenda integrada.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, icalUrl, embedUrl, color } = body;

    if (!icalUrl?.trim() && !embedUrl?.trim()) {
      return NextResponse.json(
        { error: 'Informe o link secreto iCal (.ics) ou o link/e-mail de incorporação do Google Agenda.' },
        { status: 400 }
      );
    }

    // Valida o feed iCal antes de salvar (evita salvar links públicos 404 de agendas privadas)
    let testEventsCount = 0;
    if (icalUrl?.trim()) {
      const now = new Date();
      const rangeStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
      const rangeEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 0));
      const tempConn = {
        id: 'test',
        name: name || 'Minha Agenda Google',
        icalUrl: icalUrl.trim(),
        embedUrl: null,
        color: color || '#FD3100',
        isActive: true,
        createdAt: '',
        updatedAt: '',
      };
      const { events, error } = await fetchIcalEvents(tempConn, rangeStart, rangeEnd);
      if (error) {
        const isPublicLink = icalUrl.includes('/public/basic.ics');
        return NextResponse.json(
          {
            error: isPublicLink
              ? 'Você copiou o "Endereço PÚBLICO", mas sua agenda é privada (HTTP 404). No Google Agenda, copie o campo logo abaixo chamado "Endereço SECRETO no formato iCal" (clique no ícone de copiar ao lado dos pontinhos ••••••).'
              : error,
          },
          { status: 400 }
        );
      }
      testEventsCount = events.length;
    }

    const connection = await saveGoogleCalendarConnection({
      name: name || 'Minha Agenda Google',
      icalUrl: icalUrl || null,
      embedUrl: embedUrl || null,
      color: color || '#FD3100',
    });

    return NextResponse.json(
      {
        success: true,
        connection,
        testEventsCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao conectar Google Agenda:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar conexão do Google Agenda.' },
      { status: 500 }
    );
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
    const eventId = searchParams.get('eventId');
    const source = searchParams.get('source') as 'google' | 'post' | 'demand' | 'recording' | null;

    if (eventId && source) {
      const ok = await deleteAgencyEventById(eventId, source);
      if (!ok) {
        return NextResponse.json({ error: 'Não foi possível remover o evento.' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID não informado.' }, { status: 400 });
    }

    await deleteGoogleCalendarConnection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover conexão do Google Agenda:', error);
    return NextResponse.json(
      { error: 'Erro ao remover conexão.' },
      { status: 500 }
    );
  }
}
