import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getClientMonthlyMetrics,
  upsertClientMonthlyMetric,
  deleteClientMonthlyMetric,
} from '@/lib/services/metrics-service';

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
    const metrics = await getClientMonthlyMetrics(id);
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Erro ao buscar métricas do cliente (admin):', error);
    return NextResponse.json({ error: 'Erro ao carregar métricas.' }, { status: 500 });
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
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Mês e ano são obrigatórios.' },
        { status: 400 }
      );
    }

    const metric = await upsertClientMonthlyMetric({
      clientId: id,
      month: Number(month),
      year: Number(year),
      reach: body.reach,
      impressions: body.impressions,
      profileVisits: body.profileVisits,
      followersTotal: body.followersTotal,
      followersGained: body.followersGained,
      likes: body.likes,
      comments: body.comments,
      shares: body.shares,
      saves: body.saves,
      linkClicks: body.linkClicks,
      leads: body.leads,
      adSpend: body.adSpend,
      notes: body.notes,
      customMetrics: body.customMetrics,
    });

    if (!metric) {
      return NextResponse.json({ error: 'Falha ao salvar métricas.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, metric });
  } catch (error) {
    console.error('Erro ao salvar métricas (admin):', error);
    return NextResponse.json({ error: 'Erro ao salvar métricas.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const metricId = searchParams.get('metricId');

    if (!metricId) {
      return NextResponse.json({ error: 'ID da métrica não informado.' }, { status: 400 });
    }

    await deleteClientMonthlyMetric(id, metricId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir métrica:', error);
    return NextResponse.json({ error: 'Erro ao excluir métrica.' }, { status: 500 });
  }
}
