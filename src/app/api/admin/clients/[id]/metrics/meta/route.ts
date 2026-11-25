import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getAgencyMetaToken,
  getMetaClientConnection,
  saveMetaClientConnection,
  deleteMetaClientConnection,
  syncClientMetricsFromMeta,
} from '@/lib/services/meta-insights-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const [connection, token] = await Promise.all([
      getMetaClientConnection(id),
      getAgencyMetaToken(),
    ]);

    return NextResponse.json({
      connection,
      hasAgencyToken: Boolean(token),
    });
  } catch (error) {
    console.error('Erro ao buscar conexão Meta do cliente:', error);
    return NextResponse.json({ error: 'Erro ao carregar conexão Meta.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Ação 1: Sincronizar métricas de um mês/ano direto da API da Meta
    if (body.action === 'sync') {
      const month = Number(body.month);
      const year = Number(body.year);
      if (!month || !year) {
        return NextResponse.json({ error: 'Mês e ano são obrigatórios.' }, { status: 400 });
      }

      const result = await syncClientMetricsFromMeta({
        clientId: id,
        month,
        year,
      });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        metric: result.metric,
        warnings: result.warnings,
      });
    }

    // Ação 2: Vincular conta do Instagram / Anúncios ao cliente
    const { igAccountId, igUsername, adAccountId } = body;
    if (!igAccountId?.trim()) {
      return NextResponse.json(
        { error: 'Selecione ou informe o ID da conta Instagram Business.' },
        { status: 400 }
      );
    }

    const connection = await saveMetaClientConnection({
      clientId: id,
      igAccountId: igAccountId.trim(),
      igUsername: igUsername || null,
      adAccountId: adAccountId || null,
    });

    return NextResponse.json({ success: true, connection });
  } catch (error) {
    console.error('Erro na rota Meta do cliente:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação da Meta.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteMetaClientConnection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao desvincular Meta:', error);
    return NextResponse.json({ error: 'Erro ao desvincular conta.' }, { status: 500 });
  }
}
