import { NextResponse } from 'next/server';
import { getClientBySlug } from '@/lib/services/client-service';
import { getClientMonthlyMetrics } from '@/lib/services/metrics-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug do cliente não informado.' }, { status: 400 });
    }

    const { client } = await getClientBySlug(slug);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const metrics = await getClientMonthlyMetrics(client.id);
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Erro ao buscar métricas do cliente:', error);
    return NextResponse.json({ error: 'Erro ao carregar métricas.' }, { status: 500 });
  }
}
