import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getGoogleCalendarConnections,
  saveGoogleCalendarConnection,
  deleteGoogleCalendarConnection,
  fetchIcalEvents,
  getAgencyUnifiedEvents,
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

    const allEvents = [...googleEvents, ...agencyEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

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

    const connection = await saveGoogleCalendarConnection({
      name: name || 'Minha Agenda Google',
      icalUrl: icalUrl || null,
      embedUrl: embedUrl || null,
      color: color || '#FD3100',
    });

    // Testa imediatamente se o feed iCal é válido quando informado
    let testEventsCount = 0;
    let testWarning: string | undefined;
    if (connection.icalUrl) {
      const now = new Date();
      const rangeStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
      const rangeEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 0));
      const { events, error } = await fetchIcalEvents(connection, rangeStart, rangeEnd);
      if (error) {
        testWarning = error;
      } else {
        testEventsCount = events.length;
      }
    }

    return NextResponse.json(
      {
        success: true,
        connection,
        testEventsCount,
        testWarning,
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

    if (!id) {
      return NextResponse.json({ error: 'ID da conexão não informado.' }, { status: 400 });
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
