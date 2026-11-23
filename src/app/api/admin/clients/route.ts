import { NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { getClients, createClient } from '@/lib/services/client-service';
import { generateSlug, generatePin } from '@/lib/utils';

export async function GET() {
  const isAuth = await isAuthenticatedAdmin();
  if (!isAuth) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { clients, isUsingFallback } = await getClients();
    return NextResponse.json({ clients, isUsingFallback });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return NextResponse.json(
      { error: 'Não foi possível buscar a lista de clientes.' },
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
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: 'O nome do cliente é obrigatório.' },
        { status: 400 }
      );
    }

    // Gerar ou validar slug
    let slug = body.slug?.trim() ? generateSlug(body.slug) : generateSlug(name);
    if (!slug) {
      slug = `cliente-${Date.now().toString().slice(-4)}`;
    }

    // Gerar ou validar PIN de 4 dígitos
    let pin = body.pin?.trim();
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      pin = generatePin();
    }

    const { client, isUsingFallback } = await createClient({
      name,
      slug,
      pin,
      logoUrl: body.logoUrl?.trim() || undefined,
    });

    return NextResponse.json(
      { client, isUsingFallback, message: 'Cliente cadastrado com sucesso!' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao cadastrar cliente:', error);
    // Erro de slug duplicado no Prisma (código P2002)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe um cliente cadastrado com este slug (identificador de URL).' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao cadastrar cliente no banco de dados.' },
      { status: 500 }
    );
  }
}
