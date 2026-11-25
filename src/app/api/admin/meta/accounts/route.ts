import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import {
  getAgencyMetaToken,
  saveAgencyMetaToken,
  discoverMetaAccounts,
} from '@/lib/services/meta-insights-service';

export async function GET(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const discover = searchParams.get('discover') === 'true';
    const token = await getAgencyMetaToken();

    if (!token) {
      return NextResponse.json({
        hasToken: false,
        igAccounts: [],
        adAccounts: [],
      });
    }

    if (!discover) {
      return NextResponse.json({
        hasToken: true,
        tokenPreview: `${token.slice(0, 8)}...${token.slice(-6)}`,
      });
    }

    const result = await discoverMetaAccounts(token);
    return NextResponse.json({
      hasToken: true,
      tokenPreview: `${token.slice(0, 8)}...${token.slice(-6)}`,
      igAccounts: result.igAccounts,
      adAccounts: result.adAccounts,
      error: result.error,
    });
  } catch (error) {
    console.error('Erro ao buscar contas Meta:', error);
    return NextResponse.json({ error: 'Erro ao consultar contas da Meta.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken?.trim()) {
      return NextResponse.json(
        { error: 'Cole o Token de Acesso do Meta Business.' },
        { status: 400 }
      );
    }

    const result = await discoverMetaAccounts(accessToken.trim());
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await saveAgencyMetaToken(accessToken.trim());

    return NextResponse.json({
      success: true,
      hasToken: true,
      igAccounts: result.igAccounts,
      adAccounts: result.adAccounts,
    });
  } catch (error) {
    console.error('Erro ao salvar token Meta:', error);
    return NextResponse.json({ error: 'Erro ao salvar token da Meta.' }, { status: 500 });
  }
}
